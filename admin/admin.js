const SUPABASE_URL = "https://nhqknvtmaounbkjeltdd.supabase.co";
const SUPABASE_KEY = "sb_publishable_1LGbqugNeswqSVcFHLiZAw_YcY7Y7xu";
const ADMIN_API = `${SUPABASE_URL}/functions/v1/admin-api`;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let currentView = "dashboard";

async function token(){ const {data}=await sb.auth.getSession(); return data.session?.access_token || ""; }
async function api(action, method="GET", body=null){
  const t=await token();
  const r=await fetch(`${ADMIN_API}?action=${encodeURIComponent(action)}`,{method,headers:{"Authorization":`Bearer ${t}`,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({error:`HTTP ${r.status}`}));
  if(!r.ok) throw new Error(j.message||j.error||`HTTP ${r.status}`);
  return j;
}
function status(msg){ $("status").textContent=msg||""; }
function title(v){ return ({dashboard:"داشبورد",users:"کاربران",posts:"پست‌ها",comments:"کامنت‌ها",cook_photos:"پخت کاربران",premium:"Premium"})[v]||v; }
function date(v){ if(!v) return "—"; try{return new Date(v).toLocaleString("fa-IR")}catch{return v} }

async function render(){
  status("در حال دریافت اطلاعات…"); $("viewTitle").textContent=title(currentView); $("content").innerHTML='<div class="panel">در حال بارگذاری…</div>';
  try{
    if(currentView==="dashboard") return await dashboard();
    if(currentView==="users") return await users();
    if(currentView==="posts") return await rowsView("posts");
    if(currentView==="comments") return await rowsView("comments");
    if(currentView==="cook_photos") return await rowsView("cook_photos");
    if(currentView==="premium") return await premium();
  }catch(e){ $("content").innerHTML=`<div class="panel"><b>خطا:</b> ${esc(e.message)}</div>`; status("خطا در دریافت اطلاعات"); }
}
async function dashboard(){
  const d=await api("dashboard"); $("adminEmail").textContent=d.admin_email||"";
  const cards=[["کاربران",d.users],["پروفایل‌ها",d.profiles],["پست‌ها",d.posts],["کامنت‌ها",d.comments],["عکس‌های پخت",d.cook_photos],["اشتراک‌ها",d.subscriptions]];
  $("content").innerHTML=`<div class="statgrid">${cards.map(x=>`<div class="stat"><span class="muted">${x[0]}</span><b>${x[1]??"—"}</b></div>`).join("")}</div><div class="panel" style="margin-top:18px"><h3>وضعیت پنل</h3><p>این پنل با Session حساب مدیر به Edge Function امن متصل می‌شود. Service Role داخل مرورگر قرار نمی‌گیرد.</p></div>`; status("به‌روز شد");
}
async function users(){
  const d=await api("users");
  $("content").innerHTML=`<div class="panel"><div class="row"><b>${d.total??d.users.length} کاربر</b></div><table class="table"><thead><tr><th>کاربر</th><th>ایمیل</th><th>شناسه</th><th>ثبت‌نام</th><th>آخرین ورود</th><th>Premium دستی</th></tr></thead><tbody>${d.users.map(u=>`<tr><td><b>${esc(u.profile?.display_name||"—")}</b><br><span class="small muted">@${esc(u.profile?.username||"—")}</span></td><td>${esc(u.email||"—")}</td><td class="small">${esc(u.id)}</td><td>${date(u.created_at)}</td><td>${date(u.last_sign_in_at)}</td><td><button class="btn small" onclick="grant('${esc(u.id)}')">+۳۰ روز</button> <button class="btn secondary small" onclick="revokePremium('${esc(u.id)}')">لغو دستی</button></td></tr>`).join("")}</tbody></table></div>`; status("کاربران دریافت شدند");
}
async function rowsView(kind){
  const d=await api(kind); const rows=d.rows||[];
  const conf={posts:{cols:["id","user_id","caption","created_at"],del:"delete_post"},comments:{cols:["id","post_id","user_id","body","created_at"],del:"delete_comment"},cook_photos:{cols:["id","recipe_id","user_id","caption","image_url","created_at"],del:"delete_cook_photo"}}[kind];
  $("content").innerHTML=`<div class="panel"><b>${rows.length} مورد اخیر</b><table class="table"><thead><tr>${conf.cols.map(c=>`<th>${esc(c)}</th>`).join("")}<th>عملیات</th></tr></thead><tbody>${rows.map(r=>`<tr>${conf.cols.map(c=>`<td class="${c==='caption'||c==='body'||c==='image_url'?'truncate':''}">${c==='created_at'?date(r[c]):esc(r[c]??'—')}</td>`).join("")}<td><button class="btn danger small" onclick="removeRow('${conf.del}','${esc(r.id)}')">حذف</button></td></tr>`).join("")}</tbody></table></div>`; status("اطلاعات دریافت شد");
}
async function premium(){
  const d=await api("premium");
  const paid=d.subscriptions||[], grants=d.grants||[];
  $("content").innerHTML=`<div class="two"><div class="panel"><h3>خریدهای ثبت‌شده</h3><table class="table"><thead><tr><th>کاربر</th><th>وضعیت</th><th>پلن</th><th>انقضا</th></tr></thead><tbody>${paid.map(x=>`<tr><td class="small">${esc(x.user_id)}</td><td>${esc(x.status)}</td><td>${esc(x.tier)}</td><td>${date(x.expires_at)}</td></tr>`).join("")}</tbody></table></div><div class="panel"><h3>Premium دستی مدیر</h3><table class="table"><thead><tr><th>کاربر</th><th>وضعیت</th><th>انقضا</th><th>یادداشت</th></tr></thead><tbody>${grants.map(x=>`<tr><td class="small">${esc(x.user_id)}</td><td>${esc(x.status)}</td><td>${date(x.expires_at)}</td><td>${esc(x.note||"")}</td></tr>`).join("")}</tbody></table></div></div>${d.errors?.length?`<div class="notice">${d.errors.map(esc).join("<br>")}</div>`:""}`; status("Premium به‌روز شد");
}
window.grant=async(id)=>{const days=Number(prompt("چند روز Premium فعال شود؟","30")); if(!days)return; try{await api("grant_premium","POST",{user_id:id,days}); alert("Premium فعال شد"); await render();}catch(e){alert(e.message)}};
window.revokePremium=async(id)=>{if(!confirm("Premium دستی این کاربر غیرفعال شود؟"))return; try{await api("revoke_premium","POST",{user_id:id}); alert("غیرفعال شد"); await render();}catch(e){alert(e.message)}};
window.removeRow=async(action,id)=>{if(!confirm("این مورد حذف شود؟ این عملیات قابل بازگشت نیست."))return; try{await api(action,"POST",{id}); await render();}catch(e){alert(e.message)}};

$("loginBtn").onclick=async()=>{ $("loginMsg").textContent="در حال ورود…"; const {error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value}); if(error){$("loginMsg").textContent=error.message;return;} await start(); };
$("logoutBtn").onclick=async()=>{await sb.auth.signOut(); location.reload();};
$("refreshBtn").onclick=render;
document.querySelectorAll(".sidebtn[data-view]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".sidebtn[data-view]").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentView=b.dataset.view;render();});
async function start(){ const {data}=await sb.auth.getSession(); if(!data.session){$("loginView").classList.remove("hidden");$("appView").classList.add("hidden");return;} $("loginView").classList.add("hidden");$("appView").classList.remove("hidden"); try{await api("dashboard"); await render();}catch(e){await sb.auth.signOut();$("loginView").classList.remove("hidden");$("appView").classList.add("hidden");$("loginMsg").textContent="این حساب اجازه مدیریت ندارد: "+e.message;} }
start();
