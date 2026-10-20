# Eclipse — análise de viabilidade comercial

Data da análise: 30/09/2026.

## Resumo executivo

O Eclipse já é um MVP funcional relevante, e não apenas uma demonstração de
interface. O repositório possui aproximadamente 17.896 linhas em 226 arquivos de
código, 20 migrações, 18 entidades, 13 controllers e 25 arquivos de teste. O
backend compilou e as 25 suítes, com 115 testes unitários, foram aprovadas nesta
análise.

O produto pode ser lançado comercialmente depois de uma etapa de produtização.
O investimento mais provável é:

- R$ 4 mil a R$ 12 mil de desembolso se os autores fizerem o desenvolvimento e
  não contabilizarem as próprias horas;
- R$ 35 mil a R$ 60 mil para uma implementação profissional enxuta;
- R$ 60 mil a R$ 95 mil com agência, acabamento maior, jurídico e contingência.

O custo técnico mensal deve começar entre R$ 250 e R$ 600 em piloto e ficar
entre R$ 700 e R$ 1.500 com cerca de 1.000 usuários ativos mensais e 100
assinantes. Esses valores não incluem pró-labore, marketing ou atendimento.

A recomendação é iniciar com um plano pago de **R$ 29,90/mês**, oferecer
**R$ 24,90/mês** como preço fundador e, depois de validar o uso, adicionar um
plano Pro de **R$ 59,90/mês**.

## O que já existe

- Angular/Ionic responsivo e API NestJS;
- cadastro, login, sessões e isolamento de dados por usuário;
- projetos, conversas, chat com IA e memória de projeto;
- briefing, curadoria, moodboard, roadmap e PDF versionados;
- referências de YouTube, Spotify, biblioteca particular e links manuais;
- upload privado de MP3/WAV em armazenamento S3 compatível;
- análise assíncrona de áudio, busca semântica com pgvector e embeddings;
- separação de stems com Demucs;
- rate limiting compartilhado, cotas, consentimento, exportação e exclusão;
- migrações, testes unitários e testes E2E existentes.

## Pendências para uma operação real

| Entrega | Estimativa | Custo a R$ 100–180/h |
|---|---:|---:|
| Docker de produção, CI/CD, domínio, HTTPS, segredos e ambientes | 32–48 h | R$ 3.200–8.640 |
| Assinaturas, checkout, webhooks, cancelamento, entitlements e cotas | 50–80 h | R$ 5.000–14.400 |
| Verificação de e-mail, recuperação de senha e e-mails transacionais | 30–50 h | R$ 3.000–9.000 |
| Worker de áudio escalável e Demucs em GPU sob demanda | 40–70 h | R$ 4.000–12.600 |
| Logs, erros, alertas, backup e teste de restauração | 30–50 h | R$ 3.000–9.000 |
| Teste de carga, segurança, acessibilidade e correções de QA | 40–70 h | R$ 4.000–12.600 |
| Painel operacional simples, suporte e métricas de produto | 30–50 h | R$ 3.000–9.000 |
| **Total de engenharia** | **252–418 h** | **R$ 25.200–75.240** |

Uma contratação única e bem coordenada tende a ficar no meio da faixa, entre
R$ 35 mil e R$ 60 mil. Deve-se reservar ainda:

| Item não técnico | Faixa inicial |
|---|---:|
| Termos de uso, aviso de privacidade e revisão LGPD | R$ 3.000–8.000 |
| Abertura/ajuste da empresa e configuração contábil | R$ 1.000–3.000 |
| Identidade, textos comerciais e página de venda | R$ 1.500–5.000 |
| Domínio `.com.br` | R$ 40/ano |
| Reserva de contingência | 15% do projeto |

## Arquitetura de lançamento sugerida

1. Frontend estático em Cloudflare Pages.
2. API NestJS e PostgreSQL/pgvector no Railway Pro.
3. Áudios e stems no Cloudflare R2, mantendo URLs assinadas.
4. Análise leve em worker CPU; Demucs em GPU serverless sob demanda.
5. Groq para texto e Cloudflare Workers AI para embeddings.
6. Stripe Checkout/Billing para assinatura, Resend para e-mail e Sentry ou
   equivalente para erros.

Essa arquitetura exige pouca administração e preserva a estrutura atual. Uma
VPS única seria mais barata, mas colocaria API, banco e arquivos no mesmo ponto
de falha e aumentaria o trabalho de backup e segurança.

## Custos mensais de operação

Conversão adotada: US$ 1 = R$ 5,22, PTAX de venda de 29/09/2026. Valores em
dólar podem receber IOF, impostos e variação cambial.

### Custos por serviço

| Serviço | Piloto | 1.000 MAU / 100 pagos | Observação |
|---|---:|---:|---|
| API, worker e PostgreSQL | R$ 160–300 | R$ 310–630 | Railway cobra RAM, CPU e volume por uso |
| Frontend/CDN | R$ 0 | R$ 0–50 | cabe no plano gratuito no início |
| Áudio no R2 | R$ 0–10 | R$ 40–90 | US$ 0,015/GB-mês, com 10 GB gratuitos |
| IA de texto Groq | R$ 20–80 | R$ 100–450 | depende do modelo e de mensagens por projeto |
| Embeddings | menos de R$ 1 | menos de R$ 10 | US$ 0,012 por milhão de tokens |
| GPU para stems | R$ 0–50 | R$ 50–150 | precisa de benchmark real do Demucs |
| E-mail transacional | R$ 0 | R$ 0–105 | Resend: 3.000 grátis; Pro US$ 20 |
| Erros, uptime e logs | R$ 0–50 | R$ 0–100 | gratuito primeiro; pago conforme retenção |
| Domínio | R$ 3,33 | R$ 3,33 | R$ 40/ano |
| **Total técnico estimado** | **R$ 250–600** | **R$ 700–1.500** | inclui margem cambial/arredondamento |

Além da tecnologia, uma empresa pequena deve prever cerca de R$ 1.500 a
R$ 5.000/mês para contabilidade, atendimento, manutenção corretiva e tarefas
operacionais. Marketing e pró-labore ficam fora dessa conta.

### Cenários de escala

| Estágio | Usuários ativos | Pagos | Tecnologia/mês | Operação total sem marketing/pró-labore |
|---|---:|---:|---:|---:|
| Piloto | 50–100 | 10–20 | R$ 250–600 | R$ 500–1.500 |
| Lançamento | 1.000 | 100 | R$ 700–1.500 | R$ 2.200–6.500 |
| Crescimento | 10.000 | 1.000 | R$ 3.500–8.000 | R$ 12.000–35.000 |

As faixas precisam ser atualizadas depois de 30 dias de telemetria real. Hoje o
projeto ainda não tem amostra de tokens, projetos completos ou avaliações de
usuários no relatório acadêmico.

## Custo unitário aproximado

Hipótese de um projeto típico: 14 gerações, com média de 3.500 tokens de
entrada e 450 de saída por geração. Isso representa 49 mil tokens de entrada e
6,3 mil de saída.

- Qwen 3.6 27B, a US$ 0,60/M de entrada e US$ 3,00/M de saída: cerca de
  US$ 0,048, ou R$ 0,25 por projeto;
- GPT-OSS 120B, a US$ 0,15/M de entrada e US$ 0,60/M de saída: cerca de
  US$ 0,011, ou R$ 0,06 por projeto, sujeito a teste de qualidade;
- embeddings: fração de centavo por projeto;
- stems: reservar R$ 0,10–0,50 por processamento até medir tempo, cold start,
  tráfego e quantidade/tamanho dos arquivos gerados;
- armazenamento de stems: aproximadamente R$ 0,078 por GB-mês no câmbio usado,
  depois da franquia global gratuita.

O custo marginal é baixo, mas o armazenamento é cumulativo. Por isso, stems
devem ter prazo de retenção ou consumir uma franquia clara.

## Modelo freemium recomendado

| Recurso | Gratuito | Creator — R$ 29,90 | Pro — R$ 59,90 |
|---|---:|---:|---:|
| Projetos ativos | 2 | 15 | 50 |
| Mensagens de IA/mês | 20 | 250 | 700 |
| Biblioteca de áudio | 250 MB | 5 GB | 25 GB |
| Moodboards/PDF | 1/mês | ilimitados com uso justo | ilimitados com uso justo |
| Separações de stems | 1 teste, retenção de 7 dias | 5/mês | 20/mês |
| Histórico de versões | básico | completo | completo |
| Suporte | comunidade/e-mail | e-mail | prioritário |

No lançamento, é melhor publicar apenas Gratuito + Creator. O Pro deve ser
adicionado quando houver usuários realmente esbarrando nos limites.

O plano gratuito precisa mostrar o valor do fluxo completo, mas não pode ser um
substituto permanente para o pago. A conversão deve acontecer por projetos,
armazenamento e stems, não bloqueando artificialmente a qualidade da IA.

## Receita, taxas e ponto de equilíbrio

Na Stripe Brasil, cartão nacional custa 3,99% + R$ 0,39 por transação e o
Billing acrescenta 0,7% do volume.

| Plano | Preço | Taxa aproximada | Receita líquida antes da infraestrutura |
|---|---:|---:|---:|
| Creator | R$ 29,90 | R$ 1,79 | R$ 28,11 |
| Pro | R$ 59,90 | R$ 3,20 | R$ 56,70 |

Se o custo variável do Creator ficar em R$ 3 por assinante, sua contribuição
será aproximadamente R$ 25,11, margem de 84%. Assim:

- infraestrutura de R$ 600/mês: aproximadamente 24 assinantes para pagar;
- operação enxuta de R$ 2.500/mês: aproximadamente 100 assinantes;
- operação de R$ 6.500/mês: aproximadamente 259 assinantes.

Com 100 assinantes Creator, o faturamento bruto seria R$ 2.990/mês. Isso valida
o produto e paga uma operação muito enxuta, mas ainda não sustenta uma equipe em
tempo integral. Para isso, o objetivo deve ser algo como 400–600 assinantes ou
um ticket médio maior com o plano Pro.

## Riscos que precisam ser tratados antes do lançamento

1. O modelo `qwen/qwen3.6-27b` configurado no código não aparece na lista atual
   de modelos de produção da Groq. Deve-se migrar e executar uma bateria de
   qualidade antes de vender o serviço.
2. A YouTube Data API oferece por padrão somente 100 pesquisas por dia. O cache
   atual ajuda, mas o lançamento público exige pedido de extensão ou outra forma
   de limitar a pesquisa.
3. Aplicativos Spotify em Development Mode passaram a exigir Premium do dono e
   aceitam somente cinco usuários em novos apps. Para uso público, é necessário
   Extended Quota Mode ou retirar a dependência obrigatória dessa integração.
4. Demucs roda hoje como processo local e precisa ser isolado do servidor web.
   Sem isso, uma separação pesada pode degradar toda a API.
5. Ainda não existem pagamento, verificação/recuperação de e-mail, CI/CD,
   monitoramento central ou teste documentado de restauração de backup.
6. A implementação técnica de privacidade está adiantada, mas faltam aviso de
   privacidade, termos, definição formal do controlador e plano de incidentes.
7. Ainda não há dados de validação com usuários reais. Preço e limites devem ser
   tratados como hipóteses, não como conclusões.

## Sequência recomendada

1. Fazer beta fechado com 20–50 músicos por quatro semanas.
2. Medir tokens, minutos de áudio, GB armazenados, separações, conclusão do
   moodboard, retorno semanal e disposição a pagar.
3. Trocar/validar o modelo Groq, resolver as cotas de YouTube/Spotify e separar o
   worker Demucs.
4. Implementar conta completa, pagamentos, entitlements e observabilidade.
5. Publicar Gratuito + Creator por R$ 29,90, com fundador a R$ 24,90.
6. Rever limites depois dos primeiros 100 pagantes e só então criar o Pro.

## Fontes de preços

- Groq, modelos e preços: https://console.groq.com/docs/models
- Railway: https://railway.com/pricing
- Cloudflare R2: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Workers AI: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Modal GPU: https://modal.com/pricing
- RunPod GPU: https://www.runpod.io/pricing
- Stripe Brasil: https://stripe.com/br/pricing
- Resend: https://resend.com/pricing
- YouTube Data API: https://developers.google.com/youtube/v3/getting-started
- Spotify Dev Mode 2026: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
- PTAX: https://ptax.bcb.gov.br/ptax_internet/consultarUltimaCotacaoDolar.do
- Registro.br: https://registro.br/

