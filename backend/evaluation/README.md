# Protocolo reproduzível de avaliação

1. Recrute participantes voluntários e informe finalidade, duração e tratamento dos dados conforme a aprovação institucional.
2. Use um identificador aleatório no registro da pesquisa; não grave nome, e-mail ou dado sensível na planilha acadêmica.
3. Distribua, em ordem balanceada, os oito casos de `src/evaluation/evaluation-fixtures.ts`.
4. Para cada caso, peça que a pessoa conclua o fluxo até o moodboard e avalie no próprio painel:
   - relevância das referências, de 1 (irrelevantes) a 5 (muito relevantes);
   - utilidade do moodboard, de 1 (inútil) a 5 (muito útil);
   - intenção de usar novamente, de 1 (certamente não) a 5 (certamente sim).
5. O comentário é opcional e não deve conter dados pessoais.
6. Registre separadamente qualquer informação técnica inventada, correção grande no briefing e falha crítica observada.
7. Repita o cenário após corrigir cada falha crítica e registre a versão/commit avaliada.
8. Gere as métricas agregadas com `pnpm evaluation:report`. O comando não exporta comentários nem identifica participantes.

Para custo estimado, informe opcionalmente `GROQ_INPUT_COST_PER_MILLION_USD`, `GROQ_OUTPUT_COST_PER_MILLION_USD` e `USD_BRL` no ambiente da execução. Sem esses valores, o relatório registra que não há cálculo monetário em vez de inventar uma tarifa.
