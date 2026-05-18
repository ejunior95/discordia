import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CreditsService } from './credits.service';
import {
  ACTION_CAPABILITY,
  CREDIT_COSTS,
  ROLES_EXEMPT_FROM_CHARGE,
} from './credit-costs';
import {
  REQUIRES_CREDITS_KEY,
  RequiresCreditsMeta,
} from './requires-credits.decorator';
import { BillingService } from '../billing/billing.service';
import { UserRole } from '../users/entities/user.entity';

export class FeatureNotAllowedException extends HttpException {
  constructor(capability: string, planSlug: string) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        code: 'FEATURE_NOT_ALLOWED',
        message: 'Seu plano atual não inclui este recurso.',
        capability,
        planSlug,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

interface AuthedRequest extends Request {
  user?: { id: string; role?: UserRole };
  creditTx?: {
    transactionId: string | null;
    charged: boolean;
    action: string;
    isUnlimited: boolean;
  };
}

@Injectable()
export class CreditsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly creditsService: CreditsService,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<
      RequiresCreditsMeta | undefined
    >(REQUIRES_CREDITS_KEY, [context.getHandler(), context.getClass()]);
    if (!meta) return true; // endpoint não cobra créditos

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = req.user;
    if (!user?.id) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const cost = CREDIT_COSTS[meta.action];
    const requiredCapability = ACTION_CAPABILITY[meta.action];

    const isExempt =
      user.role && ROLES_EXEMPT_FROM_CHARGE.includes(user.role as never);

    // 1) Verifica capability do plano (exceto roles isentos).
    if (!isExempt) {
      const { plan } = await this.billingService.getActiveSubscription(user.id);
      const planCaps = plan.capabilities ?? [];
      if (!planCaps.includes(requiredCapability)) {
        throw new FeatureNotAllowedException(requiredCapability, plan.slug);
      }
    }

    // 2) Cobra (ou registra exempção). Lança 402 se saldo insuficiente.
    const idempotencyKey =
      (req.headers['idempotency-key'] as string | undefined) ?? undefined;

    const result = await this.creditsService.charge(user.id, {
      amount: cost,
      action: meta.action,
      reason: `endpoint:${req.method} ${req.path}`,
      userRole: user.role,
      idempotencyKey,
    });

    req.creditTx = {
      transactionId: result.transactionId,
      charged: result.charged,
      action: meta.action,
      isUnlimited: result.isUnlimited,
    };
    return true;
  }
}
