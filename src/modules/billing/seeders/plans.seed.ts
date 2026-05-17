import { Plan, PlanSlug } from '../entities/plan.entity';

export interface PlanSeed {
  slug: PlanSlug;
  name: string;
  description: string;
  pricing: { monthly: number; yearly: number };
  features: string[];
  monthlyRoundsLimit: number | null;
  highlight: boolean;
  cta: string;
  order: number;
}

export const DEFAULT_PLANS: PlanSeed[] = [
  {
    slug: 'free',
    name: 'Free',
    description: 'Para experimentar comparações de IA no dia a dia.',
    pricing: { monthly: 0, yearly: 0 },
    features: [
      'Até 50 rodadas por mês',
      'Acesso aos 4 modelos básicos',
      'Histórico no navegador',
      'Suporte da comunidade',
    ],
    monthlyRoundsLimit: 50,
    highlight: false,
    cta: 'Continuar grátis',
    order: 0,
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'Para quem usa o DiscordIA com frequência.',
    pricing: { monthly: 29.9, yearly: 299 },
    features: [
      '1.000 rodadas por mês',
      'Modelos avançados habilitados',
      'Sincronização em nuvem',
      'Exportar conversas e rodadas',
      'Suporte por email prioritário',
    ],
    monthlyRoundsLimit: 1000,
    highlight: true,
    cta: 'Assinar Pro',
    order: 1,
  },
  {
    slug: 'premium',
    name: 'Premium',
    description: 'Para times e usuários intensivos.',
    pricing: { monthly: 79.9, yearly: 799 },
    features: [
      'Rodadas ilimitadas',
      'Todos os modelos liberados',
      'Modo equipe (até 5 membros)',
      'Chaves de API customizadas',
      'SLA e suporte dedicado',
    ],
    monthlyRoundsLimit: null,
    highlight: false,
    cta: 'Assinar Premium',
    order: 2,
  },
];

export function isPlanUpToDate(plan: Plan, seed: PlanSeed): boolean {
  return (
    plan.name === seed.name &&
    plan.description === seed.description &&
    plan.cta === seed.cta &&
    plan.highlight === seed.highlight &&
    plan.order === seed.order &&
    plan.monthlyRoundsLimit === seed.monthlyRoundsLimit &&
    plan.pricing.monthly === seed.pricing.monthly &&
    plan.pricing.yearly === seed.pricing.yearly &&
    JSON.stringify(plan.features) === JSON.stringify(seed.features)
  );
}
