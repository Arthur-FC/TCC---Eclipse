# Eclipse

Eclipse é um protótipo de assistente musical desenvolvido como Trabalho de Conclusão de Curso. O repositório contém uma interface responsiva em Angular e Ionic e a fundação de uma API em NestJS.

## Funcionalidades atuais

- Criação e seleção de conversas.
- Envio e exibição de mensagens do usuário.
- Busca pelo título das conversas.
- Agrupamento automático por data.
- Persistência local do histórico no navegador.
- Layout adaptado para desktop, tablet e celular.
- Backend NestJS com configuração validada, CORS, proteção de cabeçalhos e tratamento uniforme de erros.
- Endpoint de saúde da API.
- PostgreSQL executado com Docker Compose e migrações versionadas.
- Cadastro, login, sessão segura por cookie, logout e desativação de conta.

A interface ainda não está conectada ao backend. A resposta automática e a integração com IA pertencem às próximas etapas.

## Tecnologias

- Angular 19
- Ionic 8
- TypeScript 5.7
- SCSS
- Local Storage
- NestJS 11
- Node.js 22+
- PostgreSQL 17
- TypeORM

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

### Backend

Na pasta `backend`:

```bash
corepack pnpm install
docker compose up -d postgres
corepack pnpm db:migration:run
corepack pnpm start:dev
```

A API ficará disponível em `http://localhost:3001/api`. Para verificar sua saúde, acesse `http://localhost:3001/api/health`.

Consulte [backend/README.md](./backend/README.md) para configuração, variáveis de ambiente e comandos de teste.

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

backend/
├── src/              # Módulos e fundação da API NestJS
├── test/             # Testes de integração
└── package.json      # Dependências e scripts do backend
```

Os componentes cuidam da apresentação, enquanto `ChatService` centraliza a manipulação e a persistência das conversas. Os modelos definem o formato esperado dos dados.

## Configuração do backend

Copie `backend/.env.example` para `backend/.env`. O arquivo de exemplo documenta porta, ambiente e origens permitidas.

Nunca coloque chaves de serviços de IA no frontend: todo segredo deve permanecer no servidor.

## Próximos passos

- Persistir projetos, conversas e mensagens no backend.
- Conectar o Angular à API.
- Integrar o modelo de IA pela Groq.
- Implementar biblioteca e busca semântica.
