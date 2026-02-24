import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";
import { Modal } from "../../components/Modal.jsx";

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminContact() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedOpen, setSelectedOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/contact", { params: { limit: 100 } });
      setMessages(res.data?.messages || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openMessage = async (id) => {
    setError("");
    try {
      const res = await api.get(`/api/contact/${id}`);
      setSelected(res.data?.message || null);
      setSelectedOpen(true);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load message");
    }
  };

  const setStatus = async (id, status) => {
    setError("");
    setUpdating(true);
    try {
      await api.put(`/api/contact/${id}`, { status });
      setSelected((m) => (m ? { ...m, status } : m));
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update message");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Contact Messages</h1>
        <p className="text-gray-600">Guest inquiries submitted via the website contact form</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold">Inbox ({messages.length})</div>
          <button className="px-3 py-2 border rounded text-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-3">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="mt-3 text-gray-600">No messages</div>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">From</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m._id} className="border-b">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-600">{m.email}</div>
                    </td>
                    <td className="py-2 pr-3">{m.subject || <span className="text-gray-500">(none)</span>}</td>
                    <td className="py-2 pr-3">{m.status}</td>
                    <td className="py-2 pr-3">{m.emailStatus}</td>
                    <td className="py-2 pr-3">
                      <button className="underline" onClick={() => openMessage(m._id)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={selectedOpen}
        title={selected ? `Message — ${selected.name}` : "Message"}
        onClose={() => {
          setSelectedOpen(false);
          setSelected(null);
        }}
        footer={
          selected ? (
            <div className="flex justify-between gap-2">
              <div className="text-xs text-gray-600">Ticket: {selected._id}</div>
              <div className="flex gap-2">
                <button className="px-3 py-2 border rounded" type="button" onClick={() => setSelectedOpen(false)}>
                  Close
                </button>
                {selected.status !== "resolved" ? (
                  <button
                    className="px-3 py-2 rounded bg-black text-white"
                    type="button"
                    disabled={updating}
                    onClick={() => setStatus(selected._id, "resolved")}
                  >
                    {updating ? "Updating…" : "Mark resolved"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="grid gap-3">
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-600">From</div>
                <div className="font-medium">{selected.name}</div>
                <div className="text-gray-700">{selected.email}</div>
              </div>
              <div>
                <div className="text-gray-600">Received</div>
                <div className="font-medium">{fmtDate(selected.createdAt)}</div>
                <div className="text-gray-600">Status: {selected.status} • Email: {selected.emailStatus}</div>
              </div>
            </div>

            <div className="text-sm">
              <div className="text-gray-600">Subject</div>
              <div className="font-medium">{selected.subject || "(none)"}</div>
            </div>

            <div className="text-sm">
              <div className="text-gray-600">Message</div>
              <pre className="whitespace-pre-wrap border rounded p-3 bg-white">{selected.message}</pre>
            </div>

            {selected.emailError ? (
              <div className="text-sm border border-amber-200 bg-amber-50 text-amber-900 rounded p-3">
                <div className="font-medium">Email error</div>
                <div className="mt-1">{selected.emailError}</div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
