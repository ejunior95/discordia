import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { CreditWallet } from './entities/credit-wallet.entity';
import {
  CreditTransaction,
  CreditTxType,
} from './entities/credit-transaction.entity';
import { BillingService } from '../billing/billing.service';
import { Plan } from '../billing/entities/plan.entity';
import { ROLES_EXEMPT_FROM_CHARGE } from './credit-costs';
import { UserRole, User } from '../users/entities/user.entity';

export class InsufficientCreditsException extends HttpException {
  constructor(balance: number, required: number) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        code: 'INSUFFICIENT_CREDITS',
        message: 'Créditos insuficientes para realizar esta ação.',
        balance,
        required,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export interface ChargeOptions {
  amount: number;
  action: string;
  reason: string;
  userRole?: UserRole;
  actionId?: string;
  idempotencyKey?: string;
}

export interface ChargeResult {
  charged: boolean;
  transactionId: string | null;
  balanceAfter: number | 'unlimited';
  isUnlimited: boolean;
}

@Injectable()
export class CreditsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    @InjectRepository(CreditWallet)
    private readonly walletRepo: MongoRepository<CreditWallet>,
    @InjectRepository(CreditTransaction)
    private readonly txRepo: MongoRepository<CreditTransaction>,
    @InjectRepository(User)
    private readonly usersRepo: MongoRepository<User>,
    private readonly billingService: BillingService,
  ) {}

  /**
   * Migração defensiva: dropa o índice único+sparse legado em
   * `idempotency_key` (incompatível com docs onde o campo vira null) e
   * remove o campo null de docs antigos. A idempotência continua garantida
   * em app-level via lookup no `charge`/`refund`.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const queryRunner =
        this.txRepo.manager.connection.createQueryRunner() as unknown as {
          databaseConnection: {
            db: () => {
              collection: (name: string) => {
                indexes: () => Promise<
                  Array<{
                    name: string;
                    key: Record<string, unknown>;
                    unique?: boolean;
                  }>
                >;
                dropIndex: (name: string) => Promise<unknown>;
                updateMany: (
                  filter: Record<string, unknown>,
                  update: Record<string, unknown>,
                ) => Promise<{ modifiedCount: number }>;
              };
            };
          };
        };
      const coll = queryRunner.databaseConnection
        .db()
        .collection('credit_transactions');

      const indexes = await coll.indexes();
      for (const idx of indexes) {
        if (idx.unique && idx.key && 'idempotency_key' in idx.key) {
          this.logger.warn(
            `Dropando índice único legado em idempotency_key: ${idx.name}`,
          );
          await coll.dropIndex(idx.name);
        }
      }
      const cleanup = await coll.updateMany(
        { idempotency_key: null },
        { $unset: { idempotency_key: '' } },
      );
      if (cleanup.modifiedCount > 0) {
        this.logger.log(
          `Limpeza idempotency_key=null: ${cleanup.modifiedCount} docs ajustados.`,
        );
      }
    } catch (err) {
      this.logger.error(
        'Falha ao executar migração de índice de credit_transactions',
        err as Error,
      );
    }
  }

  /** Cria/retorna wallet do usuário sincronizada com o plano vigente. */
  async ensureWallet(userId: string): Promise<CreditWallet> {
    const existing = await this.walletRepo.findOne({
      where: { user_id: userId },
    });
    const { plan } = await this.billingService.getActiveSubscription(userId);

    if (!existing) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const wallet = this.walletRepo.create({
        user_id: userId,
        balance: plan.monthlyCredits ?? 0,
        monthly_allowance: plan.monthlyCredits ?? 0,
        soft_cap: plan.unlimitedSoftCap ?? null,
        plan_slug: plan.slug,
        period_start: now,
        period_end: periodEnd,
      });
      const saved = await this.walletRepo.save(wallet);
      await this.recordTransaction({
        user_id: userId,
        type: 'monthly_reset',
        amount: plan.monthlyCredits ?? 0,
        balance_after: saved.balance,
        reason: 'wallet_initial_grant',
        action_type: 'WALLET_INIT',
      });
      return saved;
    }

    // Renovação automática se o ciclo expirou.
    if (existing.period_end.getTime() <= Date.now()) {
      return this.applyMonthlyReset(existing, plan);
    }

    // Sincronização de mudança de plano (resseta apenas plan_slug e cap,
    // sem alterar saldo até o próximo ciclo).
    if (existing.plan_slug !== plan.slug) {
      existing.plan_slug = plan.slug;
      existing.soft_cap = plan.unlimitedSoftCap ?? null;
      await this.walletRepo.save(existing);
    }
    return existing;
  }

  async getBalance(userId: string): Promise<{
    balance: number;
    monthlyAllowance: number;
    periodEnd: Date;
    planSlug: string;
    isUnlimited: boolean;
  }> {
    const wallet = await this.ensureWallet(userId);
    const { plan } = await this.billingService.getActiveSubscription(userId);
    return {
      balance: wallet.balance,
      monthlyAllowance: wallet.monthly_allowance,
      periodEnd: wallet.period_end,
      planSlug: wallet.plan_slug,
      isUnlimited: plan.unlimitedSoftCap != null,
    };
  }

  /**
   * Decremento atômico do saldo. Usa findOneAndUpdate com filtro `balance >= amount`,
   * o que garante segurança contra race conditions sem locks.
   *
   * Se o usuário tiver role admin/beta_tester, NÃO debita mas registra uma transação
   * `role_exempt` (amount=0) para auditoria.
   */
  async charge(userId: string, opts: ChargeOptions): Promise<ChargeResult> {
    if (opts.amount < 0) {
      throw new Error('CreditsService.charge: amount não pode ser negativo');
    }

    // Idempotência: se a chave já foi usada, retornar o resultado anterior.
    if (opts.idempotencyKey) {
      const existing = await this.txRepo.findOne({
        where: { idempotency_key: opts.idempotencyKey },
      });
      if (existing) {
        return {
          charged: existing.type === 'debit' && existing.amount < 0,
          transactionId: existing._id.toString(),
          balanceAfter: existing.balance_after,
          isUnlimited: false,
        };
      }
    }

    // Garante que wallet existe + ciclo renovado.
    const wallet = await this.ensureWallet(userId);

    // Auto-resolve role se não foi informado (chamada interna sem contexto HTTP).
    let effectiveRole = opts.userRole;
    if (!effectiveRole) {
      try {
        const u = await this.usersRepo.findOne({
          where: { _id: new ObjectId(userId) },
        });
        effectiveRole = u?.role ?? 'user';
      } catch {
        effectiveRole = 'user';
      }
    }

    // Roles isentos: registra auditoria e devolve sucesso sem decrementar.
    if (
      effectiveRole &&
      ROLES_EXEMPT_FROM_CHARGE.includes(effectiveRole as never)
    ) {
      const tx = await this.recordTransaction({
        user_id: userId,
        type: 'role_exempt',
        amount: 0,
        balance_after: wallet.balance,
        reason: `role_exempt:${effectiveRole}`,
        action_type: opts.action,
        action_id: opts.actionId,
        idempotency_key: opts.idempotencyKey,
      });
      return {
        charged: false,
        transactionId: tx._id.toString(),
        balanceAfter: 'unlimited',
        isUnlimited: true,
      };
    }

    // Operação atômica: só decrementa se balance >= amount.
    const result = await this.walletRepo.findOneAndUpdate(
      { _id: wallet._id, balance: { $gte: opts.amount } },
      { $inc: { balance: -opts.amount }, $set: { updated_at: new Date() } },
      { returnDocument: 'after' },
    );

    const updated = (result as any)?.value ?? (result as any);
    if (!updated || typeof updated.balance !== 'number') {
      throw new InsufficientCreditsException(wallet.balance, opts.amount);
    }

    const tx = await this.recordTransaction({
      user_id: userId,
      type: 'debit',
      amount: -opts.amount,
      balance_after: updated.balance,
      reason: opts.reason,
      action_type: opts.action,
      action_id: opts.actionId,
      idempotency_key: opts.idempotencyKey,
    });

    return {
      charged: true,
      transactionId: tx._id.toString(),
      balanceAfter: updated.balance,
      isUnlimited: false,
    };
  }

  /** Estorna uma transação de débito (ex: falha em chamada externa). */
  async refund(transactionId: string, reason: string): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: { _id: new ObjectId(transactionId) },
    });
    if (!tx) throw new NotFoundException('Transação não encontrada');
    if (tx.type !== 'debit') {
      this.logger.warn(
        `Refund ignorado: tx ${transactionId} tipo=${tx.type} (não é débito)`,
      );
      return;
    }
    // Evita duplo refund.
    const alreadyRefunded = await this.txRepo.findOne({
      where: { refund_of: transactionId },
    });
    if (alreadyRefunded) {
      this.logger.warn(`Refund duplicado ignorado para tx ${transactionId}`);
      return;
    }
    const amountToReturn = Math.abs(tx.amount);
    const wallet = await this.walletRepo.findOne({
      where: { user_id: tx.user_id },
    });
    if (!wallet) throw new NotFoundException('Wallet não encontrada');
    const updated = await this.walletRepo.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { balance: amountToReturn }, $set: { updated_at: new Date() } },
      { returnDocument: 'after' },
    );
    const newBalance =
      ((updated as any)?.value ?? (updated as any))?.balance ?? wallet.balance;
    await this.recordTransaction({
      user_id: tx.user_id,
      type: 'refund',
      amount: amountToReturn,
      balance_after: newBalance,
      reason,
      action_type: tx.action_type,
      action_id: tx.action_id,
      refund_of: transactionId,
    });
  }

  /** Concede créditos manualmente (admin / Stripe webhook futuro). */
  async grant(
    userId: string,
    amount: number,
    reason: string,
    performedBy?: string,
    idempotencyKey?: string,
  ): Promise<{ transactionId: string; balanceAfter: number }> {
    if (amount <= 0) throw new Error('grant: amount deve ser positivo');

    if (idempotencyKey) {
      const existing = await this.txRepo.findOne({
        where: { idempotency_key: idempotencyKey },
      });
      if (existing) {
        return {
          transactionId: existing._id.toString(),
          balanceAfter: existing.balance_after,
        };
      }
    }

    const wallet = await this.ensureWallet(userId);
    const updated = await this.walletRepo.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { balance: amount }, $set: { updated_at: new Date() } },
      { returnDocument: 'after' },
    );
    const newBalance =
      ((updated as any)?.value ?? (updated as any))?.balance ?? wallet.balance;
    const tx = await this.recordTransaction({
      user_id: userId,
      type: 'grant',
      amount,
      balance_after: newBalance,
      reason,
      action_type: 'ADMIN_GRANT',
      performed_by: performedBy,
      idempotency_key: idempotencyKey,
    });
    return { transactionId: tx._id.toString(), balanceAfter: newBalance };
  }

  /** Lista transações paginadas (mais recentes primeiro). */
  async listTransactions(
    userId: string,
    limit = 20,
    cursorId?: string,
  ): Promise<CreditTransaction[]> {
    const where: any = { user_id: userId };
    if (cursorId) {
      try {
        where._id = { $lt: new ObjectId(cursorId) };
      } catch {
        // cursor inválido — ignora
      }
    }
    return this.txRepo.find({
      where,
      order: { _id: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  /** Renova o ciclo mensal: zera saldo e concede monthlyCredits do plano. */
  private async applyMonthlyReset(
    wallet: CreditWallet,
    plan: Plan,
  ): Promise<CreditWallet> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    wallet.balance = plan.monthlyCredits ?? 0;
    wallet.monthly_allowance = plan.monthlyCredits ?? 0;
    wallet.soft_cap = plan.unlimitedSoftCap ?? null;
    wallet.plan_slug = plan.slug;
    wallet.period_start = now;
    wallet.period_end = periodEnd;
    const saved = await this.walletRepo.save(wallet);
    await this.recordTransaction({
      user_id: wallet.user_id,
      type: 'monthly_reset',
      amount: plan.monthlyCredits ?? 0,
      balance_after: saved.balance,
      reason: 'monthly_cycle_renewed',
      action_type: 'MONTHLY_RESET',
    });
    return saved;
  }

  /** Cron horário: aplica reset em todas as wallets cujo ciclo expirou. */
  async runScheduledResets(): Promise<number> {
    const expired = await this.walletRepo.find({
      where: { period_end: { $lte: new Date() } as any },
    });
    let count = 0;
    for (const wallet of expired) {
      try {
        const { plan } = await this.billingService.getActiveSubscription(
          wallet.user_id,
        );
        await this.applyMonthlyReset(wallet, plan);
        count++;
      } catch (err) {
        this.logger.error(
          `Falha ao renovar wallet ${wallet._id}: ${(err as Error).message}`,
        );
      }
    }
    if (count > 0) this.logger.log(`Wallets renovadas: ${count}`);
    return count;
  }

  private async recordTransaction(
    data: Partial<CreditTransaction> & {
      user_id: string;
      type: CreditTxType;
      amount: number;
      balance_after: number;
      reason: string;
    },
  ): Promise<CreditTransaction> {
    const tx = this.txRepo.create(data);
    return this.txRepo.save(tx);
  }
}
