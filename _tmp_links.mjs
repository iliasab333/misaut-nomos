import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()];}));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const {data} = await sb.from('blog_posts').select('slug,title_es,content_es,related_articles,tags,category,word:content_es').eq('status','published');
let tot=0;
for(const p of data){
  const c = p.content_es||'';
  const hrefs = [...c.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  const internal = hrefs.filter(h=>h.startsWith('/')||h.includes('misautonomos'));
  const ficha = internal.filter(h=>h.includes('/autonomo/'));
  const buscar = internal.filter(h=>h.includes('/buscar')||h.includes('/categoria/'));
  const ext = hrefs.filter(h=>h.startsWith('http')&&!h.includes('misautonomos'));
  tot += hrefs.length;
  console.log(`${p.slug}\n  chars=${c.length} hrefs=${hrefs.length} internos=${internal.length} ficha=${ficha.length} buscar/cat=${buscar.length} externos=${ext.length} related=${(p.related_articles||[]).length} tags=${JSON.stringify(p.tags)}`);
  if(internal.length) console.log('    internos:', JSON.stringify(internal));
  if(ext.length) console.log('    externos:', JSON.stringify(ext.slice(0,6)));
}
console.log('TOTAL hrefs en los 25 posts:', tot);
