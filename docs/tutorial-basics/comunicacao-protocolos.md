---
sidebar_position: 3
---

# Comunicação e Protocolos

- Protocolo: MQTT (Message Queuing Telemetry Transport)
- Broker: HiveMQ Public Broker
- Porta: 8884 (TCP/IP)
- Tópicos utilizados:
- `medbox/medbox01/events` → Publicação de mensagens (sensor, estado do atuador)
- `medbox/medbox01/cmd` → Subscrição de comandos remotos

## Fluxo de comunicação:
1- ESP32 conecta ao broker via TCP/IP.

2- Ao detectar evento (sensor), publica no tópico medbox/medbox01/events.

3- Interface web ou app envia comandos (open/close) via medbox/medbox01/cmd.

4- ESP32 interpreta e aciona o servo motor.
