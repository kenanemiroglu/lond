
// Simple in-memory store (resets on reload)
const state = {
  commissionRules: {}, // shopId -> [{category, rate_pct}]
  profiles: {},        // name -> params
};

// Utility: CSV builders
function csvDaily(days=30){
  // headers: date,total,orders,revenue_net, ... profit (col 10 per original usage)
  const lines = ["date,total,orders,revenue_net,x1,x2,x3,x4,x5,profit_extra,profit"];
  const today = new Date();
  for(let i=days-1;i>=0;i--){
    const d = new Date(today); d.setDate(d.getDate()-i);
    const date = d.toISOString().slice(0,10);
    const orders = Math.floor(40 + Math.random()*80);
    const revenue = Math.round(30000 + Math.random()*40000);
    const profit = Math.round(revenue * (0.12 + Math.random()*0.1));
    lines.push([date,revenue,orders,revenue,0,0,0,0,0,0,profit].join(","));
  }
  return lines.join("\n");
}
function csvProducts(n=50){
  const headers = "date,sku,title,net,profit,category,unit_cost";
  const cats = ["Giyim","Aksesuar","Elektronik","Ev","Spor"];
  const rows = [headers];
  for(let i=0;i<n;i++){
    const sku = "SKU"+String(1000+i);
    const title = "Ürün "+(i+1);
    const net = Math.round(200 + Math.random()*1500);
    const profit = Math.round(net*(0.1+Math.random()*0.2));
    const cat = cats[i%cats.length];
    const unit = Math.round(50 + Math.random()*400);
    rows.push([new Date().toISOString().slice(0,10), sku, title, net, profit, cat, unit].join(","));
  }
  return rows.join("\n");
}

self.addEventListener('install', (e)=>{ self.skipWaiting(); });
self.addEventListener('activate', (e)=>{ self.clients.claim(); });

self.addEventListener('fetch', (event)=>{
  const url = new URL(event.request.url);
  if(!url.pathname.startsWith('/api/')) return;

  event.respondWith(handleApi(url, event.request));
});

async function handleApi(url, req){
  const { pathname } = url;

  // GET /api/export/daily.csv
  if (pathname === '/api/export/daily.csv') {
    return new Response(csvDaily(60), { headers: {'Content-Type':'text/csv; charset=utf-8'} });
  }
  // GET /api/export/products.csv
  if (pathname === '/api/export/products.csv') {
    return new Response(csvProducts(100), { headers: {'Content-Type':'text/csv; charset=utf-8'} });
  }
  // POST /api/costs/upload
  if (pathname === '/api/costs/upload' && req.method === 'POST') {
    return new Response(JSON.stringify({ ok:true, inserted: 42 }), { headers: {'Content-Type':'application/json'} });
  }
  // Commission GET/POST: /api/commission/:shopId
  const m = pathname.match(/^\/api\/commission\/(.+)$/);
  if (m){
    const shopId = decodeURIComponent(m[1]);
    if (req.method === 'GET') {
      const rules = state.commissionRules[shopId] || [];
      return new Response(JSON.stringify(rules), { headers: {'Content-Type':'application/json'} });
    } else if (req.method === 'POST') {
      const body = await req.json().catch(()=>({}));
      state.commissionRules[shopId] = state.commissionRules[shopId] || [];
      // upsert by category
      const ex = state.commissionRules[shopId].find(r=>r.category===body.category);
      if (ex) { ex.rate_pct = body.rate_pct; } else { state.commissionRules[shopId].push({category:body.category, rate_pct: body.rate_pct}); }
      return new Response(JSON.stringify({ ok:true }), { headers: {'Content-Type':'application/json'} });
    }
  }
  // Mock generate
  if (pathname === '/api/mock/generate' && req.method === 'POST') {
    const b = await req.json().catch(()=>({days:30}));
    return new Response(JSON.stringify({ ok:true, enqueued: b.days }), { headers: {'Content-Type':'application/json'} });
  }
  // Profiles GET/POST
  if (pathname === '/api/mock/profiles') {
    if (req.method === 'GET') {
      return new Response(JSON.stringify(Object.entries(state.profiles).map(([name,params])=>({name,params}))), { headers: {'Content-Type':'application/json'} });
    } else if (req.method === 'POST') {
      const b = await req.json().catch(()=>({}));
      if(b.name){ state.profiles[b.name] = b.params || {}; return new Response(JSON.stringify({ ok:true })); }
      return new Response(JSON.stringify({ ok:false, error:'name required' }), { status:400 });
    }
  }
  // Run profile
  if (pathname === '/api/mock/run-profile' && req.method === 'POST') {
    const b = await req.json().catch(()=>({from:'',to:'',profileName:''}));
    return new Response(JSON.stringify({ ok:true, enqueued:  (Math.max(0, (new Date(b.to)-new Date(b.from))/86400000)|0)  }), { headers: {'Content-Type':'application/json'} });
  }

  return new Response(JSON.stringify({ error:'Not Implemented'}), { status:404, headers:{'Content-Type':'application/json'} });
}
