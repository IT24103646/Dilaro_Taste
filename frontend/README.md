# Frontend Guide

This document explains frontend architecture, dependencies, routes, and module structure for the current codebase.

## Runtime and Tooling

- React 18
- Vite 7
- React Router 6
- TailwindCSS

## Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: build production assets
- `npm run preview`: preview production build

## Dependency Reference

- `react`, `react-dom`: UI runtime
- `react-router-dom`: routing and guards
- `axios`: API communication
- `socket.io-client`: real-time event subscription
- `leaflet`, `react-leaflet`: map rendering for delivery tracking and location selection

Dev dependencies:

- `vite`
- `@vitejs/plugin-react`
- `tailwindcss`
- `postcss`
- `autoprefixer`

## App Composition

- [src/main.jsx](src/main.jsx): React app bootstrap
- [src/App.jsx](src/App.jsx): route tree, protected routes, provider wiring
- [src/styles.css](src/styles.css): global style system and utility classes

Providers:

- [src/lib/auth.jsx](src/lib/auth.jsx): auth state and token/session helpers
- [src/lib/cart.jsx](src/lib/cart.jsx): shopping cart state and actions

HTTP and Socket:

- [src/lib/api.js](src/lib/api.js): Axios instance using `VITE_API_BASE`
- [src/lib/socket.js](src/lib/socket.js): socket connection factory

## UI Components

- [src/components/Nav.jsx](src/components/Nav.jsx): top navigation and role-aware actions
- [src/components/Footer.jsx](src/components/Footer.jsx): global footer
- [src/components/HeroCarousel.jsx](src/components/HeroCarousel.jsx): shared full-width hero section
- [src/components/Modal.jsx](src/components/Modal.jsx): modal and confirm dialogs
- [src/components/Card.jsx](src/components/Card.jsx): reusable card/stat cards
- [src/components/DeliveryLiveMap.jsx](src/components/DeliveryLiveMap.jsx): live driver map rendering
- [src/components/DeliveryLocationPickerMap.jsx](src/components/DeliveryLocationPickerMap.jsx): user location pin map

## Page Structure

Public/customer pages in [src/pages](src/pages):

- `Home`, `About`, `Contact`
- `Menu`, `MenuItemDetail`
- `Rooms`, `RoomDetail`
- `Track`
- `Login`, `Register`
- `Profile`
- `PaymentResult`
- `Staff` (role protected)

Admin pages in [src/pages/admin](src/pages/admin):

- `AdminLayout`
- `AdminDashboard`
- `AdminMenu`
- `AdminIngredients`
- `AdminRooms`
- `AdminUsers`
- `AdminLaundry`
- `AdminOrders`
- `AdminReservations`
- `AdminReports`
- `AdminContact`
- `AdminHero`

## Feature Mapping

### Ordering and Checkout

- [src/pages/Menu.jsx](src/pages/Menu.jsx):
  - category filtering
  - cart summary and guest details
  - delivery location pin + geocoding actions
  - order placement

### Tracking and Live Delivery

- [src/pages/Track.jsx](src/pages/Track.jsx):
  - tracking by order reference
  - my order history and reservation history
  - per-dispatched-order live location cards
  - socket updates + polling fallback
- [src/components/DeliveryLiveMap.jsx](src/components/DeliveryLiveMap.jsx):
  - planned route rendering
  - completed route rendering
  - moving rider marker

### Profile and History

- [src/pages/Profile.jsx](src/pages/Profile.jsx):
  - account summary
  - orders/reservations overview and metrics

### Admin Operations

- [src/pages/admin/AdminOrders.jsx](src/pages/admin/AdminOrders.jsx): status updates + live simulation controls
- [src/pages/admin/AdminMenu.jsx](src/pages/admin/AdminMenu.jsx): menu CRUD and media handling
- [src/pages/admin/AdminUsers.jsx](src/pages/admin/AdminUsers.jsx): role management
- [src/pages/admin/AdminReports.jsx](src/pages/admin/AdminReports.jsx): business overview and analytics

## Environment Variables

- `VITE_API_BASE`: backend base URL used by Axios and Socket.IO

## Developer Notes

- Keep route guards in [src/App.jsx](src/App.jsx) aligned with backend RBAC expectations.
- If backend payloads change, update both API usage and UI mappers (especially tracking and admin tables).
- Map components are lazily loaded where appropriate to reduce initial bundle weight.
