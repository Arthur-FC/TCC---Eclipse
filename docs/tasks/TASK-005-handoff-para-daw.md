# TASK-005 — Criar entrega acionável para a DAW

**Prioridade:** P1  
**Status:** não iniciada  
**Dependências:** TASK-002 e TASK-004

## Objetivo

Converter o plano de pré-produção em arquivos e instruções que reduzam o trabalho de iniciar uma sessão em uma DAW.

## Etapa 1 — pacote universal

Criar um arquivo ZIP contendo:

- resumo do briefing em Markdown ou texto;
- estrutura da música em CSV e JSON;
- referências e observações por seção, sem copiar áudio de terceiros;
- checklist de pistas e instrumentos;
- notas de produção, restrições e próximos passos;
- moodboard em PDF;
- manifesto com versão, data e proveniência.

## Etapa 2 — MIDI e marcadores

Após validação do pacote universal:

- exportar MIDI opcional para progressão harmônica confirmada;
- gerar marcadores de seções em formatos abertos ou facilmente importáveis;
- incluir tempo, compasso e tonalidade apenas quando confirmados ou claramente marcados como estimativa;
- documentar importação em Ableton Live, FL Studio, Logic Pro e Reaper.

## Regras

- Nenhum áudio do YouTube ou Spotify pode ser incluído.
- Links devem manter sua origem.
- Conteúdo gerado pela IA deve ser distinguido de decisões confirmadas pelo usuário.
- Exportações devem ser reproduzíveis a partir da mesma versão do moodboard.
- O usuário escolhe quais itens entram no pacote.

## Fora do escopo inicial

- Gerar projetos nativos completos de todas as DAWs.
- Instalar plugins na máquina do usuário.
- Sincronizar alterações de volta da DAW.
- Gerar stems ou arranjos completos.

## Critérios de aceite

- Pacote universal é gerado para uma versão confirmada do projeto.
- Arquivos podem ser abertos sem software proprietário.
- Links e referências apontam para suas fontes corretas.
- MIDI, quando solicitado, contém tempo, compasso e progressão esperados.
- Há instruções testadas para pelo menos duas DAWs, incluindo uma disponível no Windows.
- O download respeita autenticação e isolamento por usuário.
- Testes verificam nomes seguros, conteúdo do ZIP, versão e ausência de URLs privadas expiradas.

## Métrica de sucesso

- percentual de moodboards que geram um pacote;
- percentual de participantes que abre a DAW após a exportação;
- tempo para criar a sessão inicial;
- utilidade percebida do pacote, de 1 a 5.
