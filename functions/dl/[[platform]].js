// 下载加速:先试国内 GitHub 加速镜像,不通则回退直链
const FILES = {
  windows: 'tangram-windows-x64.exe',
  linux: 'tangram-linux-x64.AppImage',
  macos: 'tangram-macos-arm64.dmg',
  android: 'tangram-android-arm64.apk',
  ios: 'tangram-ios-arm64-unsigned.ipa',
};
const BASE = 'https://github.com/3477856804/tangram-agent-releases/releases/download/v0.0.3/';
const MIRRORS = ['https://gh-proxy.com/', 'https://ghproxy.net/'];

export const onRequestGet = async (context) => {
  const platform = context.params.platform;
  const file = FILES[platform];
  if (!file) return new Response('unknown platform', { status: 404 });
  const direct = BASE + file;
  for (const m of MIRRORS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const r = await fetch(m + direct, { method: 'HEAD', signal: ctrl.signal });
      clearTimeout(timer);
      if (r.ok || r.status === 302) return Response.redirect(m + direct, 302);
    } catch (e) { /* 试下一个 */ }
  }
  return Response.redirect(direct, 302);
};
