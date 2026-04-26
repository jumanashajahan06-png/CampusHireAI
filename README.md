# 🎓 CampusHire AI — Placement & Internship Tracker

<div align="center">

**The smart job & internship tracker built for college students.**
Track every application, prep for interviews with AI, and never miss a deadline.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Claude AI](https://img.shields.io/badge/Claude-AI-cc785c?style=flat-square&logo=anthropic&logoColor=white)](https://anthropic.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Quick Start](#-quick-start) · [API Docs](#-api-reference) · [Deploy](#-deployment) · [Contributing](#-contributing)

</div>

---

## ✨ Features

- **🔐 Authentication** — Secure signup/login with JWT. Passwords hashed with bcrypt (12 rounds).
- **📊 Dashboard** — Animated stats cards, upcoming deadlines, and status breakdown bars.
- **📋 Application Tracker** — Add, edit, delete applications. Filter by status, search by company/role, sort by date or deadline.
- **🎯 Status Pipeline** — Track every stage: `Applied → Interview → Offer / Rejected`.
- **⏰ Deadline Reminders** — Visual urgency indicators (red ≤3 days, yellow ≤7 days).
- **🤖 AI Career Assistant** — Powered by Claude. Resume tips, mock interview Q&A, cover letters, salary negotiation. Works in demo mode without an API key.
- **📱 Fully Responsive** — Works on mobile, tablet, and desktop.
- **🌙 Dark Theme** — Easy on the eyes during late-night application sessions.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (no frameworks) |
| **Backend** | Node.js 18+, Express 4 |
| **Database** | MongoDB with Mongoose ODM |
| **Auth** | JWT + bcryptjs |
| **AI** | Anthropic Claude API (`claude-opus-4-6`) |
| **Dev** | nodemon, dotenv |

---

## 📁 Project Structure

```
campushireai/
├── frontend/
│   ├── pages/          # index, login, signup, dashboard,
│   │                   # applications, ai-assistant, 404
│   ├── css/            # main, auth, dashboard, applications, ai
│   └── js/             # utils, auth, dashboard, applications, ai
│
├── backend/
│   ├── server.js       # Express entry point
│   ├── seed.js         # Demo data seeder
│   ├── .env.example    # Environment variable template
│   ├── config/         # db.js (MongoDB), indexes.js
│   ├── models/         # User.js, Application.js
│   ├── controllers/    # auth, applications, ai (Claude)
│   ├── routes/         # auth, applications, ai
│   └── middleware/     # JWT auth, global error handler
│
├── docs/
│   ├── QUICKSTART.md
│   ├── MONGODB_SETUP.md
│   └── DEPLOYMENT.md
│
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16+ — [Download](https://nodejs.org)
- **MongoDB** — Local install or [Atlas free tier](https://mongodb.com/atlas)
- **Anthropic API key** *(optional)* — [Get one](https://console.anthropic.com) for real AI

### 1. Clone & install

```bash
git clone https://github.com/jumanashajahan06-png/CampusHireAI.git
cd campushireai
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/campushireai
JWT_SECRET=your_secret_min_32_chars_here
PORT=3000
NODE_ENV=development
ANTHROPIC_API_KEY=sk-ant-api03-...    # optional
```

> **Generate a secure JWT secret:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 3. Seed demo data *(recommended)*

```bash
npm run seed
```

Creates a demo account and 8 sample applications across all statuses:

```
Email:    demo@campushireai.com
Password: demo1234
```

### 4. Start the server

```bash
npm run dev     # development (auto-restart on file changes)
npm start       # production
```

### 5. Open in browser

```
http://localhost:3000/pages/index.html
```

---

## 🔌 API Reference

All protected routes require the header: `Authorization: Bearer <token>`

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/auth/signup` | ❌ | Create account, returns JWT |
| `POST` | `/api/auth/login` | ❌ | Login, returns JWT |
| `GET` | `/api/auth/me` | ✅ | Get current user profile |

**Example — Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@campushireai.com","password":"demo1234"}'
```

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "name": "Alex Johnson", "email": "demo@campushireai.com" }
}
```

---

### Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/applications` | List all (supports `?status=Interview&search=google&sort=-createdAt`) |
| `GET` | `/api/applications/stats` | Dashboard stats + upcoming deadlines |
| `GET` | `/api/applications/:id` | Get single application |
| `POST` | `/api/applications` | Create application |
| `PUT` | `/api/applications/:id` | Update application |
| `DELETE` | `/api/applications/:id` | Delete application |

**Create application body:**
```json
{
  "company": "Stripe",
  "role": "Backend Engineer Intern",
  "status": "Applied",
  "jobType": "Internship",
  "location": "San Francisco, CA",
  "dateApplied": "2025-01-15",
  "deadline": "2025-02-01",
  "notes": "Referral from senior student."
}
```

**Status values:** `Applied` · `Interview` · `Offer` · `Rejected`  
**jobType values:** `Internship` · `Full-time` · `Part-time` · `Contract`

---

### AI Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/ask` | Send a message, receive AI career advice |
| `POST` | `/api/ai/resume-tips` | Tips personalised to your actual tracked applications |
| `POST` | `/api/ai/interview-prep` | Role-specific interview questions with model answers |

**Chat:**
```json
POST /api/ai/ask
{
  "messages": [
    { "role": "user", "content": "How do I prepare for a Google SWE interview?" }
  ]
}
```

**Interview prep:**
```json
POST /api/ai/interview-prep
{ "company": "Stripe", "role": "Backend Engineer Intern" }
```

Responses include a `source` field: `"claude"` (real AI) or `"mock"` (demo mode).

---

### Health Check

```bash
GET /api/health
```
```json
{
  "status": "ok",
  "app": "CampusHire AI",
  "version": "1.0.0",
  "aiEnabled": true,
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

## 📦 NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start in production mode |
| `npm run seed` | Seed demo user + 8 sample applications |
| `npm run seed:clear` | Wipe all data from the database |
| `npm run indexes` | Create MongoDB performance indexes |

---

## 🔒 Security

- Passwords hashed with **bcrypt** at 12 salt rounds — never stored in plain text
- **JWT tokens** expire after 7 days
- All application queries **scoped to authenticated user** — users cannot access each other's data
- **Rate limiting** — 100 requests/IP per 15 minutes
- **Body size limit** — 10kb max payload
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- Vague login error messages to prevent email enumeration attacks

---

## 🌍 Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for full guides. Quick summary:

**Railway (easiest):**
1. Push to GitHub
2. Connect repo on [railway.app](https://railway.app)
3. Add environment variables in the dashboard
4. Done — auto-deploys on every push

**Pre-deploy checklist:**
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is 32+ random characters
- [ ] `MONGODB_URI` points to Atlas, not localhost
- [ ] Run `npm run indexes` once on the production DB
- [ ] Lock CORS `origin` in `server.js` to your domain

---

## 🤖 Enabling Real AI

The app works in **demo mode by default** — useful without any API key. To unlock real Claude responses:

1. Get a key at [console.anthropic.com](https://console.anthropic.com)
2. Add to `backend/.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```
3. Restart: `npm run dev`

The UI shows a yellow **Demo Mode** banner when the key is absent, and a **✦ Claude AI** tag on real responses.

---

## 🗄️ Database Setup

See **[docs/MONGODB_SETUP.md](docs/MONGODB_SETUP.md)** for detailed setup. The short version:

**Atlas (recommended — free 512MB):**
```
1. Sign up → mongodb.com/atlas
2. Create free M0 cluster
3. Create a DB user + whitelist your IP
4. Copy connection string → paste into MONGODB_URI
```

**Local:**
```env
MONGODB_URI=mongodb://localhost:27017/campushireai
```

---

## 🧩 Data Models

**User**
```
name         String   required
email        String   required, unique
password     String   bcrypt hashed, never returned in responses
university   String
createdAt    Date     auto-generated
```

**Application**
```
user         ObjectId  → User (owner)
company      String    required
role         String    required
status       Enum      Applied | Interview | Offer | Rejected
jobType      Enum      Internship | Full-time | Part-time | Contract
location     String
dateApplied  Date      defaults to today
deadline     Date      drives urgency indicators
notes        String    max 2000 chars
salary       String
jobUrl       String
createdAt    Date      auto-generated
```

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork this repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Write clean, commented code
4. Test the auth flow, CRUD, and AI chat manually
5. Commit with a clear message: `git commit -m "feat: add CSV export"`
6. Open a Pull Request

**Ideas for good first contributions:**
- Email notifications for upcoming deadlines (Nodemailer/SendGrid)
- Export applications to CSV
- Calendar/timeline view of deadlines
- Unit tests for controllers (Jest)
- Docker + docker-compose setup
- OAuth login (Google)

---

## 📄 License

[MIT](LICENSE) — free to use, fork, and modify. Attribution appreciated.

---

## 🙏 Acknowledgements

- [Anthropic](https://anthropic.com) for Claude
- [MongoDB Atlas](https://mongodb.com/atlas) for the generous free tier
- [Syne](https://fonts.google.com/specimen/Syne) & [DM Sans](https://fonts.google.com/specimen/DM+Sans) from Google Fonts
- Every student grinding through placement season 💪

---

<div align="center">
Built with ❤️ for students everywhere.<br>
<strong>⭐ Star this repo if it helped you land an offer!</strong>
</div>
