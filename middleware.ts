import { next } from '@vercel/functions';

const COOKIE_NAME = 'planixy_admin';
const AUTH_PATH = '/__gate_auth';

function gatePage(showError: boolean, redirectTo: string) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Planixy</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#F2E9D8; color:#2F4B39; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; box-sizing:border-box; }
  .box { background:#fff; border-radius:16px; padding:32px; max-width:360px; width:100%; box-shadow:0 10px 30px rgba(0,0,0,0.08); text-align:center; }
  h1 { font-size:1.4rem; margin:0 0 8px; }
  p { color:#666; margin:0 0 20px; font-size:0.95rem; }
  input[type=password] { width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-bottom:12px; font-size:1rem; }
  button { width:100%; padding:12px; border:none; border-radius:8px; background:#2F4B39; color:#fff; font-size:1rem; cursor:pointer; }
  .error { color:#b3261e; font-size:0.85rem; margin-bottom:12px; }
</style>
</head>
<body>
  <div class="box">
    <h1>Planixy</h1>
    <p>Diese Seite ist gerade nicht öffentlich verfügbar.</p>
    ${showError ? '<div class="error">Falsches Passwort, bitte nochmal versuchen.</div>' : ''}
    <form method="POST" action="${AUTH_PATH}">
      <input type="hidden" name="redirect" value="${redirectTo}" />
      <input type="password" name="password" placeholder="Passwort" autofocus required />
      <button type="submit">Weiter</button>
    </form>
  </div>
</body>
</html>`;
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('cookie') || '';
  const hasAccess = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .some((c) => c === `${COOKIE_NAME}=${process.env.GATE_PASSWORD}`);

  if (url.pathname === AUTH_PATH && request.method === 'POST') {
    const form = await request.formData();
    const password = form.get('password');
    const redirectTo = (form.get('redirect') as string) || '/';

    if (password && process.env.GATE_PASSWORD && password === process.env.GATE_PASSWORD) {
      const res = new Response(null, {
        status: 302,
        headers: { Location: redirectTo },
      });
      res.headers.append(
        'Set-Cookie',
        `${COOKIE_NAME}=${process.env.GATE_PASSWORD}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
      );
      return res;
    }

    return new Response(gatePage(true, redirectTo), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' },
    });
  }

  if (hasAccess) {
    return next();
  }

  return new Response(gatePage(false, url.pathname), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' },
  });
}
