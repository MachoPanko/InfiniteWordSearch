import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { CREDIT_PACKAGES, getTotalCredits, type PackageId } from '@/lib/credit-pricing';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { packageId } = await request.json();

    if (!packageId || !(packageId in CREDIT_PACKAGES)) {
      return NextResponse.json(
        { error: 'Invalid package selected' },
        { status: 400 }
      );
    }

    const selectedPackage = CREDIT_PACKAGES[packageId as PackageId];
    const totalCredits = getTotalCredits(packageId as PackageId);

    // Create Stripe checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage.name,
              description: `${totalCredits} credits for word puzzle generation${
                selectedPackage.bonus > 0
                  ? ` (includes ${selectedPackage.bonus} bonus credits!)`
                  : ''
              }`,
            },
            unit_amount: selectedPackage.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?payment=cancelled`,
      metadata: {
        userId: user.id,
        packageId,
        credits: totalCredits.toString(),
      },
      customer_email: user.email,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
