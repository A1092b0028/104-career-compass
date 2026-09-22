import { z } from 'zod';
import { body, database, endpoint, HttpError, identity, json } from '@/lib/server';
import { profileSchema, finishSchema, states } from '@/lib/validation';
import * as store from '@/lib/store';
export const dynamic='force-dynamic';
async function route(request:Request) {
  return endpoint(async()=>{
    const owner=await identity(request), db=database(), url=new URL(request.url), parts=url.pathname.replace(/^\/api\//,'').split('/'), method=request.method;
    try {
      if(parts[0]==='profile' && parts.length===1) {
        if(method==='GET') return json(await store.getProfile(db,owner));
        if(method==='PUT'){await store.saveProfile(db,owner,profileSchema.parse(await body(request)));return json({ok:true});}
      }
      if(parts[0]==='account' && parts.length===1 && method==='DELETE') {const data=z.object({confirm:z.literal('DELETE')}).strict().parse(await body(request));if(data.confirm){await store.deleteAccount(db,owner);}return json({ok:true});}
      if(parts[0]==='jobs') {
        if(parts.length===1 && method==='GET') return json(await store.listJobs(db,owner,url.searchParams));
        if(parts.length===2 && method==='PATCH') {await store.changeJob(db,owner,parts[1],z.object({status:z.enum(states).optional(),note:z.string().max(3000).optional()}).strict().parse(await body(request)));return json({ok:true});}
        if(parts.length===3 && parts[2]==='history' && method==='GET') return json(await db.prepare('SELECT previous,status,at FROM history WHERE user_id=? AND job_id=? ORDER BY at DESC LIMIT 100').bind(owner,parts[1]).all());
      }
      if(parts[0]==='batches') {
        if(parts.length===1 && method==='POST') {const data=z.object({count:z.number().int().min(1).max(50)}).strict().parse(await body(request));return json(await store.createBatch(db,owner,data.count));}
        if(parts.length===2 && method==='GET') {const b=await store.getBatch(db,owner,parts[1]);return json({id:b.id,status:b.status,raw:b.raw,imported:b.imported,error:b.error});}
        if(parts.length===3 && parts[2]==='finish' && method==='POST') return json(await store.finishBatch(db,owner,parts[1],finishSchema.parse(await body(request))));
        if(parts.length===3 && parts[2]==='fail' && method==='POST') {const data=z.object({error:z.string().max(300)}).strict().parse(await body(request));await store.failBatch(db,owner,parts[1],data.error);return json({ok:true});}
      }
      throw new HttpError(404,'找不到操作。');
    } catch(e){if(e instanceof store.StoreError) throw new HttpError(e.status,e.message);throw e;}
  });
}
export const GET=route; export const POST=route; export const PUT=route; export const PATCH=route; export const DELETE=route;
