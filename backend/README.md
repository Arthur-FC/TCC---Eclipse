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
| `PORT` | `3002` | Porta HTTP da API |
| `CORS_ORIGINS` | `http://localhost:4200` | Origens permitidas, separadas por vírgula |
| `DATABASE_HOST` | `127.0.0.1` | Endereço do PostgreSQL |
| `DATABASE_PORT` | `5432` | Porta do PostgreSQL |
| `DATABASE_NAME` | `eclipse` | Banco principal da aplicação |
| `DATABASE_USER` | `eclipse` | Usuário local do banco |
| `DATABASE_PASSWORD` | `eclipse_dev` | Senha apenas para desenvolvimento |
| `SESSION_TTL_DAYS` | `7` | Duração da sessão em dias |
| `GROQ_API_KEY` | vazio | Chave secreta da Groq; obrigatória em produção |
| `GROQ_MODEL` | `qwen/qwen3.6-27b` | Modelo principal de chat |
| `GROQ_TIMEOUT_MS` | `45000` | Tempo máximo de uma geração |
| `AI_MAX_COMPLETION_TOKENS` | `1500` | Limite de tokens da resposta |
| `AI_CONTEXT_MESSAGES` | `20` | Quantidade máxima de mensagens enviadas como contexto |
| `AI_BRIEFING_MAX_ATTEMPTS` | `2` | Máximo de tentativas para obter um briefing JSON válido |
| `AI_MAX_TOOL_CALLS` | `4` | Máximo de ferramentas executadas em uma resposta |
| `YOUTUBE_API_KEY` | vazio | Chave da YouTube Data API v3; obrigatória em produção |
| `YOUTUBE_TIMEOUT_MS` | `15000` | Tempo máximo de cada chamada ao YouTube |
| `YOUTUBE_CACHE_TTL_SECONDS` | `86400` | Validade do cache de pesquisa, em segundos |
| `YOUTUBE_RESULTS_LIMIT` | `10` | Máximo de vídeos por pesquisa |
| `YOUTUBE_DAILY_SEARCH_LIMIT` | `90` | Margem local para o limite diário de pesquisas |
| `YOUTUBE_DAILY_GENERAL_LIMIT` | `9000` | Margem local para a quota geral diária |
| `SPOTIFY_CLIENT_ID` | vazio | Identificador secreto do aplicativo Spotify; obrigatório em produção |
| `SPOTIFY_CLIENT_SECRET` | vazio | Segredo do aplicativo Spotify; obrigatório em produção |
| `SPOTIFY_MARKET` | `BR` | Mercado usado para verificar disponibilidade das faixas |
| `SPOTIFY_TIMEOUT_MS` | `15000` | Tempo máximo de cada chamada ao Spotify |

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

A API fica disponível em `http://localhost:3002/api` e o endpoint de saúde em `http://localhost:3002/api/health`.

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

## Assistente pela Groq

Crie uma chave em [Groq API Keys](https://console.groq.com/keys) e preencha localmente no arquivo `.env`:

```env
GROQ_API_KEY=gsk_sua_chave_aqui
```

Nunca coloque essa chave no Angular, no Git ou em capturas de tela. Reinicie o backend depois da alteração.

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/api/projects/:projectId/conversations/:conversationId/assistant/stream` | Salvar a mensagem do usuário e transmitir a resposta da IA |

Envio normal:

```json
{ "content": "Quero uma trilha melancólica com piano." }
```

Repetição após falha da Groq, sem duplicar a mensagem:

```json
{ "retry": true }
```

A resposta utiliza `text/event-stream` com eventos `user_message`, `delta`, `done` e `error`. As respostas da assistente guardam modelo, provedor, tokens e latência no PostgreSQL.

## Briefing estruturado

O briefing transforma o histórico da conversa em dados editáveis. O Qwen usa o modo de objeto JSON da Groq, mas o backend continua validando cada campo e faz no máximo duas tentativas. Valores ausentes permanecem `null` ou como listas vazias; dúvidas e perguntas complementares são mantidas separadamente.

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/api/projects/:projectId/briefings/generate` | Gerar uma nova versão usando uma conversa do projeto |
| `GET` | `/api/projects/:projectId/briefings/latest` | Consultar a versão mais recente |
| `GET` | `/api/projects/:projectId/briefings` | Consultar o histórico de versões |
| `PUT` | `/api/projects/:projectId/briefings/:version` | Salvar uma edição como nova versão |
| `POST` | `/api/projects/:projectId/briefings/:version/confirm` | Confirmar explicitamente a versão mais recente |

A edição e a confirmação verificam a versão informada para evitar sobrescrever uma alteração mais recente. O backend também disponibiliza uma regra interna que impede as futuras pesquisas de avançarem sem um briefing confirmado.

## Ferramentas internas da IA

O Qwen pode solicitar três operações locais durante o chat:

| Ferramenta | Acesso permitido |
|---|---|
| `read_project_summary` | Título, descrição e contagens do projeto atual |
| `read_confirmed_briefing` | Versão confirmada mais recente do briefing atual |
| `search_project_messages` | Até cinco trechos do histórico do projeto atual |

As ferramentas não recebem `ownerId` ou `projectId` em seus argumentos. Esses valores são obtidos da sessão e da rota autenticada. Argumentos desconhecidos são rejeitados, ferramentas inexistentes não são executadas e o limite padrão é quatro chamadas por resposta.

Cada tentativa registra nome, estado, duração e código de falha em `ai_tool_executions`. Argumentos e resultados não são duplicados na auditoria. Conteúdo recuperado é identificado para o modelo como dado não confiável e não pode substituir as instruções centrais da Eclipse.

## Pesquisa de referências no YouTube

No Google Cloud Console, crie ou selecione um projeto, habilite **YouTube Data API v3** e crie uma chave de API. Restrinja a chave à YouTube Data API v3 e, no ambiente publicado, também ao servidor que executa o backend. Depois, configure somente em `backend/.env`:

```env
YOUTUBE_API_KEY=sua_chave_do_google
```

Reinicie o backend após alterar o arquivo. Nunca envie essa chave ao Angular ou ao Git.

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/api/projects/:projectId/references/youtube/search` | Pesquisar usando o briefing confirmado |
| `GET` | `/api/projects/:projectId/references` | Listar referências persistidas |
| `PATCH` | `/api/projects/:projectId/references/:referenceId` | Marcar como pendente, aprovada ou rejeitada |

A busca usa `type=video`, categoria musical e filtro de incorporação. Depois consulta os detalhes para normalizar título, canal, miniatura, duração, link e disponibilidade. Vídeos privados, não processados ou não incorporáveis são descartados.

O cache padrão dura 24 horas. O contador local separa chamadas de pesquisa da quota geral e usa margens abaixo dos limites padrão do Google. Repetir uma busca mantém as decisões já tomadas e não duplica o mesmo vídeo no projeto.

## Referências do Spotify por link

Crie um aplicativo no [Spotify for Developers](https://developer.spotify.com/dashboard), copie o Client ID e o Client Secret e configure somente em `backend/.env`:

```env
SPOTIFY_CLIENT_ID=seu_client_id
SPOTIFY_CLIENT_SECRET=seu_client_secret
SPOTIFY_MARKET=BR
```

O backend usa o fluxo Client Credentials, próprio para comunicação servidor-a-servidor, e reutiliza o token até perto do vencimento. Em modo de desenvolvimento, a conta proprietária do aplicativo precisa atender às regras atuais do Spotify, incluindo a exigência de Premium. Reinicie o backend depois de configurar as credenciais.

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/api/projects/:projectId/references/spotify` | Adicionar os metadados de uma faixa por link |

São aceitos links HTTPS de faixa em `open.spotify.com/track/...`, inclusive links localizados como `open.spotify.com/intl-pt/track/...`. Links de álbum, playlist, artista, domínios externos e IDs inválidos são rejeitados. O sistema salva título, artistas, álbum, capa, duração e link oficial; não baixa, armazena nem envia áudio ou prévias do Spotify à IA.

## Limites atuais

A busca no acervo ainda pertence às próximas etapas. A integração do Spotify adiciona apenas os metadados verificados da faixa e não fornece o áudio à IA.
