// Credit-based pricing configuration

export const CREDIT_PACKAGES = {
  starter: {
    id: 'starter',
    name: 'Starter Pack',
    credits: 100,
    price: 500, // $5.00 in cents
    priceDisplay: '$5',
    bonus: 0,
    popular: false,
  },
  popular: {
    id: 'popular',
    name: 'Popular Pack',
    credits: 500,
    price: 2000, // $20.00 in cents
    priceDisplay: '$20',
    bonus: 100, // 20% bonus = 500 + 100 = 600 total
    popular: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro Pack',
    credits: 1500,
    price: 5000, // $50.00 in cents
    priceDisplay: '$50',
    bonus: 500, // ~33% bonus = 1500 + 500 = 2000 total
    popular: false,
  },
} as const;

export type PackageId = keyof typeof CREDIT_PACKAGES;

export const DAILY_FREE_CREDITS = 5;

/**
 * Calculate credit cost for puzzle generation
 * Formula: base cost scales with complexity
 */
export function calculateCreditCost(params: {
  wordCount: number;
  copies?: number;
  themes?: number;
}): number {
  const { wordCount = 10, copies = 1, themes = 1 } = params;
  
  // Base cost: 1 credit per 10 words
  const wordCost = Math.ceil(wordCount / 10);
  
  // Scale with copies (diminishing returns)
  const copyMultiplier = copies === 1 ? 1 : 1 + Math.log2(copies) * 0.5;
  
  // Scale with themes (linear)
  const themeMultiplier = themes;
  
  // Calculate total cost (minimum 1 credit)
  const totalCost = Math.max(1, Math.ceil(wordCost * copyMultiplier * themeMultiplier));
  
  return totalCost;
}

/**
 * Get total credits including bonus
 */
export function getTotalCredits(packageId: PackageId): number {
  const pkg = CREDIT_PACKAGES[packageId];
  return pkg.credits + pkg.bonus;
}

/**
 * Estimate API token cost (for internal tracking)
 * Rough estimate: 1 credit ≈ 2000 tokens
 */
export function estimateTokenUsage(credits: number): number {
  return credits * 2000;
}
