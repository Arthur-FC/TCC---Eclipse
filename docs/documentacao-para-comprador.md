# Eclipse — documentação para comprador e equipe técnica

> Documento de entrega e entendimento do produto  
> Revisão: 09/09/2026  
> Situação analisada: código-fonte do repositório, na forma de um MVP acadêmico

## 1. Resumo direto

O **Eclipse** é uma aplicação web que ajuda uma pessoa a organizar o início de uma produção musical. Ela reúne conversa com inteligência artificial, briefing, referências musicais, biblioteca privada de áudio e moodboard em um único fluxo.

O sistema **não compõe, grava, mixa ou finaliza uma música automaticamente**. Seu valor está em transformar ideias soltas em uma direção criativa documentada, comparável e reutilizável.

O comprador recebe uma base funcional com interface, servidor, banco de dados, armazenamento privado, integrações externas, testes do backend e documentação. Ainda assim, a versão atual deve ser entendida como **MVP**, não como um serviço comercial pronto para ser colocado na internet sem trabalho adicional de infraestrutura, operação, documentos jurídicos e homologação.

---

# Parte A — para o comprador que não é da área de tecnologia

## 2. O que está sendo comprado

Em termos simples, a entrega é o **código-fonte de uma plataforma web de apoio à criação musical**. Esse código contém:

- a tela que o usuário acessa pelo navegador;
- o sistema de cadastro e login;
- a área de projetos e conversas;
- a conexão com serviços de inteligência artificial;
- a organização de briefings, referências e moodboards;
- o banco que guarda usuários, projetos e histórico;
- o armazenamento privado dos arquivos de áudio;
- os mecanismos de análise e separação de áudio;
- os testes automatizados existentes no servidor;
- os guias de instalação e segurança.

Comprar o código **não significa receber automaticamente** hospedagem, domínio, suporte permanente, contas pagas em outros serviços, aprovação jurídica, loja de aplicativos ou garantia de disponibilidade 24 horas. Esses itens precisam constar separadamente no contrato, se fizerem parte da negociação.

## 3. Para quem o Eclipse foi pensado

O produto pode atender:

- músicos e compositores que precisam dar forma a uma ideia inicial;
- produtores que desejam registrar decisões e alinhar referências;
- estudantes de música e produção musical;
- equipes criativas que precisam compartilhar uma direção de trabalho;
- instituições que queiram avaliar um processo assistido por IA.

## 4. Como uma pessoa usa o sistema

O caminho normal é este:

1. A pessoa cria uma conta e entra no Eclipse.
2. Cria um projeto e conversa com a assistente sobre a música desejada.
3. A IA transforma a conversa em um briefing organizado.
4. A pessoa revisa, altera e confirma o briefing.
5. Adiciona referências do YouTube, Spotify, links manuais ou de sua biblioteca privada.
6. Aprova, rejeita e ordena as melhores referências.
7. O Eclipse gera um moodboard e um roteiro de produção.
8. O resultado pode ser consultado depois e exportado em PDF.
9. A obra final pode ser enviada e ligada ao histórico criativo daquele projeto.

## 5. Funcionalidades entregues

### Conta e projetos

- cadastro, login e logout;
- sessão segura por cookie;
- projetos separados por usuário;
- renomeação, listagem e arquivamento de projetos;
- histórico persistente de conversas e mensagens.

### Assistente criativa

- respostas progressivas no chat;
- contexto recente e memória resumida do projeto;
- registro do modelo, uso de tokens e tempo de resposta;
- nova tentativa controlada quando a geração falha.

### Briefing

- geração de briefing estruturado pela IA;
- edição manual antes da aprovação;
- confirmação explícita;
- preservação de versões.

### Referências musicais

- pesquisa no YouTube;
- inclusão de faixa do Spotify por link;
- inclusão por link manual;
- inclusão de uma faixa da biblioteca particular;
- aprovação, rejeição, comparação, ordenação e substituição;
- curadoria com justificativas baseadas nos dados disponíveis.

### Biblioteca de áudio

- envio de MP3 e WAV de até 50 MB;
- armazenamento privado;
- reprodução por link temporário;
- detecção de arquivo repetido;
- estimativas de duração, BPM, tonalidade e características musicais;
- busca em linguagem natural quando a integração de busca semântica está configurada;
- busca mais simples por metadados quando essa integração não está disponível.

### Separação de voz e instrumental

- separação local de uma referência aprovada;
- armazenamento privado dos arquivos resultantes;
- reprodução e download por links temporários;
- uso do arquivo do próprio usuário: o sistema não baixa áudio do YouTube ou Spotify.

### Moodboard e entrega criativa

- geração de direção criativa e roteiro de produção;
- exigência de briefing e referências confirmados;
- histórico de versões;
- indicação de quais dados são fatos, estimativas ou sugestões da IA;
- exportação autenticada em PDF;
- registro versionado da obra final.

### Privacidade e avaliação

- exportação dos dados da conta em JSON;
- correção de nome e e-mail;
- exclusão de faixa e revogação do consentimento;
- exclusão da conta com senha e confirmação textual;
- consulta de consumo dos serviços externos;
- formulário de avaliação acadêmica do projeto.

## 6. O que depende de terceiros

Algumas partes funcionam somente quando o responsável pela operação cria e configura contas externas:

| Serviço | Para que serve | Sem ele |
|---|---|---|
| Groq | Chat, briefing, curadoria assistida e moodboard | As funções de IA ficam indisponíveis |
| YouTube Data API | Pesquisa de referências do YouTube | A pesquisa no YouTube não funciona |
| Spotify Web API | Leitura de dados de uma faixa por link | Não é possível adicionar faixa do Spotify |
| Cloudflare Workers AI | Busca por significado na biblioteca | O sistema usa a busca alternativa por texto e metadados |
| Servidor de e-mail | Recuperação e confirmação por e-mail | Não está implementado no MVP atual |

As regras, preços, limites e disponibilidade desses fornecedores podem mudar. Contas, chaves e eventuais cobranças pertencem ao operador do sistema, não ao código-fonte.

## 7. Custos que o comprador deve prever

O repositório não define um valor mensal fixo. O custo real depende da quantidade de usuários e arquivos. Devem ser orçados:

- servidor para a aplicação e para os processos de análise de áudio;
- banco de dados PostgreSQL;
- armazenamento e tráfego dos arquivos de áudio;
- domínio e certificado HTTPS;
- uso de Groq e demais APIs, conforme o plano de cada fornecedor;
- backups, monitoramento e alertas;
- manutenção técnica e atualizações de segurança;
- assessoria jurídica e adequação à LGPD;
- suporte aos usuários.

A separação de voz e instrumental exige mais processamento que as demais funções e pode demandar uma máquina com mais memória, CPU e, para melhor desempenho, GPU compatível.

## 8. Limitações importantes

- É um MVP acadêmico, embora tenha uma base funcional ampla.
- As respostas da IA podem errar e devem ser tratadas como sugestões.
- BPM, tonalidade, emoção e instrumentação são estimativas, não laudos musicais.
- O Eclipse não fornece direitos sobre músicas de terceiros.
- O sistema não baixa áudio do YouTube ou Spotify.
- Não há recuperação de senha por e-mail no estado atual.
- Não foram encontrados, no repositório analisado, aplicativo mobile nativo, painel administrativo completo, faturamento/assinaturas ou integração de pagamento.
- Colocar o sistema em produção exige infraestrutura, HTTPS, segredos seguros, backups, monitoramento e definições institucionais de privacidade.

## 9. Privacidade em linguagem simples

- Cada conta deve enxergar somente seus próprios projetos e áudios.
- Senhas não são guardadas em texto legível.
- Os arquivos ficam em armazenamento privado e são acessados por links com prazo curto.
- O áudio é analisado localmente; Groq e Cloudflare recebem texto, não o arquivo de áudio.
- O usuário pode exportar seus dados e solicitar a exclusão da conta.
- Antes de uso comercial, o comprador deve publicar aviso de privacidade, definir responsáveis, canal de atendimento, contratos com fornecedores e plano de resposta a incidentes.

Essas medidas técnicas ajudam na proteção, mas **não substituem uma análise jurídica de LGPD**.

## 10. O que conferir no contrato de compra

Antes da aquisição, comprador e vendedor devem registrar por escrito:

- quais direitos sobre o código, marca, identidade visual e documentação serão cedidos;
- se a venda é exclusiva ou se o vendedor poderá reutilizar partes do projeto;
- quais credenciais, contas e dados serão transferidos;
- se instalação, publicação e migração de dados estão incluídas;
- prazo de correção de defeitos e limites do suporte;
- critérios objetivos de aceite;
- responsabilidade pelos custos dos serviços externos;
- responsabilidade por conteúdo, direitos autorais e tratamento de dados;
- relação completa das dependências de código aberto e suas licenças.

O pacote do backend está marcado como `UNLICENSED`, e o repositório não apresenta uma licença geral de uso na raiz. Isso não impede uma negociação, mas torna essencial formalizar a cessão ou licença no contrato.

---

# Parte B — para comprador técnico, desenvolvedor ou equipe de TI

## 11. Arquitetura

```text
Navegador
  └─ Angular 19 + Ionic 8
       └─ HTTP/stream com credenciais
            └─ API NestJS 11 (prefixo /api)
                 ├─ PostgreSQL 17 + pgvector
                 ├─ MinIO / API compatível com S3
                 ├─ Groq
                 ├─ YouTube Data API
                 ├─ Spotify Web API
                 ├─ Cloudflare Workers AI
                 └─ workers locais de análise e separação de áudio
```

### Frontend

- Angular 19, Ionic 8, TypeScript 5.7, RxJS e SCSS.
- Estrutura baseada em módulo Angular tradicional, componentes e serviços HTTP.
- URL local da API: `http://localhost:3002/api`.
- Em build de produção, a URL configurada é relativa: `/api`.
- A autenticação usa cookie e requer requisições com credenciais.
- Não há script de testes automatizados do frontend no `package.json` atual.

### Backend

- NestJS 11, TypeScript 5.9 e Node.js 22 ou superior.
- TypeORM com migrações versionadas; `synchronize` não deve ser usado como substituto das migrações.
- PostgreSQL armazena dados de negócio, auditoria, quotas e vetores.
- MinIO é usado localmente; a camada de armazenamento aceita serviço compatível com S3.
- Processos em segundo plano tratam análise de áudio, retenção e separação de stems.
- O bootstrap aplica `helmet`, CORS por lista permitida, validação de DTOs, filtro uniforme de erros e rate limiting persistido.

## 12. Módulos do backend

| Módulo | Responsabilidade |
|---|---|
| `auth` | Cadastro, login, sessão, logout e desativação |
| `projects` | Projetos, conversas e mensagens |
| `ai` | Chat por IA, streaming, memória e provedor Groq |
| `ai-tools` | Ferramentas internas permitidas e auditoria de execução |
| `briefings` | Geração, edição, versões e confirmação |
| `references` | YouTube, Spotify, links, curadoria e seleção |
| `library` | Upload, armazenamento, análise e busca de áudios |
| `stem-separation` | Fila e separação de voz/instrumental |
| `moodboards` | Geração, versões e PDF |
| `final-works` | Registro versionado da obra final |
| `privacy` | Consumo, exportação, perfil, consentimento e exclusão |
| `evaluation` | Avaliação acadêmica e dados para relatório |
| `health` | Verificação simples de disponibilidade da API |

## 13. Modelo de dados em alto nível

O núcleo relacional segue esta lógica:

```text
Usuário
  ├─ Sessões
  ├─ Projetos
  │    ├─ Conversas → Mensagens
  │    ├─ Briefings versionados
  │    ├─ Referências e seleção final
  │    ├─ Moodboards versionados
  │    ├─ Separações e stems
  │    ├─ Obras finais
  │    └─ Avaliação
  └─ Biblioteca privada de faixas
       └─ Jobs de análise e embeddings
```

Há também tabelas operacionais para chamadas de ferramentas da IA, caches, quotas e rate limiting. O isolamento é feito pelo identificador do proprietário obtido da sessão autenticada.

## 14. Principais grupos de API

Todas as rotas abaixo usam o prefixo `/api`.

| Grupo | Exemplos | Autenticação |
|---|---|---|
| Saúde | `GET /health` | Não |
| Conta | `POST /auth/register`, `POST /auth/login` | Não |
| Sessão | `GET /auth/me`, `POST /auth/logout` | Sim |
| Projetos | `/projects` | Sim |
| Conversas | `/projects/:projectId/conversations` | Sim |
| IA | `.../assistant/stream` | Sim |
| Briefings | `/projects/:projectId/briefings` | Sim |
| Referências | `/projects/:projectId/references` | Sim |
| Moodboards | `/projects/:projectId/moodboards` | Sim |
| Obras finais | `/projects/:projectId/final-works` | Sim |
| Biblioteca | `/library/tracks` | Sim |
| Privacidade | `/privacy` | Sim |
| Avaliação | `/projects/:projectId/evaluation` | Sim |

O detalhamento de verbos, corpos e respostas deve ser consultado nos controllers e DTOs. No estado atual não foi identificada uma especificação OpenAPI/Swagger publicada; gerar essa especificação seria uma melhoria recomendada para integrações futuras.

## 15. Execução local

### Pré-requisitos

- Windows, Linux ou macOS com ambiente compatível;
- Node.js 22+;
- npm para o frontend;
- pnpm 11.19.0 para o backend;
- Docker Desktop ou Docker Engine com Compose;
- Git;
- Python e dependências adicionais somente para separação de stems.

### Instalação

Na raiz:

```powershell
npm ci
Copy-Item backend/.env.example backend/.env
corepack pnpm --dir backend install --frozen-lockfile
docker compose -f backend/compose.yaml up -d postgres minio
corepack pnpm --dir backend db:migration:run
```

Preencha em `backend/.env` pelo menos `GROQ_API_KEY` para usar a IA. YouTube, Spotify e Cloudflare são integrações opcionais no ambiente de desenvolvimento.

### Inicialização

Terminal 1:

```powershell
corepack pnpm --dir backend start:dev
```

Terminal 2:

```powershell
npm start
```

Endereços padrão:

- interface: `http://localhost:4200`;
- API: `http://localhost:3002/api`;
- saúde: `http://localhost:3002/api/health`;
- console local do MinIO: `http://localhost:9001`.

Use o mesmo nome de host para interface e API (`localhost`, por exemplo). Misturar `localhost` e `127.0.0.1` pode impedir o envio correto do cookie.

## 16. Variáveis de ambiente

O arquivo de referência é `backend/.env.example`. Principais grupos:

| Grupo | Variáveis principais |
|---|---|
| Aplicação | `NODE_ENV`, `PORT`, `CORS_ORIGINS` |
| Banco | `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` |
| Sessão e limites | `SESSION_TTL_DAYS`, `RATE_LIMIT_PER_MINUTE` e limites específicos |
| IA | `GROQ_API_KEY`, `GROQ_MODEL`, timeouts, tokens e quotas |
| YouTube | `YOUTUBE_API_KEY` e limites locais |
| Spotify | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_MARKET` |
| Arquivos | `STORAGE_*`, `AUDIO_MAX_FILE_SIZE_BYTES` |
| Busca semântica | `CLOUDFLARE_*` |
| Workers | `AUDIO_ANALYSIS_*`, `STEM_SEPARATOR_*` |

Em produção, a validação exige senha forte do banco, credenciais de armazenamento e chaves dos provedores principais. `EXTERNAL_BILLING_ALLOWED` deve permanecer `false`; a aplicação foi desenhada para bloquear inicialização quando esse controle permite cobrança externa sem limite.

Nunca versionar `backend/.env` nem inserir segredos no Angular.

## 17. Comandos de desenvolvimento e verificação

### Frontend

```powershell
npm start
npm run build
```

### Backend

```powershell
corepack pnpm --dir backend start:dev
corepack pnpm --dir backend build
corepack pnpm --dir backend test
corepack pnpm --dir backend test:e2e
corepack pnpm --dir backend test:cov
corepack pnpm --dir backend db:migration:show
corepack pnpm --dir backend db:migration:run
corepack pnpm --dir backend evaluation:report
corepack pnpm --dir backend stems:smoke
```

Os testes unitários usam Jest. Os testes E2E dependem de serviços e configuração de teste; consulte `backend/test/setup-e2e.ts` antes de executá-los em uma máquina nova.

### Verificação desta revisão

Em 09/09/2026, na cópia analisada:

- o build de produção do frontend foi concluído;
- o build do backend foi concluído;
- as 25 suítes unitárias do backend foram aprovadas, totalizando 111 testes;
- os testes E2E não fizeram parte desta verificação, pois exigem a infraestrutura de teste ativa.

Esse resultado descreve a revisão indicada no início do documento e deve ser revalidado depois de qualquer alteração no código ou nas dependências.

## 18. Segurança implementada

- token de sessão armazenado como hash;
- cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
- CORS com origens explícitas;
- rejeição de operações mutáveis vindas de origem externa;
- cabeçalhos de segurança com Helmet;
- validação global com descarte e rejeição de campos inesperados;
- rate limiting por categoria, compartilhado no PostgreSQL;
- validação de extensão, MIME, assinatura, parser, tamanho e hash de áudio;
- bucket privado e URLs assinadas com validade curta;
- escopo por usuário aplicado nas consultas;
- allowlist e limite para ferramentas chamadas pela IA;
- limites locais de consumo para Groq, YouTube e Cloudflare;
- logs sem cookies, credenciais, prompts, nomes de arquivo ou query strings;
- exclusão em cascata e limpeza de objetos privados na remoção da conta.

## 19. Pontos para produção

Antes de um lançamento comercial, recomenda-se tratar como obrigatório:

1. definir arquitetura de hospedagem, capacidade e escalabilidade;
2. criar imagens/serviços de deploy do frontend e backend;
3. configurar HTTPS e proxy reverso;
4. usar gerenciador de segredos, nunca `.env` distribuído manualmente;
5. configurar backups criptografados e testar a restauração;
6. implantar logs centralizados, métricas, alertas e rastreamento de falhas;
7. executar testes unitários, E2E, carga, segurança e recuperação;
8. criar pipeline de integração e entrega contínua;
9. fixar e revisar imagens Docker, evitando depender de tags mutáveis como `latest`;
10. definir política de atualização das dependências;
11. adicionar recuperação de conta e fluxos operacionais de suporte;
12. revisar acessibilidade e compatibilidade entre navegadores e celulares;
13. publicar termos, aviso de privacidade e canal LGPD;
14. revisar licenças e direitos autorais do código e das dependências;
15. documentar resposta a incidentes e continuidade de negócio.

O `compose.yaml` atual sobe PostgreSQL e MinIO para desenvolvimento. Ele não representa sozinho uma arquitetura completa de produção.

## 20. Estrutura do repositório

```text
TCC---Eclipse/
├─ src/                       # frontend Angular/Ionic
│  ├─ app/components/        # telas e painéis
│  ├─ app/services/          # chamadas à API e estado
│  ├─ app/models/            # contratos usados pela interface
│  └─ environments/          # URL da API por ambiente
├─ backend/
│  ├─ src/                   # API e regras de negócio
│  ├─ src/database/migrations/ # evolução versionada do banco
│  ├─ test/                  # testes de integração
│  ├─ evaluation/            # protocolo e relatório acadêmico
│  ├─ scripts/               # utilitários de áudio
│  └─ compose.yaml           # PostgreSQL e MinIO locais
├─ docs/                      # documentação do produto
├─ package.json               # comandos/dependências do frontend
└─ README.md                  # apresentação rápida
```

## 21. Manutenção recomendada

### Em toda alteração

- manter DTOs, modelos do frontend e respostas da API compatíveis;
- criar migração para toda mudança de banco;
- preservar o filtro por proprietário em toda consulta;
- adicionar ou atualizar testes da regra alterada;
- verificar `npm run build` e `pnpm --dir backend build`;
- executar a suíte do backend;
- registrar novas variáveis em `.env.example`, sem valores secretos;
- atualizar a documentação funcional.

### Periodicamente

- atualizar dependências depois de revisar notas de versão;
- revisar vulnerabilidades conhecidas;
- testar restauração de backup;
- revisar consumo e limites das APIs;
- limpar dados conforme a política de retenção;
- conferir disponibilidade e mudanças contratuais dos provedores;
- revalidar o fluxo principal em navegador desktop e mobile.

## 22. Critérios sugeridos de aceite da compra

Uma aceitação técnica objetiva pode exigir:

- repositório completo entregue e histórico Git acessível;
- dependências instaladas a partir dos arquivos de lock;
- frontend e backend compilando sem erro;
- migrações aplicadas em banco vazio;
- testes automatizados aprovados;
- cadastro, login e logout funcionando;
- criação de projeto, chat, briefing, referências e moodboard demonstrados;
- upload, reprodução e exclusão de MP3/WAV demonstrados;
- exportação de moodboard em PDF demonstrada;
- exportação de dados e exclusão de conta demonstradas;
- lista de credenciais externas necessárias entregue sem expor segredos em Git;
- backup e restauração demonstrados, se fizerem parte do contrato;
- direitos de uso/cessão formalizados no instrumento de compra.

## 23. Glossário curto

| Termo | Significado |
|---|---|
| API | Parte do sistema que recebe pedidos da tela e executa as regras |
| Backend | Servidor, regras de negócio e acesso aos dados |
| Frontend | Interface usada no navegador |
| Banco de dados | Local estruturado para guardar contas, projetos e histórico |
| Bucket | Espaço privado onde ficam os arquivos de áudio |
| Cookie de sessão | Identifica uma conta autenticada sem expor a senha a cada acesso |
| Deploy | Processo de publicar uma versão em um servidor |
| Embedding | Representação numérica de texto usada na busca por significado |
| Migração | Alteração versionada da estrutura do banco |
| Moodboard | Documento de direção criativa e referências |
| MVP | Versão funcional criada para validar a proposta antes de uma operação completa |
| Rate limiting | Limite de requisições para reduzir abuso e custos |
| Stem | Parte separada de um áudio, como voz ou instrumental |

## 24. Documentos relacionados

- `README.md`: apresentação e comandos rápidos;
- `docs/sobre-o-projeto.md`: visão geral curta;
- `docs/como-rodar-localmente.md`: guia para instalar em outro computador;
- `docs/seguranca-privacidade-homologacao.md`: controles, retenção e pendências institucionais;
- `docs/escopo-mvp.md`: escopo e critérios do protótipo;
- `backend/README.md`: referência detalhada do backend e integrações;
- `backend/evaluation/README.md`: protocolo de avaliação acadêmica.

---

## Conclusão

O Eclipse entrega uma base técnica consistente para validar e continuar desenvolvendo um assistente de criação musical. Para um comprador leigo, o ponto central é entender que a plataforma organiza decisões criativas, mas depende de operação técnica e serviços externos. Para uma equipe técnica, o projeto oferece separação clara entre interface, API, persistência e armazenamento, com migrações e testes no backend, mas ainda requer um ciclo formal de produção, observabilidade, continuidade e governança.
