// Netlify Function: /api/planet
// GET  ?id=PLANETID                → 返回该星球详情 + 统计(等级/天气/居民数/最近访问)
// POST { action:"upsert", ... }     → 创建/更新自己的星球基础信息（铸造成功后调用一次）
// POST { action:"visit",  ... }     → 记录一次"到访"（别人打开了这个星球页面）
const { getStore } = require("@netlify/blobs");
const { summarize, MAX_VISITS_STORED } = require("./_planetUtils");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const store = getStore("planets");

  try {
    if (event.httpMethod === "GET") {
      const id = (event.queryStringParameters || {}).id;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "id required" }) };
      const planet = await store.get(`planet:${id}`, { type: "json" });
      if (!planet) return { statusCode: 404, headers, body: JSON.stringify({ error: "not found" }) };
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          ...summarize(planet),
          recentVisits: (planet.visits || []).slice(-10).reverse(),
        }),
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      if (body.action === "upsert") {
        const { id, ownerId, ownerName, name, color, emoji, typeZh, typeEn } = body;
        if (!id || !ownerId) return { statusCode: 400, headers, body: JSON.stringify({ error: "id and ownerId required" }) };
        const existing = await store.get(`planet:${id}`, { type: "json" });
        const planet = {
          id, ownerId,
          ownerName: ownerName ?? existing?.ownerName ?? "",
          name: name ?? existing?.name ?? "",
          color: color ?? existing?.color ?? "#7c6fff",
          emoji: emoji ?? existing?.emoji ?? "🪐",
          typeZh: typeZh ?? existing?.typeZh ?? "",
          typeEn: typeEn ?? existing?.typeEn ?? "",
          createdAt: existing?.createdAt || new Date().toISOString(),
          visits: existing?.visits || [],
        };
        await store.setJSON(`planet:${id}`, planet);
        return { statusCode: 200, headers, body: JSON.stringify(summarize(planet)) };
      }

      if (body.action === "visit") {
        const { id, visitorId, visitorName } = body;
        if (!id || !visitorId) return { statusCode: 400, headers, body: JSON.stringify({ error: "id and visitorId required" }) };
        const planet = await store.get(`planet:${id}`, { type: "json" });
        if (!planet) return { statusCode: 404, headers, body: JSON.stringify({ error: "planet not found" }) };

        // 同一访客24小时内重复打开不重复计入，避免刷数据
        const now = Date.now();
        const visits = planet.visits || [];
        const recentSame = visits.find(v => v.visitorId === visitorId && (now - new Date(v.at).getTime()) < 86400000);
        if (!recentSame) {
          visits.push({ visitorId, visitorName: visitorName || "匿名灵魂", at: new Date().toISOString() });
          if (visits.length > MAX_VISITS_STORED) visits.splice(0, visits.length - MAX_VISITS_STORED);
          planet.visits = visits;
          await store.setJSON(`planet:${id}`, planet);
        }
        return {
          statusCode: 200, headers,
          body: JSON.stringify({ ...summarize(planet), recentVisits: visits.slice(-10).reverse(), recorded: !recentSame }),
        };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: "unknown action" }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("[planet]", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
