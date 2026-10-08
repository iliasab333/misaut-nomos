import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
const anon = createClient(env.SUPABASE_URL.replace(/^["']|["']$/g,''), env.VITE_SUPABASE_ANON_KEY, {auth:{persistSession:false}});
const {data:row,error:e0} = await anon.from('blog_posts').select('id,slug,views').eq('slug','iva-autonomos-declaracion-trimestral').maybeSingle();
console.log('lectura anon:', JSON.stringify(row), e0?e0.message:'');
if(row){
  const {data:upd, error} = await anon.from('blog_posts').update({views: row.views}).eq('id', row.id).select('id,views');
  console.log('UPDATE anon (mismo valor) → error:', error ? error.code+' / '+error.message : 'NINGUNO');
  console.log('filas devueltas por el UPDATE:', JSON.stringify(upd));
}
