import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { CreditsService } from './credits.service';

/**
 * Após qualquer resposta de sucesso de usuário autenticado, anexa o header
 *   X-Credits-Balance: <number> | unlimited
 * para que o frontend mantenha o badge da navbar sincronizado sem polling.
 *
 * Roda em TODAS as rotas (global), mas só consulta o banco se houver req.user.
 * Erros são silenciados — header é metadata, nunca deve quebrar a resposta.
 */
@Injectable()
export class CreditsBalanceInterceptor implements NestInterceptor {
  constructor(private readonly creditsService: CreditsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { id: string } }>();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      tap(async () => {
        const userId = req.user?.id;
        if (!userId) return;
        try {
          const info = await this.creditsService.getBalance(userId);
          if (!res.headersSent) {
            res.setHeader(
              'X-Credits-Balance',
              info.isUnlimited ? 'unlimited' : String(info.balance),
            );
            res.setHeader('X-Credits-Plan', info.planSlug);
          }
        } catch {
          // silencioso de propósito
        }
      }),
    );
  }
}
