const active=new Set();
const allowed=chrome.runtime.getManifest().content_scripts.flatMap(x=>x.matches).map(x=>new URL(x.replace(/\*$/,'')).origin);
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(msg?.type!=='COMPASS_REFRESH' || sender.tab?.id===undefined || sender.frameId!==0 || !sender.url || !allowed.includes(new URL(sender.url).origin)) return;
  if(active.has(sender.tab.id)){reply({error:'此分頁已有更新正在進行。'});return;}
  active.add(sender.tab.id);
  refresh(msg.profile,sender.tab.id,msg.id).then(reply).catch(e=>reply({error:e.message})).finally(()=>active.delete(sender.tab.id));
  return true;
});
async function refresh(p,siteTab,id){
  if(!p || !Number.isInteger(p.count)||p.count<1||p.count>50 || !Array.isArray(p.titles)||!p.titles.length||!Array.isArray(p.locations)) throw Error('請回網站儲存搜尋條件。');
  const url=new URL('https://www.104.com.tw/jobs/search/');
  url.searchParams.set('keyword',p.titles.join(' '));url.searchParams.set('order','11');url.searchParams.set('asc','0');
  const codes={'台北市':'6001001000','新北市':'6001002000','宜蘭縣':'6001003000','基隆市':'6001004000','桃園市':'6001005000','新竹縣':'6001006000','新竹市':'6001007000','苗栗縣':'6001008000','台中市':'6001009000','彰化縣':'6001010000','南投縣':'6001011000','雲林縣':'6001012000','嘉義縣':'6001013000','嘉義市':'6001014000','台南市':'6001015000','高雄市':'6001016000','屏東縣':'6001017000','台東縣':'6001018000','花蓮縣':'6001019000','澎湖縣':'6001020000','金門縣':'6001021000','連江縣':'6001022000'};
  const areas=p.locations.map(x=>codes[x.replaceAll('臺','台')]).filter(Boolean);
  if(areas.length===p.locations.length&&areas.length) url.searchParams.set('area',areas.join(','));
  const progress=async state=>{try{await chrome.tabs.sendMessage(siteTab,{type:'COMPASS_PROGRESS',id,state});}catch{throw Error('網站分頁已關閉，請重新更新。');}};
  const tab=await chrome.tabs.create({url:url.href,active:false}), collected=new Map();let raw=0;
  await progress('104 頁面讀取中');
  for(let page=1;page<=3;page++){
    if(page>1){url.searchParams.set('page',String(page));await chrome.tabs.update(tab.id,{url:url.href});}
    const deadline=Date.now()+60000;let read=false;
    while(Date.now()<deadline){
      await new Promise(r=>setTimeout(r,1500));const current=await chrome.tabs.get(tab.id);
      if(current.status!=='complete')continue;
      const [probe]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>({title:document.title,text:document.body.innerText.slice(0,5000),url:location.href})});
      if(/Just a moment|Verify you are human|驗證您是人類|請稍候|人機驗證|安全驗證/i.test(probe.result.title+' '+probe.result.text)){
        await chrome.tabs.update(tab.id,{active:true});await progress('等待使用者完成驗證');throw Error('請在 104 完成驗證後重新更新。');
      }
      const actual=new URL(probe.result.url);
      if(actual.origin!==url.origin||actual.pathname!==url.pathname||['keyword','area','page'].some(k=>(actual.searchParams.get(k)||'')!==(url.searchParams.get(k)||''))) throw Error('104 搜尋條件已變更，請回網站重新更新。');
      const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},files:['collector.js']});
      const data=result.result;
      if(data.jobs.length){
        raw+=data.jobs.length; const before=collected.size;
        for(const j of data.jobs)collected.set(j.url,j);
        read=true;
        if(collected.size>=p.count||page===3||before===collected.size){await chrome.tabs.remove(tab.id);return {jobs:[...collected.values()].slice(0,p.count),raw};}
        break;
      }
      if(data.emptyConfirmed){await chrome.tabs.remove(tab.id);return {jobs:[...collected.values()].slice(0,p.count),raw,emptyConfirmed:true};}
    }
    if(!read)throw Error('60 秒內未讀到職缺；已保留 104 分頁，請檢查結果後重試。');
  }
  throw Error('職缺讀取未完成。');
}
