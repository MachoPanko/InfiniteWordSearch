// Credit-based limits configuration
import { calculateCreditCost, DAILY_FREE_CREDITS } from './credit-pricing';

export const LIMITS = {
  maxWordsPerPuzzle: 100,
  maxCopies: 100,
  maxThemes: 10,
} as const;

/**
 * Check if a user can perform an action based on their credit balance
 */
export function canPerformAction(params: {
  creditBalance: number;
  creditsUsedToday: number;
  wordCount?: number;
  copies?: number;
  themes?: number;
}): {
  allowed: boolean;
  reason?: string;
  creditsRequired: number;
  usingFreeCredits: boolean;
} {
  const { creditBalance, creditsUsedToday, wordCount = 10, copies = 1, themes = 1 } = params;

  // Calculate cost
  const creditsRequired = calculateCreditCost({ wordCount, copies, themes });

  // Check hard limits first
  if (wordCount > LIMITS.maxWordsPerPuzzle) {
    return {
      allowed: false,
      reason: `Maximum ${LIMITS.maxWordsPerPuzzle} words per puzzle`,
      creditsRequired,
      usingFreeCredits: false,
    };
  }

  if (copies > LIMITS.maxCopies) {
    return {
      allowed: false,
      reason: `Maximum ${LIMITS.maxCopies} copies`,
      creditsRequired,
      usingFreeCredits: false,
    };
  }

  if (themes > LIMITS.maxThemes) {
    return {
      allowed: false,
      reason: `Maximum ${LIMITS.maxThemes} themes`,
      creditsRequired,
      usingFreeCredits: false,
    };
  }

  // Check if can use free daily credits
  const freeCreditsRemaining = Math.max(0, DAILY_FREE_CREDITS - creditsUsedToday);
  
  if (freeCreditsRemaining >= creditsRequired) {
    return {
      allowed: true,
      creditsRequired,
      usingFreeCredits: true,
    };
  }

  // Need to use paid credits
  const additionalCreditsNeeded = creditsRequired - freeCreditsRemaining;
  
  if (creditBalance >= additionalCreditsNeeded) {
    return {
      allowed: true,
      creditsRequired,
      usingFreeCredits: false,
    };
  }

  // Insufficient credits
  return {
    allowed: false,
    reason: `Insufficient credits. Need ${creditsRequired}, have ${creditBalance} (${freeCreditsRemaining} free remaining today)`,
    creditsRequired,
    usingFreeCredits: false,
  };
}
