# Eclipse API

Fundação do backend da plataforma Eclipse, construída com NestJS e TypeScript.

## Pré-requisitos

- Node.js 22 ou superior.
- pnpm 10 ou superior.
- Docker Desktop para o PostgreSQL local.

## Configuração

Na pasta `backend`, copie o arquivo de exemplo:

```powershell
Copy-Item .env.example .env
```

Variáveis disponíveis nesta etapa:

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | Ambiente: `development`, `test` ou `production` |
| `PORT` | `3001` | Porta HTTP da API |
| `CORS_ORIGINS` | `http://localhost:4200` | Origens permitidas, separadas por vírgula |
| `DATABASE_HOST` | `127.0.0.1` | Endereço do PostgreSQL |
| `DATABASE_PORT` | `5432` | Porta do PostgreSQL |
| `DATABASE_NAME` | `eclipse` | Banco principal da aplicação |
| `DATABASE_USER` | `eclipse` | Usuário local do banco |
| `DATABASE_PASSWORD` | `eclipse_dev` | Senha apenas para desenvolvimento |
| `SESSION_TTL_DAYS` | `7` | Duração da sessão em dias |

Valores inválidos impedem o servidor de iniciar e são informados no terminal.

## Banco de dados

Com o Docker Desktop iniciado:

```powershell
docker compose up -d postgres
corepack pnpm db:migration:run
```

O volume `eclipse_postgres_data` preserva os dados quando o contêiner é reiniciado. O Compose também cria `eclipse_test`, utilizado exclusivamente pelos testes de integração.

Comandos úteis:

```powershell
corepack pnpm db:migration:show
corepack pnpm db:migration:revert
docker compose down
```

`docker compose down` remove o contêiner e a rede, mas preserva o volume. Não use `down -v` se quiser manter os dados.

## Instalação e execução da API

```powershell
corepack pnpm install
corepack pnpm start:dev
```

O Corepack acompanha o Node.js e permite usar a versão de pnpm registrada no `package.json` sem uma instalação global. Se as dependências já estiverem instaladas e o Corepack não conseguir acessar a internet, execute diretamente no Windows:

```powershell
.\node_modules\.bin\nest.cmd start --watch
```

A API fica disponível em `http://localhost:3001/api` e o endpoint de saúde em `http://localhost:3001/api/health`.

O frontend continua sendo executado a partir da raiz do repositório, normalmente em `http://localhost:4200`.

## Verificação

```powershell
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

Os testes de integração exigem que o PostgreSQL do Compose esteja saudável.

## Autenticação disponível

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/api/auth/register` | Criar conta e iniciar sessão |
| `POST` | `/api/auth/login` | Entrar com e-mail e senha |
| `GET` | `/api/auth/me` | Recuperar o usuário autenticado |
| `POST` | `/api/auth/logout` | Revogar a sessão atual |
| `PATCH` | `/api/auth/account/disable` | Desativar a conta e revogar todas as sessões |

A sessão é enviada pelo cookie `eclipse_session`, configurado como `HttpOnly` e `SameSite=Lax`. O banco armazena somente o hash do token. Senhas são protegidas com `scrypt` e salt aleatório.

## Projetos e histórico disponíveis

Todas as rotas abaixo exigem o cookie de sessão. Os IDs são UUIDs criados no backend e cada consulta é limitada ao proprietário autenticado.

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/api/projects` | Criar projeto |
| `GET` | `/api/projects?page=1&limit=20` | Listar projetos ativos |
| `GET` | `/api/projects/:projectId` | Consultar um projeto |
| `PATCH` | `/api/projects/:projectId` | Editar título ou descrição |
| `DELETE` | `/api/projects/:projectId` | Arquivar projeto sem apagar o histórico |
| `POST` | `/api/projects/:projectId/conversations` | Abrir conversa |
| `GET` | `/api/projects/:projectId/conversations` | Listar conversas |
| `POST` | `/api/projects/:projectId/conversations/:conversationId/messages` | Salvar mensagem |
| `GET` | `/api/projects/:projectId/conversations/:conversationId/messages` | Listar mensagens |

As listagens devolvem `items`, `page`, `limit`, `total` e `totalPages`. O limite máximo é 100. Para incluir projetos arquivados, use `GET /api/projects?includeArchived=true`. Um projeto arquivado pode ser consultado, mas não recebe novas conversas ou mensagens.

## Limites atuais

O backend já persiste projetos e o histórico de conversas, mas a interface Angular ainda usa seu estado local. A conexão da interface pertence à etapa 5 e a resposta real da IA pertence à etapa 6.
