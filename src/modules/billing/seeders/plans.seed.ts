import { Plan, PlanCapability, PlanSlug } from '../entities/plan.entity';

export interface PlanSeed {
  slug: PlanSlug;
  name: string;
  description: string;
  pricing: { monthly: number; yearly: number };
  features: string[];
  capabilities: PlanCapability[];
  monthlyCredits: number;
  unlimitedSoftCap?: number | null;
  monthlyRoundsLimit: number | null;
  highlight: boolean;
  cta: string;
  order: number;
}

export const DEFAULT_PLANS: PlanSeed[] = [
  {
    slug: 'free',
    name: 'Grátis',
    description: 'Pra experimentar e comparar as 4 IAs no dia a dia.',
    pricing: { monthly: 0, yearly: 0 },
    features: [
      '50 créditos por mês',
      'Chat conflituoso com as 4 IAs',
      'Histórico no navegador',
    ],
    capabilities: ['chat'],
    monthlyCredits: 50,
    unlimitedSoftCap: null,
    monthlyRoundsLimit: 50,
    highlight: false,
    cta: 'Começar grátis',
    order: 0,
  },
  {
    slug: 'basic',
    name: 'Basic',
    description: 'Pra quem usa o DiscordIA com frequência e curte jogar.',
    pricing: { monthly: 39.99, yearly: 360 },
    features: [
      '600 créditos por mês',
      'Chat conflituoso com as 4 IAs',
      'Jogos contra IA (xadrez, hangman, jokenpô, RPG)',
      'Batalha de rima (modo texto)',
    ],
    capabilities: ['chat', 'games'],
    monthlyCredits: 600,
    unlimitedSoftCap: null,
    monthlyRoundsLimit: 600,
    highlight: true,
    cta: 'Assinar Basic',
    order: 1,
  },
  {
    slug: 'premium',
    name: 'Premium',
    description: 'Acesso total — texto, jogos, voz e geração de música.',
    pricing: { monthly: 79.99, yearly: 720 },
    features: [
      'Créditos ilimitados (fair use)',
      'Chat conflituoso com as 4 IAs',
      'Todos os jogos contra IA',
      'Batalha de rima com música gerada por IA',
      'Narração de respostas em voz (ElevenLabs)',
      'Acesso antecipado a novos modos',
    ],
    capabilities: ['chat', 'games', 'audio', 'music'],
    monthlyCredits: 2500,
    unlimitedSoftCap: 2500,
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
    plan.monthlyCredits === seed.monthlyCredits &&
    (plan.unlimitedSoftCap ?? null) === (seed.unlimitedSoftCap ?? null) &&
    plan.pricing.monthly === seed.pricing.monthly &&
    plan.pricing.yearly === seed.pricing.yearly &&
    JSON.stringify(plan.features) === JSON.stringify(seed.features) &&
    JSON.stringify(plan.capabilities ?? []) ===
      JSON.stringify(seed.capabilities)
  );
}
