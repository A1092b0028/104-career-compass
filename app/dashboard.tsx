'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Compass, SlidersHorizontal, Download, RefreshCw, ExternalLink, Search, Upload, Check, MapPin, Wallet, Clock, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { emptyProfile, type Profile, type Job, type Match } from '@/lib/matching';
import { parseResume } from '@/lib/resume';

type Row={id:string;data:Job;result:Match;score:number;status:string;note:string;exclude_source:string;exclude_reason:string;captured:string;applied_at:string|null;last_applied:string|null};
type List={jobs:Row[];total:number;page:number;size:number;latest:null|{id:string;status:string;raw:number;imported:number;error:string|null;finished:string|null;started:string}};
const tabs=[['latest','最新職缺'],['inbox','未讀取與已讀'],['history','歷史應徵紀錄'],['excluded','篩除內容']];
async function api<T=unknown>(path:string,method='GET',data?:unknown):Promise<T>{const r=await fetch('/api/'+path,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json'},...(data!==undefined?{body:JSON.stringify(data)}:{})});const j=await r.json() as T & {error?:string};if(!r.ok)throw Error(j.error||'操作失敗，請重試。');return j;}
const time=(s:string|null|undefined)=>s?new Date(s).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'—';
function extensionRequest(type:string,id:string,profile?:unknown,onProgress?:(state:string)=>void):Promise<Record<string,unknown>>{
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{cleanup();reject(Error(type==='COMPASS_PING'?'尚未偵測到更新助手。請安裝後重新整理網站。':'更新已逾時，原推薦仍保留，請檢查 104 分頁。'));},type==='COMPASS_PING'?1500:200000);
  const handler=(e:MessageEvent)=>{if(e.source!==window||e.origin!==location.origin||e.data?.id!==id)return;
   if(e.data.type==='COMPASS_PROGRESS'){onProgress?.(String(e.data.state));return;}
   if(e.data.type===(type==='COMPASS_PING'?'COMPASS_READY':'COMPASS_RESULT')){cleanup();if(e.data.error)reject(Error(String(e.data.error)));else resolve(e.data);}
  };
  const cleanup=()=>{clearTimeout(timeout);window.removeEventListener('message',handler);};
  window.addEventListener('message',handler);window.postMessage({type,id,profile},location.origin);
 });
}
export default function Dashboard({name}:{name:string}){
 const [tab,setTab]=useState('latest'),[page,setPage]=useState(1),[q,setQ]=useState(''),[filter,setFilter]=useState('all'),[reason,setReason]=useState('');
 const [list,setList]=useState<List>({jobs:[],total:0,page:1,size:20,latest:null}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [profile,setProfile]=useState<Profile>(emptyProfile),[configured,setConfigured]=useState(false),[settings,setSettings]=useState(false),[profileReady,setProfileReady]=useState(false);
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[count,setCount]=useState(20),[revision,setRevision]=useState(0),[mobile,setMobile]=useState(false),[privacy,setPrivacy]=useState(false),[deleting,setDeleting]=useState(false),[deleteOpen,setDeleteOpen]=useState(false);
 const [detail,setDetail]=useState<Row|null>(null),[events,setEvents]=useState<{previous:string;status:string;at:string}[]>([]);
 const working=useRef(false);
 const loadProfile=useCallback(()=>api<{profile:Profile;configured:boolean}>('profile').then(data=>{setProfile(data.profile);setConfigured(data.configured);setProfileReady(true);}).catch(e=>setError(e.message)),[]);
 useEffect(()=>{setMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));void loadProfile();},[loadProfile]);
 useEffect(()=>{let live=true;setLoading(true);const timer=setTimeout(()=>{const p=new URLSearchParams({tab,page:String(page),q});if(tab==='excluded'){if(filter!=='all')p.set('source',filter);p.set('reason',reason);}if(tab==='inbox'&&filter!=='all')p.set('status',filter);
  api<List>('jobs?'+p).then(data=>{if(live){setList(data);}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});},150);return()=>{live=false;clearTimeout(timer);};},[tab,page,q,filter,reason,revision]);
 const reload=useCallback(()=>setRevision(x=>x+1),[]);
 const switchTab=(t:string)=>{setTab(t);setPage(1);setFilter('all');setReason('');};
 useEffect(()=>{
  const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown}}).modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  Promise.resolve(context.registerTool({name:'list_my_jobs',description:'Read the signed-in user’s job list. Does not change job status or submit applications.',inputSchema:{type:'object',properties:{tab:{type:'string',enum:['latest','inbox','history','excluded']}},required:['tab'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async(input:unknown)=>{const t=(input as {tab?:unknown})?.tab;if(typeof t!=='string'||!tabs.some(([k])=>k===t))throw Error('Invalid tab');const r=await api<List>('jobs?tab='+t);return {total:r.total,jobs:r.jobs.map(j=>({id:j.id,title:j.data.title,company:j.data.company,status:j.status,score:j.score}))};}},{signal:lifecycle.signal})).catch(()=>{});return()=>lifecycle.abort();
 },[]);
 async function refresh(){
  if(working.current)return;working.current=true;setBusy(true);setError('');setMessage('');let id='';
  try{setProgress('等待擴充功能');await extensionRequest('COMPASS_PING',crypto.randomUUID());
   const b=await api<{id:string;profile:unknown}>('batches','POST',{count});id=b.id;setProgress('104 頁面讀取中');
   const r=await extensionRequest('COMPASS_REFRESH',id,b.profile,setProgress);setProgress('媒合中');
   const done=await api<{raw:number;imported:number}>('batches/'+id+'/finish','POST',{jobs:r.jobs,raw:r.raw,...(r.emptyConfirmed?{emptyConfirmed:true}:{})});
   setProgress('完成');setMessage(`讀取 ${done.raw} 筆，去重／本次上限處理後匯入 ${done.imported} 筆。`);switchTab('latest');reload();
  }catch(e){const text=e instanceof Error?e.message:'更新失敗';let completed=false;
   if(id){try{const b=await api<{status:string;imported:number}>('batches/'+id);if(b.status==='done'){completed=true;setProgress('完成');setMessage(`已匯入 ${b.imported} 筆。`);}else await api('batches/'+id+'/fail','POST',{error:text.slice(0,300)});}catch{}}
   if(!completed){setError(text);setProgress(text.includes('驗證')?'等待使用者完成驗證':'失敗');}reload();
  }finally{setBusy(false);working.current=false;}
 }
 async function change(id:string,input:{status?:string;note?:string}){try{await api('jobs/'+id,'PATCH',input);setMessage('已儲存');setError('');reload();}catch(e){setError((e as Error).message);throw e;}}
 async function showDetail(row:Row){setDetail(row);setEvents([]);try{const r=await api<{results:{previous:string;status:string;at:string}[]}>('jobs/'+row.id+'/history');setEvents(r.results);}catch(e){setError((e as Error).message);}}
 async function remove(){setDeleting(true);try{await api('account','DELETE',{confirm:'DELETE'});location.assign('/signout-with-chatgpt?return_to=/');}catch(e){setError((e as Error).message);setDeleting(false);}}
 return <main className="workspace"><header className="masthead"><a className="brand" href="/"><Compass/><span>104 職涯羅盤<small>熟人測試版</small></span></a><div className="account">{name}<a href="/signout-with-chatgpt?return_to=/" target="_top">登出</a></div></header>
 <section className="intro"><div><p className="eyebrow">你的下一步，從這裡開始</p><h1>找到方向，也記住每一步。</h1><p>依照你的條件整理職缺，讓求職進度一目了然。</p></div><div className="refresh-controls"><label htmlFor="count">本次最多筆數</label><Input id="count" type="number" min={1} max={50} value={count} onChange={e=>setCount(Number(e.target.value))} disabled={busy}/><Button onClick={refresh} disabled={busy||!configured||mobile||!Number.isInteger(count)||count<1||count>50}>{busy?<LoaderCircle className="spin"/>:<RefreshCw/>}更新 104 職缺</Button></div></section>
 <div className="toolbar"><Button variant="outline" disabled={!profileReady} onClick={()=>setSettings(true)}><SlidersHorizontal/>履歷與搜尋條件</Button><a href="/assistant"><Download size={16}/>下載更新助手</a>{configured&&<span className="condition-summary">{profile.titles.join('、')||'尚未設定職稱'} · {profile.locations.join('、')||'地區不限'}</span>}</div>
 {mobile&&<div className="notice">手機可查看與管理資料；更新職缺請使用已安裝助手的桌面 Chrome／Edge。</div>}
 {error&&<div className="notice error" role="alert">{error}<Button size="sm" variant="ghost" onClick={()=>{setError('');void loadProfile();reload();}}>重新讀取</Button></div>}
 {(progress||message)&&<div className="notice" role="status">{busy&&<LoaderCircle size={16} className="spin"/>}{progress&&<strong>{progress}</strong>} {message}</div>}
 <Tabs value={tab} onValueChange={switchTab}><TabsList className="job-tabs" variant="line">{tabs.map(([k,v])=><TabsTrigger value={k} key={k}>{v}</TabsTrigger>)}</TabsList>
 {tabs.map(([key])=><TabsContent value={key} key={key}><div className="list-tools"><div className="search"><Search size={18}/><Input aria-label="搜尋職稱、公司、備註" placeholder="搜尋職稱、公司、備註" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/></div>
 {(tab==='excluded'||tab==='inbox')&&<Select value={filter} onValueChange={v=>{setFilter(v);setPage(1);}}><SelectTrigger aria-label="篩選來源或狀態"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">全部{tab==='excluded'?'來源':'狀態'}</SelectItem>{(tab==='excluded'?[['system','系統篩除'],['user','手動篩除']]:[['未讀取','未讀取'],['已讀','已讀']]).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>}
 {tab==='excluded'&&<Input aria-label="搜尋篩除原因" placeholder="搜尋篩除原因" value={reason} onChange={e=>{setReason(e.target.value);setPage(1);}}/>}<span className="total">{list.total} 筆</span></div>
 {tab==='latest'&&<p className="list-caption">最近成功更新的前 10 名推薦。分數是匹配指標，不是錄取機率。</p>}
 {loading?<div className="job-list">{[1,2,3].map(i=><Skeleton key={i} className="h-40 rounded-xl"/>)}</div>:list.jobs.length?<div className="job-list">{list.jobs.map(j=><JobCard key={j.id} row={j} onChange={change} onDetails={()=>showDetail(j)}/>)}</div>:<Empty className="empty-state"><EmptyHeader><Compass size={42}/><EmptyTitle>{configured?'這裡還沒有職缺':'先告訴我們你想找什麼工作'}</EmptyTitle><EmptyDescription>{configured?'更新職缺或調整搜尋篩選，結果會顯示在這裡。':'設定技能、職稱與地區，再使用電腦上的更新助手讀取 104 職缺。'}</EmptyDescription></EmptyHeader><Button variant="outline" disabled={!profileReady} onClick={()=>setSettings(true)}>設定履歷與搜尋條件</Button></Empty>}
 {list.total>20&&<Pagination><PaginationContent><PaginationItem><Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>上一頁</Button></PaginationItem><PaginationItem><span className="page-label">第 {page} / {Math.ceil(list.total/20)} 頁</span></PaginationItem><PaginationItem><Button variant="outline" disabled={page*20>=list.total} onClick={()=>setPage(p=>p+1)}>下一頁</Button></PaginationItem></PaginationContent></Pagination>}
 </TabsContent>)}</Tabs>
 {list.latest&&<p className="list-caption">最近一次更新：{time(list.latest.started)} · {list.latest.status==='done'?`完成，讀取 ${list.latest.raw} 筆／匯入 ${list.latest.imported} 筆`:list.latest.status==='failed'?`失敗：${list.latest.error}`:'更新中（逾時後可重新更新）'}</p>}
 <footer><span>測試用途 · 非 104 官方整合 · 應徵由你在 104 自行送出</span><button onClick={()=>setPrivacy(true)}>資料保存與刪除</button></footer>
 <Settings open={settings} onOpenChange={setSettings} profile={profile} onSaved={p=>{setProfile(p);setConfigured(true);setMessage('條件已儲存，下次更新會使用新條件。');setSettings(false);}}/>
 <Dialog open={!!detail} onOpenChange={v=>{if(!v)setDetail(null);}}><DialogContent className="wide-dialog"><DialogHeader><DialogTitle>{detail?.data.title}</DialogTitle><DialogDescription>{detail?.data.company} · 搜尋頁摘要，完整條件請以 104 為準</DialogDescription></DialogHeader>{detail&&<div className="detail-body"><a href={detail.data.url} target="_blank" rel="noopener noreferrer" className="external">前往 104 查看 <ExternalLink size={16}/></a><h3>匹配依據</h3><p>匹配 {detail.score} 分 · 資料覆蓋率 {detail.result.coverage}%</p><p>{Object.entries(detail.result.breakdown).map(([k,v])=>`${k} ${v}`).join(' · ')}</p><p>{detail.result.reasons.join('；')}</p>{detail.exclude_reason&&<p>篩除原因：{detail.exclude_reason}</p>}<h3>職缺摘要</h3><p className="preserve">{detail.data.description}</p><h3>操作紀錄</h3>{events.length?events.map((e,i)=><p key={i}>{time(e.at)} · {e.previous} → {e.status}</p>):<p>尚無狀態變更紀錄。</p>}</div>}</DialogContent></Dialog>
 <Dialog open={privacy} onOpenChange={setPrivacy}><DialogContent><DialogHeader><DialogTitle>你的資料，由你管理</DialogTitle><DialogDescription>履歷文字與求職紀錄會持續保存，直到你主動刪除。</DialogDescription></DialogHeader><div className="privacy-copy"><p>原始 PDF／DOCX／TXT 僅在你的瀏覽器解析。按下「確認並儲存」後，確認文字與搜尋條件才會透過 HTTPS 傳到本站。</p><p>本站使用 Sites 與 Cloudflare D1 保存帳戶識別、履歷文字、職缺與狀態紀錄，供跨裝置媒合與管理；不把履歷送交外部 AI。資料由上述服務的雲端基礎設施處理，未設定台灣專屬儲存地區。</p><p>刪除會立即移除本站主資料，不提供復原。服務備份依平台週期淘汰；這個操作不會刪除你的 ChatGPT 或 104 帳號。重新使用本站並儲存條件將建立空白資料。</p><Button variant="destructive" disabled={busy||deleting} onClick={()=>{setPrivacy(false);setDeleteOpen(true);}}>刪除我的本站資料</Button></div></DialogContent></Dialog>
 <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>確定刪除所有本站資料？</AlertDialogTitle><AlertDialogDescription>履歷文字、條件、職缺、備註與投遞歷史會立即刪除且無法復原。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>保留資料</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={remove} disabled={deleting}>確認刪除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </main>;
}
function JobCard({row,onChange,onDetails}:{row:Row;onChange:(id:string,input:{status?:string;note?:string})=>Promise<void>;onDetails:()=>void}){
 const [saving,setSaving]=useState(false),[note,setNote]=useState(row.note);useEffect(()=>setNote(row.note),[row.note]);
 async function update(input:{status?:string;note?:string}){setSaving(true);try{await onChange(row.id,input);}catch{}finally{setSaving(false);}}
 return <article className="job-card"><div className="job-heading"><div><p className="company">{row.data.company}</p><h2><a href={row.data.url} target="_blank" rel="noopener noreferrer">{row.data.title}<ExternalLink size={16}/></a></h2></div><div className="score"><strong>{row.score}</strong><span>匹配分數</span></div></div><div className="job-meta"><span><MapPin size={15}/>{row.data.location||'地區未提供'}</span><span><Wallet size={15}/>{row.data.salary_text||'薪資未提供'}</span><span><Clock size={15}/>發布 {row.data.publish_time||'日期未知'}</span></div><div className="job-reasons"><span className={'status status-'+row.status}>{row.status}</span><span>{row.result.reasons[0]}</span><span>資料覆蓋率 {row.result.coverage}%</span></div>{row.exclude_reason&&<p className="exclude-reason">{row.exclude_source==='user'?'手動':'系統'}篩除：{row.exclude_reason}</p>}{row.last_applied&&<p className="list-caption">最近投遞紀錄：{time(row.last_applied)}{row.status!=='已投遞'?'（目前已變更狀態）':''}</p>}<div className="card-actions"><Select value={row.status} disabled={saving} onValueChange={v=>update({status:v})}><SelectTrigger aria-label={`${row.data.title}狀態`}><SelectValue/></SelectTrigger><SelectContent>{['未讀取','已讀','已投遞','篩除'].map(s=><SelectItem key={s} value={s}>{row.status==='篩除'&&s==='未讀取'?'復原至未讀取':row.status==='已投遞'&&s==='未讀取'?'取消投遞，回未讀取':s}</SelectItem>)}</SelectContent></Select><Button variant="ghost" onClick={onDetails}>匹配說明與紀錄</Button><span className="captured">讀取 {time(row.captured)}</span></div><div className="note-row"><Input aria-label={`${row.data.title}備註`} maxLength={3000} value={note} onChange={e=>setNote(e.target.value)} placeholder="加上自己的備註…"/><Button size="sm" variant="outline" disabled={saving||note===row.note} onClick={()=>update({note})}>儲存備註</Button></div></article>;
}
function Settings({open,onOpenChange,profile,onSaved}:{open:boolean;onOpenChange:(v:boolean)=>void;profile:Profile;onSaved:(p:Profile)=>void}){
 const [draft,setDraft]=useState(profile),[words,setWords]=useState({skills:'',titles:'',locations:'',exclude:''}),[error,setError]=useState(''),[info,setInfo]=useState(''),[saving,setSaving]=useState(false),[parsing,setParsing]=useState(false);
 useEffect(()=>{if(open){setDraft(profile);setWords({skills:profile.skills.join('、'),titles:profile.titles.join('、'),locations:profile.locations.join('、'),exclude:profile.exclude.join('、')});setError('');setInfo('');}},[open,profile]);
 async function readFile(file?:File){if(!file)return;setParsing(true);setError('');try{const text=await parseResume(file);setDraft(p=>({...p,resume_text:text}));setInfo('辨識完成，請核對下方文字後再儲存。');}catch(e){setError((e as Error).message||'解析失敗，請改貼文字。');}finally{setParsing(false);}}
 async function save(){setSaving(true);setError('');try{const p={...draft,...Object.fromEntries(Object.entries(words).map(([k,v])=>[k,v.split(/[,，、\n]+/).map(s=>s.trim()).filter(Boolean)]))} as Profile;await api('profile','PUT',p);onSaved(p);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 return <Dialog open={open} onOpenChange={v=>{if(!saving&&!parsing)onOpenChange(v);}}><DialogContent className="wide-dialog"><DialogHeader><DialogTitle>履歷與搜尋條件</DialogTitle><DialogDescription>網站上的設定是搜尋與媒合的唯一來源；儲存後，下次更新生效。</DialogDescription></DialogHeader><div className="settings-body"><div className="upload-area"><Upload size={22}/><div><label htmlFor="resume">選擇履歷 PDF／DOCX／TXT</label><p>上限 20 MiB · 原檔僅在瀏覽器解析 · 掃描圖片請改貼文字</p></div><Input id="resume" type="file" accept=".pdf,.docx,.txt" disabled={parsing||saving} onChange={e=>{void readFile(e.target.files?.[0]);e.target.value='';}}/></div>{parsing&&<p role="status">正在解析履歷…</p>}{error&&<p role="alert" className="error notice">{error}</p>}{info&&<p role="status" className="notice">{info}</p>}<label className="field">履歷確認文字<Textarea rows={7} value={draft.resume_text} maxLength={100000} onChange={e=>setDraft({...draft,resume_text:e.target.value})} placeholder="貼上履歷文字，或上傳後在此核對。"/><small>{draft.resume_text.length.toLocaleString()} / 100,000 字；確認儲存後會保存在雲端。</small></label><div className="fields-grid">{([['titles','期望職稱','例：前端工程師、軟體工程師'],['skills','技能','例：React、TypeScript、SQL'],['locations','地區','例：台北市、新北市；留白不限'],['exclude','排除關鍵字','例：保險、派遣']] as const).map(([k,label,placeholder])=><label className="field" key={k}>{label}<Input value={words[k]} onChange={e=>setWords({...words,[k]:e.target.value})} placeholder={placeholder}/></label>)}<label className="field">工作年資<Input type="number" min={0} max={100} value={draft.years??''} onChange={e=>setDraft({...draft,years:e.target.value===''?null:Number(e.target.value)})} placeholder="未填則不計分"/></label><label className="field">最低期望月薪（新台幣）<Input type="number" min={0} value={draft.min_salary} onChange={e=>setDraft({...draft,min_salary:Number(e.target.value)})}/></label></div><p className="list-caption">多個條件請用頓號或逗號分隔。媒合沿用技能、職稱、履歷描述、年資與薪資規則；欄位缺少時顯示待確認。</p><Button className="save-profile" onClick={save} disabled={saving||parsing}>{saving?<LoaderCircle className="spin"/>:<Check/>}確認並儲存文字與條件</Button></div></DialogContent></Dialog>;
}
