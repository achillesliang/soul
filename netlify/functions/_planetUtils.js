// 共享工具：星球等级 / 天气 / 居民数 计算
// 等级与天气都从 visits 数组动态推导，不单独存储，避免数据不一致。

const LEVELS = [
  { min: 0,   key: "obsidian", zh: "黑曜星",  en: "Obsidian Star",  color: "#6b7280" },
  { min: 5,   key: "azure",    zh: "蓝晶星",  en: "Azure Star",     color: "#38bdf8" },
  { min: 20,  key: "violet",   zh: "紫耀星",  en: "Violet Star",    color: "#a855f7" },
  { min: 50,  key: "golden",   zh: "金辉星",  en: "Golden Star",    color: "#fbbf24" },
  { min: 100, key: "stellar",  zh: "恒星级",  en: "Stellar Class",  color: "#f472b6" },
];

function levelOf(visitCount) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) if (visitCount >= l.min) lvl = l;
  const next = LEVELS[LEVELS.indexOf(lvl) + 1] || null;
  return { ...lvl, next, toNext: next ? next.min - visitCount : 0 };
}

const WEATHERS = [
  { maxDays: 3,  key: "clear",   zh: "晴朗",   en: "Clear",   emoji: "☀️" },
  { maxDays: 7,  key: "cloudy",  zh: "多云",   en: "Cloudy",  emoji: "⛅" },
  { maxDays: 14, key: "rain",    zh: "阴雨",   en: "Rain",    emoji: "🌧️" },
  { maxDays: Infinity, key: "dormant", zh: "沉寂期", en: "Dormant", emoji: "🌑" },
];

function weatherOf(lastVisitAt) {
  if (!lastVisitAt) return WEATHERS[WEATHERS.length - 1];
  const days = (Date.now() - new Date(lastVisitAt).getTime()) / 86400000;
  return WEATHERS.find(w => days <= w.maxDays) || WEATHERS[WEATHERS.length - 1];
}

function residentCount(visits) {
  return new Set((visits || []).map(v => v.visitorId)).size;
}

// 计算一个星球的完整统计摘要（不含原始 visits 数组，避免接口返回过大）
function summarize(planet) {
  const visits = planet.visits || [];
  const visitCount = visits.length;
  const residents = residentCount(visits);
  const lastVisitAt = visits.length ? visits[visits.length - 1].at : planet.createdAt;
  const score = visitCount * 2 + residents * 3; // 排行榜综合分：访问量*2 + 去重居民*3
  return {
    id: planet.id,
    ownerId: planet.ownerId,
    ownerName: planet.ownerName,
    name: planet.name,
    color: planet.color,
    emoji: planet.emoji,
    typeZh: planet.typeZh,
    typeEn: planet.typeEn,
    createdAt: planet.createdAt,
    visitCount,
    residents,
    lastVisitAt,
    level: levelOf(visitCount),
    weather: weatherOf(lastVisitAt),
    score,
  };
}

const MAX_VISITS_STORED = 200; // 每个星球最多保留最近200条访问记录

module.exports = { levelOf, weatherOf, residentCount, summarize, MAX_VISITS_STORED, LEVELS, WEATHERS };
