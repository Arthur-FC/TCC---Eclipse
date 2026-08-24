# Eclipse

Eclipse é um protótipo de assistente conversacional desenvolvido como Trabalho de Conclusão de Curso. A aplicação oferece criação, busca e seleção de conversas em uma interface responsiva construída com Angular e Ionic.

## Funcionalidades atuais

- Criação e seleção de conversas.
- Envio e exibição de mensagens do usuário.
- Busca pelo título das conversas.
- Agrupamento automático por data.
- Persistência local do histórico no navegador.
- Layout adaptado para desktop, tablet e celular.

A resposta automática do assistente e a integração com um backend ainda não foram implementadas.

## Tecnologias

- Angular 19
- Ionic 8
- TypeScript 5.7
- SCSS
- Local Storage

## Como executar

Requisitos: Node.js 22 ou uma versão compatível com Angular 19 e npm.

```bash
npm ci
npm start
```

A aplicação ficará disponível no endereço mostrado pelo Angular CLI, normalmente `http://localhost:4200`.

Para gerar a versão de produção:

```bash
npm run build
```

## Organização

```text
src/app/
├── components/       # Partes visuais reutilizáveis
│   ├── chat-list/
│   ├── chat-window/
│   ├── message/
│   ├── message-input/
│   └── sidebar/
├── models/           # Formatos de Chat e Message
├── services/         # Estado, persistência e regras do chat
└── app.component.*   # Composição da aplicação
```

Os componentes cuidam da apresentação, enquanto `ChatService` centraliza a manipulação e a persistência das conversas. Os modelos definem o formato esperado dos dados.

## Configuração futura do backend

Copie `.env.example` para `.env` quando a integração com o backend for implementada. O arquivo serve apenas para documentar as configurações necessárias.

Nunca coloque chaves de serviços de IA no frontend: todo segredo deve permanecer no servidor.

## Próximos passos

- Criar o backend.
- Integrar o modelo de IA.
- Tratar estados de carregamento e falhas.
- Implementar renomeação e exclusão de conversas.
- Adicionar testes automatizados e lint.
- Definir regras de privacidade e tratamento dos dados.
