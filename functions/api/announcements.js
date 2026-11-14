// 公告 feed 代理:GitHub raw 在国内常超时,带边缘缓存回源
const SRC = 'https://raw.githubusercontent.com/3477856804/tangram-agent-releases/main/announcements.json';
export const onRequest = async () => {
  try {
    const r = await fetch(SRC, { cf: { cacheTtl: 300, cacheKey: 'ann-feed' } });
    if (!r.ok) throw new Error(String(r.status));
    return new Response(r.body, { headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=60',
    }});
  } catch (e) {
    return new Response(JSON.stringify({ items: [], error: 'feed unavailable' }), {
      status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
  }
};
