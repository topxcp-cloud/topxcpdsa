export async function syncCodeforces(handle:string){return getSyncRequest(handle)}
async function getSyncRequest(handle:string){const r=await fetch('/api/codeforces/sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({handle})});if(!r.ok)throw new Error('Codeforces sync failed');return r.json()}
