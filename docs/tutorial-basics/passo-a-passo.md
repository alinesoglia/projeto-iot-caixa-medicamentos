---
sidebar_position: 1
---

# Passo a Passo do Funcionamento

- O sistema inicializa o ESP32 e conecta-se à rede Wi-Fi.

- O dispositivo estabelece comunicação com o broker MQTT (ex: broker.hivemq.com).

- O sensor HX711 detecta variações de peso ao retirar ou adicionar medicamentos.

- Quando ocorre retirada, o servo motor é acionado e uma mensagem MQTT é publicada no tópico configurado.

- O display OLED mostra o status do sistema e mensagens de alerta (“Medicamento retirado”, “Caixa fechada”, etc.).

- O sistema também pode receber comandos MQTT (open/close) via aplicativo ou painel web.
