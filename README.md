# ⚡ APEX CREATIONS — Deployment Guide

## Project Structure

```
apex-creations/
├── backend/
│   ├── middleware/security.js   # All security hardening
│   ├── routes/
│   │   ├── auth.js             # Admin login/logout/verify
│   │   ├── posts.js            # CRUD for service posts
│   │   └── projects.js         # Client project registrations
│   ├── services/mailer.js      # Email notifications
│   ├── db.js                   # PostgreSQL + schema init
│   ├── server.js               # Main Express server
│   ├── package.json
│   └── .env.template           # ← Copy to .env and fill in
├── frontend/public/
│   ├── index.html              # Full single-page app
│   ├── css/main.css            # All styles
│   └── js/app.js               # All frontend logic
├── render.yaml                 # Render Blueprint
└── .gitignore
```

---

## 🚀 Deploy to Render (Step-by-Step)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial Apex Creations deployment"
git remote add origin https://github.com/YOUR_USERNAME/apex-creations.git
git push -u origin main
```

### Step 2 — Create PostgreSQL on Render
1. Go to https://dashboard.render.com
2. Click **New → PostgreSQL**
3. Name it `apex-db`, pick **Free** plan, region **Oregon**
4. Click **Create Database**
5. Copy the **Internal Database URL** (starts with `postgresql://`)

### Step 3 — Create Web Service on Render
1. Click **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node

### Step 4 — Add Disk Storage
1. In your Web Service → **Disks** tab
2. Click **Add Disk**
3. Name: `apex-uploads`, Mount Path: `/var/data/uploads`, Size: `1 GB`

### Step 5 — Set Environment Variables
In your Web Service → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `UPLOAD_DIR` | `/var/data/uploads` |
| `DATABASE_URL` | *(paste from Step 2)* |
| `JWT_SECRET` | *(generate: 64+ random chars)* |
| `ADMIN_USERNAME` | `LordNejju` *(or your choice)* |
| `ADMIN_PASSWORD` | *(strong password)* |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | `callmetigger2018@gmail.com` |
| `EMAIL_PASS` | *(Gmail App Password — see below)* |
| `EMAIL_TO` | `callmetigger2018@gmail.com` |
| `FRONTEND_ORIGIN` | `https://apex-creations.onrender.com` |

### Step 6 — Gmail App Password
1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** if not already
3. Search **App Passwords**
4. Create one for "Mail" → copy the 16-char password
5. Paste as `EMAIL_PASS` in Render

### Step 7 — Deploy
Click **Manual Deploy → Deploy latest commit**

Your site will be live at: `https://apex-creations.onrender.com`

---

## 🔐 Admin Access

1. Open your site
2. **Tap the top-left corner 10 times** (invisible 50×50px zone)
3. A glassmorphic login panel slides in
4. Enter your `ADMIN_USERNAME` and `ADMIN_PASSWORD`
5. Watch the "Welcome, Lord Nejju" animation
6. Click "Enter the Chamber" → Admin Dashboard opens

### Admin Dashboard Features
- **Posts Panel:** Create posts for all 4 services + Announcements
  - Upload image, write description, add tags
  - Delete any post (clears Render disk storage too)
  - Filter by category
- **Client Requests Panel:** View all submitted project registrations
  - Full details: name, budget, type, contacts, concept, description
  - Mark as Reviewed
  - Delete/clear from storage

---

## 🛡 Security Features

- **Helmet.js** — Strict HTTP security headers + CSP
- **Rate Limiting** — Auth: 10/15min | Uploads: 50/hr | Projects: 10/hr
- **JWT** with token blacklist (logout invalidates token server-side)
- **Timing-safe login** — constant-time comparison, artificial delay
- **XSS sanitization** — all inputs sanitized via `xss` library
- **SQL injection prevention** — parameterized queries only (no string concat)
- **Path traversal guard** — `safeFilePath()` on all file operations
- **File upload validation** — MIME type + extension + size checks
- **CORS** — strict origin whitelist
- **Input validation** — `express-validator` on all routes

---

## 📞 Contact Information

- Phone: +251970061607 · +251976062692
- Email: callmetigger2018@gmail.com
- Telegram: https://t.me/ApexCreations_Official

---

## 🔧 Local Development

```bash
cd backend
cp .env.template .env
# Edit .env with your values (use local PostgreSQL)
npm install
node server.js
# Open http://localhost:10000
```
