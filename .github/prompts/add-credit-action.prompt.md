---
description: "Adiciona uma nova ação cobrada ao discordIA (backend + frontend): CREDIT_COSTS, ACTION_CAPABILITY, guards/interceptor/decorator, FeatureGate e sync de crédito."
argument-hint: "Nome da ação (ex.: VOICE_CLONE) e capability exigida (chat | games | audio | music)"
agent: "agent"
---

# Adicionar nova ação cobrada

Use este prompt para introduzir uma nova cobrança de créditos. Informe:
- **Nome da ação** (ex.: `VOICE_CLONE`) — screaming_snake_case.
- **Custo em créditos**.
- **Capability** que o plano precisa ter: `chat`, `games`, `audio` ou `music`.
- **Endpoint** que será cobrado (controller + método HTTP).
- **Tipo de fluxo**: simples (1 passo) ou composto (ex.: gera texto → sintetiza áudio).

Se alguma informação estiver faltando, pergunte antes de prosseguir.

---

## Backend (`discordia/`)

### 1. `src/modules/credits/credit-costs.ts`

Adicione ao objeto `CREDIT_COSTS`:
```ts
NOME_DA_ACTION: <custo>,
```
Adicione ao `ACTION_CAPABILITY`:
```ts
NOME_DA_ACTION: '<capability>',
```
`CreditAction` é inferido de `keyof typeof CREDIT_COSTS`; não precisa de union manual.

### 2. Decorar o endpoint (fluxo simples)

```ts
@UseGuards(AuthGuard('jwt'), CreditsGuard)
@UseInterceptors(CreditsRefundInterceptor)
@RequiresCredits('NOME_DA_ACTION')
@Post('/meu-endpoint')
async meuEndpoint(...) { ... }
```

Regras obrigatórias:
- Os três decorators **sempre juntos**, nessa ordem.
- Não chame `creditsService.charge()` manualmente quando usar o guard.

### 3. Fluxo composto (múltiplos passos com falha interna)

Quando o endpoint cobrar via guard (`GAME_ACTION`) **e** o service cobrar uma etapa extra (ex.: áudio):

```ts
// no service, dentro do try:
const charge = await creditsService.charge(userId, {
  amount: CREDIT_COSTS.NOME_DA_ACTION,
  action: 'NOME_DA_ACTION',
  reason: 'descricao_para_auditoria',
});
try {
  // etapa que pode falhar
} catch (err) {
  await creditsService.refund(charge.transactionId, 'razao_do_refund');
  throw err;
}
```

Nunca use `CreditsRefundInterceptor` para a cobrança interna — ele só cobre a cobrança do guard.

### 4. Lint + testes

```bash
cd discordia && pnpm run lint && pnpm run test
```

Verifique se há spec que cubra o novo endpoint (cobrança, refund, 402, 403). Se não houver, anote como débito técnico.

---

## Frontend (`discordia-front/`)

### 5. Verificar `FeatureGate` da rota/feature

Se a capability associada à ação ainda não protege a rota:

```tsx
// src/App.tsx
<FeatureGate capability="<capability>">
  <MeuComponente />
</FeatureGate>
```

Adicione `requiresCapability: '<capability>'` ao item em `src/config/navigation.ts` se a feature aparecer na navbar.

### 6. Tratar erros de crédito

O interceptor Axios (`src/server/api.ts`) já exibe toast para `402 INSUFFICIENT_CREDITS` e `403 FEATURE_NOT_ALLOWED`. Só adicione tratamento extra se a UI precisar de ação além do toast (ex.: desabilitar botão).

### 7. Lint

```bash
cd discordia-front && pnpm run lint
```

---

## Checklist final

- [ ] `CREDIT_COSTS.NOME_DA_ACTION` adicionado.
- [ ] `ACTION_CAPABILITY.NOME_DA_ACTION` aponta para a capability correta.
- [ ] Endpoint usa `@RequiresCredits` + `CreditsGuard` + `CreditsRefundInterceptor` (fluxo simples) **ou** refund manual em catch (fluxo composto).
- [ ] `FeatureGate` e navegação atualizados no front (se capability nova ou rota nova).
- [ ] Nenhum valor numérico de crédito hard-coded fora de `credit-costs.ts`.
- [ ] Lint + test passando nos dois projetos.
- [ ] `GET /auth/me` ainda retorna as capabilities corretas após a mudança.

## Saída esperada

Ao finalizar, apresente:
1. Arquivos criados/alterados com links.
2. Resultado de lint e test.
3. Endpoints que cobram a nova ação e o custo associado.
