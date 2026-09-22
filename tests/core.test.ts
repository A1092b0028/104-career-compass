import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { score, similarity, contains, emptyProfile, type Job, type Profile } from '../lib/matching';
import { profileSchema, finishSchema } from '../lib/validation';
import { saveProfile, getProfile, createBatch, finishBatch, changeJob, listJobs, getBatch, failBatch, deleteAccount } from '../lib/store';

function database(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');sql.exec(readFileSync('drizzle/0000_absent_polaris.sql','utf8'));
 class Statement{constructor(public query:string,public args:(string|number|null)[]=[]){ } bind(...args:(string|number|null)[]){return new Statement(this.query,args);} async first(){return sql.prepare(this.query).get(...this.args)||null;} async all(){return {results:sql.prepare(this.query).all(...this.args)};} async run(){const r=sql.prepare(this.query).run(...this.args);return {meta:{changes:r.changes},success:true};}}
 const db={prepare:(q:string)=>new Statement(q),batch:async(ops:Statement[])=>{sql.exec('BEGIN');try{const result=[];for(const op of ops)result.push(await op.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}} as unknown as D1Database;
 return {db,sql};
}
const profile:Profile={...emptyProfile,skills:['Python'],titles:['Python 工程師'],resume_text:'Python 工程師',years:2,min_salary:40000};
const job=(id:string):Job=>({id,title:'Python 工程師',company:'測試公司',location:'台北市',description:'Python 工程師',url:'https://www.104.com.tw/job/'+id,salary_text:'月薪 45,000 至 60,000',salary_min:45000,salary_max:60000,years_required:1,publish_time:'2026-01-01'});
const list=(db:D1Database,owner:string,tab='latest')=>listJobs(db,owner,new URLSearchParams({tab}));
function age(sql:DatabaseSync,owner='a'){sql.prepare('UPDATE batches SET started=? WHERE user_id=?').run(new Date(Date.now()-15000).toISOString(),owner);}

test('matching: Python parity, boundaries, unknown coverage, hard exclusions',()=>{
 assert.equal(score(job('a'),profile).score,100);assert.equal(score(job('a'),profile).coverage,100);
 assert.equal(similarity('資料分析','資料分析'),1);assert.equal(similarity('Python SQL','Python'),1/Math.sqrt(2));
 assert.equal(contains('javascript','java'),false);assert.equal(contains('使用 C++ 開發','C++'),true);
 const unknown={...job('a'),salary_min:null,salary_max:null,years_required:null};assert.equal(score(unknown,profile).coverage,70);assert.equal(score(unknown,profile).score,100);
 assert.ok(score({...job('a'),location:'高雄市'},profile).excluded.includes('地區不符合或未提供'));
 assert.ok(score({...job('a'),salary_max:30000},profile).excluded.includes('薪資上限低於期望'));
 assert.ok(score(job('a'),{...profile,exclude:['Python']}).excluded.includes('包含排除關鍵字'));
});
test('strict schemas reject owner injection, hostile URL, oversized batches and invalid dates',()=>{
 assert.equal(profileSchema.safeParse({...profile,user_id:'b'}).success,false);
 const {id,...j}=job('a');assert.equal(finishSchema.safeParse({jobs:[j],raw:1}).success,true);
 assert.equal(finishSchema.safeParse({jobs:[{...j,url:'https://evil.example/job/a'}],raw:1}).success,false);
 assert.equal(finishSchema.safeParse({jobs:[{...j,publish_time:'2026-02-31'}],raw:1}).success,false);
 assert.equal(finishSchema.safeParse({jobs:Array(51).fill(j),raw:51}).success,false);
 assert.equal(profileSchema.safeParse({...profile,resume_text:'x'.repeat(100001)}).success,false);
});
test('two accounts: profile, batch, job and history isolation',async()=>{
 const {db,sql}=database();await saveProfile(db,'a',profile);await saveProfile(db,'b',{...profile,resume_text:'B private'});
 assert.equal((await getProfile(db,'a')).profile.resume_text,'Python 工程師');
 const a=await createBatch(db,'a',50);await assert.rejects(()=>getBatch(db,'b',a.id));await assert.rejects(()=>finishBatch(db,'b',a.id,{jobs:[job('a')],raw:1}));
 await finishBatch(db,'a',a.id,{jobs:[job('a')],raw:1});await assert.rejects(()=>changeJob(db,'b','a',{status:'已投遞'}));assert.equal((await list(db,'b')).total,0);
 await changeJob(db,'a','a',{status:'已投遞'});assert.equal((await list(db,'a','history')).total,1);assert.equal((await list(db,'b','history')).total,0);sql.close();
});
test('50 rows, top ten deterministic ties, duplicates, manual state and note survive refresh',async()=>{
 const {db,sql}=database();await saveProfile(db,'a',profile);const b=await createBatch(db,'a',50);
 const input=Array.from({length:49},(_,i)=>job('j'+String(i).padStart(2,'0')));await finishBatch(db,'a',b.id,{jobs:[...input,input[0]],raw:50});
 const first=await list(db,'a');assert.equal(first.total,10);assert.equal(first.jobs[0].id,'j00');assert.equal((await list(db,'a','excluded')).total,39);
 assert.equal((await finishBatch(db,'a',b.id,{jobs:[job('other')],raw:1})).imported,49); // idempotent replay
 await changeJob(db,'a','j00',{status:'已投遞',note:'keep'});await changeJob(db,'a','j01',{status:'篩除'});await changeJob(db,'a','j10',{status:'未讀取'});
 age(sql);const next=await createBatch(db,'a',50);await finishBatch(db,'a',next.id,{jobs:input,raw:49});
 const rows=sql.prepare('SELECT id,status,note,recommend_batch FROM jobs WHERE user_id=? AND id IN (?,?,?) ORDER BY id').all('a','j00','j01','j10');
 assert.equal(rows[0].status,'已投遞');assert.equal(rows[0].note,'keep');assert.equal(rows[1].status,'篩除');assert.equal(rows[2].status,'未讀取');assert.equal(rows[2].recommend_batch,'');
 assert.equal((await list(db,'a')).total,10);
 await changeJob(db,'a','j00',{status:'未讀取'});assert.equal((await list(db,'a','history')).total,1);sql.close();
});
test('atomic failure, limits, simultaneous updates, failure preservation and deletion',async()=>{
 const {db,sql}=database();await saveProfile(db,'a',profile);const b=await createBatch(db,'a',1);await finishBatch(db,'a',b.id,{jobs:[job('old')],raw:1});age(sql);
 const c=await createBatch(db,'a',1);age(sql);await assert.rejects(()=>createBatch(db,'a',1));await assert.rejects(()=>finishBatch(db,'a',c.id,{jobs:[job('x'),job('y')],raw:2}));
 sql.exec("CREATE TRIGGER reject_bad BEFORE INSERT ON jobs WHEN NEW.id='bad' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");
 await assert.rejects(()=>finishBatch(db,'a',c.id,{jobs:[job('bad')],raw:1}));assert.equal((await getBatch(db,'a',c.id)).status,'running');assert.equal((await list(db,'a')).jobs[0].id,'old');
 await failBatch(db,'a',c.id,'驗證頁');assert.equal((await list(db,'a')).jobs[0].id,'old');await assert.rejects(()=>finishBatch(db,'a',c.id,{jobs:[job('x')],raw:1}));
 await saveProfile(db,'b',profile);await deleteAccount(db,'a');for(const t of ['users','profiles','batches','jobs','history'])assert.equal(sql.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${t==='users'?'id':'user_id'}=?`).get('a')!.n,0);
 assert.equal((await getProfile(db,'b')).configured,true);await assert.rejects(()=>finishBatch(db,'a',c.id,{jobs:[job('x')],raw:1}));sql.close();
});
test('confirmed zero results creates a successful empty latest batch; unconfirmed empty fails',async()=>{
 const {db,sql}=database();await saveProfile(db,'a',profile);const b=await createBatch(db,'a',1);await assert.rejects(()=>finishBatch(db,'a',b.id,{jobs:[],raw:0}));await finishBatch(db,'a',b.id,{jobs:[],raw:0,emptyConfirmed:true});assert.equal((await list(db,'a')).total,0);sql.close();
});
