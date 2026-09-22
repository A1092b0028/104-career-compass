import { emptyProfile, score, type Profile, type Job } from './matching';

export class StoreError extends Error { constructor(public status: number, message: string) { super(message); } }
const stamp = () => new Date().toISOString();
type Batch = {id:string;user_id:string;profile:string;requested:number;status:string;started:string;raw:number;imported:number;finished:string|null;error:string|null};
export async function getProfile(db:D1Database, owner:string) {
  const row = await db.prepare('SELECT data FROM profiles WHERE user_id=?').bind(owner).first<{data:string}>();
  return {profile:row ? JSON.parse(row.data) as Profile : emptyProfile, configured:!!row};
}
export async function saveProfile(db:D1Database, owner:string, p:Profile) {
  const at=stamp(); await db.batch([
    db.prepare('INSERT INTO users(id,created) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(owner,at),
    db.prepare('INSERT INTO profiles(user_id,data,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(owner,JSON.stringify(p),at),
  ]);
}
export async function deleteAccount(db:D1Database,owner:string) {
  // Explicit deletion also works in environments where FK enforcement is disabled.
  await db.batch(['history','jobs','batches','profiles'].map(t=>db.prepare(`DELETE FROM ${t} WHERE user_id=?`).bind(owner)).concat(db.prepare('DELETE FROM users WHERE id=?').bind(owner)));
}
export async function createBatch(db:D1Database,owner:string,count:number) {
  const at=stamp(), expires=new Date(Date.now()-240000).toISOString(), id=crypto.randomUUID();
  const {profile,configured}=await getProfile(db,owner);
  if(!configured || !profile.titles.length) throw new StoreError(400,'請先儲存履歷與期望職稱。');
  const latest=await db.prepare('SELECT started FROM batches WHERE user_id=? ORDER BY started DESC LIMIT 1').bind(owner).first<{started:string}>();
  if(latest && Date.now()-Date.parse(latest.started)<10000) throw new StoreError(429,'請隔 10 秒再更新。');
  try { await db.batch([
    db.prepare("UPDATE batches SET status='failed',active=NULL,error='更新逾時',finished=? WHERE user_id=? AND active=1 AND started<?").bind(at,owner,expires),
    db.prepare("INSERT INTO batches(id,user_id,profile,requested,status,active,started) VALUES(?,?,?,?,'running',1,?)").bind(id,owner,JSON.stringify(profile),count,at),
  ]); } catch(e) { if(String(e).includes('UNIQUE')) throw new StoreError(409,'已有更新正在進行，請等待完成或四分鐘後重試。'); throw e; }
  // Only public search criteria cross the extension boundary; the resume stays on the site.
  return {id,profile:{titles:profile.titles,locations:profile.locations,count}};
}
export async function getBatch(db:D1Database,owner:string,id:string) {
  const row=await db.prepare('SELECT * FROM batches WHERE user_id=? AND id=?').bind(owner,id).first<Batch>();
  if(!row) throw new StoreError(404,'找不到這次更新。'); return row;
}
export async function failBatch(db:D1Database,owner:string,id:string,error:string) {
  await getBatch(db,owner,id);
  await db.prepare("UPDATE batches SET status='failed',active=NULL,error=?,finished=? WHERE user_id=? AND id=? AND status='running'").bind(error,stamp(),owner,id).run();
}
export async function finishBatch(db:D1Database,owner:string,id:string,input:{jobs:Job[];raw:number;emptyConfirmed?:boolean}) {
  const batch=await getBatch(db,owner,id);
  if(batch.status==='done') return {imported:batch.imported,raw:batch.raw,id};
  if(batch.status!=='running' || Date.now()-Date.parse(batch.started)>240000) throw new StoreError(409,'批次已結束或逾時，請重新更新。');
  if(input.jobs.length>batch.requested || input.raw<input.jobs.length || (!input.jobs.length&&!input.emptyConfirmed)) throw new StoreError(400,'讀取筆數無效，或未確認搜尋結果為空。');
  const unique=[...new Map(input.jobs.map(j=>[j.id,j])).values()], profile=JSON.parse(batch.profile) as Profile, at=stamp(), token=crypto.randomUUID();
  const guard="EXISTS (SELECT 1 FROM batches WHERE user_id=? AND id=? AND status='committing' AND commit_token=?)";
  const statements=[db.prepare("UPDATE batches SET status='committing',commit_token=? WHERE user_id=? AND id=? AND status='running'").bind(token,owner,id)];
  for(const j of unique) {
    const result=score(j,profile), excluded=result.excluded.join('；');
    statements.push(db.prepare(`INSERT INTO jobs(user_id,id,data,title,company,status,score,result,published,captured,recommend_batch,exclude_source,exclude_reason)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${guard}
      ON CONFLICT(user_id,id) DO UPDATE SET data=excluded.data,title=excluded.title,company=excluded.company,score=excluded.score,result=excluded.result,published=excluded.published,captured=excluded.captured,
      status=CASE WHEN jobs.manual=1 THEN jobs.status ELSE excluded.status END,
      recommend_batch=CASE WHEN jobs.manual=1 THEN '' ELSE excluded.recommend_batch END,
      exclude_source=CASE WHEN jobs.manual=1 THEN jobs.exclude_source ELSE excluded.exclude_source END,
      exclude_reason=CASE WHEN jobs.manual=1 THEN jobs.exclude_reason ELSE excluded.exclude_reason END`).bind(owner,j.id,JSON.stringify(j),j.title,j.company,excluded?'篩除':'未讀取',result.score,JSON.stringify(result),j.publish_time,at,id,excluded?'system':'',excluded,owner,id,token));
  }
  statements.push(db.prepare(`UPDATE jobs SET status='篩除',exclude_source='system',exclude_reason='本批次排名未進前 10 名',recommend_batch='' WHERE user_id=? AND manual=0 AND recommend_batch=? AND status='未讀取' AND id NOT IN (SELECT id FROM jobs WHERE user_id=? AND manual=0 AND recommend_batch=? AND status='未讀取' ORDER BY score DESC,published DESC,id ASC LIMIT 10) AND ${guard}`).bind(owner,id,owner,id,owner,id,token));
  statements.push(db.prepare(`UPDATE jobs SET recommend_batch='' WHERE user_id=? AND recommend_batch=? AND status='篩除' AND ${guard}`).bind(owner,id,owner,id,token));
  statements.push(db.prepare("UPDATE batches SET status='done',active=NULL,finished=?,raw=?,imported=? WHERE user_id=? AND id=? AND status='committing' AND commit_token=?").bind(at,input.raw,unique.length,owner,id,token));
  await db.batch(statements); // D1 batches are transactional; no partial import becomes visible.
  const done=await getBatch(db,owner,id);
  if(done.status!=='done') throw new StoreError(409,'更新已取消，請重新更新。');
  return {id,imported:done.imported,raw:done.raw};
}
export async function listJobs(db:D1Database,owner:string,params:URLSearchParams) {
  const tab=params.get('tab')||'latest', page=Math.max(1,Math.min(100000,Number(params.get('page'))||1)), size=20;
  const where=['j.user_id=?']; const values:(string|number)[]=[owner];
  if(tab==='latest') where.push("j.recommend_batch=(SELECT id FROM batches WHERE user_id=j.user_id AND status='done' ORDER BY finished DESC,id DESC LIMIT 1) AND j.status IN ('未讀取','已讀')");
  else if(tab==='inbox') where.push("j.status IN ('未讀取','已讀')");
  else if(tab==='history') where.push("EXISTS (SELECT 1 FROM history h WHERE h.user_id=j.user_id AND h.job_id=j.id AND h.status='已投遞')");
  else if(tab==='excluded') where.push("j.status='篩除'"); else throw new StoreError(400,'清單不存在。');
  const q=(params.get('q')||'').slice(0,100); if(q){ where.push('(instr(j.title,?)>0 OR instr(j.company,?)>0 OR instr(j.note,?)>0)'); values.push(q,q,q); }
  const source=params.get('source'); if(source==='system'||source==='user'){where.push('j.exclude_source=?');values.push(source);}
  const reason=(params.get('reason')||'').slice(0,100); if(reason){where.push('instr(j.exclude_reason,?)>0');values.push(reason);}
  const status=params.get('status'); if(status==='未讀取'||status==='已讀'){where.push('j.status=?');values.push(status);}
  const condition=where.join(' AND ');
  const total=await db.prepare(`SELECT count(*) AS n FROM jobs j WHERE ${condition}`).bind(...values).first<{n:number}>();
  const result=await db.prepare(`SELECT j.*, (SELECT MAX(at) FROM history h WHERE h.user_id=j.user_id AND h.job_id=j.id AND h.status='已投遞') AS last_applied FROM jobs j WHERE ${condition} ORDER BY ${tab==='history'?'last_applied DESC,':''}j.score DESC,j.published DESC,j.id ASC LIMIT ? OFFSET ?`).bind(...values,size,(page-1)*size).all<Record<string,unknown> & {id:string}>();
  const latest=await db.prepare('SELECT id,status,started,finished,raw,imported,error FROM batches WHERE user_id=? ORDER BY started DESC LIMIT 1').bind(owner).first();
  return {jobs:result.results.map(r=>({...r,user_id:undefined,data:JSON.parse(r.data as string),result:JSON.parse(r.result as string)})),total:total?.n||0,page,size,latest};
}
export async function changeJob(db:D1Database,owner:string,id:string,input:{status?:string;note?:string}) {
  const found=await db.prepare('SELECT id FROM jobs WHERE user_id=? AND id=?').bind(owner,id).first(); if(!found) throw new StoreError(404,'找不到職缺。');
  const ops:D1PreparedStatement[]=[], at=stamp();
  if(input.status) {
    const s=input.status;
    ops.push(db.prepare('INSERT INTO history(id,user_id,job_id,previous,status,at) SELECT ?,user_id,id,status,?,? FROM jobs WHERE user_id=? AND id=? AND status<>?').bind(crypto.randomUUID(),s,at,owner,id,s));
    ops.push(db.prepare(`UPDATE jobs SET status=?,manual=1,applied_at=CASE WHEN ?='已投遞' THEN COALESCE(applied_at,?) ELSE NULL END,
      recommend_batch=CASE WHEN ? IN ('已投遞','篩除') OR status IN ('已投遞','篩除') THEN '' ELSE recommend_batch END,
      exclude_source=CASE WHEN ?='篩除' THEN 'user' ELSE '' END,exclude_reason=CASE WHEN ?='篩除' THEN '手動篩除' ELSE '' END WHERE user_id=? AND id=?`).bind(s,s,at,s,s,s,owner,id));
  }
  if(input.note!==undefined) ops.push(db.prepare('UPDATE jobs SET note=? WHERE user_id=? AND id=?').bind(input.note,owner,id));
  if(ops.length) await db.batch(ops);
}
