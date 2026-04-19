const { appendRow } = require("./_lib/google");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    const { sessionType } = body;

    if (!sessionType || !["Music Studio", "Podcast"].includes(sessionType)) {
      return res.status(400).json({ error: "Invalid session type" });
    }

    let row;

    if (sessionType === "Music Studio") {
      const { date, artist, type, hours, rate, engineer, mixingMastering, production, total, profit, notes } = body;
      if (!date || !artist || !type) {
        return res.status(400).json({ error: "Date, Artist, and Session Type are required" });
      }
      row = [date || "", artist || "", type || "", String(hours || ""), String(rate || ""), engineer || "", String(mixingMastering || ""), String(production || ""), String(total || ""), String(profit || ""), notes || ""];
    } else {
      const { date, clientName, type, hours, rate, engineer, editing, mixingMastering, total, profit, notes } = body;
      if (!date || !clientName || !type) {
        return res.status(400).json({ error: "Date, Client Name, and Session Type are required" });
      }
      row = [date || "", clientName || "", type || "", String(hours || ""), String(rate || ""), engineer || "", String(editing || ""), String(mixingMastering || ""), String(total || ""), String(profit || ""), notes || ""];
    }

    await appendRow(sessionType, row);
    return res.status(200).json({ success: true, message: "Session logged successfully" });
  } catch (err) {
    console.error("[api/log] Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};
