import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Plan, PlanSlug } from './entities/plan.entity';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { DEFAULT_PLANS, isPlanUpToDate } from './seeders/plans.seed';

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly plansRepo: MongoRepository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: MongoRepository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoicesRepo: MongoRepository<Invoice>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodsRepo: MongoRepository<PaymentMethod>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  private async seedDefaultPlans() {
    // Migração: rename plano legacy 'pro' → 'basic' (preserva _id e
    // referências em subscriptions). Roda antes do loop de upsert.
    const legacyPro = await this.plansRepo.findOne({
      where: { slug: 'pro' as PlanSlug },
    });
    if (legacyPro) {
      const basicAlready = await this.plansRepo.findOne({
        where: { slug: 'basic' as PlanSlug },
      });
      if (basicAlready) {
        // Já existe um 'basic' — desativa o legacy para evitar duplicidade.
        legacyPro.active = false;
        await this.plansRepo.save(legacyPro);
        this.logger.warn(
          `Plan legacy 'pro' desativado: 'basic' já existe (_id=${basicAlready._id}).`,
        );
      } else {
        (legacyPro as Plan & { slug: PlanSlug }).slug = 'basic';
        await this.plansRepo.save(legacyPro);
        this.logger.log(
          `Plan migrated: 'pro' → 'basic' (_id=${legacyPro._id}).`,
        );
      }
    }

    for (const seed of DEFAULT_PLANS) {
      const existing = await this.plansRepo.findOne({
        where: { slug: seed.slug },
      });
      if (!existing) {
        await this.plansRepo.save(
          this.plansRepo.create({ ...seed, active: true }),
        );
        this.logger.log(`Plan seeded: ${seed.slug}`);
        continue;
      }
      if (!isPlanUpToDate(existing, seed) || existing.active !== true) {
        Object.assign(existing, seed, { active: true });
        await this.plansRepo.save(existing);
        this.logger.log(`Plan updated: ${seed.slug}`);
      }
    }
  }

  async listActivePlans(): Promise<Plan[]> {
    const plans = await this.plansRepo.find({ where: { active: true } });
    return [...plans].sort((a, b) => a.order - b.order);
  }

  async findPlanBySlug(slug: PlanSlug): Promise<Plan> {
    const plan = await this.plansRepo.findOne({ where: { slug } });
    if (!plan) throw new NotFoundException(`Plano ${slug} não encontrado`);
    return plan;
  }

  /** Garante uma subscription Free ativa para um usuário (idempotente). */
  async ensureFreeSubscription(userId: string): Promise<Subscription> {
    const existing = await this.subscriptionsRepo.findOne({
      where: { user_id: userId, status: 'active' as SubscriptionStatus },
    });
    if (existing) return existing;

    const freePlan = await this.findPlanBySlug('free');
    const now = new Date();
    const renews = new Date(now);
    renews.setMonth(renews.getMonth() + 1);

    const sub = this.subscriptionsRepo.create({
      user_id: userId,
      plan_id: freePlan._id.toString(),
      cycle: 'monthly',
      status: 'active',
      started_at: now,
      renews_at: renews,
      canceled_at: null,
    });
    return this.subscriptionsRepo.save(sub);
  }

  async getActiveSubscription(userId: string): Promise<{
    subscription: Subscription;
    plan: Plan;
  }> {
    const subscription = await this.ensureFreeSubscription(userId);
    let plan: Plan | null = null;
    try {
      plan = await this.plansRepo.findOne({
        where: { _id: new ObjectId(subscription.plan_id) },
      });
    } catch {
      plan = null;
    }
    const resolvedPlan = plan ?? (await this.findPlanBySlug('free'));
    return { subscription, plan: resolvedPlan };
  }

  async listInvoices(userId: string): Promise<Invoice[]> {
    const invoices = await this.invoicesRepo.find({
      where: { user_id: userId },
    });
    return [...invoices].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async getDefaultPaymentMethod(userId: string): Promise<PaymentMethod | null> {
    const pm = await this.paymentMethodsRepo.findOne({
      where: { user_id: userId, is_default: true },
    });
    return pm ?? null;
  }
}
