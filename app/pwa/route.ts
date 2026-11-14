/** Zero-dependency installed-PWA first paint. No session fetch or HTTP 30x before the branded splash. */
export const dynamic = "force-static";

const launchHtml = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0b1412">
<title>Finzaro · Đang khởi động</title><style>
:root{color-scheme:light dark;--bg:#f5f7f7;--fg:#13201d;--card:#fff;--muted:#637a72;--primary:#0d8b66}
@media(prefers-color-scheme:dark){:root{--bg:#0c1211;--fg:#eef7f3;--card:#111a18;--muted:#9aaba5;--primary:#2fc28f}}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:var(--bg);color:var(--fg);font-family:Arial,Helvetica,sans-serif}
.launch{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:16px;background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--primary) 10%,var(--bg)),var(--bg) 44%)}
.mark{display:grid;place-items:center;width:84px;height:84px;border-radius:26px;background:var(--card);box-shadow:0 20px 50px -22px #07553b66}.mark img{width:100%;height:100%;object-fit:cover;border-radius:21px}
h1{font-size:27px;letter-spacing:-.7px;margin:0;font-weight:800}.subtitle{margin:-10px 0 0;font-size:11px;font-weight:700;letter-spacing:2.2px;color:var(--muted)}
.loader{width:84px;height:4px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--fg) 12%,transparent);margin-top:8px}.loader span{display:block;width:45%;height:100%;border-radius:inherit;background:var(--primary);animation:flow 1s infinite ease-in-out}@keyframes flow{from{transform:translateX(-110%)}55%{transform:translateX(95%)}to{transform:translateX(220%)}}
@media(prefers-reduced-motion:reduce){.loader span{animation:none;width:100%}}
a{color:var(--primary);font-size:12px;margin-top:12px;visibility:hidden;animation:show-retry 0s 5s forwards}@keyframes show-retry{to{visibility:visible}}
</style></head><body><div class="launch" role="status" aria-label="Đang mở Finzaro">
<div class="mark"><img src="/icons/finzaro-v0012-192.png" alt="" width="84" height="84" decoding="sync" fetchpriority="high"></div>
<h1>Finzaro</h1><p class="subtitle">PERSONAL FINANCE</p><div class="loader" aria-hidden="true"><span></span></div>
<a href="/overview">Mở ứng dụng</a></div>
<script>(function(){var go=function(){location.replace('/overview')};if('requestAnimationFrame' in window){requestAnimationFrame(function(){requestAnimationFrame(go)})}else{go()}})();</script>
</body></html>`;

export function GET() {
  return new Response(launchHtml, { status: 200, headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff"
  } });
}
