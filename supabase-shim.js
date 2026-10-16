/* OneDrop: Supabase ব্যাকএন্ড অ্যাডাপ্টার (docs টেবিল + media স্টোরেজ) */
(function(){
const C=window.ONEDROP_CONFIG||{};
const ok=C.SUPABASE_URL&&!/PASTE/.test(C.SUPABASE_URL)&&window.supabase;
window.blob=id=>(C.SUPABASE_URL||"")+"/storage/v1/object/public/media/"+id;
window.adminAuth=()=>alert("Supabase এখনো কনফিগার করা হয়নি (config.js দেখুন)।");
if(!ok){window.claude={use:async()=>null};return}
const sb=supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY);
let isAdmin=false,uid=localStorage.getItem("od_uid");
if(!uid){uid=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now()).replace(/[^\w-]/g,"");localStorage.setItem("od_uid",uid)}
const ready=(async()=>{try{const{data:{session}}=await sb.auth.getSession();if(session){const{data}=await sb.rpc("is_admin");isAdmin=data===true}}catch(e){}
 const a=document.getElementById("adl");if(a)a.textContent=isAdmin?"অ্যাডমিন লগআউট":"অ্যাডমিন লগইন"})();
window.adminAuth=async()=>{await ready;if(isAdmin){await sb.auth.signOut();location.reload();return}
 const email=prompt("অ্যাডমিন ইমেইল");if(!email)return;const password=prompt("পাসওয়ার্ড");if(!password)return;
 const{error}=await sb.auth.signInWithPassword({email,password});if(error)return alert("লগইন ব্যর্থ হয়েছে");location.reload()};
const runs=new Set(),refresh=()=>runs.forEach(f=>f());
const coll=c=>({
 onSnapshot(cb,err){const run=async()=>{try{await ready;const{data,error}=await sb.from(isAdmin?"docs":"docs_public").select("id,data").eq("coll",c);if(error)throw error;
   cb({docs:data.map(r=>({id:r.id,data:()=>r.data})),size:data.length})}catch(e){err&&err(e)}};
  runs.add(run);run();const t=setInterval(()=>{if(!document.hidden)run()},15000);return()=>{clearInterval(t);runs.delete(run)}},
 doc:id=>({
  async set(d){const{error}=await sb.from("docs").upsert({coll:c,id,data:d},{ignoreDuplicates:!isAdmin});if(error)throw error;refresh()},
  async update(d){const{data:r}=await sb.from("docs").select("data").eq("coll",c).eq("id",id).single();
   const{error}=await sb.from("docs").update({data:{...(r&&r.data||{}),...d}}).eq("coll",c).eq("id",id);if(error)throw error;refresh()},
  async delete(){const{error}=await sb.from("docs").delete().eq("coll",c).eq("id",id);if(error)throw error;refresh()}})});
async function shrink(f){if(!/^image\/(jpeg|png|webp)$/.test(f.type))return f;
 try{const b=await createImageBitmap(f),k=Math.min(1,1600/Math.max(b.width,b.height));if(k==1&&f.size<600e3)return f;
  const cv=document.createElement("canvas");cv.width=Math.round(b.width*k);cv.height=Math.round(b.height*k);cv.getContext("2d").drawImage(b,0,0,cv.width,cv.height);
  return await new Promise(r=>cv.toBlob(x=>r(x||f),"image/jpeg",.82))}catch(e){return f}}
const assets={async upload(f){const b=await shrink(f),id=Date.now().toString(36)+Math.random().toString(36).slice(2,8)+".jpg";
 const{error}=await sb.storage.from("media").upload(id,b,{contentType:b.type||"image/jpeg",cacheControl:"31536000"});if(error)throw error;return{id,url:blob(id)}}};
window.claude={use:async n=>{await ready;
 if(n=="user")return{canEdit:()=>isAdmin,isOwner:()=>isAdmin,id:async()=>uid};
 if(n=="db")return{collection:coll};
 if(n=="assets")return isAdmin?assets:null;
 return null}};
})();
