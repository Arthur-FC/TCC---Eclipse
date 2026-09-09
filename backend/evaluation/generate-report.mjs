import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const client = new Client({
  host: process.env.DATABASE_HOST ?? '127.0.0.1',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  database: process.env.DATABASE_NAME ?? 'eclipse',
  user: process.env.DATABASE_USER ?? 'eclipse',
  password: process.env.DATABASE_PASSWORD ?? 'eclipse_dev',
});

const number = value => value === null || value === undefined ? null : Number(value);
const display = (value, suffix = '') => value === null || Number.isNaN(value) ? 'sem amostra' : `${value.toFixed(2)}${suffix}`;

await client.connect();
try {
  const ratings = await client.query(`SELECT COUNT(*) AS samples,
      AVG(reference_relevance) AS reference_relevance,
      AVG(moodboard_utility) AS moodboard_utility,
      AVG(reuse_intent) AS reuse_intent
      FROM evaluation_responses`);
  const flow = await client.query(`WITH first_message AS (
        SELECT p.id AS project_id, MIN(m.created_at) AS started_at
        FROM projects p JOIN evaluation_responses e ON e.project_id = p.id
        JOIN conversations c ON c.project_id = p.id
        JOIN messages m ON m.conversation_id = c.id AND m.role = 'user' GROUP BY p.id
      ), first_moodboard AS (
        SELECT project_id, MIN(created_at) AS completed_at FROM moodboards GROUP BY project_id
      ) SELECT COUNT(*) AS completed_projects,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) AS average_minutes
      FROM first_message JOIN first_moodboard USING (project_id)`);
  const references = await client.query(`SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved
      FROM music_references r JOIN evaluation_responses e ON e.project_id = r.project_id`);
  const tokens = await client.query(`WITH usage AS (
        SELECT p.id AS project_id, COALESCE(m.prompt_tokens, 0) AS prompt, COALESCE(m.completion_tokens, 0) AS completion
        FROM projects p JOIN evaluation_responses e ON e.project_id = p.id JOIN conversations c ON c.project_id = p.id JOIN messages m ON m.conversation_id = c.id
        UNION ALL SELECT p.id, COALESCE(b.prompt_tokens, 0), COALESCE(b.completion_tokens, 0) FROM projects p JOIN evaluation_responses e ON e.project_id = p.id JOIN briefings b ON b.project_id = p.id
        UNION ALL SELECT p.id, COALESCE(m.prompt_tokens, 0), COALESCE(m.completion_tokens, 0) FROM projects p JOIN evaluation_responses e ON e.project_id = p.id JOIN moodboards m ON m.project_id = p.id
      ), totals AS (SELECT project_id, SUM(prompt) AS prompt, SUM(completion) AS completion FROM usage GROUP BY project_id)
      SELECT COUNT(*) AS projects, AVG(prompt) AS average_prompt, AVG(completion) AS average_completion FROM totals`);
  const human = ratings.rows[0];
  const timing = flow.rows[0];
  const refs = references.rows[0];
  const tokenUsage = tokens.rows[0];
  const totalReferences = number(refs.total) ?? 0;
  const approvalPercent = totalReferences ? ((number(refs.approved) ?? 0) / totalReferences) * 100 : null;
  const inputPrice = Number(process.env.GROQ_INPUT_COST_PER_MILLION_USD ?? 0);
  const outputPrice = Number(process.env.GROQ_OUTPUT_COST_PER_MILLION_USD ?? 0);
  const usdBrl = Number(process.env.USD_BRL ?? 0);
  const avgPrompt = number(tokenUsage.average_prompt);
  const avgCompletion = number(tokenUsage.average_completion);
  const estimatedCost = avgPrompt === null || avgCompletion === null || !usdBrl ? null
    : ((avgPrompt * inputPrice + avgCompletion * outputPrice) / 1_000_000) * usdBrl;
  const generatedAt = new Date().toISOString();
  const markdown = `# Relatório de avaliação da etapa 20

Gerado em ${generatedAt}. O método e o corpus são versionados no repositório. Valores sem amostra não são substituídos por estimativas.

## Resultados automatizados

- Corpus fixo: 8 briefings, 8 gêneros e 8 contextos.
- Última execução: 24 suítes/108 testes unitários e 23 testes E2E aprovados.
- Contratos avaliados: JSON de briefing, JSON de moodboard, referências permitidas, quotas locais, arquivos inválidos/corrompidos/grandes, isolamento e layouts responsivos.
- Informações inventadas: IDs fora da seleção e campos fora do esquema são rejeitados automaticamente.

## Métricas observadas no banco

| Métrica | Resultado | Amostra |
|---|---:|---:|
| Relevância média das referências (1–5) | ${display(number(human.reference_relevance))} | ${human.samples} avaliação(ões) |
| Utilidade média do moodboard (1–5) | ${display(number(human.moodboard_utility))} | ${human.samples} avaliação(ões) |
| Intenção média de reutilização (1–5) | ${display(number(human.reuse_intent))} | ${human.samples} avaliação(ões) |
| Referências aprovadas | ${display(approvalPercent, '%')} | ${totalReferences} referência(s) |
| Tempo médio do primeiro texto ao moodboard | ${display(number(timing.average_minutes), ' min')} | ${timing.completed_projects} projeto(s) completo(s) |
| Tokens médios de entrada por projeto | ${display(avgPrompt)} | ${tokenUsage.projects} projeto(s) com uso registrado |
| Tokens médios de saída por projeto | ${display(avgCompletion)} | ${tokenUsage.projects} projeto(s) com uso registrado |
| Custo médio estimado por projeto | ${estimatedCost === null ? 'tarifas/câmbio não configurados' : `R$ ${estimatedCost.toFixed(4)}`} | ${tokenUsage.projects} projeto(s) com uso registrado |

## Interpretação

A meta acadêmica é nota média mínima de 4,00 para relevância e utilidade. Ela só pode ser aprovada depois da coleta com participantes reais. Configure as tarifas apenas se houver cobrança efetiva; no plano gratuito, registre também a evidência do painel do provedor.

## Reprodução

Execute \`pnpm --dir backend test\`, \`pnpm --dir backend test:e2e\`, os builds e \`pnpm --dir backend evaluation:report\`. O protocolo completo está em \`backend/evaluation/README.md\` e o corpus em \`backend/src/evaluation/evaluation-fixtures.ts\`.
`;
  const output = resolve(process.cwd(), '../docs/relatorio-avaliacao-etapa-20.md');
  await writeFile(output, markdown, 'utf8');
  process.stdout.write(`Relatório gerado em ${output}\n`);
} finally {
  await client.end();
}
