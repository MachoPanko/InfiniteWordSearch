# Stripe Premium Features Implementation Guide

## 🎯 Premium vs Free Tier Strategy

Based on your Gemini API costs, here's the recommended pricing structure:

### **Free Tier** (No API calls or minimal)
- ✅ 5 puzzles per day
- ✅ Up to 10 words per puzzle
- ✅ 1 theme at a time
- ✅ Basic random theme generator (no AI)
- ✅ Standard grid size (15x15)
- ❌ No bulk generation
- ❌ No high word count

### **Premium Tier** (Unlimited API usage)
- ✅ **Unlimited puzzles**
- ✅ **Up to 50 words per puzzle** (high token usage)
- ✅ **Bulk generation** (up to 50 copies at once) - major token cost
- ✅ **Multiple themes simultaneously** (batch API calls)
- ✅ **AI-powered random themes** (currently free but uses API)
- ✅ **Larger grids** (up to 30x30)
- ✅ **Priority processing** (faster generation)
- ✅ **Custom word lists with AI optimization**
- ✅ **Export to PDF/PNG**
- ✅ **No watermark**

### **Enterprise Tier** (For corporations)
- Everything in Premium +
- ✅ **API access** for integration
- ✅ **White-label branding**
- ✅ **Team accounts** (multiple users)
- ✅ **Usage analytics dashboard**
- ✅ **Priority support**
- ✅ **Custom themes library**
- ✅ **Dedicated account manager**

---

## 💰 Suggested Pricing

Based on Gemini API costs (~$0.01-0.05 per 1K tokens):

| Tier | Price | Target Audience |
|------|-------|----------------|
| **Free** | $0/month | Individual teachers, casual users |
| **Premium** | $9.99/month or $79/year | Active teachers, therapists, small groups |
| **Enterprise** | $49/month or $399/year | Schools, nursing homes, corporations |

---

## 🚀 Implementation Steps

### Phase 1: Setup Stripe (30 minutes)

#### 1. Install Stripe
```bash
cd auto-word-search
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

#### 2. Add Environment Variables
Create `.env.local`:
```env
# Stripe Keys (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...
```

#### 3. Create Stripe Products in Dashboard
1. Go to https://dashboard.stripe.com/products
2. Create products:
   - **Premium Plan** - $9.99/month recurring
   - **Premium Plan (Yearly)** - $79/year recurring
   - **Enterprise Plan** - $49/month recurring
   - **Enterprise Plan (Yearly)** - $399/year recurring

---

### Phase 2: Database for User Subscriptions (1 hour)

You'll need a database to track user subscriptions. Recommended options:

#### Option A: Supabase (Easiest, Free Tier)
```bash
npm install @supabase/supabase-js
```

**Schema:**
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'premium', 'enterprise'
  subscription_status TEXT, -- 'active', 'canceled', 'past_due'
  stripe_subscription_id TEXT,
  subscription_start DATE,
  subscription_end DATE,
  puzzles_generated_today INT DEFAULT 0,
  last_puzzle_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT, -- 'generate_puzzle', 'generate_words', 'random_theme'
  theme_count INT,
  word_count INT,
  copies_count INT,
  tokens_used INT, -- estimate API token usage
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reset daily counter (run as cron job)
CREATE OR REPLACE FUNCTION reset_daily_puzzles()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET puzzles_generated_today = 0
  WHERE last_puzzle_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
```

#### Option B: Vercel KV (Redis) - Simpler, No Complex Queries
```bash
npm install @vercel/kv
```

---

### Phase 3: Create Stripe API Routes (2 hours)

#### File: `app/api/create-checkout-session/route.ts`
```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: Request) {
  try {
    const { priceId, userEmail } = await request.json();

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/pricing`,
      metadata: {
        userEmail,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

#### File: `app/api/stripe-webhook/route.ts`
```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      // TODO: Save to database
      console.log('New subscription:', {
        email: customerEmail,
        customerId,
        subscriptionId,
      });

      // Update user in database
      // await supabase.from('users').upsert({
      //   email: customerEmail,
      //   stripe_customer_id: customerId,
      //   stripe_subscription_id: subscriptionId,
      //   subscription_tier: 'premium', // or 'enterprise' based on priceId
      //   subscription_status: 'active',
      //   subscription_start: new Date(),
      // });

      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status;

      // TODO: Update subscription status in database
      console.log('Subscription updated:', { customerId, status });

      // await supabase.from('users')
      //   .update({
      //     subscription_status: status,
      //     subscription_end: status === 'canceled' ? new Date(subscription.canceled_at! * 1000) : null,
      //   })
      //   .eq('stripe_customer_id', customerId);

      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Payment failed:', invoice.customer);

      // TODO: Send email notification, update status to 'past_due'
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
```

#### File: `app/api/check-limits/route.ts`
```typescript
import { NextResponse } from 'next/server';

// This checks if user can perform an action based on their tier
export async function POST(request: Request) {
  try {
    const { userEmail, action, params } = await request.json();

    // TODO: Get user from database
    // const user = await getUserByEmail(userEmail);
    
    // Mock for now
    const user = {
      subscription_tier: 'free', // or 'premium', 'enterprise'
      puzzles_generated_today: 3,
    };

    const limits = {
      free: {
        puzzles_per_day: 5,
        max_words: 10,
        max_copies: 1,
        max_themes: 1,
        ai_random_themes: false,
      },
      premium: {
        puzzles_per_day: Infinity,
        max_words: 50,
        max_copies: 50,
        max_themes: 10,
        ai_random_themes: true,
      },
      enterprise: {
        puzzles_per_day: Infinity,
        max_words: 100,
        max_copies: 100,
        max_themes: 50,
        ai_random_themes: true,
      },
    };

    const tierLimits = limits[user.subscription_tier as keyof typeof limits];

    // Check specific limits based on action
    if (action === 'generate_puzzle') {
      if (user.puzzles_generated_today >= tierLimits.puzzles_per_day) {
        return NextResponse.json({
          allowed: false,
          reason: 'Daily puzzle limit reached',
          upgrade_required: true,
        });
      }

      if (params.wordCount > tierLimits.max_words) {
        return NextResponse.json({
          allowed: false,
          reason: `Maximum ${tierLimits.max_words} words allowed for ${user.subscription_tier} tier`,
          upgrade_required: true,
        });
      }

      if (params.copies > tierLimits.max_copies) {
        return NextResponse.json({
          allowed: false,
          reason: `Maximum ${tierLimits.max_copies} copies allowed for ${user.subscription_tier} tier`,
          upgrade_required: true,
        });
      }
    }

    return NextResponse.json({
      allowed: true,
      tier: user.subscription_tier,
      limits: tierLimits,
    });

  } catch (error) {
    console.error('Error checking limits:', error);
    return NextResponse.json(
      { error: 'Failed to check limits' },
      { status: 500 }
    );
  }
}
```

---

### Phase 4: Update Frontend (2 hours)

#### File: `components/PricingModal.tsx`
```typescript
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export default function PricingModal({ isOpen, onClose, reason }: PricingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubscribe = async (priceId: string) => {
    if (!email) {
      alert('Please enter your email');
      return;
    }

    setIsLoading(true);

    try {
      // Create Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userEmail: email }),
      });

      const { sessionId } = await response.json();

      // Redirect to Checkout
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Upgrade to Premium</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
              ×
            </button>
          </div>

          {reason && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-yellow-800">{reason}</p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free Tier */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <p className="text-3xl font-bold mb-4">$0<span className="text-sm text-gray-500">/month</span></p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm">5 puzzles/day</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm">Up to 10 words</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm">1 theme at a time</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span className="text-sm text-gray-400">No bulk generation</span>
                </li>
              </ul>
              <button disabled className="w-full py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed">
                Current Plan
              </button>
            </div>

            {/* Premium Tier */}
            <div className="border-4 border-blue-500 rounded-xl p-6 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>
              <h3 className="text-xl font-bold mb-2">Premium</h3>
              <p className="text-3xl font-bold mb-4">$9.99<span className="text-sm text-gray-500">/month</span></p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm font-semibold">Unlimited puzzles</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm font-semibold">Up to 50 words</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm font-semibold">Bulk generation (50 copies)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm font-semibold">AI random themes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID!)}
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Subscribe Now'}
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="border-2 border-purple-500 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-3xl font-bold mb-4">$49<span className="text-sm text-gray-500">/month</span></p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm">Everything in Premium</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm font-semibold">API access</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm font-semibold">Team accounts</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm">White-label branding</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm">Dedicated support</span>
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!)}
                disabled={isLoading}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Contact Sales'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Update `app/api/generate-words/route.ts` with limits check:
```typescript
// Add at the beginning of POST function
export async function POST(request: Request) {
  try {
    const { themes = [], locale = 'en', count = 10, copies = 1, userEmail } = await request.json();

    // Check user limits
    const limitsCheck = await fetch(`${request.headers.get('origin')}/api/check-limits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail,
        action: 'generate_puzzle',
        params: { wordCount: count, copies, themes: themes.length },
      }),
    });

    const limitsResult = await limitsCheck.json();

    if (!limitsResult.allowed) {
      return NextResponse.json(
        { 
          error: limitsResult.reason,
          upgrade_required: true,
        },
        { status: 403 }
      );
    }

    // ... rest of existing code
```

---

### Phase 5: Testing (1 hour)

1. **Test Mode**: Use Stripe test keys
2. **Test Cards**: 
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. **Webhook Testing**: Use Stripe CLI
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```

---

## 📊 Token Cost Estimation

Based on your current usage patterns:

| Action | Tokens Used | Cost per Action | Free Tier Limit | Premium Impact |
|--------|-------------|-----------------|-----------------|----------------|
| Generate 10 words | ~150 tokens | $0.0075 | 5x/day = $0.0375 | Unlimited |
| Generate 50 words | ~750 tokens | $0.0375 | ❌ Not allowed | Unlimited |
| Bulk 10 copies | ~1500 tokens | $0.075 | ❌ Not allowed | Unlimited |
| Bulk 50 copies | ~7500 tokens | $0.375 | ❌ Not allowed | Unlimited |
| AI Random themes | ~100 tokens | $0.005 | ❌ Not allowed | Unlimited |

**Monthly costs for heavy user:**
- Free tier: $0 (5 puzzles/day × 30 days × $0.0075) = ~$1.12 cost to you
- Premium user (100 puzzles/day): ~$22.50 cost to you → **Profit margin: $9.99 - $22.50 = -$12.51 loss**

**Solution**: Adjust limits or pricing:
- Premium: $19.99/month (better margin)
- OR: Limit premium to 30 puzzles/day (still great value, ~$6.75 cost)

---

## 🚀 Quick Start Checklist

- [ ] Sign up for Stripe account
- [ ] Create products in Stripe Dashboard
- [ ] Install dependencies (`stripe`, `@stripe/stripe-js`)
- [ ] Add environment variables
- [ ] Set up database (Supabase recommended)
- [ ] Create API routes (checkout, webhook, limits)
- [ ] Build pricing modal component
- [ ] Add limit checks to existing API routes
- [ ] Test with Stripe test mode
- [ ] Configure webhook endpoint in Stripe
- [ ] Deploy to production
- [ ] Switch to live mode

**Total implementation time: ~6-8 hours for a working MVP**

---

## 💡 Pro Tips

1. **Start simple**: Implement just Free + Premium first
2. **Use Stripe Customer Portal**: Let users manage subscriptions themselves
3. **Add usage dashboard**: Show users their current usage
4. **Email notifications**: Alert users when nearing limits
5. **Grandfather existing users**: Give early adopters lifetime free premium
6. **Annual discount**: 2 months free encourages longer commitments
7. **Free trial**: 7-day premium trial increases conversion

Need help implementing any specific part? I can write the complete code!
