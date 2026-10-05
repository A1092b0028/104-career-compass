'use client';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Analysis } from '@/lib/gemini';

const matchLabels={direct:'直接符合',equivalent:'等價能力',transferable:'相關能力',missing:'未呈現'} as const;

export default function AiAnalysis({jobId,enabled}:{jobId:string;enabled:boolean}){
 const [result,setResult]=useState<Analysis|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();},[]);
 async function analyze(){
  if(active.current)return;
  const controller=new AbortController();active.current=controller;setLoading(true);setError('');setResult(null);
  try{
   const response=await fetch('/api/jobs/'+encodeURIComponent(jobId)+'/analysis',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:'{}',signal:controller.signal});
   const data=await response.json() as Analysis & {error?:string};
   if(!response.ok)throw Error(data.error||'AI 分析失敗，請重試。');
   if(!controller.signal.aborted)setResult(data);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'AI 分析失敗，請重試。');}
  finally{if(!controller.signal.aborted){active.current=null;setLoading(false);}}
 }
 return <section className="ai-analysis" aria-label="Gemini 履歷與職缺分析"><h3>AI 履歷與職缺分析</h3>
  <p className="list-caption">按下分析會將已儲存的履歷確認文字與此職缺摘要傳送至 Google Gemini。結果僅在本次視窗顯示，供你修改履歷時參考。</p>
  {!enabled&&<p className="notice">請先儲存履歷確認文字，再進行 AI 分析。</p>}
  <Button variant="outline" onClick={analyze} disabled={!enabled||loading}>{loading?<LoaderCircle className="spin"/>:<Sparkles/>}{loading?'分析中…':result||error?'重新分析':'AI 分析'}</Button>
  {loading&&<p role="status">正在核對履歷與職缺資料…</p>}
  {error&&<p className="notice error" role="alert">{error}</p>}
  {result&&<div role="region" aria-label="AI 分析結果">
   <div className="fields-grid ai-scores"><div className="ai-score"><span>履歷分數</span><strong>{result.resume_score} / 100</strong></div><div className="ai-score"><span>AI 職缺媒合分數</span><strong>{result.match_score} / 100</strong></div></div>
   <p className="list-caption">履歷分數反映文字呈現；AI 媒合分數依技能 40%、經驗 25%、專案 20%、學歷與其他條件 15% 計算。未呈現的資訊不算符合，分數不代表錄取機率。</p>
   <h3>評分依據</h3>{([['skills','技能'],['experience','經驗'],['projects','專案'],['education_other','學歷與其他條件']] as const).map(([key,label])=><div key={key}><p><strong>{label}：{result.breakdown[key].score} / 100</strong> · {matchLabels[result.breakdown[key].match_type]} · {result.breakdown[key].reason}</p>{result.breakdown[key].resume_evidence.length>0&&<details><summary>履歷與職缺證據</summary><p>履歷：{result.breakdown[key].resume_evidence.join('；')}</p><p>職缺：{result.breakdown[key].job_evidence.join('；')}</p></details>}</div>)}
   <h3>符合技能</h3>{result.matched_skills.length?result.matched_skills.map((s,i)=><p key={i}><strong>{s.skill}</strong> · {matchLabels[s.match_type]}<br/>{s.explanation}<br/><small>履歷證據：{s.resume_evidence}；職缺證據：{s.job_evidence}</small></p>):<p>目前文字中沒有可核對的符合技能。</p>}
   <h3>履歷未呈現的職缺技能</h3>{result.missing_skills.length?result.missing_skills.map((s,i)=><p key={i}><strong>{s.skill}</strong> · 職缺：{s.job_evidence}</p>):<p>目前摘要中沒有其他可核對的未呈現技能。</p>}<p className="list-caption">未呈現不代表不會。職缺資料目前只有搜尋頁摘要，完整條件仍請以 104 為準。</p>
   <h3>履歷優點</h3>{result.strengths.length?result.strengths.map((s,i)=><p key={i}>{s.point}<br/><small>履歷證據：{s.evidence}</small></p>):<p>資料不足，尚無可核對的優點。</p>}
   <h3>履歷不足</h3>{result.weaknesses.length?result.weaknesses.map((s,i)=><p key={i}>{s}</p>):<p>目前未指出其他不足。</p>}
   <h3>AI 改善建議</h3>{result.recommendations.length?result.recommendations.map((s,i)=><p key={i}>{i+1}. {s}</p>):<p>資料不足，尚無具體建議。</p>}
  </div>}
 </section>;
}
