# Backend Guide

This document explains backend architecture, dependencies, environment variables, and module ownership for the current codebase.

## Runtime and Tooling

- Node.js (ESM modules)
- Express
- Mongoose
- Socket.IO
- Zod validation

## Scripts

- `npm run dev`: start backend with nodemon
- `npm run start`: start backend with node
- `npm run seed`: seed demo data
- `npm run reminders`: run reservation reminder job

## Dependency Reference

- `express`: API server and routing
- `mongoose`: MongoDB models and queries
- `zod`: request validation and parsing
- `jsonwebtoken`: auth token signing/verification
- `bcryptjs`: password hashing
- `cookie-parser`: cookie parsing
- `cors`: cross-origin policy handling
- `helmet`: security headers
- `express-rate-limit`: API rate limiting
- `morgan`: HTTP request logging
- `socket.io`: real-time communication
- `stripe`: payment gateway integration
- `nodemailer`: SMTP email sending
- `cloudinary`: upload signature and media support
- `mongodb-memory-server`: optional in-memory database for local/dev

## Core Entry Points

- [src/server.js](src/server.js): bootstraps app, DB, socket, admin seed
- [src/app.js](src/app.js): middleware stack and route mounting
- [src/socket.js](src/socket.js): Socket.IO server and room event emission

## Folder Responsibilities

- [src/config](src/config): DB and Cloudinary config
- [src/middleware](src/middleware): auth guards and error handling
- [src/models](src/models): Mongoose schema models
- [src/routes](src/routes): domain API routes
- [src/utils](src/utils): helper services (email, idempotency, delivery simulation)
- [src/jobs](src/jobs): scheduled/triggered jobs

## Route Modules

- [src/routes/auth.routes.js](src/routes/auth.routes.js): register/login/me/user admin actions
- [src/routes/menu.routes.js](src/routes/menu.routes.js): menu browsing and management
- [src/routes/order.routes.js](src/routes/order.routes.js): order lifecycle, tracking, geocoding, live simulation controls
- [src/routes/reservation.routes.js](src/routes/reservation.routes.js): reservation lifecycle and user history
- [src/routes/room.routes.js](src/routes/room.routes.js): room data and status management
- [src/routes/inventory.routes.js](src/routes/inventory.routes.js): ingredients and stock adjustments
- [src/routes/laundry.routes.js](src/routes/laundry.routes.js): laundry tasks and status flow
- [src/routes/payment.routes.js](src/routes/payment.routes.js): Stripe session and webhook handling
- [src/routes/report.routes.js](src/routes/report.routes.js): analytics/overview endpoints
- [src/routes/contact.routes.js](src/routes/contact.routes.js): contact form submissions and admin handling
- [src/routes/hero.routes.js](src/routes/hero.routes.js): homepage hero slide content
- [src/routes/upload.routes.js](src/routes/upload.routes.js): media upload signatures

## Delivery Tracking Architecture

- [src/utils/deliverySimulation.js](src/utils/deliverySimulation.js):
  - creates simulator state per order
  - fetches real drivable route from OSRM when available
  - falls back to synthetic route if routing API unavailable
  - emits `delivery:location` events over Socket.IO
- [src/routes/order.routes.js](src/routes/order.routes.js):
  - starts simulator when order becomes dispatched
  - exposes tracking endpoints for live location
  - supports speed/pause/resume/reset controls

## Environment Variables

Required or commonly used:

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

## Data Models

Major models in [src/models](src/models):

- `User`
- `MenuItem`
- `Order`
- `Reservation`
- `Room`
- `Ingredient`
- `InventoryLog`
- `LaundryItem`
- `TextileInventory`
- `RoomStatusLog`
- `ContactMessage`
- `HeroSlide`

## Developer Notes

- Keep Zod request schemas synchronized with frontend payloads.
- Keep simulator payload contract stable when updating tracking map features.
- If adding a new route module, mount it in [src/app.js](src/app.js).
