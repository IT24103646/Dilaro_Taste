import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      // This endpoint may not exist yet; if it doesn't, we'll add it backend-side next.
      const res = await api.get("/api/auth/users");
      setUsers(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRole = async (id, role) => {
    setError("");
    try {
      await api.put(`/api/auth/users/${id}`, { role });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update user");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-gray-600">Manage roles and access</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="font-semibold mb-2">Users ({users.length})</div>
        {loading ? (
          <div>Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-gray-600">No users</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b">
                    <td className="py-2 pr-3">{u.name}</td>
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">{u.role}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <button className="px-2 py-1 border rounded" onClick={() => updateRole(u._id, "staff")}>Make staff</button>
                        <button className="px-2 py-1 border rounded" onClick={() => updateRole(u._id, "admin")}>Make admin</button>
                        <button className="px-2 py-1 border rounded" onClick={() => updateRole(u._id, "customer")}>Make customer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="font-semibold mb-2">Note</div>
        <div className="text-sm text-gray-600">
          If this page errors with 404, the backend user-management endpoints need to be added.
        </div>
      </Card>
    </div>
  );
}
