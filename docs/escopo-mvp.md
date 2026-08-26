# Eclipse - Escopo do MVP

**Versão:** 1.2  
**Data:** 25 de agosto de 2026  
**Status:** Escopo atualizado com a arquitetura de IA escolhida  
**Tipo de produto:** Protótipo acadêmico funcional (TCC)

## 1. Objetivo do MVP

Validar que a Eclipse consegue transformar um briefing musical em um conjunto útil de referências, um roadmap criativo e um moodboard, utilizando inteligência artificial e o acervo particular do usuário.

O MVP não tem como objetivo gerar músicas automaticamente. A IA deve atuar como copiloto do processo criativo: interpretar, pesquisar, organizar, comparar e sugerir, mantendo as decisões artísticas com o usuário.

## 2. Público-alvo inicial

- Músicos independentes.
- Produtores musicais.
- Compositores.
- Estudantes de música e produção.
- Pequenas equipes que trabalham com trilhas, singles e projetos audiovisuais.

O primeiro protótipo será validado com um grupo pequeno de usuários convidados. Não haverá lançamento público em grande escala nesta versão.

## 3. Proposta de valor validada pelo MVP

> O usuário descreve a música que pretende criar e, em poucos minutos, recebe um briefing organizado, referências justificadas e um moodboard musical que pode orientar a produção.

O MVP será considerado conceitualmente válido quando um usuário conseguir concluir esse fluxo sem precisar utilizar várias ferramentas separadas.

## 4. Fluxo principal do usuário

1. O usuário cria uma conta e entra na plataforma.
2. Cria um projeto musical.
3. Descreve o projeto por meio do chat.
4. A IA transforma a descrição em um briefing estruturado.
5. O usuário revisa, edita e confirma o briefing.
6. A plataforma pesquisa referências no YouTube.
7. O usuário pode adicionar referências do Spotify por link.
8. A plataforma pesquisa músicas semelhantes no acervo particular do usuário.
9. A IA ranqueia e explica a relevância das referências encontradas.
10. O usuário aprova, rejeita ou adiciona referências.
11. A IA gera o moodboard e o roadmap criativo.
12. O usuário consulta o resultado na plataforma e exporta um PDF.
13. O chat continua disponível como assistente criativo com memória do projeto.
14. Ao finalizar a música, o usuário pode enviá-la ao acervo e vinculá-la ao projeto que a originou.

## 5. Funcionalidades obrigatórias

### RF-01 - Autenticação

- Cadastro com nome, e-mail e senha.
- Login e encerramento de sessão.
- Cada usuário visualiza somente seus próprios projetos, conversas e arquivos.
- Sessão recuperada ao recarregar a aplicação.

### RF-02 - Gestão de projetos

- Criar projeto.
- Listar e abrir projetos existentes.
- Renomear projeto.
- Arquivar ou excluir projeto mediante confirmação.
- Registrar data de criação e última atualização.

### RF-03 - Chat com a Eclipse

- Enviar mensagens e receber respostas da IA.
- Utilizar o modelo Qwen 3.6 27B por meio da API da Groq como provedor principal do MVP.
- Exibir a resposta progressivamente.
- Manter o histórico no servidor.
- Informar estados de processamento e falha.
- Permitir tentar novamente quando uma resposta falhar.
- Associar cada conversa a um projeto musical.

### RF-04 - Briefing estruturado

A IA deve extrair, quando disponíveis:

- tipo do projeto;
- gênero e subgênero;
- emoções e atmosfera;
- contexto de uso;
- público pretendido;
- referências já conhecidas;
- instrumentação desejada;
- faixa de BPM;
- duração aproximada;
- restrições e observações.

O usuário deve poder editar e confirmar o resultado. A busca de referências só começa depois da confirmação.

### RF-05 - Pesquisa no YouTube

- Gerar termos de pesquisa a partir do briefing.
- Pesquisar vídeos musicais usando a YouTube Data API.
- Exibir título, canal, miniatura, duração e link.
- Filtrar resultados inválidos ou duplicados.
- Registrar a origem de cada resultado.
- Controlar quota e reutilizar resultados recentes por cache.

### RF-06 - Referências do Spotify por link

- Aceitar um link de faixa enviado pelo usuário.
- Validar o formato do link.
- Recuperar os metadados permitidos que estiverem disponíveis.
- Registrar título, artista, álbum, capa, duração e link.
- Não enviar conteúdo de áudio do Spotify ao modelo de IA.

O MVP não dependerá da busca avançada nem dos endpoints depreciados de características de áudio do Spotify.

### RF-07 - Biblioteca musical particular

- Upload de arquivos MP3 e WAV.
- Armazenamento privado por usuário.
- Cadastro manual de título, artista e observações.
- Listagem e reprodução dos arquivos autorizados.
- Exclusão do arquivo pelo proprietário.
- Indicação visual do estado de processamento.

AIFF, FLAC e upload em lote ficam planejados para uma versão posterior.

### RF-08 - Análise básica de áudio

Para arquivos enviados pelo próprio usuário, extrair:

- formato;
- duração;
- tamanho;
- BPM estimado;
- tonalidade estimada, quando tecnicamente possível;
- tags descritivas de gênero, emoção e instrumentação.

Valores estimados devem ser apresentados como estimativas, e não como fatos absolutos.

### RF-09 - Busca semântica no acervo

- Permitir pesquisas por descrição livre, como "melancólico, intimista e com violão".
- Gerar os embeddings pela API do Cloudflare Workers AI com o modelo Qwen3 Embedding 0.6B.
- Combinar semelhança semântica com filtros técnicos disponíveis.
- Priorizar músicas do próprio usuário quando forem compatíveis com o briefing.
- Explicar resumidamente por que uma faixa foi encontrada.

### RF-10 - Curadoria e ranqueamento

- Reunir referências de diferentes origens em uma lista única.
- Calcular relevância considerando briefing, metadados e descrição.
- Apresentar uma justificativa compreensível para cada recomendação.
- Permitir aprovar, rejeitar, substituir ou adicionar referências manualmente.
- Não inventar BPM, tonalidade, artista, link ou outro metadado técnico.

### RF-11 - Moodboard musical

Gerar uma visualização contendo:

- resumo do briefing;
- paleta emocional;
- referências aprovadas e comentários;
- características sonoras disponíveis;
- instrumentação sugerida;
- estrutura sugerida para a música;
- direção harmônica;
- notas de arranjo e produção;
- roadmap de criação;
- pontos que devem ser evitados.

O moodboard deve ser salvo e poderá ser regenerado quando o briefing ou as referências forem alterados.

### RF-12 - Exportação em PDF

- Gerar um PDF com a identidade visual da Eclipse.
- Incluir briefing, referências, características, roadmap e notas de produção.
- Exibir data e versão do documento.
- Disponibilizar o arquivo para download.

### RF-13 - Assistente com memória do projeto

Durante a conversa, a IA deve considerar:

- briefing confirmado;
- moodboard atual;
- referências aprovadas;
- informações relevantes do acervo;
- histórico recente da conversa.

A IA poderá responder dúvidas de teoria musical, sugerir caminhos criativos e explicar decisões, mas não gerará o arquivo de uma música completa.

### RF-14 - Registro da obra final

- Permitir o envio opcional da música finalizada.
- Vincular a obra ao briefing, moodboard e referências do projeto.
- Executar a mesma análise básica utilizada na biblioteca.
- Tornar a nova obra disponível em buscas futuras do acervo.

## 6. Funcionalidades desejáveis, mas não bloqueadoras

Estas funcionalidades podem entrar no MVP apenas se as obrigatórias estiverem concluídas e estáveis:

- tema claro e escuro;
- edição de mensagens;
- duplicação de projeto;
- comparação textual entre duas versões do moodboard;
- compartilhamento do PDF por link temporário;
- filtros avançados na biblioteca;
- importação de várias faixas em uma única operação.

## 7. Fora do escopo do MVP

- Geração automática de música ou áudio pela IA.
- Clonagem de voz ou imitação de artista.
- Separação de stems com Moises, Music AI ou AudioShake.
- Execução local de Spleeter ou Demucs.
- Player multipista para stems.
- Integração com iMusica.
- Busca avançada e reprodução controlada pelo Spotify.
- Aplicativos nativos para Android ou iOS.
- Colaboração simultânea entre equipes.
- Planos pagos e cobrança.
- Marketplace de samples.
- Integração direta com DAWs.
- Treinamento ou fine-tuning de um modelo próprio.
- Análise automática de músicas comerciais sem autorização.

## 8. Arquitetura definida para o MVP

- **Frontend:** Angular 19 + Ionic, aproveitando o projeto atual.
- **Backend:** Node.js + TypeScript com NestJS.
- **Banco:** PostgreSQL.
- **Busca vetorial:** extensão pgvector no PostgreSQL.
- **IA principal:** API da Groq com o modelo `qwen/qwen3.6-27b`.
- **Embeddings:** Cloudflare Workers AI com o modelo `@cf/qwen/qwen3-embedding-0.6b`.
- **Integrações iniciais:** YouTube Data API e metadados do Spotify por link.
- **Arquivos:** armazenamento compatível com S3; MinIO poderá ser usado no ambiente local.
- **Processamento assíncrono:** fila para análise de áudio e geração de documentos.
- **Comunicação:** REST para operações comuns e SSE para respostas progressivas da IA.

Todas as chaves e credenciais permanecerão exclusivamente no backend.

### 8.1 Responsabilidades de cada modelo

O Qwen 3.6 27B hospedado pela Groq será responsável por:

- conversar com o usuário em português;
- interpretar e estruturar o briefing;
- decidir quando utilizar ferramentas do backend;
- criar termos de pesquisa;
- justificar e ranquear referências;
- gerar o conteúdo do moodboard e do roadmap;
- prestar assistência criativa durante o projeto.

O Qwen3 Embedding 0.6B hospedado no Cloudflare Workers AI será responsável por:

- transformar descrições de músicas em vetores;
- transformar consultas do usuário em vetores;
- permitir a busca semântica no acervo por meio do pgvector.

O modelo de embeddings não produzirá respostas de chat. Arquivos de áudio não serão enviados à Groq nem à Cloudflare para essa finalidade. O backend enviará somente títulos, descrições, tags e consultas textuais necessárias, e armazenará no PostgreSQL os vetores retornados.

### 8.2 Integração com a Groq

O backend terá um módulo próprio de provedor de IA, evitando chamadas à Groq diretamente nos demais módulos do sistema. Esse módulo deverá oferecer:

- chat com streaming;
- uso de ferramentas por function calling;
- respostas em JSON para o briefing e o moodboard;
- controle de timeout;
- repetição limitada em falhas temporárias;
- tratamento específico de limite excedido (`429`);
- registro de tokens utilizados;
- modelo selecionado por variável de ambiente.

O identificador padrão do MVP será `qwen/qwen3.6-27b`. Como modelos disponíveis em planos gratuitos podem mudar, o identificador não ficará fixo no frontend nem espalhado pelas regras de negócio.

### 8.3 Integração com o Cloudflare Workers AI

O backend chamará a API do Cloudflare Workers AI para gerar embeddings. O modelo padrão será `@cf/qwen/qwen3-embedding-0.6b`.

O módulo de embeddings deverá:

- manter o identificador da conta e o token da Cloudflare somente no backend;
- enviar somente texto e metadados necessários, nunca o arquivo de áudio;
- usar a mesma dimensão vetorial para documentos e consultas;
- validar a compatibilidade da dimensão com a coluna configurada no pgvector;
- registrar o modelo e a dimensão utilizados em cada vetor;
- reutilizar embeddings existentes quando o conteúdo não tiver mudado;
- tratar timeout, indisponibilidade e esgotamento da cota gratuita;
- permitir acesso às funções que não dependem da busca semântica quando a Cloudflare estiver indisponível.

No plano gratuito, a arquitetura deverá respeitar a alocação diária vigente do Workers AI. O limite deve ser consultado novamente antes da homologação, pois quotas e disponibilidade de modelos podem mudar.

### 8.4 Portabilidade do provedor

Embora a Groq seja a escolha oficial do MVP, a aplicação deverá depender de uma interface interna de IA. Isso permitirá substituir o provedor futuramente sem reescrever os módulos de briefing, chat e moodboard.

Uma troca de provedor não faz parte do MVP, mas a arquitetura não deverá criar dependência direta entre a interface Angular e a Groq.

## 9. Requisitos não funcionais

### Segurança e privacidade

- Senhas armazenadas usando hash seguro.
- Comunicação HTTPS em ambientes publicados.
- Validação de tipo, extensão e tamanho de arquivos.
- URLs temporárias para acesso aos áudios.
- Separação dos dados por usuário.
- Exclusão de arquivos e projetos pelo proprietário.
- Registro de consentimento para processamento de áudio.
- Nenhum segredo presente no código do frontend.
- A chave da Groq será armazenada somente nas variáveis de ambiente do backend.
- O token e o identificador da conta da Cloudflare serão armazenados somente nas variáveis de ambiente do backend.
- Apenas o contexto textual necessário será enviado para a Groq.
- Apenas títulos, descrições, tags e consultas textuais serão enviados ao serviço de embeddings da Cloudflare.
- Arquivos de áudio permanecerão na infraestrutura da Eclipse, e os vetores retornados serão armazenados no PostgreSQL da aplicação.
- Dados sensíveis deverão ser removidos de logs e mensagens de erro.

### Usabilidade

- Interface utilizável em computador, tablet e celular.
- Mensagens claras para carregamento, sucesso e erro.
- O usuário sempre poderá revisar o briefing antes da pesquisa.
- Recomendações da IA deverão incluir justificativas.
- Dados estimados ou indisponíveis deverão ser identificados.

### Desempenho esperado para homologação

- Operações comuns de cadastro e consulta devem responder em até 3 segundos em condições normais.
- A primeira parte da resposta do chat deve aparecer preferencialmente em até 10 segundos.
- Pesquisas externas devem informar progresso quando ultrapassarem 5 segundos.
- Processamentos longos devem continuar em segundo plano sem bloquear o chat.

Esses valores são metas de experiência, não um SLA comercial.

### Observabilidade e custos

- Registrar erros de integração sem armazenar chaves ou senhas.
- Registrar consumo de tokens da IA por operação.
- Limitar mensagens, pesquisas e uploads por usuário no ambiente de homologação.
- Manter o uso da IA dentro dos limites do plano gratuito da Groq durante o MVP.
- Manter a geração de embeddings dentro da alocação gratuita diária do Cloudflare Workers AI.
- Controlar requisições por minuto, requisições por dia e tokens consumidos.
- Interromper novas chamadas dependentes do serviço afetado e informar o usuário quando uma quota gratuita estiver esgotada.
- Não ativar automaticamente um plano pago ou mecanismo de cobrança por excesso.
- Manter configurável um teto mensal de gastos caso um plano pago seja adotado futuramente.

## 10. Critérios de aceite do MVP

O MVP estará concluído quando todos os cenários abaixo funcionarem em ambiente de homologação:

1. Um novo usuário consegue criar uma conta e entrar.
2. O usuário cria um projeto musical.
3. Envia uma descrição livre e recebe um briefing estruturado.
4. Edita e confirma o briefing.
5. Obtém referências reais do YouTube.
6. Adiciona ao menos uma referência válida do Spotify por link.
7. Envia uma música própria em MP3 ou WAV.
8. A música é analisada e passa a integrar a biblioteca.
9. Uma busca por emoção ou contexto encontra músicas do acervo.
10. A IA apresenta referências ranqueadas com justificativas.
11. O usuário aprova as referências e gera um moodboard.
12. O moodboard é exportado em PDF sem erros visuais.
13. O chat responde considerando o briefing e o moodboard do projeto.
14. O usuário encerra a sessão, entra novamente e recupera todo o projeto.
15. Um segundo usuário não consegue acessar os projetos ou arquivos do primeiro.
16. O chat, o briefing e o moodboard funcionam usando o Qwen 3.6 27B pela Groq.
17. A busca semântica funciona usando o Qwen3 Embedding 0.6B pelo Cloudflare Workers AI e vetores armazenados no pgvector.
18. Ao simular o esgotamento da quota da Groq, a aplicação apresenta erro compreensível e preserva a mensagem do usuário.
19. Ao simular indisponibilidade ou esgotamento da cota da Cloudflare, a aplicação preserva os dados e mantém disponíveis as funções que não dependem de busca semântica.

## 11. Métricas para validação acadêmica

Durante os testes com usuários, serão coletadas:

- taxa de briefings confirmados sem grandes correções;
- tempo médio entre briefing e moodboard;
- percentual de referências aprovadas;
- avaliação de relevância das referências, de 1 a 5;
- avaliação de utilidade do roadmap, de 1 a 5;
- quantidade de erros ou dados inventados pela IA;
- intenção do usuário de utilizar novamente a plataforma;
- latência e custo médio por projeto.

Uma meta inicial razoável é obter nota média igual ou superior a 4 de 5 para relevância das referências e utilidade do moodboard durante a avaliação do TCC.

## 12. Dependências externas

Antes das respectivas integrações, será necessário criar e configurar:

- conta e chave gratuita da Groq;
- acesso ao modelo `qwen/qwen3.6-27b` na conta da Groq;
- conta gratuita da Cloudflare;
- Workers AI habilitado na conta da Cloudflare;
- token de API e identificador da conta da Cloudflare;
- acesso ao modelo `@cf/qwen/qwen3-embedding-0.6b`;
- projeto no Google Cloud com YouTube Data API habilitada;
- aplicativo no painel de desenvolvedores do Spotify;
- banco PostgreSQL com pgvector;
- armazenamento S3 ou instância local do MinIO;
- serviço para envio de e-mails, caso a recuperação de senha faça parte da homologação.

O projeto não deve assumir acesso público à iMusica nem contratação de um provedor de stems no MVP.

Os planos gratuitos da Groq e da Cloudflare são adequados para desenvolvimento e demonstração, mas seus modelos e limites podem mudar. Antes da apresentação do TCC, a equipe deverá confirmar nos respectivos painéis se os modelos escolhidos continuam disponíveis e executar um teste completo do fluxo.

## 13. Ordem aprovada de implementação

1. Backend e configurações de ambiente.
2. Banco de dados e autenticação.
3. Persistência dos projetos e conversas.
4. Integração do chat Angular com o backend.
5. Integração da Groq com Qwen 3.6 27B.
6. Briefing estruturado.
7. Pesquisa no YouTube.
8. Referências do Spotify por link.
9. Biblioteca e upload de áudio.
10. Cloudflare Workers AI, análise básica e busca semântica com Qwen3 Embedding 0.6B.
11. Curadoria das referências.
12. Moodboard e exportação em PDF.
13. Assistente com memória do projeto.
14. Registro da obra final.
15. Segurança, testes com usuários e deploy de homologação.

## 14. Definição de pronto para cada funcionalidade

Uma funcionalidade somente será considerada pronta quando:

- o fluxo principal estiver implementado;
- entradas inválidas forem tratadas;
- falhas externas exibirem uma mensagem compreensível;
- dados forem persistidos corretamente;
- permissões do usuário forem verificadas;
- houver teste proporcional ao risco;
- a interface funcionar em desktop e celular;
- nenhuma chave secreta estiver exposta no frontend;
- a documentação técnica correspondente estiver atualizada.

## 15. Referências técnicas das IAs escolhidas

- Groq - limites do plano gratuito: <https://console.groq.com/docs/rate-limits>
- Groq - Qwen 3.6 27B: <https://console.groq.com/docs/model/qwen/qwen3.6-27b>
- Groq - uso local de ferramentas: <https://console.groq.com/docs/tool-use/local-tool-calling>
- Cloudflare Workers AI - visão geral: <https://developers.cloudflare.com/workers-ai/>
- Cloudflare Workers AI - preços e alocação gratuita: <https://developers.cloudflare.com/workers-ai/platform/pricing/>
- Cloudflare Workers AI - catálogo de modelos: <https://developers.cloudflare.com/workers-ai/models/>
