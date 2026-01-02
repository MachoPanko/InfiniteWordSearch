import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });
}

function getWebhookSecret() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      const webhookSecret = getWebhookSecret();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const credits = parseInt(session.metadata?.credits || '0', 10);
  const packageId = session.metadata?.packageId;

  if (!userId || !credits) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  const supabase = await createAdminClient();

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return;
  }

  const newBalance = (profile?.credit_balance || 0) + credits;

  // Update user's credit balance
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      credit_balance: newBalance,
      total_credits_purchased: credits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating credits:', updateError);
    return;
  }

  // Log the transaction
  const { error: txError } = await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: credits,
    transaction_type: 'purchase',
    stripe_payment_intent_id: session.payment_intent as string,
    description: `Purchased ${packageId} package - ${credits} credits`,
    balance_after: newBalance,
  });

  if (txError) {
    console.error('Error logging transaction:', txError);
  }

  console.log(`✅ Added ${credits} credits to user ${userId}. New balance: ${newBalance}`);
}

async function handleRefund(charge: Stripe.Charge) {
  // Find the original transaction
  const paymentIntentId = charge.payment_intent as string;
  
  const supabase = await createAdminClient();

  const { data: transaction } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .eq('transaction_type', 'purchase')
    .single();

  if (!transaction) {
    console.error('Original transaction not found for refund:', paymentIntentId);
    return;
  }

  const creditsToDeduct = transaction.amount;

  // Get current balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', transaction.user_id)
    .single();

  const newBalance = Math.max(0, (profile?.credit_balance || 0) - creditsToDeduct);

  // Deduct credits
  await supabase
    .from('profiles')
    .update({
      credit_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transaction.user_id);

  // Log refund transaction
  await supabase.from('credit_transactions').insert({
    user_id: transaction.user_id,
    amount: -creditsToDeduct,
    transaction_type: 'refund',
    stripe_payment_intent_id: paymentIntentId,
    description: `Refund: ${creditsToDeduct} credits deducted`,
    balance_after: newBalance,
  });

  console.log(`Refunded ${creditsToDeduct} credits from user ${transaction.user_id}`);
}
