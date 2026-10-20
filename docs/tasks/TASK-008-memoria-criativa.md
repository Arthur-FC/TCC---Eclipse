# TASK-008 — Construir memória criativa longitudinal e privada

**Prioridade:** P2  
**Status:** não iniciada  
**Dependências:** TASK-002 e volume mínimo de projetos reais

## Objetivo

Usar o histórico do próprio usuário para melhorar decisões futuras sem transformar preferências em regras rígidas e sem treinar modelos externos com conteúdo privado.

## Pré-condição

Não implementar personalização forte antes de existirem projetos suficientes. Como referência inicial, exigir pelo menos três projetos com briefing confirmado e um projeto com obra final ou avaliação.

## Escopo

1. Registrar sinais explícitos:
   - referências aprovadas e rejeitadas;
   - tags corrigidas;
   - sugestões aceitas, editadas ou removidas;
   - seções e instrumentos recorrentes;
   - avaliações e motivos fornecidos pelo usuário.
2. Construir um perfil criativo legível e editável.
3. Permitir ativar ou desativar a personalização.
4. Explicar quando uma sugestão foi influenciada pelo histórico.
5. Diferenciar preferência observada, preferência declarada e contexto do projeto atual.
6. Comparar intenção inicial com a obra final quando houver autorização.
7. Permitir exportar, corrigir e apagar o perfil.
8. Aplicar decaimento ou revisão para não congelar o usuário em escolhas antigas.

## Exemplos de valor

- “Você costuma rejeitar referências com vocais muito presentes; deseja reduzir esse tipo de resultado?”
- “Em três projetos semelhantes, você manteve estruturas mais curtas que o primeiro plano.”
- “Esta instrumentação foi sugerida pelo briefing atual, não pelo seu histórico.”

## Guardrails

- Não inferir atributos pessoais sensíveis.
- Não utilizar dados de outros usuários para explicar preferências individuais.
- Não ocultar referências novas apenas porque divergem do histórico.
- Não modificar briefing ou moodboard confirmado sem aprovação.
- Não enviar o perfil completo a provedores quando um resumo mínimo for suficiente.

## Fora do escopo

- Fine-tuning de modelo com dados do usuário.
- Recomendação social entre usuários.
- Venda ou compartilhamento de perfis criativos.
- Pontuação pública de estilo ou talento.

## Critérios de aceite

- Usuário visualiza a origem de cada preferência registrada.
- Usuário corrige, exclui ou desativa o perfil.
- Personalização nunca cruza contas.
- Sugestões indicam quando usaram o histórico.
- Exclusão de conta remove perfil e sinais derivados.
- Testes demonstram que o projeto atual tem precedência sobre hábitos anteriores.
- Experimento controlado mostra melhoria de relevância ou a funcionalidade permanece desativada.

## Métricas

- aceitação de sugestões personalizadas versus não personalizadas;
- correções do perfil;
- usuários que desativam personalização;
- diversidade das referências antes e depois;
- relevância percebida;
- conclusão de projetos recorrentes.
