import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth.jsx";

const linkBase = "block px-3 py-2 rounded";
const linkActive = "bg-gray-200 font-medium";

function SideLink({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) => `${linkBase} ${isActive ? linkActive : "hover:bg-gray-100"}`}
    >
      {children}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      <aside className="border rounded p-3 h-fit md:sticky md:top-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-gray-500">Admin</div>
            <div className="font-semibold">{user?.name || user?.email}</div>
          </div>
          <button className="text-sm underline" onClick={logout}>Logout</button>
        </div>

        <nav className="space-y-1">
          <SideLink to="/admin">Dashboard</SideLink>
          <SideLink to="/admin/orders">Orders</SideLink>
          <SideLink to="/admin/reservations">Reservations</SideLink>
          <SideLink to="/admin/menu">Menu</SideLink>
          <SideLink to="/admin/ingredients">Ingredients</SideLink>
          <SideLink to="/admin/rooms">Rooms</SideLink>
          <SideLink to="/admin/laundry">Laundry</SideLink>
          <SideLink to="/admin/users">Users</SideLink>
          <SideLink to="/admin/reports">Reports</SideLink>
        </nav>
      </aside>

      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
