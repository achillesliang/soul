// Netlify Function: /api/memorial
// GET  ?ownerId=xxx           → 返回该用户所有纪念列表（不含照片base64，避免传输过大）
// GET  ?ownerId=xxx&id=yyy   → 返回单条纪念完整数据（含照片）
// POST { action:"save", memorial:{...} }  → 创建或更新一条纪念
// POST { action:"delete", ownerId, id }   → 删除一条纪念
const { getStore } = require("@netlify/blobs");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const store = getStore("memorials");

  try {
    if (event.httpMethod === "GET") {
      const { ownerId, id } = event.queryStringParameters || {};
      if (!ownerId) return { statusCode: 400, headers, body: JSON.stringify({ error: "ownerId required" }) };

      if (id) {
        // 返回单条完整数据（含照片）
        const m = await store.get(`${ownerId}:${id}`, { type: "json" });
        if (!m) return { statusCode: 404, headers, body: JSON.stringify({ error: "not found" }) };
        return { statusCode: 200, headers, body: JSON.stringify(m) };
      }

      // 返回用户所有纪念列表（去掉照片字段，减小传输量）
      const { blobs } = await store.list({ prefix: `${ownerId}:` });
      const list = await Promise.all(
        blobs.map(async (b) => {
          const m = await store.get(b.key, { type: "json" });
          if (!m) return null;
          const { photo, ...rest } = m; // 列表不返回photo
          return { ...rest, hasPhoto: !!photo };
        })
      );
      return { statusCode: 200, headers, body: JSON.stringify({ memorials: list.filter(Boolean) }) };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      if (body.action === "save") {
        const m = body.memorial;
        if (!m?.id || !m?.ownerId) return { statusCode: 400, headers, body: JSON.stringify({ error: "memorial.id and memorial.ownerId required" }) };
        // 照片是base64，限制单条不超过4MB
        const size = JSON.stringify(m).length;
        if (size > 4 * 1024 * 1024) return { statusCode: 400, headers, body: JSON.stringify({ error: "Memorial too large (max 4MB)" }) };
        await store.setJSON(`${m.ownerId}:${m.id}`, { ...m, updatedAt: new Date().toISOString() });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: m.id }) };
      }

      if (body.action === "delete") {
        const { ownerId, id } = body;
        if (!ownerId || !id) return { statusCode: 400, headers, body: JSON.stringify({ error: "ownerId and id required" }) };
        await store.delete(`${ownerId}:${id}`);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: "unknown action" }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("[memorial]", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
