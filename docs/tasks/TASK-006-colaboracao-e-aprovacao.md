# TASK-006 — Adicionar colaboração e aprovação contextual

**Prioridade:** P2  
**Status:** não iniciada  
**Dependências:** TASK-002 e TASK-004

## Objetivo

Permitir que artista, produtor, colega ou professor revise a direção criativa sem depender de mensagens espalhadas em outros aplicativos.

## Primeira entrega

1. Criar link de revisão somente leitura com validade e revogação.
2. Permitir comentário geral e comentário associado a uma seção, referência ou decisão.
3. Permitir aprovar, pedir alteração ou marcar como resolvido.
4. Registrar autor, data e objeto relacionado ao comentário.
5. Notificar o proprietário dentro da aplicação.
6. Criar uma visão de alterações pendentes.

## Segunda entrega, condicionada ao uso

- convite de membros com papéis `proprietário`, `editor` e `revisor`;
- edição assíncrona por membros;
- histórico de alterações;
- comentários por timestamp em arquivos próprios;
- notificações por e-mail configuráveis.

## Requisitos de segurança

- Links devem usar tokens não previsíveis, expirar e poder ser revogados.
- Revisores não podem acessar biblioteca, conversas ou outros projetos.
- Downloads devem ser desabilitados por padrão para revisores.
- URLs privadas de áudio não podem ser persistidas em comentários.
- Exclusão de conta e exportação de dados devem abranger colaboração.

## Fora do escopo

- Rede social ou descoberta pública de usuários.
- Chat em tempo real.
- Videoconferência.
- Marketplace de profissionais.
- Edição simultânea antes de existir demanda comprovada.

## Critérios de aceite

- Um revisor sem conta consegue acessar apenas o projeto compartilhado enquanto o link for válido.
- Comentários aparecem no contexto correto e podem ser resolvidos.
- Revogação bloqueia acesso imediatamente.
- Dois projetos e dois usuários permanecem completamente isolados.
- Auditoria registra compartilhamento, acesso, comentário, aprovação e revogação.
- Interface funciona por teclado e em celular.

## Métricas

- projetos compartilhados;
- revisores convidados e ativos;
- comentários por projeto;
- tempo até aprovação;
- alterações realizadas após feedback;
- incidentes de permissão ou links expirados.
