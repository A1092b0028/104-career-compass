/* Injected only on the exact Site origin declared in the packaged manifest. */
window.addEventListener('message', event => {
  if(event.source!==window || event.origin!==location.origin) return;
  const msg=event.data;
  if(!['COMPASS_PING','COMPASS_REFRESH'].includes(msg?.type) || typeof msg.id!=='string') return;
  const reply=result=>window.postMessage({type:msg.type==='COMPASS_PING'?'COMPASS_READY':'COMPASS_RESULT',id:msg.id,...result},location.origin);
  try{chrome.runtime.sendMessage({type:msg.type,id:msg.id,profile:msg.profile},result=>{
    const error=chrome.runtime.lastError?.message;
    reply(error||!result?{error:'更新助手連線中斷，請到 Chrome／Edge 擴充功能頁重新載入助手，再重新整理網站。'}:result);
  });}catch{reply({error:'更新助手已重新載入，請重新整理網站後重試。'});}
});
chrome.runtime.onMessage.addListener(msg=>{
  if(msg?.type==='COMPASS_PROGRESS') window.postMessage(msg,location.origin);
});
