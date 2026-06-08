// Netlify Function: GET /api/pi-me
// Validates Pi user access token server-side
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "GET")     return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const auth = event.headers["authorization"] || event.headers["Authorization"] || "";
    if (!auth.startsWith("Bearer ")) return { statusCode: 401, headers, body: JSON.stringify({ error: "Bearer token required" }) };

    const accessToken = auth.slice(7);
    const res = await fetch("https://api.minepi.com/v2/me", {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data }) };

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
