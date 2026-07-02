// Netlify Function: POST /api/pi-approve
// Called by frontend onReadyForServerApproval
// Pi Platform API key required — set in Netlify env: PI_API_KEY
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { paymentId } = JSON.parse(event.body || "{}");
    if (!paymentId) return { statusCode: 400, headers, body: JSON.stringify({ error: "paymentId required" }) };

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "PI_API_KEY not configured" }) };

    // Call Pi Platform — approve requires server-side API key
    const res = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${apiKey}`,
          "Content-Type":  "application/json",
        },
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error("[pi-approve] Pi API error:", data);
      return { statusCode: res.status, headers, body: JSON.stringify({ error: data }) };
    }

    console.log("[pi-approve] Approved:", paymentId);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, payment: data }) };

  } catch (err) {
    console.error("[pi-approve] Exception:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
