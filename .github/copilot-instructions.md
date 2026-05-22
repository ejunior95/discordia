# discordIA Backend - Copilot Instructions

## Project Overview

discordIA is a competitive AI chat API where multiple AI models (ChatGPT, Gemini, Deepseek, Grok) compete to provide the best responses. It is a NestJS 11 / TypeScript API backed by MongoDB Atlas through TypeORM.

The backend also drives AI-powered game flows for chess, hangman, jokenpo, RPG, and rap battles through context-specific prompt builders. Current product surface includes subscriptions, credits, plan capabilities, stats, round voting, RPG TTS through ElevenLabs, and rap battle music generation through Sunor.

## Architecture

### Core Concept

- Multi-AI orchestration: `AppService` coordinates calls to four AI services.
- Context-based behavior: prompts and temperatures vary by context.
- Game-action prompts: `src/utils/gamePromptBuilders.ts` validates game payloads and builds prompts for `/ai/game-action`.
- Session and history tracking: user interactions are stored per context with optional agent attribution.
- Cookie-based auth and user profiles: JWT auth protects most routes, while user creation/update supports avatar uploads and email verification.
- Billing and credits: plans expose capabilities, credits are charged/refunded around AI actions, and balance is surfaced through `X-Credits-Balance`.
- Stats and voting: chat rounds are persisted, users vote for a winner, and stats feed the home dashboard and account pages.
- Audio: RPG master turns can synthesize narration with ElevenLabs; rap battles can create and poll music tasks with Sunor.

### Service Structure

```text
AppService (orchestrator)
├── ChatGptService (OpenAI)
├── DeepseekService
├── GeminiService (@google/genai)
└── GrokService
```

Each AI service follows the same provider contract:

```ts
execute(
  context: ChatContext,
  question: string,
  history: { role: 'user' | 'assistant'; content: string }[],
): Promise<{ response: string }>;
```

Most new orchestration should live in `src/app.service.ts`; keep provider-specific API details inside `src/modules/<provider>/<provider>.service.ts`.

## Key Conventions

### Allowed Values

- Agents: `['deepseek', 'gemini', 'chat-gpt', 'grok']` in `src/shared/global.service.ts`.
- Contexts: `['chat', 'chess', 'hangman-chooser', 'hangman-guesser', 'jokenpo', 'rpg', 'rap-battle']` in `src/shared/global.service.ts`.
- Use `AgentName`, `ChatContext`, `isAgentName`, and `isChatContext` instead of duplicating string checks.
- Game actions accept every context except `chat` through `GameActionContext`.

### Entities and MongoDB

- Use TypeORM with MongoDB driver.
- Use `MongoRepository<Entity>`, not `Repository<Entity>`.
- Use `ObjectId` from `mongodb`.
- Core entities: `IA_Agent`, `History`, `Session` in `src/entities/`.
- Users are defined in `src/modules/users/entities/user.entity.ts`.
- Billing entities live in `src/modules/billing/entities/`; credit entities live in `src/modules/credits/entities/`; chat competition rounds use `src/entities/round.entity.ts`.
- Primary key pattern: `@ObjectIdColumn() _id: ObjectId`.
- Convert string IDs with `new ObjectId(id)` before querying.
- Soft-delete patterns use `deleted_at: null` filters instead of hard deletes where implemented.
- Active sessions must filter `finished_at: null`.

### Authentication and Security

- JWT is stored in the `access_token` cookie, not in bearer headers.
- JWT extraction lives in `src/modules/auth/jwt.strategy.ts` using cookies.
- Protected routes use `@UseGuards(AuthGuard('jwt'))`.
- Current user may come from `req.user` or `@CurrentUser()`.
- Login writes an HTTP-only cookie with `sameSite: 'none'` and `secure: true`.
- Keep CORS `credentials: true`; default origins come from `CORS_ORIGINS` or `http://localhost:5173,https://discordia.app.br`.
- `main.ts` applies `helmet()`, `cookieParser()`, and the global `ValidationPipe`.
- `AppModule` registers a global `ThrottlerGuard` with short and medium limits.
- `AppModule` registers `CreditsBalanceInterceptor` globally; keep it in place so the frontend can update credit balance from `X-Credits-Balance`.
- Passwords use `bcryptjs`; hashing helpers live in `src/utils/hash.ts`.
- Email verification uses a 6-digit OTP code (bcrypt-hashed, 10 min TTL, 5 attempts max, 60s resend cooldown) handled by `UsersService` + `EmailService` via Resend; endpoints are `POST /auth/verify-email` and `POST /auth/resend-verification`. Login is blocked for unverified accounts with `403 EMAIL_NOT_VERIFIED`.
- Avatar upload goes through `S3Service`; controllers should not talk to S3 directly.
- Roles `admin` and `beta_tester` are exempt from credit charges and have all plan capabilities.

### Billing, Credits, and Capabilities

- Plans are seeded in `BillingService` from `src/modules/billing/seeders/plans.seed.ts`.
- Valid plan slugs are `free`, `basic`, and `premium`; do not introduce new `pro` references.
- Valid capabilities are `chat`, `games`, `audio`, and `music` (`PlanCapability`).
- `AuthController.getMe()` enriches the authenticated user with `plan` and `credits`; keep this response synchronized with the frontend `CurrentUser` type.
- Credit costs live only in `src/modules/credits/credit-costs.ts` (`CREDIT_COSTS`, `ACTION_CAPABILITY`). Do not hard-code costs in controllers or services.
- Charged routes should use `AuthGuard('jwt')`, `CreditsGuard`, `CreditsRefundInterceptor`, and `@RequiresCredits(...)` when the guarded work can fail after charge.
- Expected error contract: `402` with `code: 'INSUFFICIENT_CREDITS'` for balance failures and `403` with `code: 'FEATURE_NOT_ALLOWED'` for plan capability failures.
- Admin grants go through `POST /credits/admin/grant/:userId` and must remain admin-only.

### Controller Pattern

```ts
@UseGuards(AuthGuard('jwt'))
@Post('/endpoint')
async method(
  @Body() body: SomeDto,
  @Req() req: Request & { user: UserResponseDto },
  @Res() res: Response,
) {
  const result = await this.appService.someMethod(body.value, req.user.id);
  return res.status(HttpStatus.OK).json(result);
}
```

Controllers commonly use explicit `@Res()` responses and local `try/catch` blocks. Preserve this style in nearby routes unless intentionally refactoring the whole controller.

### DTOs and Validation

- Main app DTOs live in `src/dtos/app.dtos.ts`.
- Use `class-validator` decorators for request bodies.
- `AskAllDto` validates `question`.
- `AskOneDto` validates `agent` against `ALLOWED_AGENTS`.
- `StartSessionDto` validates `context` and a non-empty agent array.
- `GameActionDto` validates `agent`, non-chat `context`, and object `payload`.
- `gamePromptBuilders.ts` performs deeper payload validation and should throw `BadRequestException` for invalid game payloads.

## AI and Game Integration

### Chat Flow

1. Controller receives authenticated request.
2. `AppService` fetches recent chat history with `HistoryService.getRecent(userId, 10, 'chat')`.
3. `askToAll()` calls providers with `Promise.allSettled` and tolerates partial provider failure.
4. User question and successful assistant responses are persisted through `HistoryService.add()`.
5. Response shape is keyed by agent name.

### Game Action Flow

Use `POST /ai/game-action` for frontend game features. The request shape is:

```ts
{
  context: 'chess' | 'hangman-chooser' | 'hangman-guesser' | 'jokenpo' | 'rpg' | 'rap-battle';
  agent: AgentName;
  payload: Record<string, unknown>;
}
```

`AppService.askGameAction()` must:

- resolve the provider from the local `providers` record;
- build the prompt with `buildGameActionPrompt(context, agent, payload)`;
- call `provider.execute(context, prompt, [])`;
- save a user summary with `summarizeGameAction(context, payload)`;
- save the assistant response with the selected agent;
- return `{ [agent]: { response } }`.

Audio extensions:

- For RPG, when `payload.campaign.master === agent`, synthesize TTS with `ElevenLabsService`, upload through `S3Service`, save `audio_url`/`audio_meta` in history, and return `audio_url`. If TTS fails, refund `TTS_RESPONSE` and abort the turn without assistant history.
- For rap battle, save the assistant verse, charge `MUSIC_GEN`, submit a Sunor task through `MusicGenerationService`, and return `musicTaskId`, `musicStatus`, `creditsCharged`, and/or `musicError` when available. If task submission fails before generation, refund the music charge.
- Music polling is exposed by `GET /music/rap-verse/:taskId/status` and finalizes history audio metadata when ready or failed.

### Supported Game Payloads

- `chess`: `fen`, `pgn`, `side`, `level`, optional `lastInvalid`.
- `hangman-chooser`: `category`, `usedWords`.
- `hangman-guesser`: `category`, `pattern`, `wrongLetters`, `triedLetters`.
- `jokenpo`: `history` with `{ user, ai }` rounds.
- `rap-battle`: `agent`, `opponent`, `theme`, `roundIndex`, optional previous verses.
- `rpg`: `campaign` with scenario, master, players, turn order, characters, turns, and status.

Keep these payload contracts synchronized with the frontend hooks in `discordia-front/src/features/*/hooks`.

### Sessions and Hangman Legacy Flow

- `POST /session/start` creates a `Session` with `user_id`, `context`, and resolved `agent_ids`.
- `POST /session/finish/:idSession` sets `finished_at`.
- `findSessionById()` returns only active sessions.
- `POST /hangman/:idSession` uses the first session agent and a larger history window for legacy hangman flow.

### Rounds and Stats

- `askToAll()` persists a `Round` with responses and returns `{ roundId, responses }`.
- `POST /rounds/:id/vote` is the source of truth for a round winner. It must verify the authenticated user owns the round, prevent double voting, and update stats through `StatsService.incrementOnVote()`.
- `StatsService` feeds `/stats/home`, `/stats/me`, `/stats/me/rounds`, and `/stats/recompute`. Keep returned shapes synchronized with frontend services and home/account hooks.

## Development Workflows

### Package Manager

Always use `pnpm`, not npm or yarn:

```bash
pnpm install
pnpm run start:dev
pnpm run build
pnpm run lint
pnpm run test
pnpm run test:e2e
```

`pnpm run lint` runs ESLint with `--fix`; mention any files it modifies.

### Environment Variables

Required and supported vars are documented in `README.md` and `.exemplo.env`. Important groups:

- AI providers: `OPENAI_API_KEY`, `OPENAI_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `GROK_API_BASE_URL`, `GROK_API_KEY`, `GROK_MODEL`.
- Database: `USER_DATABASE`, `PASS_DATABASE`, `DATABASE_NAME`, `NODE_ENV`.
- Auth and app: `JWT_SECRET`, `PORT`, `CORS_ORIGINS`.
- Upload and email: AWS S3 vars, `RESEND_API_KEY`.
- Audio and music: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_NARRATOR_PTBR`, `ELEVENLABS_MODEL`, `MUSIC_PROVIDER`, `SUNOR_API_KEY`, `SUNOR_API_BASE_URL`.

Never invent real secret values in code, docs, or logs.

### Docker

```bash
docker-compose up --build
```

The Docker setup serves the API on port `3000` using `.env` values.

## Common Changes

### Adding a New AI Provider

1. Create `src/modules/<ai-name>/` with module, service, controller if needed, and focused specs.
2. Implement the `execute(context, question, history)` provider contract.
3. Add the module to `AppModule`.
4. Add the provider to `AppService.providers`.
5. Add the agent to `ALLOWED_AGENTS`.
6. Add prompts and temperatures in `getCustomContent.ts`.
7. Update game prompt support if the provider needs special handling.
8. Update frontend agent types, icons, labels, cards, selectors, services, and tests/validation.

### Adding a New Game Context

1. Add the context to `ALLOWED_CONTEXTS` and update the `ChatContext` consumers.
2. Update `GameActionDto` if the context should be accepted by `/ai/game-action`.
3. Add parser, prompt builder, and summary logic to `gamePromptBuilders.ts`.
4. Add or update specs in `src/utils/gamePromptBuilders.spec.ts`.
5. Update frontend `GameActionContext`, feature hook, route, UI, selected-agent flow, and sessionStorage migration/sanitization.
6. Decide whether the context needs a credit action/capability and update `CREDIT_COSTS`, `ACTION_CAPABILITY`, frontend `FeatureGate`, and route navigation.

### Error Handling

- Controllers usually return explicit status JSON for handled failures.
- Services may throw Nest exceptions such as `BadRequestException` and `NotFoundException`.
- Provider errors in `askToAll()` should be logged and represented as per-agent failure without failing the whole request.
- For charged flows, ensure failures after charge are refunded by `CreditsRefundInterceptor` or explicit refund logic in composed operations.

## Testing

- Unit tests use Jest with `ts-jest` and live alongside implementation files as `.spec.ts`.
- E2E tests live under `test/`.
- Add focused specs for orchestration, DTO-sensitive behavior, prompt builders, and error handling when touched.
- For contract changes, validate both backend and frontend.

## Quick Reference

- Entry point: `src/main.ts`
- Root module: `src/app.module.ts`
- Main controller: `src/app.controller.ts`
- AI orchestration: `src/app.service.ts`
- Shared constants: `src/shared/global.service.ts`
- History: `src/shared/history.service.ts`
- Rounds: `src/entities/round.entity.ts`
- Billing: `src/modules/billing/`
- Credits: `src/modules/credits/`
- Stats: `src/modules/stats/`
- TTS: `src/modules/tts/elevenlabs.service.ts`
- Music generation: `src/modules/music-generation/`
- AI system prompts and temperatures: `src/utils/getCustomContent.ts`
- Game prompt builders: `src/utils/gamePromptBuilders.ts`
- Auth: `src/modules/auth/`
- Users: `src/modules/users/`
