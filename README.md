<p align="center">
  <img src="https://github.com/user-attachments/assets/b66e699f-70a2-43e4-b5da-015a9b5cc84a" width="250" alt="Nest Logo" />
</p>

<p align="center">Um chat conflituoso entre as principais IAs do mercado, disputando para dar a melhor resposta para suas perguntas.</p>

# discordIA

## Descrição

Prepare-se para uma experiência única de inteligência artificial!
discordIA é uma API NestJS que funciona como uma arena digital onde múltiplas IAs competem para entregar a melhor resposta possível.
Cada pergunta pode ser enviada para todos os agentes ou para um agente específico, mantendo histórico por usuário e contexto.

Agentes suportados:

- ChatGPT
- Gemini
- Deepseek
- Grok

Contextos suportados:

- `chat`
- `chess`
- `hangman-chooser`
- `hangman-guesser`
- `jokenpo`
- `rpg`
- `rap-battle`

## Stack

- Node.js 22
- NestJS 11
- TypeScript
- MongoDB Atlas com TypeORM
- JWT em cookie HTTP-only
- OpenAI, Gemini, Deepseek e Grok
- AWS S3 para upload de avatar
- Resend para verificação de e-mail

## Requisitos

- Node.js 22 ou compatível
- pnpm 11
- Acesso a um banco MongoDB Atlas
- Chaves das IAs e serviços externos usados pela aplicação

## Configuração do projeto

Instale as dependências:

```bash
pnpm install
```

Crie um arquivo `.env` com base em `.exemplo.env`:

```bash
cp .exemplo.env .env
```

Variáveis esperadas:

| Variável                    | Uso                                               |
| --------------------------- | ------------------------------------------------- |
| `OPENAI_API_KEY`            | Chave da API da OpenAI                            |
| `GEMINI_API_KEY`            | Chave da API do Gemini                            |
| `DEEPSEEK_API_BASE_URL`     | URL base da API Deepseek                          |
| `DEEPSEEK_API_KEY`          | Chave da API Deepseek                             |
| `GROK_API_BASE_URL`         | URL base da API Grok                              |
| `GROK_API_KEY`              | Chave da API Grok                                 |
| `USER_DATABASE`             | Usuário do MongoDB Atlas                          |
| `PASS_DATABASE`             | Senha do MongoDB Atlas                            |
| `DATABASE_NAME`             | Nome do banco de dados                            |
| `AWS_ACCESS_KEY_ID`         | Credencial de acesso AWS                          |
| `AWS_SECRET_ACCESS_KEY`     | Chave secreta AWS                                 |
| `AWS_REGION`                | Região do bucket S3                               |
| `AWS_BUCKET_NAME`           | Bucket usado para avatares                        |
| `RESEND_API_KEY`            | Chave da Resend para envio de e-mails             |
| `EMAIL_VERIFICATION_SECRET` | Segredo usado nos tokens de verificação de e-mail |
| `JWT_SECRET`                | Segredo usado para assinar JWTs                   |
| `PORT`                      | Porta da API, com padrão `3000`                   |
| `CORS_ORIGINS`              | Origens permitidas separadas por vírgula          |

Por padrão, o CORS aceita `http://localhost:5173` e `https://discordia.app.br`, com credenciais habilitadas para autenticação via cookie.

## Executar o projeto

```bash
# compilar a aplicação
pnpm run build

# executar a versão compilada
pnpm run start

# modo desenvolvimento com watch
pnpm run start:dev

# modo debug com watch
pnpm run start:debug

# produção
pnpm run start:prod
```

Quando a aplicação sobe, a API escuta em `http://localhost:3000` por padrão.

## Docker

O projeto inclui `Dockerfile` multi-stage e `docker-compose.yml` para executar a API na porta `3000` usando as variáveis do arquivo `.env`.

```bash
docker-compose up --build
```

## Testes e qualidade

```bash
# lint com correção automática
pnpm run lint

# testes unitários
pnpm run test

# testes em modo watch
pnpm run test:watch

# cobertura de testes
pnpm run test:cov

# testes e2e
pnpm run test:e2e
```

## Rotas principais

### Saúde

- `GET /health` - retorna status, uptime e timestamp da API.

### Autenticação

- `POST /auth/login` - autentica o usuário e grava o JWT no cookie `access_token`.
- `POST /auth/logout` - remove o cookie de autenticação.
- `GET /auth/verify?token=...` - verifica o e-mail do usuário.
- `GET /auth/me` - retorna o usuário autenticado.

### Usuários

- `POST /users` - cria usuário, com suporte a upload de avatar.
- `GET /users` - lista usuários.
- `GET /users/:id` - busca usuário por ID.
- `PATCH /users/:id` - atualiza usuário.
- `DELETE /users/:id` - remove usuário.
- `PATCH /users/:id/avatar` - atualiza o avatar no S3.

### IA, sessões e histórico

- `POST /ask-to-all` - envia uma pergunta para todos os agentes.
- `POST /ask-to-one` - envia uma pergunta para um agente específico.
- `POST /session/start` - inicia uma sessão para um contexto e uma lista de agentes.
- `POST /session/finish/:idSession` - encerra uma sessão.
- `POST /hangman/:idSession` - executa uma rodada do contexto de forca.
- `POST /create-agent` - cadastra um agente de IA.
- `GET /find-all-agents` - lista agentes cadastrados.
- `GET /find-agent/:id` - busca agente por ID.
- `PATCH /update-agent/:id` - atualiza a pontuação de um agente.
- `DELETE /clear-history/:context` - limpa o histórico de um contexto.

Exceto `GET /health`, `POST /users`, `POST /auth/login`, `POST /auth/logout` e `GET /auth/verify`, as rotas principais usam autenticação JWT via cookie.

## Estrutura do projeto

```text
src/
  app.controller.ts        # Rotas principais de IA, sessões e agentes
  app.service.ts           # Orquestração entre os provedores de IA
  app.module.ts            # Módulos, banco, throttling e providers globais
  main.ts                  # Bootstrap, CORS, Helmet, cookies e validação
  entities/                # Entidades MongoDB/TypeORM
  modules/                 # Auth, usuários e provedores de IA
  shared/                  # Serviços compartilhados, S3, e-mail e histórico
  utils/                   # Prompts, temperatura dinâmica e hash de senha
```

## Recursos

- [NestJS](https://docs.nestjs.com)
- [OpenAI](https://platform.openai.com/docs)
- [Gemini](https://gemini.google.com)
- [Deepseek](https://chat.deepseek.com)
- [TypeORM](https://typeorm.io)
- [MongoDB](https://www.mongodb.com/docs)

## Fique por dentro

- Criador - [Edvaldo de Ramos Junior](https://www.linkedin.com/in/deved-jr100/)
