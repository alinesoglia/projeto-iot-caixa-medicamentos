---
sidebar_position: 2
---

# Código Desenvolvido

Código completo do projeto criado no Wokwi:

```js title="sketch.ino"
#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include "HX711.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// --- CONFIGURAÇÃO REDE / MQTT ---
const char* ssid = "Wokwi-GUEST";
const char* password = "";
const char* mqtt_server = "broker.hivemq.com";

// --- OLED ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// --- HX711 (pinos usados no projeto) ---
#define DT 18
#define SCK 19
HX711 scale;
float calibration_factor = 7050.0; 

// --- Servo ---
#define SERVO_PIN 5
Servo myservo;

// --- MQTT ---
WiFiClient espClient;
PubSubClient client(espClient);
const char* topic_event = "medbox/medbox01/events";
const char* topic_cmd   = "medbox/medbox01/cmd";

// --- Lógica de detecção ---
float lastWeight = 0.0;             
const float thresholdIncrease = 0.05; 

// Sensibilidade principal: mínima queda (em gramas) para considerar "retirada"
const float minDrop = 0.02; 

// debounce temporal entre eventos (hold-off)
const unsigned long eventHoldoff = 2000; 

unsigned long lastEventMillis = 0; 

// filtro EMA
float weightEma = 0.0;

float emaAlpha = 0.6; 

bool handlingEvent = false; 

// --- utilitários ---
void showMsg(const char* msg) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0,0);
  display.setTextColor(SSD1306_WHITE);
  display.println(msg);
  display.display();
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.print("[MQTT Rx] "); Serial.print(topic); Serial.print(" -> "); Serial.println(msg);
  if (String(topic) == topic_cmd) {
    if (msg == "open") {
      myservo.write(90);
      showMsg("Caixa aberta (cmd)");
    } else if (msg == "close") {
      myservo.write(0);
      showMsg("Caixa fechada (cmd)");
    }
  }
}

void reconnect() {
  static unsigned long lastTry = 0;
  if (millis() - lastTry < 2000) return;
  lastTry = millis();
  Serial.println("Tentando conectar MQTT...");
  if (client.connect("medbox01_sim")) {
    Serial.println("MQTT conectado");
    client.subscribe(topic_cmd);
    // não sobrescrever display
  } else {
    Serial.print("MQTT falhou, rc="); Serial.println(client.state());
  }
}

void publishEvent(const char* ev) {
  char payload[128];
  snprintf(payload, sizeof(payload), "{\"device\":\"medbox01\",\"event\":\"%s\",\"ts\":%lu}", ev, millis());
  bool ok = client.publish(topic_event, payload);
  Serial.print("[publish] "); Serial.print(payload); Serial.print(" -> "); Serial.println(ok?"OK":"FAIL");
}

void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.println("=== START: medbox HX711 prototype ===");

  // I2C
  Wire.begin(21, 22);
  Serial.println("Wire.begin(21,22)");

  // OLED
  bool ok = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  Serial.print("display.begin returned: "); Serial.println(ok?"OK":"FAIL");
  if (ok) {
    showMsg("OLED inicializado");
    delay(300);
  }

  // Servo
  myservo.setPeriodHertz(50);
  myservo.attach(SERVO_PIN, 500, 2400);
  myservo.write(0);
  Serial.println("Servo configurado");

  // HX711
  scale.begin(DT, SCK);
  scale.set_scale(calibration_factor);
  scale.tare();
  delay(500);

  // inicializa EMA com média de leituras
  float initSum = 0.0;
  const int initSamples = 10;
  for (int i = 0; i < initSamples; ++i) {
    if (scale.is_ready()) initSum += scale.get_units(3);
    delay(50);
  }
  weightEma = initSum / initSamples;
  lastWeight = weightEma;
  Serial.print("Referencia inicial (lastWeight) = "); Serial.println(lastWeight, 4);

  // WiFi
  WiFi.begin(ssid, password);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
    Serial.print('.'); delay(200);
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi conectado: " + WiFi.localIP().toString());
    showMsg("WiFi conectado");
  } else {
    Serial.println("WiFi nao conectado (simulador)");
    showMsg("WiFi offline");
  }

  // MQTT
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  lastEventMillis = 0;
}

void triggerMedicationEvent() {
  handlingEvent = true;
  lastEventMillis = millis();

  Serial.println("[Evento] queda confirmada -> acionando servo e publicando");
  showMsg("Remedio retirado!");
  myservo.write(90);
  delay(800);
  myservo.write(0);
  publishEvent("taken");

  // Atualiza baseline para evitar retrigger imediato
  lastWeight = weightEma;

  Serial.print("Nova referencia lastWeight = "); Serial.println(lastWeight, 4);

  handlingEvent = false;
}

void loop() {
  if (WiFi.status() == WL_CONNECTED && !client.connected()) reconnect();
  if (WiFi.status() == WL_CONNECTED) client.loop();

  float reading = 0.0;
  if (scale.is_ready()) {
    reading = scale.get_units();
    reading += ((float)random(-3, 3)) / 100.0; 
  }

  // filtro EMA
  weightEma = (emaAlpha * reading) + ((1.0 - emaAlpha) * weightEma);

  float diff = weightEma - lastWeight;
  unsigned long now = millis();

  Serial.print("[Reading] "); Serial.print(reading, 2);
  Serial.print("  [EMA] "); Serial.print(weightEma, 2);
  Serial.print("  [Ref] "); Serial.print(lastWeight, 2);
  Serial.print("  [Diff] "); Serial.println(diff, 2);

  // >>> disparo de evento quando o peso diminui (retirada)
  if (!handlingEvent && (diff <= -minDrop) && (now - lastEventMillis > eventHoldoff)) {
    triggerMedicationEvent();
  }

  // >>> atualiza baseline se houver aumento perceptível de peso
  if (diff >= thresholdIncrease) {
    Serial.println("Peso aumentado: atualizando baseline");
    lastWeight = weightEma;
  }

  delay(300);
}
```


```json title="diagram.json"
{
  "version": 1,
  "author": "Anonymous maker",
  "editor": "wokwi",
  "parts": [
    { "type": "board-esp32-devkit-c-v4", "id": "esp", "top": -9.6, "left": 24.04, "attrs": {} },
    {
      "type": "board-ssd1306",
      "id": "oled1",
      "top": -73.66,
      "left": 19.43,
      "attrs": { "i2cAddress": "0x3c" }
    },
    { "type": "wokwi-servo", "id": "servo1", "top": 46, "left": 172.8, "attrs": {} },
    {
      "type": "wokwi-hx711",
      "id": "cell1",
      "top": -74.2,
      "left": 165.8,
      "attrs": { "type": "5kg" }
    }
  ],
  "connections": [
    [ "esp:TX", "$serialMonitor:RX", "", [] ],
    [ "esp:RX", "$serialMonitor:TX", "", [] ],
    [ "servo1:V+", "esp:5V", "red", [ "h0" ] ],
    [ "servo1:GND", "esp:GND.1", "#8f4814", [ "h0" ] ],
    [ "oled1:VCC", "esp:3V3", "white", [ "v0" ] ],
    [ "oled1:GND", "esp:GND.3", "violet", [ "v0" ] ],
    [ "servo1:PWM", "esp:5", "orange", [ "h0" ] ],
    [ "oled1:SDA", "esp:21", "blue", [ "v0" ] ],
    [ "oled1:SCL", "esp:22", "purple", [ "v0" ] ],
    [ "cell1:DT", "esp:18", "green", [ "h0" ] ],
    [ "cell1:SCK", "esp:19", "green", [ "h0" ] ],
    [ "cell1:VCC", "esp:3V3", "red", [ "h0" ] ],
    [ "cell1:GND", "esp:GND.2", "black", [ "h0" ] ]
  ],
  "dependencies": {}
}
```