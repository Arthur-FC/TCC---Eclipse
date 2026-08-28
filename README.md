# Eclipse

Eclipse é um protótipo de assistente musical desenvolvido como Trabalho de Conclusão de Curso. O repositório contém uma interface responsiva em Angular e Ionic e uma API em NestJS.

## Funcionalidades atuais

- Criação e seleção de conversas.
- Envio e exibição de mensagens do usuário.
- Busca pelo título das conversas.
- Agrupamento automático por data.
- Cadastro, login, sessão segura por cookie e logout pela interface.
- Persistência oficial do histórico no PostgreSQL.
- Layout adaptado para desktop, tablet e celular.
- Backend NestJS com configuração validada, CORS, proteção de cabeçalhos e tratamento uniforme de erros.
- Endpoint de saúde da API.
- PostgreSQL executado com Docker Compose e migrações versionadas.
- Desativação de conta disponível pela API.
- Projetos, conversas e mensagens persistidos no PostgreSQL e isolados por usuário.
- Paginação do histórico e arquivamento lógico de projetos.
- Respostas progressivas pela Groq com o modelo Qwen 3.6 27B.
- Persistência de respostas da IA com tokens, modelo e latência.
- Repetição controlada quando a geração falha.
- Briefing estruturado gerado pela IA, revisável e editável.
- Versionamento e confirmação explícita do briefing.

A interface está conectada ao backend para autenticação, projetos, histórico e respostas da IA. Para utilizar a Groq, ainda é necessário configurar uma chave pessoal no `backend/.env`.

## Tecnologias

- Angular 19
- Ionic 8
- TypeScript 5.7
- SCSS
- Angular HTTP Client
- NestJS 11
- Node.js 22+
- PostgreSQL 17
- TypeORM
- Groq API

## Como executar

Requisitos: Node.js 22 ou uma versão compatível com Angular 19 e npm.

```bash
npm ci
npm start
```
ou
```bash
cd "\TCC---Eclipse"
& ".\node_modules\.bin\ng.cmd" serve
```

A aplicação ficará disponível no endereço mostrado pelo Angular CLI, normalmente `http://localhost:4200`.

Se o comando `npm` não estiver disponível, execute diretamente:

```powershell
& ".\node_modules\.bin\ng.cmd" serve
```

Use `http://localhost:4200`, mantendo o mesmo nome de host utilizado pela API para que o cookie de sessão funcione corretamente.

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
ou
```bash
cd "\backend"
docker compose up -d postgres
& ".\node_modules\.bin\nest.cmd" start --watch
```

A API ficará disponível em `http://localhost:3002/api`. Para verificar sua saúde, acesse `http://localhost:3002/api/health`.

Consulte [backend/README.md](./backend/README.md) para configuração, variáveis de ambiente e comandos de teste.

## Organização

```text
src/app/
├── components/       # Partes visuais reutilizáveis
│   ├── chat-list/
│   ├── chat-window/
│   ├── briefing-panel/
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

Os componentes cuidam da apresentação, enquanto os serviços Angular conectam autenticação, projetos, conversas e mensagens à API. Os modelos definem o formato esperado dos dados.

## Configuração do backend

Copie `backend/.env.example` para `backend/.env`. O arquivo de exemplo documenta porta, ambiente e origens permitidas.

Nunca coloque chaves de serviços de IA no frontend: todo segredo deve permanecer no servidor.

## Próximos passos

- Criar o sistema de ferramentas controladas da IA.
- Implementar biblioteca e busca semântica.
