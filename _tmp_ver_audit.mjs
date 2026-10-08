import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const {data:cats} = await sb.from('service_categories').select('name,slug');
const {data:pr} = await sb.from('professional_profiles').select('categories,provincia,ciudad').eq('visible_en_busqueda',true).eq('onboarding_completed',true);
console.log('cats:',cats.length,'perfiles:',pr.length);
const cnt={}; for(const p of pr) for(const c of (p.categories||[])) cnt[c]=(cnt[c]||0)+1;
const zero=cats.filter(c=>!cnt[c.name]).map(c=>c.name);
console.log('CATEGORÍAS CON 0:',JSON.stringify(zero));
console.log('recuento por cat:');
for(const c of cats) console.log(String(cnt[c.name]||0).padStart(3),c.name);
// provincias
const src=fs.readFileSync('src/components/utils/locationsData.jsx','utf8');
const m=src.match(/PROVINCIAS\s*=\s*\[([\s\S]*?)\];/);
const PROV=(m[1].match(/"[^"]+"/g)||[]).map(s=>s.slice(1,-1));
console.log('PROVINCIAS:',PROV.length);
const pc={}; for(const p of pr) pc[p.provincia]=(pc[p.provincia]||0)+1;
console.log('provincias de los perfiles:',JSON.stringify(pc,null,0));
const provZero=PROV.filter(p=>!pc[p]);
console.log('PROVINCIAS CON 0:',provZero.length, JSON.stringify(provZero));
// combos
const combo=new Set();
for(const p of pr) for(const c of (p.categories||[])) if(PROV.includes(p.provincia)) combo.add(c+'|'+p.provincia);
console.log('combos cat×prov con >=1:',combo.size,'de',cats.length*PROV.length);
// cuantas filas de perfiles tienen provincia fuera de la lista
console.log('perfiles con provincia no en lista:',pr.filter(p=>!PROV.includes(p.provincia)).map(p=>p.provincia));
