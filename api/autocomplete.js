const { getAccessToken, MUSIC_SHEET_ID, PODCAST_SHEET_ID } = require("./_lib/google");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const accessToken = await getAccessToken();
    const names = new Set();
    const engineers = new Set();

    // Pull from Music Studio sheet
    const musicRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${MUSIC_SHEET_ID}/values/${encodeURIComponent("Music Studio!A:K")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const musicData = await musicRes.json();
    for (const row of (musicData.values || []).slice(1)) {
      if (row[1]) names.add(row[1].trim());
      if (row[5]) engineers.add(row[5].trim());
    }

    // Pull from Podcast sheet
    const podcastRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${PODCAST_SHEET_ID}/values/${encodeURIComponent("Podcast Sessions!A:K")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const podcastData = await podcastRes.json();
    for (const row of (podcastData.values || []).slice(1)) {
      if (row[1]) names.add(row[1].trim());
      if (row[5]) engineers.add(row[5].trim());
    }

    return res.status(200).json({
      names: [...names].sort(),
      engineers: [...engineers].sort(),
    });
  } catch (err) {
    console.error("[api/autocomplete] Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
