import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { canPerformAction } from '@/lib/subscription-limits';
import { DAILY_FREE_CREDITS } from '@/lib/credit-pricing';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Allow unauthenticated users with free daily credits only
    return NextResponse.json({
      allowed: true,
      creditBalance: 0,
      freeCreditsRemaining: DAILY_FREE_CREDITS,
      authenticated: false,
      message: 'Sign in to purchase credits for unlimited access!',
    });
  }

  // Get user profile with credit info
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { action, params } = await request.json();

  // Check if daily counter needs reset
  const today = new Date().toISOString().split('T')[0];
  if (profile.last_credit_reset_date !== today) {
    await supabase
      .from('profiles')
      .update({
        credits_used_today: 0,
        last_credit_reset_date: today,
      })
      .eq('id', user.id);
    profile.credits_used_today = 0;
  }

  // Check if user has sufficient credits
  const limitCheck = canPerformAction({
    creditBalance: profile.credit_balance || 0,
    creditsUsedToday: profile.credits_used_today || 0,
    wordCount: params?.wordCount,
    copies: params?.copies,
    themes: params?.themes,
  });

  if (!limitCheck.allowed) {
    // Log denied action
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action,
      themes_count: params?.themes || 1,
      words_count: params?.wordCount || 10,
      copies_count: params?.copies || 1,
      was_allowed: false,
      denied_reason: limitCheck.reason,
      credits_charged: 0,
      credit_balance_after: profile.credit_balance,
    });

    return NextResponse.json({
      allowed: false,
      reason: limitCheck.reason,
      creditsRequired: limitCheck.creditsRequired,
      creditBalance: profile.credit_balance,
      needsToPurchase: true,
    });
  }

  // Deduct credits (use free credits first, then paid)
  const freeCreditsUsed = limitCheck.usingFreeCredits ? limitCheck.creditsRequired : Math.max(0, DAILY_FREE_CREDITS - profile.credits_used_today);
  const paidCreditsUsed = limitCheck.creditsRequired - freeCreditsUsed;
  
  const newCreditBalance = profile.credit_balance - paidCreditsUsed;
  const newCreditsUsedToday = profile.credits_used_today + limitCheck.creditsRequired;

  // Update profile
  await supabase
    .from('profiles')
    .update({
      credit_balance: newCreditBalance,
      credits_used_today: newCreditsUsedToday,
      total_puzzles_generated: (profile.total_puzzles_generated || 0) + 1,
    })
    .eq('id', user.id);

  // Log usage
  await supabase.from('usage_logs').insert({
    user_id: user.id,
    action,
    themes_count: params?.themes || 1,
    words_count: params?.wordCount || 10,
    copies_count: params?.copies || 1,
    estimated_tokens: (params?.wordCount || 10) * (params?.copies || 1) * 15,
    was_allowed: true,
    credits_charged: limitCheck.creditsRequired,
    credit_balance_after: newCreditBalance,
  });

  // Log credit transaction if paid credits were used
  if (paidCreditsUsed > 0) {
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: -paidCreditsUsed,
      transaction_type: 'usage',
      description: `Generated puzzle: ${params?.wordCount || 10} words, ${params?.copies || 1} copies, ${params?.themes || 1} themes`,
      balance_after: newCreditBalance,
    });
  }

  return NextResponse.json({
    allowed: true,
    creditsCharged: limitCheck.creditsRequired,
    freeCreditsUsed,
    paidCreditsUsed,
    newBalance: newCreditBalance,
    freeCreditsRemaining: Math.max(0, DAILY_FREE_CREDITS - newCreditsUsedToday),
    authenticated: true,
  });
}
