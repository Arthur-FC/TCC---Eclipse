# Segurança, privacidade e custos — checklist de homologação

Revisão técnica: 07/09/2026. Este documento apoia a homologação do MVP e não
substitui avaliação jurídica da instituição responsável pelo tratamento.

## Controles aprovados

- [x] Todas as rotas de projetos, conversas, IA, briefing, referências,
  moodboards, biblioteca, obras finais, consumo e exclusão exigem sessão. Apenas
  saúde, cadastro e login são públicos.
- [x] Consultas sempre recebem o `ownerId` da sessão; IDs enviados pelo cliente
  não substituem a identidade autenticada.
- [x] Cookies de sessão são `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
  somente o hash do token é persistido.
- [x] Requisições mutáveis com `Origin` externo ou `Sec-Fetch-Site: cross-site`
  são rejeitadas, e o CORS usa lista explícita.
- [x] Rate limiting separado para autenticação, IA, upload e tráfego geral,
  compartilhado no PostgreSQL entre instâncias, com identificador de IP
  irreversivelmente resumido, `429`, `Retry-After` e cabeçalhos de saldo.
- [x] Upload limitado por tamanho, extensão, MIME, tamanho real, assinatura,
  parser de áudio e hash de conteúdo. A URL de upload expira.
- [x] O consentimento explícito é obrigatório e registrado com data e versão.
- [x] O áudio fica no armazenamento privado. Groq e Cloudflare recebem somente
  texto; nenhuma chamada dessas integrações aceita bytes de áudio.
- [x] Ferramentas da IA usam allowlist, esquema fechado, limite de chamadas,
  escopo fixo no projeto atual e rotulam resultados como conteúdo não confiável.
- [x] URLs externas não são abertas pela IA; metadados de YouTube/Spotify e texto
  do usuário são tratados como dados, nunca como instruções.
- [x] Logs HTTP não incluem query strings, cookies, credenciais, prompts ou nomes
  de arquivo. Logs de IA guardam apenas contagens, provedor, modelo, tokens e
  latência.
- [x] YouTube, Cloudflare e Groq possuem limites diários locais; a reserva
  conservadora de tokens da Groq bloqueia novas chamadas antes do orçamento e
  complementa o limite por resposta. `EXTERNAL_BILLING_ALLOWED=true` impede a
  inicialização da API.
- [x] `GET /api/privacy/usage` mostra o consumo diário efetivo de Groq,
  Cloudflare e YouTube e seus limites ativos.
- [x] O menu **Privacidade** permite consultar consumo, exportar todos os dados
  em JSON e corrigir nome/e-mail; a exclusão de uma faixa revoga seu
  consentimento e apaga o áudio.
- [x] `DELETE /api/privacy/account`, com confirmação `EXCLUIR` e reautenticação
  pela senha atual, remove primeiro
  os objetos de áudio e depois a conta e seus registros em cascata.
- [x] Uploads pendentes expirados e falhas antigas são apagados automaticamente;
  sessões expiradas ou revogadas também são eliminadas.

## Fluxo de dados para provedores

### Groq

Recebe texto recente da conversa, briefing, moodboard, metadados das referências,
metadados/estimativas do acervo e resultados textuais das ferramentas internas.
Não recebe cookie, senha, chave de API, URL privada de reprodução nem áudio.

### Cloudflare Workers AI

Recebe o texto usado para busca: título, artista, observações, BPM/tonalidade
estimados, tags e, para obra final, o resumo textual da origem criativa. Recebe
também a consulta textual digitada. Não recebe áudio, hash do arquivo, object key,
e-mail, cookie ou URL privada.

### YouTube e Spotify

Recebem termos de busca ou identificadores públicos necessários para consultar
metadados. Credenciais ficam exclusivamente no backend.

## Retenção

- Projetos, mensagens, briefings, referências, moodboards e faixas prontas:
  enquanto a conta existir ou até exclusão explícita pelo titular.
- Reserva de upload não concluída: até a expiração da URL assinada.
- Registro de upload com falha: 7 dias por padrão.
- Sessão expirada ou revogada: 30 dias por padrão.
- Cache de busca do YouTube: 24 horas por padrão.
- Cache de embedding de consulta: conforme a implementação local e exclusão da
  conta; embeddings de faixa são apagados em cascata com a faixa.

## Revisão LGPD

A implementação aplica finalidade, necessidade, transparência, segurança e
prevenção, além de oferecer eliminação. Antes de usuários reais, a instituição
deve definir formalmente controlador/operadores, base legal de cada tratamento,
canal do titular, responsável por incidentes, aviso de privacidade, contratos com
provedores e procedimento de acesso/correção/portabilidade. A exclusão técnica
não elimina obrigações legais de conservação eventualmente aplicáveis.

Referências oficiais: [Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm),
[direitos dos titulares — ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares) e
[Guia de Segurança da Informação — ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/anonimizado___guia_orientat-_seg_da_inf_p_atpp.pdf).

## Pendências institucionais antes de produção

- [ ] Publicar aviso de privacidade com identificação e contato do controlador.
- [ ] Publicar o canal institucional do titular; acesso, correção, exportação e
  exclusão já estão disponíveis tecnicamente no menu **Privacidade**.
- [ ] Celebrar/revisar contratos e localização de tratamento dos provedores.
- [ ] Criar plano de resposta e comunicação de incidentes.
- [ ] Usar HTTPS, segredos gerenciados, backups criptografados e monitoramento
  centralizado no ambiente definitivo.
