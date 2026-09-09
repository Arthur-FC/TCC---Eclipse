# Relatório de avaliação da etapa 20

Gerado em 2026-09-09T00:38:31.829Z. O método e o corpus são versionados no repositório. Valores sem amostra não são substituídos por estimativas.

## Resultados automatizados

- Corpus fixo: 8 briefings, 8 gêneros e 8 contextos.
- Última execução: 24 suítes/108 testes unitários e 23 testes E2E aprovados.
- Contratos avaliados: JSON de briefing, JSON de moodboard, referências permitidas, quotas locais, arquivos inválidos/corrompidos/grandes, isolamento e layouts responsivos.
- Informações inventadas: IDs fora da seleção e campos fora do esquema são rejeitados automaticamente.

## Métricas observadas no banco

| Métrica | Resultado | Amostra |
|---|---:|---:|
| Relevância média das referências (1–5) | sem amostra | 0 avaliação(ões) |
| Utilidade média do moodboard (1–5) | sem amostra | 0 avaliação(ões) |
| Intenção média de reutilização (1–5) | sem amostra | 0 avaliação(ões) |
| Referências aprovadas | sem amostra | 0 referência(s) |
| Tempo médio do primeiro texto ao moodboard | sem amostra | 0 projeto(s) completo(s) |
| Tokens médios de entrada por projeto | sem amostra | 0 projeto(s) com uso registrado |
| Tokens médios de saída por projeto | sem amostra | 0 projeto(s) com uso registrado |
| Custo médio estimado por projeto | tarifas/câmbio não configurados | 0 projeto(s) com uso registrado |

## Interpretação

A meta acadêmica é nota média mínima de 4,00 para relevância e utilidade. Ela só pode ser aprovada depois da coleta com participantes reais. Configure as tarifas apenas se houver cobrança efetiva; no plano gratuito, registre também a evidência do painel do provedor.

## Reprodução

Execute `pnpm --dir backend test`, `pnpm --dir backend test:e2e`, os builds e `pnpm --dir backend evaluation:report`. O protocolo completo está em `backend/evaluation/README.md` e o corpus em `backend/src/evaluation/evaluation-fixtures.ts`.
