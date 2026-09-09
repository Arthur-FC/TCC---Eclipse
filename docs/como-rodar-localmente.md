# Como rodar o Eclipse em outro computador

Este guia considera um computador com Windows 10 ou 11 sem ferramentas de programação instaladas.

## 1. Instale os programas necessários

Instale os três programas abaixo usando as opções padrão dos instaladores:

1. [Node.js LTS](https://nodejs.org/en/download/) — use a versão 22 ou mais recente.
2. [Git para Windows](https://git-scm.com/install/windows).
3. [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/).

Depois, reinicie o computador. Abra o Docker Desktop e espere aparecer que o mecanismo está em execução.

> Recomenda-se um computador de 64 bits com pelo menos 8 GB de memória RAM e conexão com a internet durante a instalação.

## 2. Baixe o projeto

Abra o **PowerShell** pelo menu Iniciar e execute:

```powershell
git clone https://github.com/Arthur-FC/TCC---Eclipse.git
cd TCC---Eclipse
```

Se não quiser usar Git, baixe o projeto pelo botão **Code > Download ZIP** no GitHub, extraia o arquivo e abra o PowerShell dentro da pasta extraída.

## 3. Instale as dependências

Ainda na pasta principal do projeto, execute:

```powershell
npm install
npm install -g pnpm@11.19.0
cd backend
pnpm install
```

Na primeira instalação, os downloads podem levar alguns minutos.

## 4. Configure o backend

Na pasta `backend`, crie o arquivo de configuração:

```powershell
Copy-Item .env.example .env
notepad .env
```

No arquivo aberto, preencha pelo menos a chave da Groq:

```env
GROQ_API_KEY=sua_chave_aqui
```

Salve e feche o Bloco de Notas. A chave da Groq é necessária para o chat, briefing e moodboard com inteligência artificial.

As chaves do YouTube, Spotify e Cloudflare são opcionais. Sem elas, somente as integrações correspondentes ficam limitadas; o restante do sistema continua disponível.

> Não compartilhe nem publique o arquivo `backend/.env`, pois ele contém chaves privadas.

## 5. Inicie o banco de dados e o armazenamento

Com o Docker Desktop aberto, execute na pasta `backend`:

```powershell
docker compose up -d postgres minio
pnpm db:migration:run
```

Esses comandos iniciam o PostgreSQL e o MinIO e preparam as tabelas do sistema.

## 6. Inicie o backend

No mesmo PowerShell, execute:

```powershell
pnpm start:dev
```

Deixe essa janela aberta. A API ficará disponível em `http://localhost:3002/api`.

## 7. Inicie a interface

Abra uma segunda janela do PowerShell, entre na pasta principal do projeto e execute:

```powershell
cd TCC---Eclipse
npm start
```

Se a pasta estiver em outro local, use o caminho correto no comando `cd`.

Deixe essa janela aberta e acesse no navegador:

<http://localhost:4200>

## Como desligar

Pressione `Ctrl + C` nas duas janelas do PowerShell. Para desligar também os serviços do Docker, execute dentro da pasta `backend`:

```powershell
docker compose down
```

Esse comando mantém os dados cadastrados para a próxima execução.

## Próximas vezes

Não é necessário reinstalar tudo. Abra o Docker Desktop e execute:

**Primeiro PowerShell, na pasta `backend`:**

```powershell
docker compose up -d postgres minio
pnpm start:dev
```

**Segundo PowerShell, na pasta principal:**

```powershell
npm start
```

Depois, abra <http://localhost:4200>.

## Problemas comuns

- **Docker não conecta:** abra o Docker Desktop e espere o mecanismo terminar de iniciar.
- **`pnpm` não é reconhecido:** feche e abra novamente o PowerShell. Se continuar, use `pnpm.cmd` no lugar de `pnpm`.
- **A página abre, mas não carrega os dados:** confirme que o backend continua aberto e teste <http://localhost:3002/api/health>.
- **A inteligência artificial não responde:** confira se `GROQ_API_KEY` foi preenchida corretamente em `backend/.env` e reinicie o backend.
- **Uma porta já está em uso:** feche outras execuções do Eclipse e tente novamente.

