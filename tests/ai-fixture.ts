import { emptyProfile, type Job } from '../lib/matching';
export const aiProfile={...emptyProfile,resume_text:'Python、SQL 開發工程師，2 年 API 維護經驗。專案：使用 Python 建立資料分析 API。學歷：資訊工程學士。',skills:['Python','SQL'],years:2};
export const aiJob:Job={id:'aitest',title:'Python 工程師',company:'合成測試公司',location:'台北市',description:'技能：Python、SQL、AWS。經驗：2 年 API 維護經驗。專案：資料分析 API。學歷：資訊工程學士。',url:'https://www.104.com.tw/job/aitest',salary_text:'月薪 45,000',salary_min:45000,salary_max:60000,years_required:2,publish_time:''};
export const aiResult={resume_score:75,match_score:99,breakdown:{
 skills:{score:80,reason:'履歷呈現 Python 與 SQL，AWS 未呈現。',match_type:'direct',resume_evidence:['Python、SQL 開發工程師'],job_evidence:['技能：Python、SQL、AWS']},
 experience:{score:60,reason:'履歷呈現 API 維護經驗。',match_type:'direct',resume_evidence:['2 年 API 維護經驗'],job_evidence:['2 年 API 維護經驗']},
 projects:{score:40,reason:'有資料分析 API 專案，可補充成果。',match_type:'direct',resume_evidence:['使用 Python 建立資料分析 API'],job_evidence:['資料分析 API']},
 education_other:{score:20,reason:'履歷呈現相關學歷。',match_type:'direct',resume_evidence:['資訊工程學士'],job_evidence:['資訊工程學士']},
},strengths:[{point:'具備 Python 開發經驗。',evidence:'Python、SQL 開發工程師'}],weaknesses:['履歷未呈現專案量化成果。'],matched_skills:[{skill:'Python',match_type:'direct',explanation:'履歷與職缺都直接提到 Python。',resume_evidence:'Python、SQL 開發工程師',job_evidence:'技能：Python、SQL、AWS'},{skill:'SQL',match_type:'direct',explanation:'履歷與職缺都直接提到 SQL。',resume_evidence:'Python、SQL 開發工程師',job_evidence:'技能：Python、SQL、AWS'}],missing_skills:[{skill:'AWS',match_type:'missing',job_evidence:'技能：Python、SQL、AWS'}],recommendations:['若有真實的專案成果，可補充可驗證的量化數據；不要加入沒有做過的 AWS 經驗。']};
