const { getRecentRows } = require("./_lib/google");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sessionType = req.query.type;
    if (!sessionType || !["Music Studio", "Podcast"].includes(sessionType)) {
      return res.status(400).json({ error: "Invalid session type" });
    }
    const rows = await getRecentRows(sessionType, 10);
    return res.status(200).json({ sessions: rows });
  } catch (err) {
    console.error("[api/sessions] Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};
