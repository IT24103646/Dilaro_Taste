# Restaurant MERN Platform

Production-style MERN monorepo for restaurant operations, including food ordering, delivery tracking with simulated rider movement, room reservations, laundry workflows, payment integration, and role-based admin/staff operations.

## What Is In This Repository

- Customer-facing web app (menu, rooms, ordering, tracking, profile)
- Real-time status updates through Socket.IO
- Delivery simulator with moving rider and route map
- Admin operations dashboard (orders, inventory, users, reports, content)
- Staff dashboard for kitchen/laundry/reservation operations

## Workspace Structure

```
restaurant-mern-codebase/
  backend/
    src/
      app.js
      server.js
      socket.js
      seed.js
      config/
      jobs/
      middleware/
      models/
      routes/
      utils/
  frontend/
    src/
      App.jsx
      main.jsx
      styles.css
      components/
      lib/
      pages/
      pages/admin/
  docker-compose.yml
  package.json
  README.md
```

Detailed module docs:

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

## Tech Stack

- Frontend: React 18, Vite 7, React Router 6, TailwindCSS, Axios, React Leaflet
- Backend: Node.js (ESM), Express 4, Mongoose 8, JWT, Zod, Socket.IO
- Data: MongoDB (local, Docker, or in-memory)
- Integrations: Stripe, Nodemailer, Cloudinary, OSRM/Nominatim APIs

## Dependency Map By Functional Area

This section is intended to give each team member a quick dependency understanding by feature.

### 1) Authentication and RBAC

- Backend dependencies: `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `zod`
- Primary files:
  - [backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js)
  - [backend/src/middleware/auth.js](backend/src/middleware/auth.js)
  - [backend/src/models/User.js](backend/src/models/User.js)
- Frontend dependencies: `react-router-dom`, `axios`
- Primary files:
  - [frontend/src/lib/auth.jsx](frontend/src/lib/auth.jsx)
  - [frontend/src/App.jsx](frontend/src/App.jsx)

### 2) Menu and Cart

- Backend dependencies: `express`, `mongoose`, `zod`
- Primary files:
  - [backend/src/routes/menu.routes.js](backend/src/routes/menu.routes.js)
  - [backend/src/models/MenuItem.js](backend/src/models/MenuItem.js)
- Frontend dependencies: `react`, `react-router-dom`
- Primary files:
  - [frontend/src/lib/cart.jsx](frontend/src/lib/cart.jsx)
  - [frontend/src/pages/Menu.jsx](frontend/src/pages/Menu.jsx)
  - [frontend/src/pages/MenuItemDetail.jsx](frontend/src/pages/MenuItemDetail.jsx)

### 3) Ordering and Delivery Tracking

- Backend dependencies: `socket.io`, `zod`, `mongoose`
- Primary files:
  - [backend/src/routes/order.routes.js](backend/src/routes/order.routes.js)
  - [backend/src/utils/deliverySimulation.js](backend/src/utils/deliverySimulation.js)
  - [backend/src/models/Order.js](backend/src/models/Order.js)
- Frontend dependencies: `socket.io-client`, `leaflet`, `react-leaflet`, `axios`
- Primary files:
  - [frontend/src/pages/Track.jsx](frontend/src/pages/Track.jsx)
  - [frontend/src/components/DeliveryLiveMap.jsx](frontend/src/components/DeliveryLiveMap.jsx)
  - [frontend/src/components/DeliveryLocationPickerMap.jsx](frontend/src/components/DeliveryLocationPickerMap.jsx)

### 4) Reservations and Rooms

- Backend dependencies: `mongoose`, `zod`
- Primary files:
  - [backend/src/routes/reservation.routes.js](backend/src/routes/reservation.routes.js)
  - [backend/src/routes/room.routes.js](backend/src/routes/room.routes.js)
  - [backend/src/models/Reservation.js](backend/src/models/Reservation.js)
  - [backend/src/models/Room.js](backend/src/models/Room.js)
- Frontend primary files:
  - [frontend/src/pages/Rooms.jsx](frontend/src/pages/Rooms.jsx)
  - [frontend/src/pages/RoomDetail.jsx](frontend/src/pages/RoomDetail.jsx)

### 5) Inventory and Laundry

- Backend dependencies: `mongoose`, `zod`
- Primary files:
  - [backend/src/routes/inventory.routes.js](backend/src/routes/inventory.routes.js)
  - [backend/src/routes/laundry.routes.js](backend/src/routes/laundry.routes.js)
  - [backend/src/models/Ingredient.js](backend/src/models/Ingredient.js)
  - [backend/src/models/LaundryItem.js](backend/src/models/LaundryItem.js)
  - [backend/src/models/InventoryLog.js](backend/src/models/InventoryLog.js)
- Frontend admin/staff views:
  - [frontend/src/pages/Staff.jsx](frontend/src/pages/Staff.jsx)
  - [frontend/src/pages/admin/AdminIngredients.jsx](frontend/src/pages/admin/AdminIngredients.jsx)
  - [frontend/src/pages/admin/AdminLaundry.jsx](frontend/src/pages/admin/AdminLaundry.jsx)

### 6) Payments

- Backend dependencies: `stripe`
- Primary files:
  - [backend/src/routes/payment.routes.js](backend/src/routes/payment.routes.js)
- Frontend primary files:
  - [frontend/src/pages/PaymentResult.jsx](frontend/src/pages/PaymentResult.jsx)

### 7) Notifications and Contact

- Backend dependencies: `nodemailer`
- Primary files:
  - [backend/src/utils/email.js](backend/src/utils/email.js)
  - [backend/src/routes/contact.routes.js](backend/src/routes/contact.routes.js)
  - [backend/src/jobs/sendReservationReminders.js](backend/src/jobs/sendReservationReminders.js)
- Frontend primary files:
  - [frontend/src/pages/Contact.jsx](frontend/src/pages/Contact.jsx)
  - [frontend/src/pages/admin/AdminContact.jsx](frontend/src/pages/admin/AdminContact.jsx)

### 8) Media and Hero Content

- Backend dependencies: `cloudinary`
- Primary files:
  - [backend/src/config/cloudinary.js](backend/src/config/cloudinary.js)
  - [backend/src/routes/upload.routes.js](backend/src/routes/upload.routes.js)
  - [backend/src/routes/hero.routes.js](backend/src/routes/hero.routes.js)
- Frontend primary files:
  - [frontend/src/components/HeroCarousel.jsx](frontend/src/components/HeroCarousel.jsx)
  - [frontend/src/pages/admin/AdminHero.jsx](frontend/src/pages/admin/AdminHero.jsx)

## Member Function Guide (By Role)

### Customer

- Browse menu and item details
- Add to cart and place delivery/pickup order
- Select delivery location from map
- Track order and rider location
- Browse rooms and reserve
- View profile, own orders, and reservations

### Staff

- Manage kitchen order progression
- Update room status and reservations
- Manage laundry task flow
- Monitor low-stock alerts

### Admin

- Full CRUD for menu, rooms, users, hero content
- Manage ingredients/inventory and reports
- Control and monitor delivery simulation from admin orders view

## Environment Variables (Current Codebase)

### Backend

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `USE_IN_MEMORY_DB`
- `MONGO_SERVER_SELECTION_TIMEOUT_MS`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_BASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL`
- `CONTACT_TO_EMAIL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`
- `PICKUP_SLOT_MAX_ORDERS`
- `REMINDER_WINDOW_HOURS`
- `REMINDER_LEAD_HOURS`
- `ROUTING_API_BASE`

### Frontend

- `VITE_API_BASE`

## Running The Project

### 1) Install all packages

```bash
npm run install:all
```

### 2) Start MongoDB (choose one)

- Local MongoDB service
- Docker MongoDB via [docker-compose.yml](docker-compose.yml)
- In-memory DB using backend env (`USE_IN_MEMORY_DB=true`)

### 3) Start full stack

```bash
npm run dev
```

- Backend default: http://localhost:5000
- Frontend default: http://localhost:5173

### 4) Seed baseline data

```bash
npm run seed
```

## High-Level API Grouping

- Auth: `/api/auth/*`
- Menu: `/api/menu/*`
- Orders: `/api/orders/*`
- Rooms: `/api/rooms/*`
- Reservations: `/api/reservations/*`
- Inventory: `/api/inventory/*`
- Laundry: `/api/laundry/*`
- Payments: `/api/payments/*`
- Reports: `/api/reports/*`
- Contact: `/api/contact/*`
- Hero: `/api/hero/*`
- Uploads: `/api/uploads/*`

## Notes For Contributors

- Track all feature-level changes in corresponding module README files.
- Keep route additions mirrored in frontend API usage docs.
- For delivery tracking changes, update both simulator and map rendering docs.
