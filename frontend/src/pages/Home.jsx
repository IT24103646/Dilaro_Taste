import React from "react";
import { Card } from "../components/Card.jsx";

export default function Home() {
  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="text-xl font-semibold">Restaurant Food Ordering & Room Reservation</h1>
        <p className="text-sm text-slate-600 mt-2">
          Order food (delivery or pickup), reserve rooms with real-time availability, track orders, manage inventory,
          laundry workflow, and admin reports — all in one system.
        </p>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <h2 className="font-semibold">Customer</h2>
          <p className="text-sm text-slate-600 mt-1">Browse menu, cart, checkout, track order status, room reservation.</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Staff</h2>
          <p className="text-sm text-slate-600 mt-1">Kitchen queue, update order status, inventory adjustments, reservations calendar, laundry tasks.</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Admin</h2>
          <p className="text-sm text-slate-600 mt-1">Menu CRUD, rooms, thresholds, reports, overrides.</p>
        </Card>
      </div>
    </div>
  );
}
