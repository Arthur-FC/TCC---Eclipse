# Eclipse — visão geral do projeto

## O que é

O Eclipse é um protótipo de assistente de criação musical desenvolvido como Trabalho de Conclusão de Curso.

Ele ajuda músicos, compositores, produtores e estudantes a transformar uma ideia inicial em uma direção criativa organizada. O sistema não cria a música automaticamente: ele auxilia nas decisões e na organização do projeto.

## O que o sistema faz

O usuário pode:

- criar uma conta e projetos musicais;
- conversar com uma inteligência artificial sobre a ideia da música;
- gerar, revisar e confirmar um briefing criativo;
- pesquisar e adicionar referências do YouTube, Spotify, links externos e biblioteca própria;
- aprovar, rejeitar, ordenar e comparar referências;
- enviar arquivos MP3 ou WAV para uma biblioteca privada;
- obter estimativas de duração, BPM, tonalidade e características do áudio;
- pesquisar músicas da biblioteca usando linguagem natural;
- gerar um moodboard e um roteiro de produção baseados no briefing e nas referências aprovadas;
- exportar o moodboard em PDF;
- manter o contexto do projeto nas conversas seguintes;
- registrar uma avaliação da experiência para a pesquisa acadêmica.

## Fluxo principal

1. O usuário cria um projeto e descreve a ideia musical no chat.
2. A inteligência artificial organiza a ideia em um briefing.
3. O usuário revisa e confirma esse briefing.
4. O sistema reúne e classifica referências musicais.
5. O usuário escolhe as referências que fazem sentido.
6. A inteligência artificial gera o moodboard e o roteiro de produção.
7. O resultado pode ser revisado, consultado em versões anteriores e exportado em PDF.

## Tecnologias principais

- **Interface:** Angular e Ionic.
- **Backend:** NestJS e Node.js.
- **Banco de dados:** PostgreSQL com pgvector.
- **Arquivos de áudio:** MinIO.
- **Inteligência artificial:** Groq.
- **Busca semântica:** Cloudflare Workers AI, quando configurado.
- **Referências externas:** YouTube Data API e Spotify Web API, quando configurados.

## Privacidade e segurança

- Cada usuário acessa somente seus próprios projetos e arquivos.
- Os áudios enviados ficam em armazenamento privado.
- A análise técnica do áudio é feita localmente pelo backend.
- O sistema possui autenticação, limites de uso, exportação de dados e desativação de conta.
- Chaves e senhas são mantidas em um arquivo local que não deve ser publicado.

## Limitações

- O Eclipse não gera nem finaliza músicas.
- Os resultados da inteligência artificial e da análise de áudio são sugestões ou estimativas e devem ser revisados pelo usuário.
- Algumas funções dependem de chaves externas da Groq, YouTube, Spotify ou Cloudflare.
- O projeto é um MVP acadêmico, criado para validar a utilidade do processo proposto.

## Objetivo do projeto

O objetivo é avaliar se uma ferramenta com chat, briefing, referências e moodboard ajuda a tornar o início de um projeto musical mais claro, organizado e consistente.
