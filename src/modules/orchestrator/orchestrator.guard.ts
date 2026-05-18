import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { OrchestratorService } from './orchestrator.service';
import { ORCHESTRATOR_TARGET_KEY } from './orchestrator-target.decorator';
import {
  OrchestratorEndpoint,
  OrchestratorTargetKind,
} from './orchestrator.types';

interface ExtractedTarget {
  kind: OrchestratorTargetKind;
  text: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class OrchestratorGuard implements CanActivate {
  private readonly logger = new Logger(OrchestratorGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly orchestrator: OrchestratorService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const endpoint = this.reflector.getAllAndOverride<
      OrchestratorEndpoint | undefined
    >(ORCHESTRATOR_TARGET_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!endpoint) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const body = (req.body ?? {}) as Record<string, unknown>;

    let targets: ExtractedTarget[];
    try {
      targets = this.extractTargets(endpoint, body);
    } catch (err) {
      // Falha na extração nunca deve quebrar o fluxo principal.
      this.logger.warn(
        `Falha ao extrair targets do orquestrador: ${(err as Error).message}`,
      );
      return true;
    }

    for (const { kind, text, metadata } of targets) {
      const verdict = await this.orchestrator.validate(kind, text, metadata);
      if (verdict.severity === 'block') {
        throw new BadRequestException(
          verdict.reason ?? 'Input rejeitado pelo orquestrador.',
        );
      }
    }
    return true;
  }

  private extractTargets(
    endpoint: OrchestratorEndpoint,
    body: Record<string, unknown>,
  ): ExtractedTarget[] {
    switch (endpoint) {
      case 'chat':
        return [{ kind: 'chat', text: asString(body.question) }];

      case 'hangman':
        // POST /hangman/:idSession — endpoint legacy; valida como palavra
        // genérica. Letras únicas são puladas pela heurística local.
        return [
          {
            kind: 'hangman-word',
            text: asString(body.question),
            metadata: { category: asString(body.category) },
          },
        ];

      case 'game-action': {
        const ctxName = asString(body.context);
        const payload =
          body.payload && typeof body.payload === 'object'
            ? (body.payload as Record<string, unknown>)
            : {};
        if (ctxName === 'rap-battle') {
          return [{ kind: 'rap-battle-theme', text: asString(payload.theme) }];
        }
        if (ctxName === 'hangman-chooser') {
          const cat = asString(payload.category);
          // Categorias muito curtas costumam ser slugs de enum; pula validação.
          return cat.length > 1
            ? [{ kind: 'hangman-category', text: cat }]
            : [];
        }
        if (ctxName === 'rpg') {
          return this.extractRpgTargets(payload);
        }
        return [];
      }

      default:
        return [];
    }
  }

  private extractRpgTargets(
    payload: Record<string, unknown>,
  ): ExtractedTarget[] {
    const campaign = (
      payload.campaign && typeof payload.campaign === 'object'
        ? payload.campaign
        : payload
    ) as Record<string, unknown>;

    const out: ExtractedTarget[] = [];
    const turns = Array.isArray(campaign.turns)
      ? (campaign.turns as Array<Record<string, unknown>>)
      : [];

    // Tema da campanha: valida quando ainda não há turnos jogados.
    if (
      turns.length === 0 &&
      typeof campaign.customPrompt === 'string' &&
      campaign.customPrompt.trim().length > 0
    ) {
      out.push({
        kind: 'rpg-campaign-theme',
        text: campaign.customPrompt,
      });
    }

    // Último turno digitado pelo usuário (master ou player).
    const last = turns[turns.length - 1];
    if (last && typeof last.content === 'string' && last.content.trim()) {
      const role = asString(last.role);
      if (role === 'master') {
        out.push({ kind: 'rpg-master-narration', text: last.content });
      } else if (role === 'player') {
        out.push({ kind: 'rpg-player-action', text: last.content });
      }
    }
    return out;
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
