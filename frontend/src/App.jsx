import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import { CartProvider } from "./lib/cart.jsx";

import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Login from "./pages/Login.jsx";
import Menu from "./pages/Menu.jsx";
import MenuItemDetail from "./pages/MenuItemDetail.jsx";
import Rooms from "./pages/Rooms.jsx";
import RoomDetail from "./pages/RoomDetail.jsx";
import Track from "./pages/Track.jsx";
import Packages from "./pages/Packages.jsx";
import PackageDetail from "./pages/PackageDetail.jsx";
import Profile from "./pages/Profile.jsx";
import Staff from "./pages/Staff.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminMenu from "./pages/admin/AdminMenu.jsx";
import AdminIngredients from "./pages/admin/AdminIngredients.jsx";
import AdminRooms from "./pages/admin/AdminRooms.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminLaundry from "./pages/admin/AdminLaundry.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminReservations from "./pages/admin/AdminReservations.jsx";
import AdminReports from "./pages/admin/AdminReports.jsx";
import AdminPayments from "./pages/admin/AdminPayments.jsx";
import AdminContact from "./pages/admin/AdminContact.jsx";
import AdminHero from "./pages/admin/AdminHero.jsx";
import AdminPOS from "./pages/admin/AdminPOS.jsx";
import AdminPackages from "./pages/admin/AdminPackages.jsx";
import PaymentResult from "./pages/PaymentResult.jsx";
import Register from "./pages/Register.jsx";
import Footer from "./components/Footer.jsx";

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RedirectAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

function AppContent() {
  const { pathname } = useLocation();
  const isAdminSection = pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {!isAdminSection && <Nav />}
      <main className={`flex-1 ${isAdminSection ? "" : "max-w-6xl mx-auto px-4 py-6 w-full"}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<RedirectAdmin><About /></RedirectAdmin>} />
          <Route path="/contact" element={<RedirectAdmin><Contact /></RedirectAdmin>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RedirectAdmin><Register /></RedirectAdmin>} />
          <Route path="/menu" element={<RedirectAdmin><Menu /></RedirectAdmin>} />
          <Route path="/menu/:id" element={<RedirectAdmin><MenuItemDetail /></RedirectAdmin>} />
          <Route path="/rooms" element={<RedirectAdmin><Rooms /></RedirectAdmin>} />
          <Route path="/rooms/:id" element={<RedirectAdmin><RoomDetail /></RedirectAdmin>} />
          <Route path="/packages" element={<RedirectAdmin><Packages /></RedirectAdmin>} />
          <Route path="/packages/:id" element={<RedirectAdmin><PackageDetail /></RedirectAdmin>} />
          <Route path="/track" element={<RedirectAdmin><Track /></RedirectAdmin>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/payment/:result" element={<PaymentResult />} />
          <Route path="/staff" element={<Protected roles={["staff","admin"]}><Staff /></Protected>} />
          <Route path="/admin" element={<Protected roles={["admin"]}><AdminLayout /></Protected>}>
            <Route index element={<AdminDashboard />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="ingredients" element={<AdminIngredients />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="laundry" element={<AdminLaundry />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="pos" element={<AdminPOS />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="contact" element={<AdminContact />} />
            <Route path="hero" element={<AdminHero />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdminSection && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
