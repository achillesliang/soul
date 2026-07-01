// Netlify Function: /api/planet-leaderboard
// GET → 列出所有星球，按综合分（访问量*2 + 去重居民*3）降序，返回前20
const { getStore } = require("@netlify/blobs");
const { summarize } = require("./_planetUtils");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const store = getStore("planets");
    const { blobs } = await store.list({ prefix: "planet:" });
    const limitParam = parseInt((event.queryStringParameters || {}).limit, 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 20;

    const planets = await Promise.all(
      blobs.map(async (b) => {
        const p = await store.get(b.key, { type: "json" });
        return p ? summarize(p) : null;
      })
    );

    const ranked = planets
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((p, i) => ({ rank: i + 1, ...p }));

    return { statusCode: 200, headers, body: JSON.stringify({ leaderboard: ranked, total: planets.filter(Boolean).length }) };
  } catch (err) {
    console.error("[planet-leaderboard]", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
