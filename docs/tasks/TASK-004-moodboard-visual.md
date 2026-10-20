# TASK-004 — Criar um moodboard visual de pré-produção

**Prioridade:** P1  
**Status:** não iniciada  
**Dependências:** TASK-002

## Objetivo

Transformar o moodboard atual, predominantemente textual, em uma visão manipulável da música antes da DAW.

## Resultado esperado

O usuário deve compreender estrutura, energia, referências, instrumentação e intenção de cada seção sem precisar reler uma resposta extensa da IA.

## Escopo funcional

1. Criar uma linha do tempo com seções como intro, verso, refrão, ponte e outro.
2. Permitir editar nome, ordem, duração, compassos e objetivo de cada seção.
3. Representar a curva de energia ao longo da música.
4. Vincular uma ou mais referências a uma seção específica.
5. Registrar o aspecto utilizado de cada referência: ritmo, textura, instrumentação, estrutura, voz ou atmosfera.
6. Permitir cartões arrastáveis para instrumentação, produção, restrições e tarefas.
7. Manter uma visualização textual acessível e adequada a telas pequenas.
8. Versionar alterações e permitir comparar duas versões.
9. Preservar exportação em PDF com uma representação legível da linha do tempo.
10. Permitir regeneração parcial de uma seção sem substituir decisões confirmadas em outras.

## Modelo de dados mínimo

Cada seção deve possuir:

- identificador estável;
- nome e ordem;
- duração aproximada ou quantidade de compassos;
- nível de energia;
- intenção emocional;
- instrumentos e papéis;
- referências vinculadas e aplicação pretendida;
- notas de produção;
- origem e estado de confirmação dos dados.

## Requisitos de interação

- Alterações manuais nunca são sobrescritas silenciosamente pela IA.
- Reordenação deve funcionar por teclado, não apenas por arrastar.
- A experiência deve permanecer utilizável em celular.
- O sistema deve avisar quando a soma das seções divergir muito da duração desejada.

## Fora do escopo

- Editor multipista.
- Reprodução sincronizada de todas as referências.
- Edição de forma de onda.
- Geração automática de áudio.

## Critérios de aceite

- Usuário cria, reordena, edita e exclui seções.
- Usuário associa referências e instruções a seções específicas.
- Curva de energia e duração total são atualizadas imediatamente.
- Regeneração parcial preserva campos bloqueados ou editados manualmente.
- Duas versões podem ser comparadas sem perda de histórico.
- PDF contém estrutura, referências e legendas compreensíveis.
- Em teste, pelo menos 80% dos participantes identificam a estrutura e o próximo passo sem abrir o chat.

## Métricas

- edições manuais por seção;
- referências vinculadas a seções;
- regenerações totais versus parciais;
- tempo entre abertura do moodboard e exportação;
- percepção de clareza do plano.
