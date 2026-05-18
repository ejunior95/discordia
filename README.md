<p align="center">
  <img src="https://github.com/user-attachments/assets/b66e699f-70a2-43e4-b5da-015a9b5cc84a" width="250" alt="Nest Logo" />
</p>

<p align="center">Um chat conflituoso entre as principais IAs do mercado, disputando para dar a melhor resposta para suas perguntas.</p>

# discordIA

## Descrição

Prepare-se para uma experiência única de inteligência artificial!
discordIA é uma API NestJS que funciona como uma arena digital onde múltiplas IAs competem para entregar a melhor resposta possível.
Cada pergunta pode ser enviada para todos os agentes ou para um agente específico, mantendo histórico por usuário e contexto.

A API também gerencia jogos com IA, rounds e votos, estatísticas, planos, créditos, assinaturas, narração TTS para RPG e geração/polling de música para batalhas de rima.

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
- Planos, capacidades e créditos por ação
- Estatísticas, rounds e leaderboard
- Throttling global com limites curtos e médios
- OpenAI, Gemini, Deepseek e Grok
- AWS S3 para upload de avatar
- Resend para verificação de e-mail
- ElevenLabs para TTS
- Sunor para geração de música

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

Variáveis obrigatórias e opcionais aceitas pela aplicação:

| Variável                    | Uso                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`            | Chave da API da OpenAI                                                                    |
| `OPENAI_MODEL`              | Modelo da OpenAI, opcional; padrão `gpt-5.4-mini`                                         |
| `GEMINI_API_KEY`            | Chave da API do Gemini                                                                    |
| `GEMINI_MODEL`              | Modelo do Gemini, opcional; padrão `gemini-2.5-flash`                                     |
| `DEEPSEEK_API_BASE_URL`     | URL base da API Deepseek                                                                  |
| `DEEPSEEK_API_KEY`          | Chave da API Deepseek                                                                     |
| `DEEPSEEK_MODEL`            | Modelo da Deepseek, opcional; padrão `deepseek-v4-flash`                                  |
| `GROK_API_BASE_URL`         | URL base da API Grok                                                                      |
| `GROK_API_KEY`              | Chave da API Grok                                                                         |
| `GROK_MODEL`                | Modelo do Grok, opcional; padrão `grok-4.3`                                               |
| `USER_DATABASE`             | Usuário do MongoDB Atlas                                                                  |
| `PASS_DATABASE`             | Senha do MongoDB Atlas                                                                    |
| `DATABASE_NAME`             | Nome do banco de dados                                                                    |
| `AWS_ACCESS_KEY_ID`         | Credencial de acesso AWS                                                                  |
| `AWS_SECRET_ACCESS_KEY`     | Chave secreta AWS                                                                         |
| `AWS_REGION`                | Região do bucket S3                                                                       |
| `AWS_BUCKET_NAME`           | Bucket usado para avatares                                                                |
| `RESEND_API_KEY`            | Chave da Resend para envio de e-mails (verificação OTP e boas-vindas)                    |
| `JWT_SECRET`                | Segredo usado para assinar JWTs                                                           |
| `MUSIC_PROVIDER`            | Provider de música; atualmente `sunor`                                                     |
| `SUNOR_API_KEY`             | Chave da API Sunor                                                                         |
| `SUNOR_API_BASE_URL`        | URL base da Sunor; padrão `https://sunor.cc/api/v1`                                       |
| `ELEVENLABS_API_KEY`        | Chave da API ElevenLabs                                                                    |
| `ELEVENLABS_VOICE_ID_NARRATOR_PTBR` | Voz padrão para narração em português                                             |
| `ELEVENLABS_MODEL`          | Modelo ElevenLabs; padrão `eleven_multilingual_v2`                                        |
| `NODE_ENV`                  | Ambiente de execução; em `production`, o TypeORM não sincroniza entidades automaticamente |
| `PORT`                      | Porta da API, com padrão `3000`                                                           |
| `CORS_ORIGINS`              | Origens permitidas separadas por vírgula                                                  |

Por padrão, o CORS aceita `http://localhost:5173` e `https://discordia.app.br`, com credenciais habilitadas para autenticação via cookie.

O Gemini usa `gemini-2.5-flash` por padrão, com thinking desabilitado para priorizar a resposta final. Se uma resposta de `chat` bater no limite de tokens, o serviço tenta continuar automaticamente antes de devolver o texto ao cliente.

Nunca coloque valores reais de segredos em README, logs ou exemplos versionados.

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

- `POST /ask-to-all` - envia uma pergunta para todos os agentes, cobra créditos, salva round e retorna `roundId`.
- `POST /ask-to-one` - envia uma pergunta para um agente específico e cobra créditos.
- `POST /ai/game-action` - executa uma ação de jogo nos contextos `chess`, `hangman-chooser`, `hangman-guesser`, `jokenpo`, `rpg` e `rap-battle`.
- `POST /rounds/:id/vote` - registra o agente vencedor de um round.
- `POST /session/start` - inicia uma sessão para um contexto e uma lista de agentes.
- `POST /session/finish/:idSession` - encerra uma sessão.
- `POST /hangman/:idSession` - executa uma rodada do contexto de forca.
- `POST /create-agent` - cadastra um agente de IA.
- `GET /find-all-agents` - lista agentes cadastrados.
- `GET /find-agent/:id` - busca agente por ID.
- `PATCH /update-agent/:id` - atualiza metadados de um agente, como label e model.
- `DELETE /clear-history/:context` - limpa o histórico de um contexto.

### Planos, créditos e estatísticas

- `GET /billing/plans` - lista planos ativos (`free`, `basic`, `premium`).
- `GET /billing/subscription/me` - retorna a assinatura ativa do usuário autenticado.
- `GET /billing/invoices/me` - lista faturas do usuário autenticado.
- `GET /billing/payment-method/me` - retorna o método de pagamento padrão, quando existir.
- `GET /credits/me` - retorna saldo, franquia mensal, período e status ilimitado.
- `GET /credits/me/transactions` - lista transações de crédito com paginação simples.
- `POST /credits/admin/grant/:userId` - concede créditos manualmente; restrito a admin.
- `GET /stats/home` - snapshot para dashboard inicial.
- `GET /stats/me` - estatísticas do usuário autenticado.
- `GET /stats/me/rounds` - rounds recentes do usuário autenticado.
- `POST /stats/recompute` - recomputa estatísticas agregadas.

### Áudio e música

- `GET /music/rap-verse/:taskId/status` - consulta status de geração musical de um verso de batalha de rima.

Exceto `GET /health`, `POST /users`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/verify`, `GET /find-all-agents` e `GET /billing/plans`, as rotas principais usam autenticação JWT via cookie.

Chamadas de IA e jogos também passam pelo sistema de créditos. Saldo insuficiente deve retornar `402` com `code: "INSUFFICIENT_CREDITS"`; recurso fora do plano deve retornar `403` com `code: "FEATURE_NOT_ALLOWED"`.

## Planos e créditos

Planos são semeados automaticamente pelo `BillingService`:

- `free`: capacidade `chat`, 50 créditos mensais.
- `basic`: capacidades `chat` e `games`, 600 créditos mensais.
- `premium`: capacidades `chat`, `games`, `audio` e `music`, exibido como ilimitado com soft cap interno.

Custos por ação ficam em `src/modules/credits/credit-costs.ts`:

- `CHAT_ASK_ONE`: 1 crédito
- `CHAT_ASK_ALL`: 4 créditos
- `GAME_ACTION`: 1 crédito
- `RPG_TURN`: 3 créditos
- `RAP_VERSE_TEXT`: 2 créditos
- `TTS_RESPONSE`: 5 créditos
- `MUSIC_GEN`: 15 créditos

Roles `admin` e `beta_tester` são isentas de cobrança e têm acesso total às capacidades.

## Jogos e áudio

- `/ai/game-action` usa payloads validados por `src/utils/gamePromptBuilders.ts`.
- RPG pode gerar narração via ElevenLabs quando o mestre da campanha é uma IA; a resposta pode incluir `audio_url`.
- Batalha de rima pode submeter geração musical via Sunor; a resposta pode incluir `musicTaskId`, `musicStatus`, `creditsCharged` e `musicError`.
- O frontend deve consultar `GET /music/rap-verse/:taskId/status` até a música ficar pronta ou falhar.

## Estrutura do projeto

```text
src/
  app.controller.ts        # Rotas principais de IA, sessões e agentes
  app.service.ts           # Orquestração entre os provedores de IA
  app.module.ts            # Módulos, banco, throttling e providers globais
  main.ts                  # Bootstrap, CORS, Helmet, cookies e validação
  entities/                # Entidades MongoDB/TypeORM
  modules/                 # Auth, usuários, provedores de IA, billing, créditos, stats, TTS e música
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
