import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
for (const t of ['search_logs','search_queries','searches','analytics_events','page_views']) {
  const {error,count} = await sb.from(t).select('*',{count:'exact',head:true});
  console.log(t, error? 'NO EXISTE/'+error.code : count+' filas');
}
const {data} = await sb.from('profile_metrics').select('month,search_appearances,profile_views,contact_clicks').limit(5);
console.log('muestra profile_metrics:',JSON.stringify(data));
// cuantas filas distintas de perfil-mes
const {count} = await sb.from('profile_metrics').select('*',{count:'exact',head:true});
console.log('profile_metrics filas:',count);
