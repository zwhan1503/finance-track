# FinanceFlow — Expense Tracker

A personal expense tracking app built with React + Recharts. No backend needed — data persists in your browser's localStorage.

## Quick Start (Local)

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Deploy to Vercel (Free)

### Option A: Via GitHub (recommended)

1. Create a new GitHub repo and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/finance-tracker.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign in with GitHub

3. Click **"Add New → Project"**

4. Import your `finance-tracker` repo

5. Click **Deploy** — Vercel auto-detects Vite and builds it

6. Done! You'll get a URL like `finance-tracker-abc123.vercel.app`

### Option B: Via Vercel CLI (no GitHub needed)

```bash
npm i -g vercel
vercel
```

Follow the prompts. Done in 30 seconds.

## Access on Mobile

1. Open your Vercel URL in Chrome on your Samsung S23 Ultra
2. Tap the **⋮** menu (three dots, top right)
3. Tap **"Add to Home screen"**
4. Now it appears as an app icon and opens full-screen!

## Notes

- Data is stored in **localStorage** per device — your phone and PC will have separate data
- No account or login needed
- Budget settings are also saved locally
- Works offline after first load
