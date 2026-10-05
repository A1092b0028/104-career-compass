import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeResume, validateAnalysis, AnalysisError } from '../lib/gemini';
import { aiProfile, aiJob, aiResult } from './ai-fixture';
const clone=()=>structuredClone(aiResult);
const response=(value:unknown,finishReason='STOP')=>Response.json({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(value)}]}}]});
function semanticResult(match_type:'direct'|'equivalent'|'transferable',resumeEvidence:string,jobEvidence:string,skill:string,score=80){
 const result=clone();
 result.breakdown.skills={score,reason:'依原文證據判斷能力關係。',match_type,resume_evidence:[resumeEvidence],job_evidence:[jobEvidence]};
 result.breakdown.experience={score:0,reason:'資料不足。',match_type:'missing',resume_evidence:[],job_evidence:[]};
 result.breakdown.projects={score:0,reason:'資料不足。',match_type:'missing',resume_evidence:[],job_evidence:[]};
 result.breakdown.education_other={score:0,reason:'資料不足。',match_type:'missing',resume_evidence:[],job_evidence:[]};
 result.strengths=[];result.matched_skills=[{skill,match_type,explanation:'依兩側原文判斷關係，不宣稱履歷未記載的技能。',resume_evidence:resumeEvidence,job_evidence:jobEvidence}];result.missing_skills=[];
 return result;
}
test('AI scores use 40/25/20/15 independently of model total',()=>{
 const r=validateAnalysis(clone(),aiProfile.resume_text,aiJob.description);assert.equal(r.match_score,58);assert.equal(r.resume_score,75);
 for(const field of ['resume_score','match_score'] as const){const v=clone();v[field]=101;assert.throws(()=>validateAnalysis(v,aiProfile.resume_text,aiJob.description));}
 assert.throws(()=>validateAnalysis({...clone(),unexpected:'x'},aiProfile.resume_text,aiJob.description));
});
test('AI rejects unsupported resume evidence and missing skills already present',()=>{
 const bad=clone();bad.strengths[0].evidence='帶領 10 人 AWS 團隊';assert.throws(()=>validateAnalysis(bad,aiProfile.resume_text,aiJob.description));
 const missing=clone();missing.missing_skills[0].skill='Python';assert.throws(()=>validateAnalysis(missing,aiProfile.resume_text,aiJob.description));
 const ungrounded=clone();ungrounded.breakdown.projects.resume_evidence=[];assert.throws(()=>validateAnalysis(ungrounded,aiProfile.resume_text,aiJob.description));
});
test('AI accepts direct, equivalent and transferable matches with exact source evidence',()=>{
 const cases=[
  ['direct','使用 TensorFlow 建立模型','需要 TensorFlow 模型開發經驗','TensorFlow',90],
  ['equivalent','具備人工智慧模型開發經驗','需要 AI 模型開發經驗','AI',85],
  ['transferable','使用 TensorFlow 建立模型','需要 PyTorch 模型開發經驗','PyTorch',55],
 ] as const;
 for(const [type,resume,job,skill,score] of cases){
  const result=validateAnalysis(semanticResult(type,resume,job,skill,score),resume,job);
  assert.equal(result.matched_skills[0].match_type,type);
 }
});
test('AI accepts CNN project evidence for related deep-learning experience but caps transferable score',()=>{
 const resume='使用 TensorFlow 建立 CNN 語音辨識模型';
 const job='需要深度學習模型開發經驗';
 const related=semanticResult('transferable',resume,job,'深度學習模型開發',60);
 related.breakdown.experience=related.breakdown.skills;related.breakdown.skills={score:0,reason:'資料不足。',match_type:'missing',resume_evidence:[],job_evidence:[]};
 assert.equal(validateAnalysis(related,resume,job).breakdown.experience.score,60);
 related.breakdown.experience.score=61;assert.throws(()=>validateAnalysis(related,resume,job));
});
test('AI marks unsupported skills missing and rejects positive matches without resume evidence',()=>{
 const resume='具備後端 API 維護經驗';
 const job='需要 PyTorch 模型開發經驗';
 const missing=semanticResult('direct',resume,job,'PyTorch');
 missing.breakdown.skills={score:0,reason:'履歷沒有足夠證據。',match_type:'missing',resume_evidence:[],job_evidence:[job]};
 missing.matched_skills=[];missing.missing_skills=[{skill:'PyTorch',match_type:'missing',job_evidence:job}];
 assert.equal(validateAnalysis(missing,resume,job).missing_skills[0].match_type,'missing');
 const invented=semanticResult('transferable','使用 TensorFlow 建立模型',job,'PyTorch',50);
 invented.matched_skills[0].resume_evidence='熟悉 PyTorch';
 assert.throws(()=>validateAnalysis(invented,'使用 TensorFlow 建立模型',job));
});
test('AI evidence accepts Unicode compatibility forms produced by PDF parsing',()=>{
 const resume='具備電⼦電路板組裝與焊接實務經驗。',evidence='具備電子電路板組裝與焊接實務經驗。',job='需要電子電路板組裝經驗';
 const result=semanticResult('direct',evidence,job,'電子電路板組裝',90);result.strengths=[{point:'具備電路板組裝經驗。',evidence}];
 assert.equal(validateAnalysis(result,resume,job).matched_skills[0].match_type,'direct');
});
test('Gemini REST uses server key header, structured JSON and saved resume/job',async()=>{
 let calls=0;
 const fetcher:typeof fetch=async(input,init)=>{calls++;assert.equal(String(input).includes('secret-test-key'),false);assert.equal(new Headers(init?.headers).get('x-goog-api-key'),'secret-test-key');const body=JSON.parse(String(init?.body));assert.equal(body.generationConfig.responseMimeType,'application/json');assert.ok(body.generationConfig.responseJsonSchema.required.includes('matched_skills'));assert.ok(body.contents[0].parts[0].text.includes(aiProfile.resume_text));assert.ok(body.contents[0].parts[0].text.includes(aiJob.description));assert.equal(body.contents[0].parts[0].text.includes('secret-test-key'),false);return response(aiResult);};
 const r=await analyzeResume(aiProfile,aiJob,'secret-test-key',undefined,fetcher);assert.equal(r.match_score,58);assert.equal(calls,1);
 await assert.rejects(()=>analyzeResume(aiProfile,aiJob,undefined,undefined,fetcher),(e:unknown)=>e instanceof AnalysisError&&e.status===503);assert.equal(calls,1);
 await assert.rejects(()=>analyzeResume({...aiProfile,resume_text:' '},aiJob,'key',undefined,fetcher),(e:unknown)=>e instanceof AnalysisError&&e.status===400);assert.equal(calls,1);
});
test('Gemini retries one ungrounded answer with exact-quote correction',async()=>{
 let calls=0;const invalid=clone();invalid.breakdown.skills.resume_evidence=['熟悉 Python 與 SQL'];invalid.strengths[0].evidence='熟悉 Python 與 SQL';
 const fetcher:typeof fetch=async(_input,init)=>{
  calls++;const contents=JSON.parse(String(init?.body)).contents;
  if(calls===1){assert.equal(contents.length,1);return response(invalid);}
  assert.equal(contents.length,3);assert.equal(contents[1].role,'model');assert.equal(contents[2].role,'user');assert.match(contents[2].parts[0].text,/逐字/);return response(aiResult);
 };
 assert.equal((await analyzeResume(aiProfile,aiJob,'key',undefined,fetcher)).match_score,58);assert.equal(calls,2);
 calls=0;await assert.rejects(()=>analyzeResume(aiProfile,aiJob,'key',undefined,async()=>{calls++;return response(invalid);}),(e:unknown)=>e instanceof AnalysisError&&e.status===502);assert.equal(calls,3);
});
test('Gemini can recover when the second answer still fails evidence validation',async()=>{
 let calls=0;const invalid=clone();invalid.breakdown.skills.resume_evidence=['熟悉 Python 與 SQL'];
 const result=await analyzeResume(aiProfile,aiJob,'key',undefined,async()=>response(++calls<3?invalid:aiResult));
 assert.equal(result.match_score,58);assert.equal(calls,3);
});
test('Gemini upstream errors, blocked/truncated responses, malformed JSON and abort are safe failures',async()=>{
 for(const status of [400,401,403,429,500]){await assert.rejects(()=>analyzeResume(aiProfile,aiJob,'secret-test-key',undefined,async()=>Response.json({error:{message:'secret-test-key'}},{status})),(e:unknown)=>e instanceof AnalysisError&&!e.message.includes('secret-test-key'));}
 for(const r of [response(aiResult,'MAX_TOKENS'),Response.json({promptFeedback:{blockReason:'SAFETY'}}),Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'not JSON'}]}}]})]){await assert.rejects(()=>analyzeResume(aiProfile,aiJob,'key',undefined,async()=>r),AnalysisError);}
 await assert.rejects(()=>analyzeResume(aiProfile,aiJob,'key',undefined,async()=>{throw new DOMException('timed out','TimeoutError');}),(e:unknown)=>e instanceof AnalysisError&&e.status===504);
});
test('Gemini schema stays structural while server validates bounds and extra fields',async()=>{
 const provider:typeof fetch=async(input,init)=>{
  const schema=JSON.parse(String(init?.body)).generationConfig.responseJsonSchema;
  // Reproduce the live API rejecting the combined schema constraints with INVALID_ARGUMENT.
  if(/"(maxItems|minimum|maximum|additionalProperties)"/.test(JSON.stringify(schema)))return Response.json({error:{status:'INVALID_ARGUMENT'}},{status:400});
  return response(aiResult);
 };
 assert.equal((await analyzeResume(aiProfile,aiJob,'key',undefined,provider)).match_score,58);
});
