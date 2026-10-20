# TASK-007 — Implementar similaridade e análise real de áudio

**Prioridade:** P2  
**Status:** descoberta técnica não iniciada  
**Dependências:** TASK-002 e TASK-003

## Objetivo

Complementar a busca textual com representações calculadas diretamente do áudio autorizado pelo usuário, mantendo explicabilidade, privacidade e custo controlado.

## Fase 0 — benchmark antes da implementação

1. Montar um corpus autorizado e diversificado com consultas esperadas.
2. Definir métricas de recuperação, latência, custo e espaço.
3. Avaliar modelos adequados a texto–áudio e áudio–áudio.
4. Comparar processamento local, worker próprio e provedor externo.
5. Verificar licenças dos modelos e conjuntos usados em treinamento.
6. Medir qualidade contra a busca textual atual.
7. Registrar uma decisão técnica; não avançar se o ganho não for relevante.

## Fase 1 — similaridade por áudio

- gerar embedding de áudio para arquivos próprios autorizados;
- armazenar modelo, versão, dimensões e hash do arquivo;
- permitir “encontrar faixas do meu acervo com som semelhante”;
- combinar similaridade sonora, filtros técnicos e correspondência textual;
- distinguir claramente os componentes da pontuação;
- reindexar de forma assíncrona quando modelo ou arquivo mudar.

## Fase 2 — análise estrutural, se validada

- detectar seções prováveis;
- estimar curva de energia;
- extrair descritores tímbricos úteis;
- comparar referência autorizada e obra final;
- permitir correção manual e registrar confiança.

## Restrições

- Processar somente arquivos enviados com autorização explícita.
- Não baixar ou analisar áudio completo de YouTube ou Spotify.
- Não treinar modelos com arquivos dos usuários sem consentimento separado.
- Permitir exclusão dos embeddings junto com o áudio.
- Não transformar proximidade vetorial em afirmação artística absoluta.

## Critérios de aceite

- Benchmark demonstra ganho definido sobre o baseline textual.
- Busca diferencia modo textual, sonoro e híbrido.
- Resultados informam pontuação e limitações sem inventar explicações.
- Mudança de modelo dispara reindexação segura e versionada.
- Exclusão remove áudio, embeddings e derivados.
- Falha no analisador mantém a biblioteca e a busca textual disponíveis.
- Testes cobrem isolamento, reprocessamento, corrupção, timeout e fallback.

## Métricas

- precisão ou NDCG no corpus de benchmark;
- aprovação de resultados por usuários;
- latência p50/p95;
- custo e tempo por minuto de áudio;
- taxa de fallback;
- diferença de qualidade entre catálogo pequeno e grande.
