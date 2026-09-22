import { endpoint, identity } from '@/lib/server';
import { extensionZip } from '@/lib/extension-package';
export const dynamic='force-dynamic';
export async function GET(){return endpoint(async()=>{await identity();return new Response(extensionZip() as BodyInit,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="104-compass-assistant-2.0.0.zip"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});});}
