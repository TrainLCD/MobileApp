/** POST /auth/token — インストール ID から短期セッショントークンを発行する。 */
import { issueSessionToken } from '../lib/auth/session';
import type { Env } from '../types';

const JSON_HEADERS = { 'content-type': 'application/json; charset=UTF-8' };

// インストール ID は端末生成 UUID 程度を想定。最低限の形式チェック。
const INSTALL_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

export const handleAuthToken = async (
  req: Request,
  env: Env
): Promise<Response> => {
  let body: { installId?: unknown };
  try {
    body = (await req.json()) as { installId?: unknown };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const installId = typeof body.installId === 'string' ? body.installId : '';
  if (!INSTALL_ID_PATTERN.test(installId)) {
    return new Response(JSON.stringify({ error: 'invalid installId' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // 署名鍵が未設定だと issueSessionToken が例外で 500 になるため、原因を明示する
  if (!env.SESSION_JWT_SECRET) {
    console.error('SESSION_JWT_SECRET is not set');
    return new Response(
      JSON.stringify({ error: 'server misconfigured: SESSION_JWT_SECRET' }),
      { status: 500, headers: JSON_HEADERS }
    );
  }

  try {
    const { token, expiresIn } = await issueSessionToken(env, installId);
    return new Response(JSON.stringify({ token, expiresIn }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (e) {
    console.error('issueSessionToken failed:', e);
    return new Response(JSON.stringify({ error: 'failed to issue token' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
