// Netlify Function: POST /api/pi-complete
// Called by frontend onReadyForServerCompletion
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
    const { paymentId, txid } = JSON.parse(event.body || "{}");
    if (!paymentId || !txid) return { statusCode: 400, headers, body: JSON.stringify({ error: "paymentId and txid required" }) };

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "PI_API_KEY not configured" }) };

    const res = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${apiKey}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({ txid }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error("[pi-complete] Pi API error:", data);
      return { statusCode: res.status, headers, body: JSON.stringify({ error: data }) };
    }

    console.log("[pi-complete] Completed:", paymentId, txid);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, payment: data }) };

  } catch (err) {
    console.error("[pi-complete] Exception:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
