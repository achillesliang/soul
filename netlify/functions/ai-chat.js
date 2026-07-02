// Netlify Function: POST /api/ai-chat
// 驱动"AI纪念馆"——基于用户填写的人设/回忆，让AI以逝者第一人称回应，
// 同时支持"AI人生传记"生成（同一接口，不同 system prompt）。
// 需要在 Netlify 环境变量中设置 ANTHROPIC_API_KEY
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
    const { system, messages } = JSON.parse(event.body || "{}");
    if (!system || !Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "system and messages[] required" }) };
    }
    // 简单的输入体积限制，防止滥用
    const totalLen = JSON.stringify(messages).length + system.length;
    if (totalLen > 20000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Input too long" }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system,
        messages,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[ai-chat] Anthropic API error:", data);
      return { statusCode: res.status, headers, body: JSON.stringify({ error: data }) };
    }

    const text = (data.content || []).map(b => b.text || "").join("\n").trim();
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };

  } catch (err) {
    console.error("[ai-chat] Exception:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
