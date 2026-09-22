/* Read rendered public cards only. Never submit an application or read credentials. */
(()=>{
 const jobs=[],seen=new Set();
 for(const a of document.querySelectorAll('h2 a[href]')){
  let u;try{u=new URL(a.href,location.href);if(u.origin==='https://r.104.com.tw'&&u.pathname==='/m104'&&u.searchParams.has('url'))u=new URL(u.searchParams.get('url'));}catch{continue;}
  if(u.origin!=='https://www.104.com.tw'||!/^\/job\/[a-z0-9]+$/i.test(u.pathname)||!a.getClientRects().length)continue;
  let card=a.parentElement;while(card&&card!==document.body&&!card.querySelector('a[href*="/company/"]'))card=card.parentElement;
  if(!card||card===document.body||card.querySelectorAll('h2 a[href]').length!==1)continue;
  const links=[...card.querySelectorAll('a[href]')],company=links.find(x=>/\/company\/[a-z0-9]+(?:\?|$)/i.test(x.href));
  const area=links.find(x=>new URL(x.href,location.href).searchParams.has('area')),exp=links.find(x=>new URL(x.href,location.href).searchParams.has('jobexp'));
  const pay=links.find(x=>/^(月薪|年薪|時薪|日薪|待遇面議)/.test(x.innerText.trim())),salary=pay?new URL(pay.href,location.href).searchParams:null,monthly=salary?.get('sctp')==='M';
  const years=exp?.innerText.match(/(\d+)年以上/),url=u.origin+u.pathname;
  if(!company||seen.has(url)||!a.innerText.trim())continue;seen.add(url);
  // A month/day alone has no known year. Preserve unknown rather than inventing a date.
  const time=card.querySelector('time[datetime]')?.getAttribute('datetime')||'';
  const full=/^\d{4}-\d{2}-\d{2}/.test(time)?time.slice(0,10):'';
  const publish_time=full&&!Number.isNaN(Date.parse(full))&&new Date(full).toISOString().slice(0,10)===full&&full<=new Date().toISOString().slice(0,10)?full:'';
  const salaryNumber=k=>monthly&&salary.has(k)&&Number.isFinite(Number(salary.get(k)))?Number(salary.get(k)):null;
  jobs.push({title:a.innerText.trim().slice(0,300),company:company.innerText.trim().slice(0,300),location:area?.innerText.trim().slice(0,300)||'',url,publish_time,
   description:('【104 搜尋頁摘要，完整條件請開啟原始職缺確認】\n'+card.innerText).slice(0,6000),salary_text:pay?.innerText.trim().slice(0,200)||'',salary_min:salaryNumber('scmin'),salary_max:salaryNumber('scmax'),years_required:years?Number(years[1]):exp?.innerText.includes('不拘')?0:null});
 }
 return {jobs,emptyConfirmed:jobs.length===0&&/沒有符合|查無符合|沒有找到符合|找不到符合/.test(document.body.innerText)};
})()
