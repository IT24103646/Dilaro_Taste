import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

const ROLE_CONFIG = {
  admin:    { label: "Admin",    color: "bg-violet-100 text-violet-700 border-violet-200" },
  staff:    { label: "Staff",    color: "bg-blue-100 text-blue-700 border-blue-200" },
  customer: { label: "Customer", color: "bg-stone-100 text-stone-600 border-stone-200" },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: "bg-stone-100 text-stone-600 border-stone-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function Avatar({ name }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = name ? (name.charCodeAt(0) * 37) % 360 : 200;
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ background: `hsl(${hue},45%,50%)` }}
    >
      {initials}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [actionLoading, setActionLoading] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // user object to delete

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/auth/users");
      setUsers(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    setActionLoading(id + role);
    setError("");
    try {
      await api.put(`/api/auth/users/${id}`, { role });
      setUsers(u => u.map(x => x._id === id ? { ...x, role } : x));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update role");
    } finally {
      setActionLoading("");
    }
  };

  const deleteUser = async (user) => {
    setConfirmDelete(null);
    setActionLoading("del-" + user._id);
    setError("");
    try {
      await api.delete(`/api/auth/users/${user._id}`);
      setUsers(u => u.filter(x => x._id !== user._id));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to delete user");
    } finally {
      setActionLoading("");
    }
  };

  const filtered = users.filter(u => {
    const matchRole = filterRole === "all" || u.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch = !q
      || (u.name || "").toLowerCase().includes(q)
      || (u.email || "").toLowerCase().includes(q)
      || (u.phone || "").toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const counts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">User Management</h1>
        <p className="text-stone-500 text-sm mt-0.5">Manage accounts, roles, and access levels</p>
      </div>

      {error && (
        <div className="alert-error text-sm">{error}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 px-4 py-3">
          <div className="text-2xl font-bold text-stone-900">{users.length}</div>
          <div className="text-xs text-stone-500 mt-0.5">Total Users</div>
        </div>
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <div key={role} className="bg-white rounded-xl border border-stone-200 px-4 py-3">
            <div className="text-2xl font-bold text-stone-900">{counts[role] || 0}</div>
            <div className="text-xs text-stone-500 mt-0.5">{cfg.label}s</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
          </span>
          <input
            type="search"
            placeholder="Search by name, email, or phone…"
            className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterRole("all")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${filterRole === "all" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
          >All</button>
          {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${filterRole === role ? `${cfg.color} border-current` : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <span className="font-semibold text-stone-800">Accounts</span>
          <span className="text-xs text-stone-400">{filtered.length} of {users.length}</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-stone-400 text-sm">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mx-auto text-stone-300 mb-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            <div className="text-stone-400 text-sm">No users match your search</div>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filtered.map(user => (
              <div key={user._id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Identity */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={user.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-stone-900">{user.name}</span>
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="text-sm text-stone-500 truncate">{user.email}</div>
                    {user.phone && (
                      <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                        {user.phone}
                      </div>
                    )}
                    <div className="text-xs text-stone-300 mt-0.5">
                      Joined {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>

                {/* Role actions */}
                <div className="flex flex-wrap gap-2 flex-shrink-0 items-center">
                  <span className="text-xs text-stone-400 mr-1 hidden sm:inline">Role:</span>
                  {Object.keys(ROLE_CONFIG).filter(r => r !== user.role).map(role => (
                    <button
                      key={role}
                      onClick={() => changeRole(user._id, role)}
                      disabled={!!actionLoading}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${ROLE_CONFIG[role].color}`}
                    >
                      {actionLoading === user._id + role ? "…" : `Make ${ROLE_CONFIG[role].label}`}
                    </button>
                  ))}
                  <button
                    onClick={() => setConfirmDelete(user)}
                    disabled={!!actionLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="text-lg font-bold text-stone-900 mb-1">Delete User</div>
            <p className="text-stone-500 text-sm mb-6">
              Are you sure you want to permanently delete <span className="font-semibold text-stone-800">{confirmDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-5 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(confirmDelete)}
                className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

