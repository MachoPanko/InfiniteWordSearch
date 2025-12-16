-- ========================================
-- CREDIT-BASED SCHEMA (Fresh Start)
-- Run this in Supabase SQL Editor
-- ========================================

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  credit_balance INTEGER DEFAULT 0,
  total_credits_purchased INTEGER DEFAULT 0,
  credits_used_today INTEGER DEFAULT 0,
  last_credit_reset_date DATE DEFAULT CURRENT_DATE,
  total_puzzles_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit_transactions table for audit trail
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- positive for purchase, negative for usage
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus', 'daily_free')),
  stripe_payment_intent_id TEXT,
  description TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage_logs table
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  themes_count INTEGER DEFAULT 1,
  words_count INTEGER DEFAULT 10,
  copies_count INTEGER DEFAULT 1,
  estimated_tokens INTEGER,
  was_allowed BOOLEAN DEFAULT true,
  denied_reason TEXT,
  credits_charged INTEGER DEFAULT 0,
  credit_balance_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for usage_logs
CREATE POLICY "Users can view own usage logs"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS reset_daily_credits();

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to reset daily free credits
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    credits_used_today = 0,
    last_credit_reset_date = CURRENT_DATE
  WHERE last_credit_reset_date < CURRENT_DATE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION update_updated_at() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION reset_daily_credits() TO postgres, service_role;

-- Table comments
COMMENT ON TABLE profiles IS 'User profiles with credit balances and usage tracking';
COMMENT ON TABLE credit_transactions IS 'Audit trail for all credit purchases and usage';
COMMENT ON TABLE usage_logs IS 'Detailed logs of puzzle generation actions';
COMMENT ON COLUMN profiles.credit_balance IS 'Current paid credit balance';
COMMENT ON COLUMN profiles.credits_used_today IS 'Total credits used today (free + paid)';

-- ========================================
-- OPTIONAL: Set up daily cron job
-- Go to Database > Cron Jobs in Supabase and add:
-- SELECT cron.schedule('reset-daily-credits', '0 0 * * *', 'SELECT reset_daily_credits()');
-- ========================================
