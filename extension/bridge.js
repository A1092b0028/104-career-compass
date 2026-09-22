/* Injected only on the exact Site origin declared in the packaged manifest. */
window.addEventListener('message', event => {
  if(event.source!==window || event.origin!==location.origin) return;
  const msg=event.data;
  if(msg?.type==='COMPASS_PING') {
    window.postMessage({type:'COMPASS_READY',id:msg.id,version:chrome.runtime.getManifest().version},location.origin); return;
  }
  if(msg?.type!=='COMPASS_REFRESH' || typeof msg.id!=='string') return;
  chrome.runtime.sendMessage({type:'COMPASS_REFRESH',id:msg.id,profile:msg.profile},result=>{
    const error=chrome.runtime.lastError?.message;
    window.postMessage({type:'COMPASS_RESULT',id:msg.id,...(error?{error:'更新助手中斷，請重新載入網站後重試。'}:result)},location.origin);
  });
});
chrome.runtime.onMessage.addListener(msg=>{
  if(msg?.type==='COMPASS_PROGRESS') window.postMessage(msg,location.origin);
});
