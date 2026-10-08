import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
for (const t of ['search_logs','search_queries','searches','analytics_events','page_views']) {
  const r = await sb.from(t).select('*',{count:'exact',head:true});
  console.log(t, '=> error:', r.error? r.error.message : 'ninguno', '| count:', r.count);
}
const r2 = await sb.from('profile_metrics').select('*').limit(2);
console.log('profile_metrics error:', r2.error?.message, 'cols:', r2.data?[0]&&Object.keys(r2.data[0]):'n/a');
console.log(JSON.stringify(r2.data));
