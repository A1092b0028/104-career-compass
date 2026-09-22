import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function database() { if (!env.DB) throw new HttpError(503, '資料儲存服務暫時無法使用，請稍後重試。'); return env.DB; }
export async function identity(request?: Request) {
  const user = await getChatGPTUser(); if (!user) throw new HttpError(401, '請先使用 ChatGPT 登入。');
  if (request && !['GET','HEAD'].includes(request.method)) {
    if (request.headers.get('origin') !== new URL(request.url).origin) { await request.body?.cancel(); throw new HttpError(403, '請從本站操作。'); }
    if (!request.headers.get('content-type')?.startsWith('application/json')) { await request.body?.cancel(); throw new HttpError(415, '請使用 JSON 請求。'); }
  }
  return user.userId;
}
export async function body(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 1800000) throw new HttpError(413, '資料超過上限。');
  const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, '缺少資料。'); let size = 0; const chunks: Uint8Array[] = [];
  for (;;) { const {value,done} = await reader.read(); if(done) break; size += value.length; if(size > 1800000) { await reader.cancel(); throw new HttpError(413, '資料超過上限。'); } chunks.push(value); }
  const all = new Uint8Array(size); let pos=0; for(const c of chunks){ all.set(c,pos); pos+=c.length; }
  try { return JSON.parse(new TextDecoder().decode(all)); } catch { throw new HttpError(400, '資料格式無效。'); }
}
export function json(data: unknown, status = 200) { return Response.json(data, {status, headers: {'Cache-Control':'private, no-store', 'Vary':'Cookie', 'X-Content-Type-Options':'nosniff'}}); }
export async function endpoint(fn: () => Promise<Response>) {
  try { return await fn(); } catch (e) {
    if (e instanceof HttpError) return json({error:e.message},e.status);
    if (e && typeof e === 'object' && 'issues' in e) return json({error:'欄位格式或數值不符合限制，請檢查輸入。'},400);
    console.error('Request failed', e instanceof Error ? e.name : 'unknown'); return json({error:'儲存或讀取失敗，原資料仍保留，請稍後重試。'},503);
  }
}
