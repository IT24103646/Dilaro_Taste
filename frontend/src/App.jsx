import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import { AuthProvider, useAuth } from "./lib/auth.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Menu from "./pages/Menu.jsx";
import Rooms from "./pages/Rooms.jsx";
import Track from "./pages/Track.jsx";
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
import PaymentResult from "./pages/PaymentResult.jsx";

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="max-w-6xl mx-auto p-4">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RedirectAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="max-w-6xl mx-auto p-4">Loading...</div>;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Nav />
      <main className="max-w-6xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/menu" element={<RedirectAdmin><Menu /></RedirectAdmin>} />
          <Route path="/rooms" element={<RedirectAdmin><Rooms /></RedirectAdmin>} />
          <Route path="/track" element={<RedirectAdmin><Track /></RedirectAdmin>} />
          <Route path="/payment/:result" element={<PaymentResult />} />

          <Route path="/staff" element={
            <Protected roles={["staff","admin"]}><Staff /></Protected>
          } />
          <Route path="/admin" element={<Protected roles={["admin"]}><AdminLayout /></Protected>}>
            <Route index element={<AdminDashboard />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="ingredients" element={<AdminIngredients />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="laundry" element={<AdminLaundry />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
