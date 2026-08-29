# Eclipse - Plano de Implementação Etapa a Etapa

**Versão:** 1.0  
**Data:** 25 de agosto de 2026  
**Referência de escopo:** [Escopo do MVP](./escopo-mvp.md)  
**Arquitetura de IA:** Groq + Qwen 3.6 27B para chat e raciocínio; Cloudflare Workers AI + Qwen3 Embedding 0.6B para busca semântica.

## 1. Como usar este plano

As etapas devem ser executadas na ordem apresentada porque cada uma prepara dados ou infraestrutura para a seguinte. Uma etapa somente avança para `concluída` quando seu critério de aceite tiver sido verificado.

Estados sugeridos:

- `não iniciada`;
- `em desenvolvimento`;
- `em validação`;
- `concluída`;
- `bloqueada`.

Nenhuma chave real deve ser incluída no repositório. Credenciais serão configuradas por variáveis de ambiente e documentadas apenas por nomes de exemplo.

## 2. Visão geral do processo

```text
Escopo
  -> Backend
  -> Banco e autenticação
  -> Projetos e conversas
  -> Integração do Angular
  -> IA pela Groq
  -> Briefing estruturado
  -> YouTube e Spotify
  -> Biblioteca musical
  -> Análise de áudio
  -> Embeddings pela Cloudflare
  -> Curadoria
  -> Moodboard e PDF
  -> Assistente com memória
  -> Obra final
  -> Segurança, testes e deploy
```

## Etapa 1 - Definir o escopo do MVP

**Status atual:** concluída.

### Objetivo

Registrar o que será entregue, o que será opcional e o que ficará fora da primeira versão.

### Atividades

1. Definir público-alvo e problema central.
2. Descrever o fluxo principal do usuário.
3. Registrar requisitos funcionais e não funcionais.
4. Definir critérios de aceite e métricas acadêmicas.
5. Escolher a arquitetura inicial.
6. Separar integrações obrigatórias das futuras.

### Entregável

Documento `docs/escopo-mvp.md` aprovado.

### Critério de conclusão

Equipe consegue explicar em uma frase o que o MVP entrega e identificar claramente o que não será implementado agora.

## Etapa 2 - Preparar a fundação do backend

**Status atual:** concluída em 25 de agosto de 2026.

### Objetivo

Criar a aplicação servidor que receberá o frontend, protegerá credenciais e concentrará as regras de negócio.

### Atividades

1. Criar o backend em Node.js, TypeScript e NestJS.
2. Separar configurações de desenvolvimento, teste e homologação.
3. Definir validação central de variáveis de ambiente.
4. Configurar tratamento global de erros.
5. Configurar validação das entradas da API.
6. Criar endpoint de saúde.
7. Configurar logs sem dados sensíveis.
8. Definir política de CORS para o Angular.
9. Adicionar scripts de execução, teste e build.
10. Documentar como iniciar frontend e backend.

### Entregável

Backend executando localmente e respondendo a uma verificação de saúde.

### Critério de conclusão

O frontend consegue consultar o endpoint de saúde e falhas de configuração impedem o backend de iniciar com uma mensagem clara.

### Verificação realizada

- build de produção concluído;
- 4 testes unitários aprovados;
- 3 testes de integração aprovados;
- endpoint `GET /api/health` verificado com a aplicação em execução;
- configuração de porta inválida verificada, impedindo corretamente a inicialização;
- banco de dados e autenticação não foram antecipados.

## Etapa 3 - Configurar banco de dados e autenticação

**Status atual:** concluída em 25 de agosto de 2026.

### Objetivo

Persistir dados no servidor e garantir que cada usuário acesse somente seu conteúdo.

### Atividades

1. Configurar PostgreSQL.
2. Escolher e configurar a camada de acesso ao banco.
3. Criar migrações versionadas.
4. Criar entidades de usuário e sessão.
5. Implementar cadastro, login e logout.
6. Armazenar senhas com hash seguro.
7. Proteger rotas autenticadas.
8. Implementar recuperação da identidade a partir da sessão.
9. Criar testes de acesso autorizado e negado.
10. Definir exclusão ou desativação de conta.

### Entregável

API autenticada com usuários persistidos no PostgreSQL.

### Critério de conclusão

Dois usuários distintos não conseguem acessar ou alterar os dados um do outro.

### Verificação realizada

- PostgreSQL 17 criado com Docker Compose e volume persistente;
- bancos `eclipse` e `eclipse_test` disponíveis;
- TypeORM configurado com sincronização automática desativada;
- migração inicial aplicada com tabelas de usuários e sessões;
- senhas protegidas com `scrypt` e salt aleatório;
- tokens de sessão aleatórios, armazenados no banco somente como hash SHA-256;
- cookies `HttpOnly` e `SameSite=Lax` verificados;
- cadastro, login, recuperação de sessão, logout e desativação testados;
- todas as sessões são revogadas ao desativar a conta;
- 7 testes unitários e 7 testes de integração aprovados.

## Etapa 4 - Persistir projetos, conversas e mensagens

**Status atual:** concluída em 25 de agosto de 2026.

### Objetivo

Transferir o histórico atualmente local para uma estrutura oficial no servidor.

### Atividades

1. Criar entidades de projeto, conversa e mensagem.
2. Usar identificadores UUID gerados no backend.
3. Criar operações de criação, listagem, edição e arquivamento de projeto.
4. Criar operações de abertura e listagem de conversas.
5. Salvar mensagens de usuário e assistente.
6. Registrar datas de criação e atualização.
7. Definir paginação do histórico.
8. Definir exclusão lógica quando for necessário preservar histórico acadêmico.
9. Criar testes das regras de propriedade.

### Entregável

Projetos e conversas disponíveis pela API, ainda sem resposta real de IA.

### Critério de conclusão

O histórico permanece disponível após reiniciar o backend e não depende do `localStorage`.

### Verificação realizada

- tabelas `projects`, `conversations` e `messages` criadas por migração versionada;
- identificadores UUID gerados pelo PostgreSQL;
- criação, consulta, edição e arquivamento lógico de projetos disponíveis pela API;
- criação e consulta paginada de conversas e mensagens;
- mensagens com papéis `user` e `assistant` persistidas, ainda sem geração por IA;
- datas de criação e atualização registradas pelo banco;
- páginas limitadas a 100 registros e metadados de paginação devolvidos pela API;
- projetos arquivados preservam o histórico, mas não aceitam novas conversas ou mensagens;
- rotas protegidas pela sessão e consultas filtradas pelo proprietário;
- tentativa de acesso com um segundo usuário verificada com resposta `404`;
- 7 testes unitários, 12 testes de integração e build de produção aprovados.

## Etapa 5 - Conectar o Angular ao backend

**Status atual:** concluída em 26 de agosto de 2026.

### Objetivo

Adaptar o protótipo atual para usar os dados e operações da API.

### Atividades

1. Configurar o endereço da API por ambiente.
2. Adicionar cliente HTTP ao Angular.
3. Criar serviços de autenticação, projetos e conversas.
4. Substituir a persistência principal no `localStorage` por chamadas ao backend.
5. Manter cache local apenas se ele não substituir a fonte oficial.
6. Adaptar IDs numéricos para UUIDs.
7. Implementar estados de carregamento, vazio e erro.
8. Preservar a responsividade existente.
9. Impedir envios duplicados.
10. Criar fluxo de repetição após falha.

### Entregável

Interface atual operando integralmente sobre o backend.

### Critério de conclusão

Usuário entra, cria projeto, envia mensagem, atualiza a página e recupera o mesmo histórico.

### Verificação realizada

- endereço da API separado por ambiente Angular: `localhost:3002` no desenvolvimento e `/api` na produção;
- cliente HTTP configurado para enviar o cookie de sessão em todas as chamadas autenticadas;
- tela de cadastro, login e logout integrada à API;
- serviços separados para autenticação, projetos, conversas e mensagens;
- IDs locais numéricos substituídos por UUIDs do backend;
- criação de chat convertida em projeto, conversa principal e primeira mensagem persistidos;
- listagem, renomeação e arquivamento da barra lateral executados no PostgreSQL;
- mensagens recuperadas do servidor em ordem cronológica após atualizar a página;
- estados de carregamento, falha de conexão e sessão inválida exibidos na interface;
- formulário bloqueado durante o envio para impedir mensagens duplicadas;
- texto mantido no campo quando uma mensagem falha, permitindo tentar novamente;
- `localStorage` removido como fonte de dados do chat;
- build Angular de desenvolvimento e produção aprovado;
- tela de autenticação verificada no navegador sem erros de console;
- 7 testes unitários e 12 testes de integração do backend continuam aprovados.

## Etapa 6 - Integrar a IA principal pela Groq

**Status atual:** concluída em 26 de agosto de 2026.

### Objetivo

Fazer a Eclipse responder usando o Qwen 3.6 27B sem expor a chave da Groq.

### Atividades

1. Criar conta e chave gratuita da Groq.
2. Adicionar `GROQ_API_KEY` somente ao ambiente do backend.
3. Configurar o modelo padrão como `qwen/qwen3.6-27b`.
4. Criar uma interface interna de provedor de IA.
5. Implementar adaptador da Groq.
6. Definir instruções centrais da personalidade e dos limites da Eclipse.
7. Enviar somente o contexto necessário da conversa.
8. Implementar streaming da resposta por SSE.
9. Salvar a mensagem final do assistente.
10. Tratar timeout, falha de rede e erro `429`.
11. Registrar tokens, latência e modelo utilizado.
12. Manter o modelo configurável por variável de ambiente.

### Entregável

Chat real com respostas progressivas do Qwen.

### Critério de conclusão

A resposta aparece por streaming, é persistida corretamente e uma falha da Groq não apaga a mensagem do usuário.

### Implementação e verificação realizadas

- modelo `qwen/qwen3.6-27b` confirmado na documentação oficial da Groq, atualmente classificado como Preview;
- interface interna de provedor criada para evitar dependência direta das regras de chat com a Groq;
- adaptador Groq implementado sobre HTTPS, com chave disponível somente no backend;
- personalidade musical central da Eclipse definida em português do Brasil;
- contexto limitado às 20 mensagens finais por padrão e configurável por ambiente;
- raciocínio interno ocultado e limite de resposta configurável;
- resposta transmitida do backend ao Angular por Server-Sent Events;
- mensagem do usuário persistida antes da chamada externa;
- mensagem final da assistente persistida somente após o streaming terminar corretamente;
- provedor, modelo, tokens de entrada, tokens de saída e latência registrados na mensagem da assistente;
- timeout, falta de chave, resposta inválida, indisponibilidade e erro `429` tratados com mensagens seguras;
- repetição da resposta implementada sem duplicar a mensagem do usuário;
- envio direto de mensagens com papel `assistant` bloqueado para o cliente;
- 14 testes unitários e 14 testes de integração aprovados usando provedor simulado;
- migração de metadados da IA aplicada e esquema do banco verificado;
- build de desenvolvimento do Angular e build do backend aprovados.

### Validação real realizada

Uma conversa real foi executada pela interface com a chave configurada somente no `backend/.env`. A resposta do Qwen foi recebida, exibida e persistida. A renderização de Markdown e a cópia do texto das mensagens também foram verificadas na interface.

Referências oficiais consultadas:

- [Qwen 3.6 27B na Groq](https://console.groq.com/docs/model/qwen/qwen3.6-27b);
- [Streaming de texto](https://console.groq.com/docs/text-chat);
- [Limites gratuitos](https://console.groq.com/docs/rate-limits).

## Etapa 7 - Implementar o briefing estruturado

**Status atual:** concluída em 28 de agosto de 2026.

### Objetivo

Transformar a descrição livre do usuário em dados editáveis e verificáveis.

### Atividades

1. Definir o esquema do briefing.
2. Pedir à IA uma resposta JSON compatível com o esquema.
3. Validar o JSON no backend.
4. Repetir a geração de forma limitada quando a resposta for inválida.
5. Identificar campos ausentes ou incertos.
6. Permitir que a IA faça perguntas complementares.
7. Criar interface de revisão e edição.
8. Exigir confirmação explícita do usuário.
9. Versionar alterações importantes do briefing.
10. Bloquear a pesquisa enquanto o briefing não estiver confirmado.

### Entregável

Briefing estruturado, editável, validado e salvo.

### Critério de conclusão

Um briefing livre é convertido para o formato definido sem campos inventados e somente avança após confirmação.

### Implementação e verificação realizadas

- esquema definido com objetivo, tema, narrativa, emoções, gêneros, clima, instrumentação, andamento, público, referências, restrições e observações;
- campos ausentes, incertezas e perguntas complementares mantidos separadamente;
- Qwen configurado no modo de objeto JSON da Groq, compatível com o modelo escolhido;
- validação rígida no backend rejeita propriedades desconhecidas, tipos incorretos e identificadores de campos inexistentes;
- geração repetida no máximo duas vezes quando o JSON não respeita o esquema;
- briefing salvo em tabela própria com versão, estado, conversa de origem, modelo, provedor e tokens;
- edições criam novas versões e não sobrescrevem o histórico anterior;
- controle de versão impede edição ou confirmação desatualizada;
- confirmação explícita separada do salvamento;
- regra interna `requireConfirmedBriefing` preparada para bloquear as pesquisas das próximas etapas;
- painel Angular permite gerar, revisar, editar, atualizar pela conversa e confirmar;
- perguntas complementares ficam visíveis para o usuário responder no chat antes de uma nova geração;
- migração `StructuredBriefings1787788800000` aplicada ao PostgreSQL de desenvolvimento;
- 18 testes unitários em 6 conjuntos, 15 testes de integração, build do backend e build Angular aprovados.

### Validação real realizada

O briefing foi gerado, revisado e confirmado pela interface com a Groq configurada somente no backend.

Referência oficial consultada:

- [JSON Object Mode e Structured Outputs da Groq](https://console.groq.com/docs/structured-outputs).

## Etapa 8 - Criar o sistema de ferramentas da IA

**Status atual:** concluída em 28 de agosto de 2026.

### Objetivo

Permitir que o Qwen peça operações controladas ao backend sem ter acesso direto a bancos ou credenciais.

### Atividades

1. Definir ferramentas com nomes, descrições e esquemas de parâmetros.
2. Implementar inicialmente ferramentas de busca e leitura do projeto.
3. Validar argumentos de toda chamada.
4. Verificar autenticação e propriedade dentro de cada ferramenta.
5. Limitar quantidade de chamadas por resposta.
6. Registrar ferramenta, resultado, duração e falha.
7. Devolver resultados compactos ao modelo.
8. Impedir que conteúdo externo altere as instruções centrais da Eclipse.
9. Criar testes para chamadas válidas, inválidas e não autorizadas.

### Entregável

Orquestrador capaz de executar ferramentas solicitadas pela IA.

### Critério de conclusão

A IA consegue consultar dados permitidos, mas não consegue executar uma ferramenta inexistente ou acessar outro usuário.

### Implementação e verificação realizadas

- contratos de ferramentas definidos no formato de function calling aceito pela Groq;
- ferramentas `read_project_summary`, `read_confirmed_briefing` e `search_project_messages` implementadas;
- IDs de usuário, projeto e conversa derivados exclusivamente da sessão e da rota, sem controle pelo modelo;
- argumentos analisados como JSON e validados contra propriedades, tipos, tamanhos e limites permitidos;
- ferramentas inexistentes e argumentos desconhecidos rejeitados sem execução;
- resultados limitados e compactados antes de retornar ao Qwen;
- resultados e histórico marcados como conteúdo não confiável nas instruções centrais, protegendo contra instruções maliciosas armazenadas;
- ciclo local de orquestração integrado ao streaming, permitindo novas chamadas até a resposta final;
- limite configurável de quatro ferramentas por resposta;
- tokens acumulados entre todas as rodadas do modelo;
- auditoria persistida em `ai_tool_executions` com ferramenta, estado, duração e código de falha, sem copiar argumentos ou resultados;
- migração `AiToolExecutions1787961600000` aplicada ao PostgreSQL de desenvolvimento;
- 25 testes unitários em 7 conjuntos, 16 testes de integração e build do backend aprovados.

### Validação real realizada

O Qwen consultou dados internos pela interface e o terminal confirmou a execução controlada da ferramenta no projeto correto.

Referências oficiais consultadas:

- [Qwen 3.6 27B e suporte a Tool Use](https://console.groq.com/docs/model/qwen/qwen3.6-27b);
- [Local Tool Calling da Groq](https://console.groq.com/docs/tool-use/local-tool-calling).

## Etapa 9 - Integrar a pesquisa no YouTube

**Status atual:** em validação; implementação concluída em 28 de agosto de 2026 e aguardando uma chave pessoal da YouTube Data API.

### Objetivo

Obter referências musicais reais com base no briefing confirmado.

### Atividades

1. Criar projeto no Google Cloud.
2. Habilitar YouTube Data API.
3. Guardar a chave somente no backend.
4. Criar termos de pesquisa a partir do briefing.
5. Implementar o conector da API.
6. Normalizar títulos, canais, miniaturas, duração e links.
7. Remover duplicatas.
8. Filtrar vídeos que não podem ser incorporados quando aplicável.
9. Implementar cache.
10. Monitorar quota.
11. Criar cards de referência no Angular.
12. Permitir aprovar e rejeitar resultados.

### Entregável

Lista de referências reais do YouTube vinculadas ao projeto.

### Critério de conclusão

O usuário recebe resultados reproduzíveis, com origem e link válidos, sem dados inventados pela IA.

### Implementação e verificação realizadas

- conector HTTPS da YouTube Data API v3 implementado sem expor a chave ao Angular;
- termos de pesquisa criados deterministicamente a partir do briefing confirmado;
- pesquisa bloqueada para projeto arquivado, briefing ausente ou briefing ainda não confirmado;
- busca limitada a vídeos da categoria musical e que permitem incorporação;
- detalhes normalizados com ID, título, canal, miniatura, duração, link e disponibilidade;
- vídeos privados, não processados ou não incorporáveis removidos antes da persistência;
- referências deduplicadas por projeto, fonte e ID externo;
- cache persistente de 24 horas por consulta normalizada;
- controle diário separado para chamadas de pesquisa e quota geral, usando o fuso de renovação do Google;
- margens locais configuradas em 90 pesquisas e 9.000 unidades gerais;
- decisões pendente, aprovada e rejeitada preservadas quando uma busca é repetida;
- rotas autenticadas verificam propriedade do projeto e da referência;
- painel Angular criado com miniatura, título, canal, duração, link e botões de aprovação ou rejeição;
- migração `YoutubeReferences1788048000000` aplicada ao PostgreSQL de desenvolvimento;
- 27 testes unitários em 8 conjuntos, 17 testes de integração, build do backend e build Angular aprovados.

### Validação pendente

Criar uma chave da YouTube Data API v3, adicionar `YOUTUBE_API_KEY` ao `backend/.env`, reiniciar o backend e pesquisar em **Referências** dentro de um projeto com briefing confirmado.

Referências oficiais consultadas:

- [Visão geral e quota da YouTube Data API](https://developers.google.com/youtube/v3/getting-started);
- [`search.list`](https://developers.google.com/youtube/v3/docs/search/list);
- [recurso e status de vídeos](https://developers.google.com/youtube/v3/docs/videos);
- [calculadora de quota](https://developers.google.com/youtube/v3/determine_quota_cost).

## Etapa 10 - Adicionar referências do Spotify por link

**Status atual:** em validação; implementação concluída em 28 de agosto de 2026 e aguardando credenciais pessoais do Spotify.

### Objetivo

Permitir referências do Spotify sem depender de busca avançada ou análise depreciada da plataforma.

### Atividades

1. Criar aplicativo no painel do Spotify.
2. Implementar autenticação necessária no backend.
3. Validar links de faixa.
4. Extrair o identificador da faixa.
5. Consultar somente metadados permitidos.
6. Normalizar título, artista, álbum, imagem, duração e link.
7. Registrar a origem Spotify.
8. Não enviar áudio ou conteúdo do Spotify aos modelos de IA.
9. Tratar faixas removidas, privadas ou indisponíveis.

### Entregável

Referências do Spotify adicionadas manualmente à mesma curadoria do projeto.

### Critério de conclusão

Um link válido é registrado com metadados reais e um link inválido produz mensagem compreensível.

### Implementação e verificação realizadas

- fluxo Client Credentials implementado exclusivamente no backend, com token reutilizado até perto do vencimento;
- Client ID e Client Secret configuráveis somente por variáveis de ambiente;
- aceitos apenas links HTTPS de faixa no domínio `open.spotify.com`, incluindo o prefixo localizado `intl-pt`;
- links de álbum, playlist, artista, outros domínios e IDs fora do formato oficial são rejeitados antes da chamada externa;
- consulta limitada ao endpoint de faixa e ao mercado brasileiro configurável;
- título, artistas, álbum, capa original, duração e link oficial normalizados;
- faixas ausentes, restritas ou indisponíveis no mercado tratado retornam mensagens compreensíveis;
- origem Spotify adicionada ao mesmo modelo de curadoria, preservando decisões ao repetir o mesmo link;
- nenhuma URL de prévia, arquivo de áudio ou conteúdo do Spotify é persistido ou enviado à IA;
- formulário Angular adicionado ao painel de referências, com cards identificados visualmente como Spotify;
- migração `SpotifyReferences1788134400000` aplicada ao PostgreSQL de desenvolvimento;
- 10 testes unitários das integrações, 18 testes de integração, build do backend e build Angular aprovados.

### Validação pendente

Criar um aplicativo no Spotify for Developers, adicionar `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET` ao `backend/.env`, reiniciar o backend e incluir uma faixa real pelo painel **Referências**. Aplicativos novos operam em modo de desenvolvimento e estão sujeitos às regras atuais de conta, usuários permitidos e quota do Spotify.

Referências oficiais consultadas:

- [Client Credentials Flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow);
- [Get Track](https://developer.spotify.com/documentation/web-api/reference/get-track);
- [modos e limites de quota](https://developer.spotify.com/documentation/web-api/concepts/quota-modes);
- [limites de requisição](https://developer.spotify.com/documentation/web-api/concepts/rate-limits).

## Etapa 11 - Criar a biblioteca musical e o armazenamento

**Status atual:** concluída em 29 de agosto de 2026.

### Objetivo

Permitir que o usuário mantenha um acervo próprio, privado e pesquisável.

### Atividades

1. Configurar armazenamento S3 compatível ou MinIO.
2. Criar entidade de faixa musical.
3. Implementar autorização de upload.
4. Enviar arquivos grandes diretamente ao armazenamento por URL temporária.
5. Aceitar inicialmente MP3 e WAV.
6. Validar tipo, tamanho e extensão.
7. Salvar título, artista e observações.
8. Criar estados de upload e processamento.
9. Disponibilizar reprodução por URL temporária.
10. Permitir exclusão pelo proprietário.
11. Remover arquivos órfãos quando uma operação falhar.
12. Impedir que o mesmo conteúdo seja salvo mais de uma vez no acervo do usuário.

### Entregável

Biblioteca privada com upload, listagem, reprodução e exclusão.

### Critério de conclusão

O usuário envia e reproduz um arquivo próprio, enquanto outro usuário não consegue acessar sua URL.

### Implementação e verificação realizadas

- MinIO local adicionado ao Docker Compose com volume persistente e API S3 compatível;
- configuração desacoplada por endpoint, região, bucket, credenciais e estilo de caminho, permitindo trocar o MinIO por outro S3 compatível;
- entidade privada de faixa criada com proprietário, metadados, arquivo, tamanho, estado, falha e prazos;
- upload direto pelo Angular por URL `PUT` pré-assinada de 15 minutos;
- MP3 e WAV limitados a 50 MB, com validação de extensão e tipo antes do envio;
- tamanho real e assinatura binária `ID3`/quadro MPEG ou `RIFF/WAVE` conferidos no armazenamento antes da liberação; para MP3, a busca percorre até os primeiros 64 KiB e tolera metadados ou bytes auxiliares antes do primeiro quadro;
- conteúdo identificado por SHA-256 e protegido por índice único por proprietário, impedindo cópias com o mesmo ou com outro nome;
- uma cópia repetida é removida do MinIO e do banco e devolve `409 Conflict`; uma nova tentativa de um envio que falhou remove o registro de falha equivalente anterior;
- arquivos inválidos removidos do armazenamento e marcados como falha;
- reservas expiradas limpas de forma controlada para evitar objetos órfãos;
- listagem, reprodução por URL temporária e exclusão de registro e arquivo implementadas;
- chaves internas dos objetos omitidas das respostas da API;
- todas as consultas filtradas pelo usuário autenticado, devolvendo `404` para outro proprietário;
- painel **Biblioteca** criado com arquivo, título, artista, observações, estados, player e exclusão confirmada;
- migrações `MusicLibrary1788220800000` e `LibraryContentHash1788307200000` aplicadas ao PostgreSQL de desenvolvimento;
- 5 testes unitários específicos e 19 testes integrados aprovados;
- builds de produção do NestJS e do Angular aprovados;
- upload real validado no MinIO: arquivo com assinatura MP3 enviado e confirmado como `ready`; uma segunda cópia foi recusada com `409`, mantendo somente uma faixa, e o arquivo de teste foi apagado ao final.

Referências oficiais consultadas:

- [URLs pré-assinadas com AWS SDK para JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html);
- [`@aws-sdk/s3-request-presigner`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/);
- [MinIO em contêiner e API compatível com S3](https://min.io/docs/minio/container/index.html).

## Etapa 12 - Implementar análise básica de áudio

### Objetivo

Extrair informações técnicas sem depender do modelo de linguagem.

### Atividades

1. Criar fila e worker de processamento.
2. Extrair formato, tamanho e duração.
3. Estimar BPM.
4. Estimar tonalidade quando tecnicamente viável.
5. Gerar ou revisar tags de gênero, emoção e instrumentação.
6. Marcar valores calculados como estimativas.
7. Registrar versão e método do analisador.
8. Tratar arquivos corrompidos.
9. Permitir reprocessamento controlado.
10. Exibir progresso e falhas no frontend.

### Entregável

Faixas do acervo enriquecidas com metadados técnicos e descritivos.

### Critério de conclusão

Um arquivo válido conclui o processamento em segundo plano sem bloquear o chat; um inválido termina com erro rastreável.

## Etapa 13 - Integrar embeddings pela Cloudflare

### Objetivo

Criar busca semântica sem instalar ou executar modelos localmente.

### Atividades

1. Criar conta gratuita da Cloudflare.
2. Habilitar Workers AI.
3. Criar token com a menor permissão necessária.
4. Configurar `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` somente no backend.
5. Configurar o modelo `@cf/qwen/qwen3-embedding-0.6b`.
6. Habilitar pgvector no PostgreSQL.
7. Escolher e fixar a dimensão vetorial do MVP.
8. Registrar modelo, dimensão e hash do conteúdo de origem.
9. Gerar embeddings de títulos, descrições e tags das faixas.
10. Gerar embedding para cada consulta semântica.
11. Calcular similaridade no PostgreSQL.
12. Combinar similaridade com filtros de BPM, gênero e instrumentação.
13. Não enviar arquivos de áudio à Cloudflare.
14. Reutilizar vetores quando o texto não mudar.
15. Controlar a alocação gratuita diária.
16. Tratar erros de quota e indisponibilidade.

### Entregável

Busca no acervo por linguagem natural usando vetores armazenados no pgvector.

### Critério de conclusão

Consultas descritivas encontram faixas coerentes, e a aplicação continua utilizável quando a Cloudflare estiver indisponível.

## Etapa 14 - Curar e ranquear referências

### Objetivo

Combinar YouTube, Spotify e acervo próprio em uma lista justificável.

### Atividades

1. Definir um formato interno único de referência.
2. Remover duplicatas entre fontes.
3. Calcular compatibilidade por metadados e semântica.
4. Priorizar o acervo próprio quando houver boa correspondência.
5. Pedir à IA justificativas baseadas somente nos dados disponíveis.
6. Impedir que a IA invente atributos ausentes.
7. Exibir fonte, pontuação e justificativa.
8. Permitir aprovar, rejeitar, substituir e adicionar manualmente.
9. Salvar a seleção final e sua ordem.

### Entregável

Lista curada e confirmada de referências do projeto.

### Critério de conclusão

Cada recomendação mostra sua fonte e explica a relevância sem apresentar metadados não verificados.

## Etapa 15 - Gerar moodboard e roadmap

### Objetivo

Converter briefing e referências aprovadas em orientação criativa utilizável.

### Atividades

1. Definir esquema estruturado do moodboard.
2. Enviar à Groq apenas briefing e referências aprovadas.
3. Validar a resposta JSON.
4. Criar seções de paleta emocional, instrumentação, estrutura e produção.
5. Separar dados medidos de sugestões da IA.
6. Salvar versões do moodboard.
7. Criar interface visual em cards.
8. Permitir regenerar após mudanças confirmadas.
9. Registrar modelo e data da geração.

### Entregável

Moodboard visual e roadmap salvos no projeto.

### Critério de conclusão

O resultado utiliza somente referências aprovadas, pode ser reaberto e não mistura estimativas com fatos sem identificação.

## Etapa 16 - Exportar o moodboard em PDF

### Objetivo

Produzir um documento visual compartilhável a partir da mesma estrutura salva no banco.

### Atividades

1. Definir template com identidade Eclipse.
2. Gerar PDF no backend.
3. Incluir briefing, referências, características e roadmap.
4. Incluir data e versão.
5. Inserir links legíveis e clicáveis quando permitido.
6. Renderizar o PDF para inspeção visual durante os testes.
7. Verificar cortes, sobreposições e páginas vazias.
8. Armazenar ou gerar o documento sob demanda.
9. Disponibilizar download autorizado.

### Entregável

PDF final do moodboard.

### Critério de conclusão

O PDF corresponde ao moodboard exibido, abre corretamente e não apresenta defeitos visuais.

## Etapa 17 - Ativar o assistente com memória do projeto

### Objetivo

Fazer o chat considerar o trabalho já realizado sem enviar todo o banco a cada mensagem.

### Atividades

1. Recuperar briefing confirmado.
2. Recuperar moodboard vigente.
3. Recuperar referências aprovadas.
4. Buscar no acervo apenas trechos semanticamente relevantes.
5. Incluir uma janela controlada do histórico recente.
6. Montar o contexto no backend.
7. Limitar tamanho e custo do contexto.
8. Diferenciar opinião criativa de dado técnico.
9. Criar testes de memória e isolamento entre projetos.

### Entregável

Assistente que acompanha a criação dentro do contexto correto.

### Critério de conclusão

A IA responde sobre decisões anteriores do projeto sem misturar informações de outros projetos ou usuários.

## Etapa 18 - Registrar a obra final

### Objetivo

Fechar o ciclo da proposta, incorporando a produção concluída ao acervo.

### Atividades

1. Permitir upload da faixa final.
2. Vincular o arquivo ao projeto.
3. Executar análise básica.
4. Gerar tags e embedding.
5. Vincular briefing, moodboard e referências que originaram a obra.
6. Registrar versão e data de conclusão.
7. Disponibilizar a obra em buscas futuras.

### Entregável

Obra final indexada com memória de sua origem criativa.

### Critério de conclusão

A faixa final aparece no acervo e pode ser encontrada em um novo projeto por busca textual ou semântica.

## Etapa 19 - Reforçar segurança, privacidade e custos

### Objetivo

Preparar o sistema para testes com usuários reais.

### Atividades

1. Revisar autenticação e autorização de todas as rotas.
2. Revisar validação de uploads.
3. Adicionar rate limiting.
4. Remover dados sensíveis dos logs.
5. Criar política de retenção e exclusão.
6. Registrar consentimento para processamento de arquivos.
7. Documentar quais dados textuais vão para Groq e Cloudflare.
8. Garantir que áudio não seja enviado aos modelos de texto ou embeddings.
9. Monitorar tokens e quotas dos provedores.
10. Impedir ativação automática de cobrança.
11. Proteger ferramentas contra instruções maliciosas em conteúdo externo.
12. Revisar necessidades de LGPD.

### Entregável

Checklist de segurança aprovado para homologação.

### Critério de conclusão

Testes de isolamento, abuso de quota, upload inválido e vazamento de credencial são executados sem falhas críticas.

## Etapa 20 - Testar o produto e a qualidade da IA

### Objetivo

Comprovar tecnicamente e academicamente que o MVP resolve o problema proposto.

### Atividades

1. Criar conjunto fixo de briefings de avaliação.
2. Testar gêneros e contextos variados.
3. Medir validade do JSON produzido.
4. Avaliar referências com usuários.
5. Medir informações inventadas.
6. Avaliar utilidade do moodboard.
7. Testar quotas esgotadas da Groq, Cloudflare e YouTube.
8. Testar arquivos grandes, inválidos e corrompidos.
9. Testar desktop, tablet e celular.
10. Medir tempo e custo por projeto.
11. Corrigir falhas críticas e repetir os cenários.

### Entregável

Relatório de testes e métricas para utilização no TCC.

### Critério de conclusão

Todos os critérios de aceite do escopo estão aprovados e as métricas acadêmicas foram registradas com método reproduzível.

## Etapa 21 - Publicar a homologação

### Objetivo

Disponibilizar uma versão estável para demonstração e avaliação.

### Atividades

1. Preparar frontend, API, worker, banco, armazenamento e fila.
2. Configurar HTTPS e domínios.
3. Aplicar migrações automaticamente de forma controlada.
4. Configurar segredos no ambiente de hospedagem.
5. Configurar backups do banco.
6. Configurar monitoramento de disponibilidade e erros.
7. Confirmar modelos e quotas vigentes da Groq e Cloudflare.
8. Executar teste completo após o deploy.
9. Preparar dados demonstrativos que não sejam confidenciais.
10. Documentar procedimento de recuperação para a apresentação.

### Entregável

Plataforma de homologação acessível e monitorada.

### Critério de conclusão

O fluxo completo pode ser demonstrado do cadastro à exportação do moodboard e permanece recuperável após reinício dos serviços.

## 3. Marcos de entrega

### Marco A - Base funcional

Etapas 1 a 5 concluídas. Usuário, projeto e chat persistem no backend.

### Marco B - IA funcional

Etapas 6 a 8 concluídas. O Qwen responde, estrutura briefings e utiliza ferramentas controladas.

### Marco C - Pesquisa musical

Etapas 9 e 10 concluídas. YouTube e links do Spotify alimentam as referências.

### Marco D - Acervo inteligente

Etapas 11 a 13 concluídas. Upload, análise e busca semântica pela Cloudflare estão operacionais.

### Marco E - Entrega criativa

Etapas 14 a 18 concluídas. Curadoria, moodboard, PDF, memória e obra final fecham o fluxo.

### Marco F - Homologação

Etapas 19 a 21 concluídas. Segurança, avaliação acadêmica e deploy foram verificados.

## 4. Dependências críticas

| Dependência | Necessária a partir de | Consequência se indisponível |
|---|---:|---|
| PostgreSQL | Etapa 3 | Backend não persiste usuários ou projetos |
| Groq/Qwen 3.6 27B | Etapa 6 | Chat, briefing e moodboard ficam indisponíveis |
| YouTube Data API | Etapa 9 | Pesquisa externa fica parcial |
| Spotify API | Etapa 10 | Inclusão automática por link fica indisponível |
| Armazenamento S3/MinIO | Etapa 11 | Upload de áudio fica indisponível |
| Cloudflare Workers AI | Etapa 13 | Busca semântica e novos embeddings ficam indisponíveis |
| pgvector | Etapa 13 | Similaridade vetorial não pode ser consultada |

## 5. Regra de fallback do MVP

O sistema deve degradar de forma controlada:

- sem Groq, mensagens ficam salvas e podem ser reenviadas depois;
- sem YouTube, o usuário ainda pode adicionar referências manualmente;
- sem Spotify, o link pode ser guardado como referência manual sem enriquecimento;
- sem Cloudflare, a busca textual e os filtros continuam disponíveis;
- sem geração de PDF, o moodboard visual permanece acessível;
- uma falha de análise de áudio não remove o arquivo enviado.

Essa regra evita que uma API gratuita indisponível interrompa toda a apresentação do TCC.
