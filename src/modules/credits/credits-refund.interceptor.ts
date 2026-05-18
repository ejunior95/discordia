import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { Request } from 'express';
import { CreditsService } from './credits.service';

/**
 * Estorna automaticamente a transação cobrada pelo CreditsGuard
 * caso o handler do controller lance uma exceção (ex: API externa falhou).
 *
 * Não toca em exceções já tratadas no nível do guard (ex: InsufficientCredits)
 * porque essas acontecem ANTES de qualquer cobrança ser efetivada.
 */
@Injectable()
export class CreditsRefundInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CreditsRefundInterceptor.name);

  constructor(private readonly creditsService: CreditsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request & { creditTx?: any }>();
    return next.handle().pipe(
      catchError((err) => {
        const tx = req.creditTx;
        if (tx?.charged && tx?.transactionId) {
          this.creditsService
            .refund(tx.transactionId, `handler_error:${err?.message ?? 'unknown'}`)
            .catch((refundErr) =>
              this.logger.error(
                `Falha ao estornar tx ${tx.transactionId}: ${
                  (refundErr as Error).message
                }`,
              ),
            );
        }
        return throwError(() => err);
      }),
    );
  }
}
