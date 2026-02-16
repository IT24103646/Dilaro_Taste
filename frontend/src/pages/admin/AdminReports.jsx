import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";

export default function AdminReports() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const res = await api.get("/api/reports/overview");
        
        if (mounted) setOverview(res.data);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.message || e.message || "Failed to load report");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-600">Summary metrics</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="font-semibold mb-2">Overview</div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <pre className="text-xs overflow-auto bg-gray-50 border rounded p-3">{JSON.stringify(overview, null, 2)}</pre>
        )}
      </Card>
    </div>
  );
}
