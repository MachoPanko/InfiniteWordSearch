# 🚀 Quick Setup Instructions

## ✅ What We Just Created

All the code files are ready! Here's what to do next:

---

## 📋 Step 1: Configure Supabase (5 minutes)

### 1.1 Get Your Credentials
1. Go to your Supabase project: https://supabase.com/dashboard
2. Click **Settings** → **API**
3. Copy these 3 values:
   - **Project URL**
   - **anon public** key
   - **service_role** key

### 1.2 Update .env.local
Open `auto-word-search/.env.local` and replace:
```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_ACTUAL_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ACTUAL_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_ACTUAL_SERVICE_ROLE_KEY
```

---

## 📋 Step 2: Run Database Schema (3 minutes)

### 2.1 Open SQL Editor
1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New query"**

### 2.2 Paste and Run
1. Open the file `auto-word-search/supabase-schema.sql`
2. Copy **ALL** the contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press `Ctrl+Enter`)

### 2.3 Verify Success
You should see:
```
Success. No rows returned
```

That's normal! The tables are created but empty.

---

## 📋 Step 3: Enable Email Authentication (2 minutes)

1. In Supabase, go to **Authentication** → **Providers**
2. Find **Email** provider
3. Make sure it's **enabled** (toggle ON)
4. Scroll down and click **Save**

### Optional: Enable Google OAuth (Skip for now)
If you want Google login, follow the instructions in `AUTH-DATABASE-SETUP.md`. 
But for testing, email auth is enough!

---

## 📋 Step 4: Test It! (2 minutes)

### 4.1 Start Development Server
```bash
cd auto-word-search
npm run dev
```

### 4.2 Open Browser
Go to: http://localhost:3000

### 4.3 Test Authentication

You should see:
- A **"Email"** button in the top right
- Click it and enter your email
- Check your email for the magic link
- Click the link → You're logged in! ✅

---

## 🎉 What Works Now

After completing the steps above:

✅ **User signup/login** (with email magic link)
✅ **Session management** (stays logged in)
✅ **Database connection** (profiles auto-created)
✅ **Free tier limits** (5 puzzles/day for free users)

---

## 🔧 Troubleshooting

### Problem: "Invalid API key"
- Check your `.env.local` file
- Make sure you copied the FULL keys (they're very long)
- Restart dev server: `Ctrl+C` then `npm run dev`

### Problem: "Profile not found"
- The SQL schema might not have run correctly
- Go back to Supabase SQL Editor
- Run this verification query:
```sql
SELECT * FROM public.profiles;
```
If it says "relation does not exist", re-run the schema.

### Problem: Can't see auth button
- Clear browser cache and refresh
- Check browser console (F12) for errors

### Problem: Email not arriving
- Check spam folder
- In Supabase → Authentication → Email Templates
- Make sure SMTP is configured (free tier uses Supabase's SMTP)

---

## 📝 Next Steps (After This Works)

Once authentication is working:

1. ✅ Add limit checks to generate-words API
2. ✅ Create pricing page
3. ✅ Set up Stripe integration
4. ✅ Add usage dashboard

But first, let's make sure auth works!

---

## 🆘 Need Help?

If something's not working:
1. Check the browser console (F12)
2. Check the terminal for errors
3. Verify .env.local has the correct keys
4. Make sure the SQL schema ran successfully

Let me know what error you're seeing and I can help debug!
