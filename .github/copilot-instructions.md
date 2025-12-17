# discordIA - Copilot Instructions

## Project Overview
discordIA is a competitive AI chat platform where multiple AI models (ChatGPT, Gemini, Deepseek, Grok) compete to provide the best responses. Built with NestJS, TypeScript, and MongoDB.

## Architecture

### Core Concept
- **Multi-AI orchestration**: AppService coordinates parallel calls to 4 AI services
- **Context-based behavior**: Each AI has different system prompts based on context (chat, games, battles)
- **Session & history tracking**: User interactions stored per context with agent attribution

### Service Structure
```
AppService (orchestrator)
├── ChatGptService (OpenAI GPT-4o)
├── DeepseekService
├── GeminiService (@google/genai)
└── GrokService
```

Each AI service follows the same pattern:
- `execute(context, question, history)` - Main method with context-specific temperature
- `getRecentHistory(userId, limit)` - Fetch conversation history
- `addHistory(context, userId, role, content, agentName?)` - Save messages
- Uses `getCustomContent(context, agentName)` from `src/utils/getCustomContent.ts` for system prompts

## Key Conventions

### Allowed Values (enforced in controllers)
- **Agents**: `['deepseek', 'gemini', 'chat-gpt', 'grok']` (see `src/shared/global.service.ts`)
- **Contexts**: `['chat', 'chess', 'hangman-chooser', 'hangman-guesser', 'jokenpo', 'rpg', 'rap-battle']`

### Entities & MongoDB
- Use TypeORM with MongoDB driver
- All entities use `ObjectId` from mongodb, not TypeORM's default
- Entity naming: `IA_Agent`, `History`, `Session` (see `src/entities/`)
- Primary key: `@ObjectIdColumn() _id: ObjectId`
- Repository type: `MongoRepository<Entity>` not `Repository`

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

## Development Workflows

### Package Manager
**Always use `pnpm`**, not npm or yarn:
```bash
pnpm install                 # Install dependencies
pnpm run start:dev           # Watch mode development
pnpm run build               # Build with increased memory
pnpm run test                # Unit tests
pnpm run test:e2e            # E2E tests
```

### Environment Variables
Required vars (see `.env`):
- `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY` (AI services)
- `USER_DATABASE`, `PASS_DATABASE`, `DATABASE_NAME` (MongoDB Atlas)
- `JWT_SECRET` (authentication)
- `PORT` (defaults to 3000)

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

### Context-Specific Behavior
- Each context (chat, games) has unique system prompts and temperature settings
- See `dynamicTemperature` and `getCustomContent()` in `src/utils/getCustomContent.ts`
- AIs have competitive personas in chat context, game-specific instructions in others

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
- Recent history (last 10 messages) passed to AI for context
- Retrieved in reverse chronological order, then reversed for correct sequence

## Common Patterns

### Error Handling
- Controllers catch and return `HttpStatus.INTERNAL_SERVER_ERROR`
- Services log errors and re-throw for controller handling
- Validation uses NestJS `ValidationPipe` with `whitelist: true` (see `main.ts`)

### CORS Configuration
Origins: `http://localhost:5173` (dev) and `https://discordia.app.br` (prod)
Credentials enabled for cookie-based auth

### Testing
- All services and controllers have `.spec.ts` files
- Use Jest with `ts-jest` transformer
- Tests live alongside implementation files

## Quick Reference

**Main entry point**: `src/main.ts`  
**AI orchestration**: `src/app.service.ts`  
**AI system prompts**: `src/utils/getCustomContent.ts`  
**Auth logic**: `src/modules/auth/` (JWT strategy, login service)  
**Shared constants**: `src/shared/global.service.ts`
