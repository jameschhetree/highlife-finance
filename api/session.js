const { deleteRow, updateRow } = require("./_lib/google");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "DELETE") {
    try {
      const body = req.body;
      const { sessionType, rowIndex } = body;
      if (!sessionType || !["Music Studio", "Podcast"].includes(sessionType)) {
        return res.status(400).json({ error: "Invalid session type" });
      }
      if (!rowIndex || rowIndex < 2) {
        return res.status(400).json({ error: "Invalid row index" });
      }
      await deleteRow(sessionType, rowIndex);
      return res.status(200).json({ success: true, message: "Session deleted" });
    } catch (err) {
      console.error("[api/session] Delete error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  }

  if (req.method === "PUT") {
    try {
      const body = req.body;
      const { sessionType, rowIndex, values } = body;
      if (!sessionType || !["Music Studio", "Podcast"].includes(sessionType)) {
        return res.status(400).json({ error: "Invalid session type" });
      }
      if (!rowIndex || rowIndex < 2 || !values || !Array.isArray(values)) {
        return res.status(400).json({ error: "Invalid row index or values" });
      }
      await updateRow(sessionType, rowIndex, values);
      return res.status(200).json({ success: true, message: "Session updated" });
    } catch (err) {
      console.error("[api/session] Update error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
