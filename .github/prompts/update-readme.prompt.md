---
description: "Use when: updating README.md after project, dependency, script, setup, or API changes in this NestJS workspace"
name: "Update README"
argument-hint: "Optional focus, such as setup, scripts, env vars, endpoints, or recent changes"
agent: "agent"
---

Update [README.md](../../README.md) so it accurately reflects the current state of this workspace.

Use any text provided with the prompt invocation as the focus area.

Process:

1. Inspect the existing README first and preserve its useful structure and project voice when possible.
2. Write README content in Brazilian Portuguese.
3. Inspect the relevant source/config files before editing. Prioritize [package.json](../../package.json), [docker-compose.yml](../../docker-compose.yml), [.exemplo.env](../../.exemplo.env), [src/app.module.ts](../../src/app.module.ts), [src/main.ts](../../src/main.ts), and changed files from the current git diff when available.
4. Update only README sections that are stale, missing, misleading, or directly related to the requested focus.
5. Keep setup and command examples aligned with this repository's package manager and scripts. Use `pnpm` commands unless the repository clearly changes package managers.
6. Document required environment variables at a practical level without exposing secrets or inventing values.
7. Mention important runtime expectations, such as MongoDB, cookies/auth, CORS, Docker, tests, and development commands, only when they are supported by the codebase.
8. Keep the README concise and useful for a developer cloning the project. Avoid marketing filler, unverified claims, and broad rewrites unrelated to the requested focus.
9. After editing, validate Markdown structure and report what changed plus anything that could not be verified.

Output style:

- Make the edit directly.
- Summarize changed sections in 2-5 bullets.
- List verification performed, or explain why verification was not run.
- Call out any remaining README gaps as follow-up items.
