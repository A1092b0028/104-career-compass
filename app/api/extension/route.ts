import { endpoint, identity } from '@/lib/server';
import { extensionZip, EXTENSION_VERSION } from '@/lib/extension-package';
export const dynamic='force-dynamic';
export async function GET(request:Request){return endpoint(async()=>{await identity();return new Response(extensionZip(new URL(request.url).origin) as BodyInit,{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="104-compass-assistant-${EXTENSION_VERSION}.zip"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});});}
