import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Monitoramento Inteligente de Medicamentos',
    description: (
      <>
        O sistema foi projetado para monitorar o uso de medicamentos em tempo real, integrando sensores físicos, atuadores multimodais e conectividade via protocolo MQTT.
Ele garante maior adesão ao tratamento e permite o acompanhamento remoto do uso de medicamentos por pacientes e cuidadores.
      </>
    ),
  },
  {
    title: 'Integração IoT e MQTT',
    description: (
      <>
        Com base no microcontrolador ESP32, o projeto utiliza o protocolo MQTT para comunicação com a internet.
Mensagens são publicadas e recebidas em tempo real, permitindo o envio de alertas, comandos remotos e registro de eventos diretamente em um broker público ou servidor local.
      </>
    ),
  },
  {
    title: 'Código Aberto e Simulação',
    description: (
      <>
        Desenvolvido com hardware de código aberto e testado no simulador online Wokwi, o protótipo pode ser facilmente reproduzido e expandido.
Inclui sensores, atuadores e display OLED, todos integrados ao ESP32.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
