# TASK-003 — Tornar a inteligência musical tecnicamente transparente

**Prioridade:** P0  
**Status:** concluída em 7 de outubro de 2026  
**Dependências:** nenhuma

## Problema

A busca semântica atual compara textos derivados de título, artista, observações e tags. Parte das tags de humor e instrumentação é produzida por heurísticas de BPM, tonalidade e características simples do sinal. Isso não deve ser apresentado como similaridade sonora ou compreensão completa do áudio.

## Objetivo

Alinhar interface, documentação, API e comunicação comercial com o que cada resultado realmente comprova.

## Escopo

1. Renomear a capacidade atual para **busca semântica por metadados e descrições**.
2. Identificar em cada resultado a origem dos dados:
   - fornecido pelo usuário;
   - metadado incorporado no arquivo;
   - metadado da plataforma;
   - estimativa técnica local;
   - inferência de IA sobre texto;
   - análise direta de áudio, quando existir futuramente.
3. Exibir confiança para BPM, tonalidade e demais estimativas.
4. Evitar tags fortes quando a confiança estiver abaixo do limiar definido.
5. Exibir aviso quando o catálogo for pequeno ou não houver evidência suficiente.
6. Permitir que o usuário corrija tags sem apagar o valor original estimado.
7. Registrar versão e método do analisador em exportações e auditoria.
8. Revisar README, escopo, PDF e textos da interface para remover alegações ambíguas.

## Fora do escopo

- Implementar embeddings de áudio.
- Substituir o analisador atual por um modelo novo.
- Prometer precisão equivalente a serviços especializados.

## Critérios de aceite

- Nenhuma tela chama o resultado atual de “similaridade sonora”.
- Cada característica apresentada informa origem e, quando aplicável, confiança.
- Um resultado sem evidência suficiente é marcado como limitado em vez de receber uma justificativa genérica positiva.
- Correções do usuário são preservadas separadamente da estimativa original.
- Testes cobrem confiança baixa, ausência de metadados, fallback textual e indisponibilidade do provedor de embeddings.
- PDF e API preservam a distinção entre fato, entrada do usuário e estimativa.

## Métrica de sucesso

- redução de correções e reclamações sobre características incorretas;
- entendimento correto da origem dos dados em testes com usuários;
- nenhuma alegação não sustentada encontrada na revisão de conteúdo.

## Implementação concluída

- API e interface distinguem metadados incorporados, estimativas técnicas locais e correções do usuário.
- BPM e tonalidade exibem confiança; tags derivadas de BPM ou tonalidade com confiança baixa são omitidas.
- Evidências por campo, método e versão do analisador são preservados na API, exportação de dados e descrições usadas no PDF.
- Correções de gênero, clima e instrumentação são armazenadas separadamente dos resultados originais do analisador.
- A busca foi identificada como semântica por metadados e descrições, com aviso explícito de que não compara o som.
- Catálogos pequenos e correspondências textuais fracas recebem avisos de evidência limitada.
- A curadoria identifica semântica textual, origem das tags, confiança e método do analisador.
- Build do backend, 118 testes unitários, verificação TypeScript do frontend e build Angular aprovados.
- A migração `1789257600000-analysis-transparency.ts` deve ser aplicada no ambiente com PostgreSQL antes de iniciar a nova versão.
