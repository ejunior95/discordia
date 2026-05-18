import { Expose, Transform } from 'class-transformer';

export class PlanResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  slug: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  pricing: { monthly: number; yearly: number };

  @Expose()
  features: string[];

  @Expose()
  capabilities: ('chat' | 'games' | 'audio' | 'music')[];

  @Expose()
  monthlyCredits: number;

  @Expose()
  unlimitedSoftCap?: number | null;

  @Expose()
  monthlyRoundsLimit?: number | null;

  @Expose()
  highlight: boolean;

  @Expose()
  cta: string;

  @Expose()
  order: number;
}

export class SubscriptionResponseDto {
  @Expose()
  @Transform(({ obj }) => obj.subscription?._id?.toString())
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.plan?.slug)
  planSlug: string;

  @Expose()
  @Transform(({ obj }) => obj.plan?._id?.toString())
  planId: string;

  @Expose()
  @Transform(({ obj }) => obj.subscription?.cycle)
  cycle: string;

  @Expose()
  @Transform(({ obj }) => obj.subscription?.status)
  status: string;

  @Expose()
  @Transform(({ obj }) => obj.subscription?.started_at)
  startedAt: Date;

  @Expose()
  @Transform(({ obj }) => obj.subscription?.renews_at)
  renewsAt: Date;

  @Expose()
  @Transform(({ obj }) => obj.subscription?.canceled_at ?? null)
  canceledAt: Date | null;
}

export class InvoiceResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  external_id: string;

  @Expose()
  date: Date;

  @Expose()
  description: string;

  @Expose()
  amount: number;

  @Expose()
  currency: string;

  @Expose()
  status: string;
}

export class PaymentMethodResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  brand: string;

  @Expose()
  last4: string;

  @Expose()
  holder: string;

  @Expose()
  exp_month: number;

  @Expose()
  exp_year: number;

  @Expose()
  is_default: boolean;
}
