import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('/Users/bigseo/Desktop/misaut-nomos/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()];}));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const {data,error} = await sb.from('blog_posts').select('slug,title_es,category,status,publish_date,views,featured,tags,read_time_minutes,excerpt_es,meta_title_es,related_articles').order('publish_date',{ascending:false});
if(error){console.error(error);process.exit(1);}
console.log('TOTAL', data.length);
for(const p of data){
  console.log([p.status, p.category, p.publish_date?.slice(0,10), 'views='+(p.views??'null'), p.featured?'FEAT':'', '| '+p.slug, '| '+p.title_es].join(' '));
}
fs.writeFileSync('/private/tmp/claude-501/-Users-bigseo-Desktop-misaut-nomos/29957642-c98b-43be-8c5b-e7438e59f24a/scratchpad/posts.json', JSON.stringify(data,null,1));
