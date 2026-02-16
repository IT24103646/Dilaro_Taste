# Restaurant Food Ordering & Room Reservation (MERN)

A full-stack MERN implementation based on the provided proposal (food ordering + delivery/pickup, kitchen inventory sync, room reservations + room inventory/status, payment integration, laundry workflow, menu management, notifications, audit logs, RBAC, guest checkout, and real-time status tracking).

## Tech Stack
- **Frontend**: React (Vite), React Router, Axios, TailwindCSS
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT Auth, Socket.IO
- **Payments**: Stripe (test mode)
- **Email Notifications**: Nodemailer (SMTP)
- **DevOps**: Docker Compose (MongoDB), environment-based config

---

## Monorepo Layout
```
restaurant-mern/
  backend/
  frontend/
  docker-compose.yml
```

---

## Quick Start (Local)

### 1) Prereqs
- Node 18+ (recommended)
- Either MongoDB (local install) OR Docker Desktop (optional)
- A Stripe test account (optional but recommended)

### 2) Configure environment
Copy env examples and fill:
- `backend/.env.example` -> `backend/.env`
- `frontend/.env.example` -> `frontend/.env`

### 3) Start MongoDB
Choose ONE:

**Option A (no Docker): run MongoDB locally**
- Install MongoDB Community Server
- Ensure MongoDB is running on `mongodb://127.0.0.1:27017`

**Option B (no Docker, no MongoDB install): use in-memory DB**
- Set `USE_IN_MEMORY_DB=true` in `backend/.env` and remove/leave blank `MONGO_URI`

**Option C (Docker): run MongoDB in Docker**
From repo root:
```bash
docker compose up -d
```

### 4) Start Backend
From repo root:
```bash
npm run install:all
npm run dev
```

Or (manual):
```bash
cd backend
npm install
npm run dev
```

### 5) Start Frontend
If you used `npm run dev` from the repo root, frontend is already running.

Or (manual):
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000

---

## Default Roles
- **customer**: can browse menu, order, reserve rooms, see history
- **staff**: kitchen queue, update order statuses, inventory adjustments, reservation calendar ops, room status updates, laundry tracking
- **admin**: menu CRUD, users, reports, thresholds, overrides

> Seed script creates initial admin + sample data. Run:
```bash
cd backend
npm run seed
```

---

## Key Features Coverage (Mapped to Proposal)
- Food ordering: menu browse, cart modify, delivery/pickup, slots, order confirmation, tracking, history, reorder, staff queue, cancel/modify with auth, prevent duplicate submissions (idempotency)
- Kitchen inventory: real-time stock, auto decrement on confirm->preparing, thresholds + alerts, manual adjustments, per-item recipe usage, movement logs, restock recommendations
- Room reservation: realtime availability, prevent double booking, confirmations, modify/cancel, reminders, staff calendar + override with audit, maintenance blocks, waitlist
- Payments: Stripe card checkout for orders/reservations, payment states synced, invoices/receipts, failed payment holds
- Laundry: linen/towel/uniform lifecycle, assignments, inventory of clean/soiled/in-use, charges appended to invoices, completion verification
- Menu management: CRUD, categories, images (simple URL storage), time-based availability, dietary tags/allergens, bulk update endpoint
- Room inventory: room DB, statuses (Available/Occupied/Cleaning/Maintenance/OOS), automatic transitions + cleaning tasks, utilization reports, cleaning alerts

---

## Notes
- This is a complete, runnable baseline meant for academic submission. For production, add rate-limiting, WAF, centralized logging, secret management, and full PCI scope controls.

### Dev CORS note
If Vite starts on a different port (e.g. 5174/5175), backend CORS must allow that origin.
- Easiest: leave `CORS_ORIGIN` blank in `backend/.env` (dev mode allows any `http://localhost:<port>`)
- Or set `CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175`
