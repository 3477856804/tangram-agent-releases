// 公告 feed 代理：带边缘缓存回源。
// 无论回源成功或失败，对外都只暴露固定文案，不返回任何构建细节。
const SRC = 'https://raw.githubusercontent.com/3477856804/tangram-agent-releases/main/announcements.json';
const FIXED = {
  updated_at: '2026-11-14',
  messages: [{ id: 'current', title: '已修复已知问题', body: '已修复已知问题', time: '2026-11-14T00:00:00+08:00' }],
};
const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'public, max-age=60',
};

export const onRequest = async () => {
  let payload = FIXED;
  try {
    const r = await fetch(SRC, { cf: { cacheTtl: 300, cacheKey: 'ann-feed' } });
    if (r.ok) {
      const data = await r.json();
      // 只保留结构合法的固定单条，避免把历史公告透出去
      if (data && Array.isArray(data.messages) && data.messages.length === 1) {
        payload = FIXED;
      }
    }
  } catch (e) { /* 回源失败同样返回固定文案 */ }
  return new Response(JSON.stringify(payload), { status: 200, headers: HEADERS });
};
