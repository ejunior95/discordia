# discordIA - Copilot Instructions

## Project Overview
discordIA is a competitive AI chat platform where multiple AI models (ChatGPT, Gemini, Deepseek, Grok) compete to provide the best responses. It is a NestJS/TypeScript API backed by MongoDB through TypeORM.

## Architecture

### Core Concept
- **Multi-AI orchestration**: `AppService` coordinates calls to four AI services.
- **Context-based behavior**: prompts and temperatures vary by context (chat, games, RPG, rap battles).
- **Session & history tracking**: user interactions are stored per context with optional agent attribution.
- **Cookie-based auth and user profiles**: JWT auth protects most routes, while user creation/update supports avatar uploads and email verification.

### Service Structure
```
AppService (orchestrator)
├── ChatGptService (OpenAI GPT-4o)
├── DeepseekService
├── GeminiService (@google/genai)
└── GrokService (@anthropic-ai/sdk with Grok-compatible base URL)
```

Each AI service follows the same pattern:
- `execute(context, question, history)` - Main method with context-specific temperature
- `getRecentHistory(userId, limit)` - Fetch conversation history
- `addHistory(context, userId, role, content, agentName?)` - Save messages
- Uses `getCustomContent(context, agentName)` from `src/utils/getCustomContent.ts` for system prompts

Most new orchestration should live in `src/app.service.ts`; keep provider-specific API details inside `src/modules/<provider>/<provider>.service.ts`.

## Key Conventions

### Allowed Values (enforced in controllers)
- **Agents**: `['deepseek', 'gemini', 'chat-gpt', 'grok']` (see `src/shared/global.service.ts`)
- **Contexts**: `['chat', 'chess', 'hangman-chooser', 'hangman-guesser', 'jokenpo', 'rpg', 'rap-battle']`

### Entities & MongoDB
- Use TypeORM with MongoDB driver
- All entities use `ObjectId` from mongodb, not TypeORM's default
- Core entity naming: `IA_Agent`, `History`, `Session` (see `src/entities/`)
- Users are defined in `src/modules/users/entities/user.entity.ts`
- Primary key: `@ObjectIdColumn() _id: ObjectId`
- Repository type: `MongoRepository<Entity>` not `Repository`
- Soft-delete patterns use `deleted_at: null` filters instead of hard deletes where implemented

### Authentication
- JWT stored in **cookies** (`access_token`), not headers
- Extract JWT: `ExtractJwt.fromExtractors([(req) => req?.cookies?.access_token])`
- Strategy: `src/modules/auth/jwt.strategy.ts` validates and populates `req.user`
- Protected routes: `@UseGuards(AuthGuard('jwt'))`
- Current user: `@CurrentUser()` decorator (see `src/decorators/current-user.decorator.ts`)

### Controller Pattern
```typescript
@UseGuards(AuthGuard('jwt'))
@Post('/endpoint')
async method(@Req() req: Request & { user: UserResponseDto }, @Res() res: Response) {
  const userId = req.user?.id;
  // Manual response handling with res.status().json()
}
```

Controllers usually validate request values manually with `ALLOWED_AGENTS` and `ALLOWED_CONTEXTS`, then return explicit `res.status(...).json(...)` responses. Preserve this style unless refactoring the whole route.

### Users, Email, and File Uploads
- User logic lives in `src/modules/users/`.
- Passwords are hashed with `src/utils/hash.ts` and verified with `bcryptjs`.
- Avatar uploads go through `S3Service` in `src/shared/s3.service.ts`.
- Email verification goes through `EmailService` in `src/shared/email.service.ts` and `EMAIL_VERIFICATION_SECRET`.

## Development Workflows

### Package Manager
**Always use `pnpm`**, not npm or yarn:
```bash
pnpm install                 # Install dependencies
pnpm run start:dev           # Watch mode development
pnpm run build               # Build with increased memory
pnpm run lint                # ESLint with --fix
pnpm run test                # Unit tests
pnpm run test:e2e            # E2E tests
```

### Environment Variables
Required vars (see `.exemplo.env`):
- `OPENAI_API_KEY`, `GEMINI_API_KEY` (AI SDKs)
- `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_API_KEY`
- `GROK_API_BASE_URL`, `GROK_API_KEY`
- `USER_DATABASE`, `PASS_DATABASE`, `DATABASE_NAME` (MongoDB Atlas)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME` (avatar uploads)
- `RESEND_API_KEY`, `EMAIL_VERIFICATION_SECRET` (email verification)
- `JWT_SECRET` (authentication)
- `PORT` (optional; defaults to 3000)

### Docker
```bash
docker-compose up            # Run production container on port 3000
```

## AI Service Integration

### Adding a New AI Provider
1. Create module: `src/modules/<ai-name>/`
2. Implement service with `execute(context, question, history)` signature
3. Add to `AppModule` imports and providers
4. Add agent name to `ALLOWED_AGENTS` in `src/shared/global.service.ts`
5. Add system prompts for each context in `src/utils/getCustomContent.ts`
6. Update `AppService.askToAll()` and `AppService.askToOne()` orchestration
7. Update tests/specs next to affected services/controllers

### Context-Specific Behavior
- Each context has unique system prompts and temperature settings
- See `dynamicTemperature` and `getCustomContent()` in `src/utils/getCustomContent.ts`
- AIs have competitive personas in chat context, game-specific instructions in others
- Keep context string unions, `ALLOWED_CONTEXTS`, and prompt mappings synchronized

## Data Flow

### Typical Request Flow
1. **Client request** → Controller validates params (agent, context)
2. **AppService** fetches recent history for context
3. **Parallel execution** of AI service(s) with history + new question
4. **History persistence** saves user question + assistant responses (with agent_id)
5. **Response** returns all AI responses for user evaluation

### History Management
- Stored per `user_id` + `context` combination
- Each AI response tagged with `agent_id` for tracking
- Recent chat history usually uses the last 10 messages; hangman uses a larger window
- Retrieved in reverse chronological order, then reversed for correct sequence

## Common Patterns

### Error Handling
- Controllers catch and return `HttpStatus.INTERNAL_SERVER_ERROR` or throw Nest exceptions
- Services log errors and re-throw for controller handling
- Validation uses NestJS `ValidationPipe` with `whitelist: true` (see `main.ts`)

### CORS Configuration
Origins: `http://localhost:5173` (dev) and `https://discordia.app.br` (prod)
Credentials enabled for cookie-based auth

### Testing
- All services and controllers have `.spec.ts` files
- Use Jest with `ts-jest` transformer
- Tests live alongside implementation files
- Prefer adding or updating focused specs for changed behavior

## Quick Reference

**Main entry point**: `src/main.ts`  
**AI orchestration**: `src/app.service.ts`  
**AI system prompts**: `src/utils/getCustomContent.ts`  
**Auth logic**: `src/modules/auth/` (JWT strategy, login service)  
**User logic**: `src/modules/users/` (profiles, password updates, avatars, email verification)  
**Shared constants**: `src/shared/global.service.ts`
