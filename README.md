# 💰 Duka Profit

**Profit tracking application for small businesses in East Africa (Rwanda)**

A simple, secure, offline-capable desktop + mobile-friendly application to help shop owners record sales, calculate profits, and understand their business performance.

---

## 🌍 Built for
- Duka (shop) owners in Rwanda
- Market vendors and informal businesses
- Small business owners across East Africa

## 🎯 Features
- ✅ Daily sales recording (one-tap)
- ✅ Automatic profit calculation
- ✅ Dashboard with charts and insights
- ✅ Reports (daily / weekly / monthly / yearly)
- ✅ PDF & CSV export
- ✅ Offline mode (works without internet)
- ✅ Multi-language: English, Kinyarwanda, Swahili, French
- ✅ Voice input ("Sold 5 sodas")
- ✅ License key system (anti-copy protection)
- ✅ JWT auth + bcrypt password hashing
- ✅ Rate limiting & security headers

---

## 🧱 Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Frontend   | React 18 + Vite               |
| Desktop    | Electron 28                   |
| Backend    | Node.js + Express             |
| Database   | MongoDB + Mongoose            |
| Auth       | JWT + bcrypt                  |
| Charts     | Recharts                      |
| Offline    | localforage (IndexedDB)       |
| i18n       | i18next                       |
| PDF Export | jsPDF + jspdf-autotable       |

---

## 📁 Project Structure

```
duka-profit/
├── electron/           # Electron main + preload
│   ├── main.js
│   └── preload.js
├── frontend/           # React app (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/     # Sidebar + navigation
│   │   ├── context/        # Auth context
│   │   ├── i18n/           # Translations (EN/RW/SW/FR)
│   │   ├── pages/          # All page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Sales.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Settings.jsx
│   │   └── utils/
│   │       └── api.js      # Axios + offline utils
│   └── index.html
├── backend/            # Express API
│   ├── middleware/
│   │   ├── auth.js         # JWT middleware
│   │   └── validate.js     # Input validation
│   ├── models/
│   │   ├── User.js         # MongoDB schema
│   │   ├── Product.js
│   │   ├── Sale.js
│   │   └── License.js
│   ├── routes/
│   │   ├── auth.js         # Register / Login / Profile
│   │   ├── products.js     # CRUD products
│   │   ├── sales.js        # Record & list sales
│   │   ├── dashboard.js    # Dashboard stats + chart
│   │   ├── reports.js      # Period reports + export data
│   │   └── license.js      # License verification
│   ├── utils/
│   │   └── seed.js         # Demo data seeder
│   ├── server.js
│   └── .env
└── package.json
```

---

## 🚀 Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) v6+ (local) or MongoDB Atlas (cloud)
- npm v9+

---

### Step 1 — Install MongoDB

**On Ubuntu/Debian:**
```bash
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**On Windows:**
Download from https://www.mongodb.com/try/download/community and install.

**On macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Or use MongoDB Atlas (cloud — free tier):**
1. Go to https://cloud.mongodb.com
2. Create a free cluster
3. Get connection string
4. Paste in `backend/.env` as `MONGODB_URI`

---

### Step 2 — Install Dependencies

```bash
# In the project root
cd duka-profit

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

---

### Step 3 — Configure Environment

```bash
# Backend config (already created with defaults)
# Edit backend/.env to customize:
nano backend/.env
```

Key settings:
```env
MONGODB_URI=mongodb://localhost:27017/duka-profit
JWT_SECRET=your-very-long-random-secret-string
```

### MongoDB Atlas (Recommended Cloud Setup)

1. Create or open your project in [MongoDB Atlas](https://cloud.mongodb.com).
2. Create a database user (`Database Access`) with read/write permissions.
3. Allow your current IP in `Network Access` (or temporarily allow `0.0.0.0/0` for testing).
4. Open `Connect` -> `Drivers` and copy the `mongodb+srv` connection string.
5. In `backend/.env`, set:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<db-name>?retryWrites=true&w=majority&appName=Profit
```

Notes:
- If your password contains special characters, URL-encode it.
- Never commit real credentials to git.
- If port `5000` is busy, backend now automatically retries on `5001+`.

---

### Step 4 — Seed Demo Data

```bash
cd backend
node utils/seed.js
```

This creates:
- Demo user: `demo@duka.rw` / `password123`
- License key: `DUKA-DEMO-2024-FREE`
- 10 sample products
- 30 days of sales history

---

### Step 5 — Run Development Mode

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server runs at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App runs at http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

### Step 6 — Run as Electron Desktop App

```bash
# First build the frontend
cd frontend && npm run build && cd ..

# Then launch Electron
npx electron .
```

---

### Step 7 — Build Distributable (Desktop Installer)

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Package for current OS
npm run build:electron
```

Outputs to `dist-electron/`:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` file
- **Linux**: `.AppImage`

---

## 🔐 Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt (12 rounds) |
| Authentication | JWT (30 day expiry) |
| Input validation | express-validator |
| Rate limiting | express-rate-limit (10 login attempts / 15min) |
| Security headers | helmet.js |
| Secrets | .env (never committed) |
| License binding | Device ID + server verification |

---

## 🔑 License System

Each installation requires a license key:

1. **Format:** `DUKA-XXXX-XXXX-XXXX`
2. **Bound to one device** after first registration
3. **Periodic online verification** (every session)
4. **Demo key:** `DUKA-DEMO-2024-FREE` (for trials)

To generate new licenses in development:
```bash
curl -X POST http://localhost:5000/api/license/seed \
  -H "Content-Type: application/json" \
  -d '{"key": "DUKA-BUSINESS-0001", "type": "standard"}'
```

---

## 🌍 Language Support

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Complete |
| Kinyarwanda | `rw` | ✅ Complete |
| Swahili | `sw` | ✅ Complete |
| French | `fr` | ✅ Complete |

Switch language in Settings → Language.

---

## 📱 Mobile Support

The app is fully mobile-responsive:
- Bottom navigation bar on mobile
- Large touch-friendly buttons
- Works in mobile browser at `http://YOUR_SERVER_IP:5000`

---

## 🔌 API Endpoints

```
POST   /api/auth/register          Register user
POST   /api/auth/login             Login
GET    /api/auth/me                Current user
PUT    /api/auth/profile           Update profile
PUT    /api/auth/change-password   Change password

GET    /api/products               List products
POST   /api/products               Create product
PUT    /api/products/:id           Update product
DELETE /api/products/:id           Delete product

GET    /api/sales                  List sales (with filters)
POST   /api/sales                  Record sale
DELETE /api/sales/:id              Void sale

GET    /api/dashboard              Dashboard stats + chart
GET    /api/reports?period=week    Reports

POST   /api/license/verify         Verify license key
GET    /api/license/status         Check own license
POST   /api/license/periodic-check Periodic device check
```

---

## 🧮 Profit Formula

```
Profit per unit  = Selling Price − Cost Price
Total Profit     = (Selling Price − Cost Price) × Quantity
Profit Margin %  = (Profit / Revenue) × 100
```

---

## 🐛 Troubleshooting

**MongoDB won't connect:**
```bash
# Check if MongoDB is running
sudo systemctl status mongodb
# Start it
sudo systemctl start mongodb
```

**Port 5000 in use:**
```bash
# Change in backend/.env
PORT=5001
```

**Electron won't open:**
```bash
# Build frontend first
cd frontend && npm run build
# Then from root
npx electron .
```

**Offline sales not syncing:**
- Check internet connection indicator (top right)
- Reconnect to internet — sync happens automatically
- Check browser console for errors

---

## 📧 Support

For support or license issues:
- Email: support@dukaprofit.rw
- WhatsApp: +250 XXX XXX XXX

---

*Made with 💚 for African small business owners*
