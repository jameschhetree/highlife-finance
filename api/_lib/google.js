// Shared Google Sheets auth + helpers for all serverless functions

const MUSIC_SHEET_ID = "159SZu9cdhJ-DJy0JMCbVuwlqFwgWn9rCACJcVImCbgo";
const PODCAST_SHEET_ID = "1DSc-9xXYrTxmfHi1JC8z4TXw5b1lOngVQx9z9skfm9M";

const SHEET_MAP = {
  "Music Studio": { id: MUSIC_SHEET_ID, tab: "Music Studio" },
  "Podcast": { id: PODCAST_SHEET_ID, tab: "Podcast Sessions" },
};

// In-memory token cache (per cold start)
let cachedAccessToken = null;
let cachedExpiresAt = 0;

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < cachedExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth env vars");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;
  cachedExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedAccessToken;
}

function getSheetInfo(sessionType) {
  const info = SHEET_MAP[sessionType];
  if (!info) throw new Error(`Unknown session type: ${sessionType}`);
  return info;
}

async function appendRow(sessionType, values) {
  const { id, tab } = getSheetInfo(sessionType);
  const accessToken = await getAccessToken();
  const range = encodeURIComponent(`${tab}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets append failed (${res.status}): ${err}`);
  }
}

async function getRecentRows(sessionType, count = 10) {
  const { id, tab } = getSheetInfo(sessionType);
  const accessToken = await getAccessToken();
  const range = encodeURIComponent(`${tab}!A:K`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets read failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const allRows = data.values || [];
  const dataRows = allRows.slice(1);
  const startIdx = Math.max(0, dataRows.length - count);
  const recent = dataRows.slice(startIdx).map((values, i) => ({
    rowIndex: startIdx + i + 2,
    values,
  }));

  return recent.reverse();
}

async function deleteRow(sessionType, rowIndex) {
  const { id, tab } = getSheetInfo(sessionType);
  const accessToken = await getAccessToken();

  const infoRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const info = await infoRes.json();
  const sheet = info.sheets?.find((s) => s.properties.title === tab);
  if (!sheet) throw new Error(`Tab "${tab}" not found`);
  const sheetId = sheet.properties.sheetId;

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: "ROWS",
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets delete failed (${res.status}): ${err}`);
  }
}

async function updateRow(sessionType, rowIndex, values) {
  const { id, tab } = getSheetInfo(sessionType);
  const accessToken = await getAccessToken();
  const range = encodeURIComponent(`${tab}!A${rowIndex}:K${rowIndex}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets update failed (${res.status}): ${err}`);
  }
}

module.exports = {
  MUSIC_SHEET_ID,
  PODCAST_SHEET_ID,
  getAccessToken,
  getSheetInfo,
  appendRow,
  getRecentRows,
  deleteRow,
  updateRow,
};
