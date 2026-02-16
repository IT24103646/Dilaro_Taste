import dotenv from "dotenv";
dotenv.config();

import { connectDB, disconnectDB } from "../config/db.js";
import { Reservation } from "../models/Reservation.js";
import { Room } from "../models/Room.js";
import { sendEmail } from "../utils/email.js";

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function main() {
  const windowHours = Math.max(1, Math.min(168, Number(process.env.REMINDER_WINDOW_HOURS || 24)));
  const leadHours = Math.max(0, Math.min(windowHours, Number(process.env.REMINDER_LEAD_HOURS || 24)));

  await connectDB();

  const now = new Date();
  const start = hoursFromNow(leadHours);
  const end = hoursFromNow(windowHours);

  const reservations = await Reservation.find({
    status: "confirmed",
    startAt: { $gte: start, $lte: end },
    "guest.email": { $ne: "" },
    reminderSentAt: { $exists: false }
  }).limit(200);

  let sent = 0;
  for (const r of reservations) {
    const room = await Room.findById(r.room).select("name code");
    const subject = `Reservation Reminder ${r.referenceNo}`;
    const html = `
      <p>Reminder: your reservation <b>${r.referenceNo}</b> is coming up.</p>
      <p>Room: <b>${room?.name || room?.code || "(room)"}</b></p>
      <p>Start: ${new Date(r.startAt).toLocaleString()}</p>
      <p>End: ${new Date(r.endAt).toLocaleString()}</p>
    `;

    try {
      await sendEmail({ to: r.guest.email, subject, html });
      r.reminderSentAt = new Date();
      await r.save();
      sent++;
    } catch {
      // best-effort
    }
  }

  console.log(`✅ Reservation reminders processed. Sent: ${sent}, Candidates: ${reservations.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Reminder job failed:", e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
