# Eclipse — backlog de diferenciação do produto

**Criado em:** 7 de outubro de 2026  
**Objetivo:** transformar o Eclipse de um MVP acadêmico funcional em um produto de pré-produção musical validado e claramente diferenciado.

## Decisões de produto aprovadas

1. **Categoria:** o Eclipse será posicionado como um copiloto de pré-produção musical, e não como gerador de músicas ou plataforma musical genérica.
2. **Público inicial:** músicos independentes e estudantes de produção que começam ideias, mas têm dificuldade de definir referências, estrutura e próximos passos antes de abrir a DAW.

Proposta de valor de trabalho:

> O Eclipse transforma uma ideia musical em um plano claro, pesquisado e pronto para levar à DAW, mantendo as decisões artísticas com o músico.

## Regras de priorização

- Validar o problema e o fluxo antes de construir recursos caros.
- Priorizar o trecho entre a ideia inicial e o início da produção na DAW.
- Não competir por geração musical, masterização ou separação de stems como capacidade principal.
- Não apresentar inferências textuais como análise direta do som.
- Toda funcionalidade nova deve possuir métrica de adoção e critério de aceite verificável.
- Preservar privacidade, autoria humana, proveniência e possibilidade de exclusão dos dados.

## Ordem recomendada

| Ordem | Task | Prioridade | Dependências | Resultado principal |
|---:|---|---|---|---|
| 1 | [TASK-001 — Posicionamento e público inicial](./TASK-001-posicionamento-e-publico.md) | P0 | nenhuma | Produto e comunicação coerentes com a categoria escolhida |
| 2 | [TASK-002 — Instrumentação e validação com usuários](./TASK-002-validacao-com-usuarios.md) | P0 | TASK-001 | Evidência de que o fluxo resolve um problema real |
| 3 | [TASK-003 — Transparência da inteligência musical](./TASK-003-transparencia-inteligencia-musical.md) | P0 | nenhuma | Promessas, rótulos e confiança compatíveis com a implementação |
| 4 | [TASK-004 — Moodboard visual de pré-produção](./TASK-004-moodboard-visual.md) | P1 | TASK-002 | Experiência visual por seções, referências e curva de energia |
| 5 | [TASK-005 — Entrega para a DAW](./TASK-005-handoff-para-daw.md) | P1 | TASK-002 e TASK-004 | Plano convertido em artefatos acionáveis de produção |
| 6 | [TASK-006 — Colaboração e aprovação](./TASK-006-colaboracao-e-aprovacao.md) | P2 | TASK-002 e TASK-004 | Produtor, artista ou professor revisam o plano no contexto correto |
| 7 | [TASK-007 — Similaridade e análise real de áudio](./TASK-007-inteligencia-de-audio.md) | P2 | TASK-002 e TASK-003 | Busca baseada no som para arquivos autorizados |
| 8 | [TASK-008 — Memória criativa longitudinal](./TASK-008-memoria-criativa.md) | P2 | TASK-002 e dados reais suficientes | Recomendações personalizadas a partir do histórico do próprio usuário |

## Marcos sugeridos

### Marco A — proposta validável

TASK-001, TASK-002 e TASK-003 concluídas. O produto tem público e promessa claros, telemetria mínima e comunicação tecnicamente honesta.

### Marco B — melhor experiência antes da DAW

TASK-004 e TASK-005 concluídas. O usuário consegue visualizar a música por seções e levar um pacote acionável para sua sessão de produção.

### Marco C — vantagem competitiva

TASK-006, TASK-007 e TASK-008 concluídas de acordo com evidências de uso. O Eclipse passa a combinar colaboração, compreensão do áudio e aprendizado privado do processo criativo.

## Definição geral de pronto

Uma task somente pode ser marcada como concluída quando:

- os critérios de aceite funcionais forem demonstrados;
- permissões e isolamento entre usuários forem testados;
- falhas externas tiverem mensagens compreensíveis e fallback quando aplicável;
- testes automatizados proporcionais ao risco estiverem aprovados;
- a interface funcionar em desktop e celular;
- documentação e textos do produto estiverem atualizados;
- a métrica de sucesso estiver sendo registrada sem conteúdo sensível;
- nenhuma alegação comercial exceder o que foi tecnicamente verificado.
