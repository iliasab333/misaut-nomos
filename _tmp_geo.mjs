import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()];}));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const {data:pr} = await sb.from('professional_profiles').select('ciudad,categories,business_name,visible_en_busqueda,onboarding_completed,slug_publico').eq('visible_en_busqueda',true).eq('onboarding_completed',true);
const byCity={}, byCat={};
for(const p of pr){ const c=(p.ciudad||'(sin ciudad)').trim(); byCity[c]=(byCity[c]||0)+1; for(const k of (p.categories||[])) byCat[k]=(byCat[k]||0)+1; }
console.log('PERFILES VISIBLES:', pr.length);
console.log('--- por ciudad ---'); console.log(Object.entries(byCity).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${v}  ${k}`).join('\n'));
console.log('--- por categoria ---'); console.log(Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${v}  ${k}`).join('\n'));
const madridFont = pr.filter(p=>/madrid/i.test(p.ciudad||'') && (p.categories||[]).some(c=>/fontan/i.test(c)));
console.log('FONTANEROS EN MADRID visibles:', madridFont.length);
