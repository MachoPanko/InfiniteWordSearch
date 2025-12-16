# Complete Auth + Database + Stripe Setup Guide

## 🎯 Critical Components (Must Have)

### 1. **Authentication** (Supabase Auth - Easiest Option)
- OAuth providers (Google, GitHub, Email)
- Session management
- User identification

### 2. **Database** (Supabase PostgreSQL)
- User profiles
- Subscription tracking
- Usage limits/logs

### 3. **Stripe Integration**
- Link Stripe customer ID to user
- Webhook handling
- Subscription status sync

### 4. **Session Middleware**
- Protect API routes
- Check subscription tier on each request

---

## 🚀 Phase 1: Supabase Setup (30 minutes)

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Create new project (Free tier is plenty)
3. Wait for database to provision (~2 minutes)

### Step 2: Get Credentials
From Supabase Dashboard → Settings → API:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (keep secret!)
```

### Step 3: Enable Auth Providers
Dashboard → Authentication → Providers:
- ✅ **Email** (default, always enable)
- ✅ **Google OAuth** (recommended for fast signup)
- ✅ **GitHub OAuth** (good for developers)

**Google OAuth Setup:**
1. Go to https://console.cloud.google.com
2. Create new project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Authorized redirect URIs: `https://xxxxx.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret to Supabase

### Step 4: Create Database Schema
Run this in Supabase → SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  
  -- Stripe info
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  
  -- Subscription details
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  
  -- Usage tracking (resets daily)
  puzzles_generated_today INT DEFAULT 0,
  last_puzzle_date DATE DEFAULT CURRENT_DATE,
  total_puzzles_generated INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage logs for analytics and debugging
CREATE TABLE public.usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Action details
  action TEXT NOT NULL, -- 'generate_puzzle', 'random_theme', etc.
  themes_count INT DEFAULT 1,
  words_count INT DEFAULT 10,
  copies_count INT DEFAULT 1,
  
  -- Cost tracking
  estimated_tokens INT, -- Approximate API token usage
  was_allowed BOOLEAN DEFAULT true,
  denied_reason TEXT,
  
  -- Context
  user_tier TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription history for audit trail
CREATE TABLE public.subscription_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL, -- 'created', 'updated', 'canceled', 'renewed'
  old_tier TEXT,
  new_tier TEXT,
  old_status TEXT,
  new_status TEXT,
  
  stripe_event_id TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX idx_usage_logs_user_date ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_logs_action ON public.usage_logs(action);

-- Row Level Security (RLS) - Users can only see their own data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own usage logs" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription history" ON public.subscription_history
  FOR SELECT USING (auth.uid() = user_id);

-- Function: Reset daily puzzle counter (run as cron job)
CREATE OR REPLACE FUNCTION reset_daily_counters()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    puzzles_generated_today = 0,
    last_puzzle_date = CURRENT_DATE
  WHERE last_puzzle_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 5: Set up Cron Job (for daily reset)
Supabase Dashboard → Database → Cron Jobs (requires Pro plan, or use Vercel Cron):

```sql
SELECT cron.schedule(
  'reset-daily-counters',
  '0 0 * * *', -- Every day at midnight UTC
  'SELECT reset_daily_counters();'
);
```

**Alternative (Free):** Use Vercel Cron or create API route:
```typescript
// app/api/cron/reset-counters/route.ts
// Call this from Vercel Cron or external service
```

---

## 🔐 Phase 2: Install Dependencies (5 minutes)

```bash
cd auto-word-search

# Supabase client
npm install @supabase/supabase-js @supabase/ssr

# Stripe
npm install stripe @stripe/stripe-js

# Optional: Better date handling
npm install date-fns
```

---

## ⚙️ Phase 3: Environment Variables (5 minutes)

Create `auto-word-search/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (Test Mode - get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (get after setting up webhook)

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Gemini API (existing)
GEMINI_API_KEY=your_gemini_key
```

**Important:** Add to `.gitignore`:
```
.env*.local
.env
```

---

## 🛠️ Phase 4: Create Utility Files (30 minutes)

### File: `lib/supabase/client.ts` (Browser client)
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### File: `lib/supabase/server.ts` (Server client)
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie errors in server components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie errors
          }
        },
      },
    }
  );
}

// Admin client with service role (bypasses RLS)
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    }
  );
}
```

### File: `lib/supabase/middleware.ts` (Route protection)
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}
```

### File: `middleware.ts` (Root of auto-word-search)
```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### File: `lib/subscription-limits.ts` (Tier limits)
```typescript
export type SubscriptionTier = 'free' | 'premium' | 'enterprise';

export interface TierLimits {
  puzzles_per_day: number;
  max_words: number;
  max_copies: number;
  max_themes_at_once: number;
  ai_features: boolean;
  bulk_generation: boolean;
  export_pdf: boolean;
  priority_support: boolean;
  api_access: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    puzzles_per_day: 5,
    max_words: 10,
    max_copies: 1,
    max_themes_at_once: 1,
    ai_features: false,
    bulk_generation: false,
    export_pdf: false,
    priority_support: false,
    api_access: false,
  },
  premium: {
    puzzles_per_day: Infinity,
    max_words: 50,
    max_copies: 50,
    max_themes_at_once: 10,
    ai_features: true,
    bulk_generation: true,
    export_pdf: true,
    priority_support: false,
    api_access: false,
  },
  enterprise: {
    puzzles_per_day: Infinity,
    max_words: 100,
    max_copies: 100,
    max_themes_at_once: 50,
    ai_features: true,
    bulk_generation: true,
    export_pdf: true,
    priority_support: true,
    api_access: true,
  },
};

export function canPerformAction(
  tier: SubscriptionTier,
  action: {
    wordCount?: number;
    copies?: number;
    themes?: number;
    dailyUsage?: number;
  }
): { allowed: boolean; reason?: string } {
  const limits = TIER_LIMITS[tier];

  if (action.dailyUsage !== undefined && action.dailyUsage >= limits.puzzles_per_day) {
    return {
      allowed: false,
      reason: `Daily limit of ${limits.puzzles_per_day} puzzles reached. Upgrade to Premium for unlimited puzzles.`,
    };
  }

  if (action.wordCount && action.wordCount > limits.max_words) {
    return {
      allowed: false,
      reason: `Maximum ${limits.max_words} words allowed for ${tier} tier. Upgrade to increase limit.`,
    };
  }

  if (action.copies && action.copies > limits.max_copies) {
    return {
      allowed: false,
      reason: `Maximum ${limits.max_copies} copies allowed for ${tier} tier. Upgrade for bulk generation.`,
    };
  }

  if (action.themes && action.themes > limits.max_themes_at_once) {
    return {
      allowed: false,
      reason: `Maximum ${limits.max_themes_at_once} themes at once for ${tier} tier.`,
    };
  }

  return { allowed: true };
}
```

---

## 🔗 Phase 5: Connect Everything (Critical API Routes)

### File: `app/api/auth/callback/route.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to home or dashboard
  return NextResponse.redirect(`${origin}/`);
}
```

### File: `app/api/user/profile/route.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json({ user, profile });
}
```

### File: `app/api/check-limits/route.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { canPerformAction, TIER_LIMITS } from '@/lib/subscription-limits';

export async function POST(request: Request) {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    // Allow unauthenticated users with free tier limits
    return NextResponse.json({
      allowed: true,
      tier: 'free',
      limits: TIER_LIMITS.free,
      authenticated: false,
    });
  }

  // Get user profile with subscription info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { action, params } = await request.json();

  // Check if daily counter needs reset
  const today = new Date().toISOString().split('T')[0];
  if (profile.last_puzzle_date !== today) {
    await supabase
      .from('profiles')
      .update({
        puzzles_generated_today: 0,
        last_puzzle_date: today,
      })
      .eq('id', user.id);
    profile.puzzles_generated_today = 0;
  }

  // Verify subscription status
  const tier = profile.subscription_status === 'active'
    ? profile.subscription_tier
    : 'free';

  // Check limits
  const limitCheck = canPerformAction(tier, {
    wordCount: params?.wordCount,
    copies: params?.copies,
    themes: params?.themes,
    dailyUsage: profile.puzzles_generated_today,
  });

  if (!limitCheck.allowed) {
    return NextResponse.json({
      allowed: false,
      reason: limitCheck.reason,
      tier,
      upgrade_required: true,
    });
  }

  // Log the action
  await supabase.from('usage_logs').insert({
    user_id: user.id,
    action,
    themes_count: params?.themes || 1,
    words_count: params?.wordCount || 10,
    copies_count: params?.copies || 1,
    was_allowed: true,
    user_tier: tier,
  });

  // Increment daily counter
  await supabase
    .from('profiles')
    .update({
      puzzles_generated_today: profile.puzzles_generated_today + 1,
      total_puzzles_generated: profile.total_puzzles_generated + 1,
    })
    .eq('id', user.id);

  return NextResponse.json({
    allowed: true,
    tier,
    limits: TIER_LIMITS[tier],
    authenticated: true,
    usage: {
      today: profile.puzzles_generated_today + 1,
      total: profile.total_puzzles_generated + 1,
    },
  });
}
```

---

## 🎨 Phase 6: Auth Components (1 hour)

### File: `components/AuthButton.tsx`
```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignIn = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-10 w-24 rounded"></div>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          {user.email}
        </span>
        <button
          onClick={handleSignOut}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleSignIn('google')}
        className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}
```

---

## ✅ Critical Checklist

### Before You Start:
- [ ] Create Supabase account
- [ ] Create Stripe account
- [ ] Have Google Cloud account (for OAuth)

### Setup (Do in order):
1. [ ] Create Supabase project & get credentials
2. [ ] Enable Google OAuth in Supabase
3. [ ] Run database schema SQL
4. [ ] Install npm dependencies
5. [ ] Create .env.local with all keys
6. [ ] Create lib/supabase files
7. [ ] Create middleware.ts
8. [ ] Create auth callback route
9. [ ] Add AuthButton to layout
10. [ ] Test login/logout

### Next Steps (After Auth Works):
- [ ] Create Stripe products
- [ ] Add Stripe webhook route
- [ ] Create checkout route
- [ ] Update generate-words API with limits check
- [ ] Build pricing page/modal
- [ ] Test full flow

---

## 🎯 What Else is Critical?

You've identified the big 3:
1. ✅ **OAuth/Auth** (Supabase Auth)
2. ✅ **Database** (Supabase PostgreSQL)
3. ✅ **Stripe** (Payment processing)

### Also Important (but can wait):
4. **Email Service** - For password resets, receipts (Supabase has built-in)
5. **Error Tracking** - Sentry or LogRocket (nice to have)
6. **Analytics** - Google Analytics or Posthog (can add later)
7. **Rate Limiting** - Prevent abuse (can add with Vercel)

### Can Skip for MVP:
- ❌ Custom email templates (use Supabase defaults)
- ❌ Advanced analytics dashboard
- ❌ Multiple team members
- ❌ API keys for developers
- ❌ Webhooks for integrations

---

## 🚀 Ready to Implement?

Let me know and I'll:
1. Create all the files above
2. Set up the database schema
3. Wire up authentication
4. Add limit checking to existing APIs
5. Create a simple login UI

**Estimated time:** 2-3 hours for working auth + limits system

Should we start? 🎯
