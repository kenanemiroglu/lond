
// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}


/* Router */
    const routes = ["overview","orders","products","costs","commission","mock","profiles","reports"];
    function setRoute(){
      const hash = (location.hash||"#/overview");
      document.querySelectorAll('.nav button').forEach(b=>{b.classList.toggle('active', b.dataset.route===hash)});
      const id = hash.replace('#/','');
      routes.forEach(r=>document.getElementById(r).classList.toggle('active', r===id));
    }
    window.addEventListener('hashchange', setRoute);
    document.getElementById('nav').addEventListener('click', (e)=>{const b=e.target.closest('button'); if(b){location.hash=b.dataset.route}});
    setRoute();

    const apiBase = '';

    /* Health ping */
    async function ping(){
      try{await fetch(apiBase + '/api/export/daily.csv', { method:'HEAD' }); document.getElementById('apiState').textContent='çalışıyor';}
      catch{document.getElementById('apiState').textContent='erişilemiyor';}
    }
    ping();

    /* Overview data (example: uses existing endpoints) */
    async function loadOverview(){
      try{
        // Pull last 30 days chart (reuse daily.csv)
        const r = await fetch('/api/export/daily.csv');
        const txt = await r.text();
        const rows = txt.trim().split(/\n/).slice(1).map(l=>l.split(','));
        const data = rows.slice(-30).map(r=>({date:r[0], revenue_net:+r[3]||0, profit:+r[10]||0}));
        // KPIs
        const sum = (k)=> data.reduce((a,b)=>a+(b[k]||0),0);
        document.getElementById('kpi_revenue').textContent = sum('revenue_net').toLocaleString('tr-TR');
        document.getElementById('kpi_profit').textContent = sum('profit').toLocaleString('tr-TR');
        // fake rates from last 7 entries
        const last7 = data.slice(-7);
        const ret = Math.min(25, Math.round((Math.random()*3+5)*10)/10); // placeholder if not available
        const can = Math.min(15, Math.round((Math.random()*1+2)*10)/10);
        document.getElementById('kpi_return').textContent = ret;
        document.getElementById('kpi_cancel').textContent = can;
        drawChart('chart', data);

        // Recent orders (reuse products.csv for demo, replace with /api/orders if available)
        const r2 = await fetch('/api/export/products.csv');
        const t2 = await r2.text();
        const rs = t2.trim().split(/\n/).slice(1).map(l=>l.split(','));
        const tbody = document.querySelector('#tbl_orders tbody');
        tbody.innerHTML = '';
        rs.slice(0,20).forEach(r=>{
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${r[0]||'-'}</td><td>${r[1]||'-'}</td><td>${r[2]||'-'}</td><td>${(+r[3]||0).toLocaleString('tr-TR')}</td><td>${(+r[4]||0).toLocaleString('tr-TR')}</td>`;
          tbody.appendChild(tr);
        });
      }catch(e){console.error(e)}
    }
    loadOverview();

    /* Orders list */
    document.getElementById('btn_export_daily').addEventListener('click',()=>{location.href='/api/export/daily.csv'});

    /* Products list */
    async function loadProducts(){
      try{
        const r = await fetch('/api/export/products.csv');
        const txt = await r.text();
        const rows = txt.trim().split(/\n/).slice(1).map(l=>l.split(','));
        const tbody = document.querySelector('#products_list tbody');
        tbody.innerHTML='';
        rows.forEach(r=>{
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${r[1]}</td><td>${r[2]}</td><td>${r[5]||'-'}</td><td>${(+r[6]||0).toLocaleString('tr-TR')}</td>`;
          tbody.appendChild(tr);
        })
      }catch(e){console.error(e)}
    }
    loadProducts();

    /* Costs upload */
    document.getElementById('btn_cost_upload').addEventListener('click', async ()=>{
      const f = document.getElementById('costFile').files[0];
      if(!f) return alert('CSV seçin');
      const fd=new FormData(); fd.append('file', f);
      const r = await fetch('/api/costs/upload', { method:'POST', body:fd });
      const j = await r.json().catch(()=>({}));
      document.getElementById('costStatus').textContent = j.ok ? `✓ ${j.inserted} satır` : `Hata: ${j.error||'bilinmiyor'}`;
    });

    /* Commission CRUD */
    document.getElementById('addRule').addEventListener('click', async()=>{
      const shopId = (document.getElementById('shopId').value||'').trim();
      const category = (document.getElementById('category').value||'').trim();
      const rate = Number(document.getElementById('rate').value||0);
      if(!shopId||!category) return alert('Shop ID ve kategori gerekli');
      const r = await fetch(`/api/commission/${encodeURIComponent(shopId)}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ category, rate_pct: rate })});
      const j = await r.json().catch(()=>({}));
      alert(j.ok? 'Kural kaydedildi':'Hata: '+(j.error||'bilinmiyor'));
    });
    document.getElementById('loadRules').addEventListener('click', async()=>{
      const shopId = (document.getElementById('shopId').value||'').trim();
      if(!shopId) return alert('Shop ID gerekli');
      const r = await fetch(`/api/commission/${encodeURIComponent(shopId)}`);
      const j = await r.json().catch(()=>[]);
      document.getElementById('rulesOut').textContent = JSON.stringify(j,null,2);
    });

    /* Mock generate */
    document.getElementById('btn_mock_start').addEventListener('click', async()=>{
      const b = {
        days: +document.getElementById('days').value||30,
        per_day: +document.getElementById('per_day').value||50,
        return_rate: (+document.getElementById('return_rate').value||7)/100,
        cancel_rate: (+document.getElementById('cancel_rate').value||2)/100,
        coupon_rate: (+document.getElementById('coupon_rate').value||10)/100,
      };
      const r = await fetch('/api/mock/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(b)});
      const j = await r.json().catch(()=>({}));
      document.getElementById('mockStatus').textContent = j.ok? `✓ İş kuyruğuna alındı (${b.days} gün)`: `Hata: ${j.error||'bilinmiyor'}`;
    });

    /* Profiles */
    document.getElementById('saveProfile').addEventListener('click', async()=>{
      const name=(document.getElementById('profName').value||'').trim();
      let params={}; try{params=JSON.parse(document.getElementById('profParams').value||'{}')}catch(e){return alert('JSON geçersiz')}
      const r = await fetch('/api/mock/profiles', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, params })});
      const j = await r.json().catch(()=>({}));
      alert(j.ok? 'Kaydedildi':'Hata: '+(j.error||'bilinmiyor'));
    });
    document.getElementById('loadProfiles').addEventListener('click', async()=>{
      const r = await fetch('/api/mock/profiles');
      const j = await r.json().catch(()=>[]);
      document.getElementById('profilesOut').textContent = JSON.stringify(j,null,2);
    });
    document.getElementById('runProfile').addEventListener('click', async()=>{
      const profileName=(document.getElementById('runProfileName').value||'').trim();
      const from=(document.getElementById('runFrom').value||'').trim();
      const to=(document.getElementById('runTo').value||'').trim();
      if(!profileName||!from||!to) return alert('Eksik alan var');
      const r = await fetch('/api/mock/run-profile', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ profileName, from, to })});
      const j = await r.json().catch(()=>({}));
      document.getElementById('runStatus').textContent = j.ok? `✓ Kuyruğa ${j.enqueued} gün eklendi`:`Hata: ${j.error||'bilinmiyor'}`;
    });

    /* Tiny chart */
    function drawChart(id, data){
      const c = document.getElementById(id); if(!c) return; const ctx=c.getContext('2d');
      const W=c.width=c.clientWidth, H=c.height=220, pad=28;
      ctx.clearRect(0,0,W,H);
      const xs=(i,n)=> pad + i*((W-2*pad)/Math.max(1,n-1));
      const getYs=(key)=>{const vals=data.map(d=>d[key]); const max=Math.max(1,...vals); return vals.map(v=> H-pad - (v/max)*(H-2*pad));};
      const x=data.map((_,i)=>xs(i,data.length)); const y1=getYs('revenue_net'), y2=getYs('profit');
      // axes
      ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.stroke();
      // line1 revenue
      ctx.strokeStyle='rgba(108,140,255,.95)'; ctx.lineWidth=2; ctx.beginPath(); x.forEach((xi,i)=>{i?ctx.lineTo(xi,y1[i]):ctx.moveTo(xi,y1[i])}); ctx.stroke();
      // line2 profit
      ctx.strokeStyle='rgba(61,217,184,.95)'; ctx.lineWidth=2; ctx.beginPath(); x.forEach((xi,i)=>{i?ctx.lineTo(xi,y2[i]):ctx.moveTo(xi,y2[i])}); ctx.stroke();
    }