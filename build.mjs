import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {marked, Renderer} from 'marked';
const bin=process.env.OKKAMA_BIN || 'okkama';
const run=(...a)=>execFileSync(bin,a,{encoding:'utf8',maxBuffer:16*1024*1024});
const version=run('--version').trim();
const index=run('man','--format','markdown','--no-pager');
const modules=[...index.matchAll(/^- `([A-Za-z_][\w]*(?:\/[A-Za-z_][\w]*)*)`(?:: (.*))?$/gm)].map(m=>({path:m[1],summary:m[2]||'',internal:m[1].split('/').includes('internal')}));
if(!modules.length || new Set(modules.map(m=>m.path)).size!==modules.length) throw Error('Invalid or empty module index');
const SITE='https://okkama-lang.github.io/', REPO='https://github.com/Okkama-lang/okkama';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const highlight=code=>code.replace(/\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:object|role|does|has|is|let|action|enum|match|case|if|else|return|throw|try|async|await|use|from|hidden|private|defer|true|false|none|some|void|int|string|bool|byte|float|any)\b|\b\d+(?:\.\d+)?\b|[&<>"']/g,t=> t.startsWith('//')?`<span class="comment">${esc(t)}</span>`:t.startsWith('"')||t.startsWith("'")?`<span class="str">${esc(t)}</span>`:/^[a-z]/i.test(t)?`<b class="kw">${esc(t)}</b>`:/^\d/.test(t)?`<span class="num">${t}</span>`:esc(t));
fs.rmSync('dist',{recursive:true,force:true});fs.rmSync('source/markdown',{recursive:true,force:true});
fs.mkdirSync('dist/assets',{recursive:true});fs.mkdirSync('source/markdown',{recursive:true});
const search=[];
function render(md,module){
 const ids=new Map(); const headings=[];
 const renderer=Object.assign(new Renderer(),{
 html({text}){return esc(text);},
 heading({tokens,depth}) {const text=this.parser.parseInline(tokens);const plain=text.replace(/<[^>]*>/g,'');const stem=plain.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'section';const n=ids.get(stem)||0;ids.set(stem,n+1);const id=stem+(n?`-${n+1}`:'');headings.push({title:plain,id,depth});return `<h${depth} id="${id}">${text}<a class="permalink" href="#${id}" aria-label="Link to ${esc(plain)}">#</a></h${depth}>`;},
 code({text,lang}){return `<div class="code-wrap"><button class="copy" type="button">Copy</button><pre><code class="language-${esc(lang||'text')}">${lang==='okkama'?highlight(text):esc(text)}</code></pre></div>`;},
 link({href,title,tokens}){const local=/^https?:\/\/(?:localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(href||'');const safe=!local&&/^(?:https?:|mailto:|#|\.\.?\/)/i.test(href||'');return safe?`<a href="${esc(href)}"${title?` title="${esc(title)}"`:''}>${this.parser.parseInline(tokens)}</a>`:this.parser.parseInline(tokens);}
 });
 const html=marked.parse(md,{renderer});
 if(module) for(const h of headings.filter(h=>h.depth>=3))search.push({module:module.path,title:h.title,url:`modules/${module.path}.html#${h.id}`,internal:module.internal});
 return {html,headings};
}
const template=(title,body,toc,prefix,current='')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Okkama standard library reference, generated from okkama man."><title>${esc(title)} · Okkama reference</title><link rel="stylesheet" href="${prefix}assets/style.css"></head><body data-root="${prefix}" data-module="${esc(current)}"><header><button id="menu" aria-label="Toggle module navigation" aria-expanded="false">☰</button><a class="brand" href="${prefix}index.html"><strong>0&lt;</strong> Okkama <span>REFERENCE</span></a><div class="searchbox"><label class="sr-only" for="search">Search modules and actions</label><input id="search" type="search" placeholder="Find a module or action…" autocomplete="off"><kbd>/</kbd><div id="results" hidden aria-live="polite"></div></div><div class="toplinks"><a href="${SITE}">okkama.</a><a href="${REPO}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div><span class="version">${esc(version)}</span></header><div class="layout"><aside id="sidebar"><div class="nav-label">STANDARD LIBRARY</div><nav id="tree" aria-label="Modules"></nav></aside><main><div class="breadcrumb"><a href="${prefix}index.html">Reference</a>${current?' / '+esc(current):' / Overview'}</div>${body}<footer>Generated from <code>okkama man</code>. The source comments are the source of truth. · <a href="${SITE}">okkama-lang.github.io</a> · <a href="${REPO}">Source on GitHub</a></footer></main><aside class="on-this-page"><div class="nav-label">ON THIS PAGE</div>${toc.filter(h=>h.depth===2||h.depth===3).map(h=>`<a href="#${h.id}">${esc(h.title)}</a>`).join('')}</aside></div><script src="${prefix}assets/data.js"></script><script src="${prefix}assets/app.js"></script></body></html>`;
for(const [i,m] of modules.entries()) {
 let md;try{md=run('man','--format','markdown','--no-pager','std/'+m.path);}catch(e){throw Error(`Failed module ${m.path}: ${e.message}`);}
 const src=`source/markdown/${m.path}.md`;fs.mkdirSync(path.dirname(src),{recursive:true});fs.writeFileSync(src,md);
 const {html,headings}=render(md,m);const dest=`dist/modules/${m.path}.html`;fs.mkdirSync(path.dirname(dest),{recursive:true});const prefix='../'.repeat(m.path.split('/').length);
 fs.writeFileSync(dest,template(m.path,`${m.internal?'<div class="internal-note"><strong>Internal module</strong> · Implementation detail. Not intended as a stable public API.</div>':''}${html}`,headings,prefix,m.path));
 search.push({module:m.path,title:m.summary,url:`modules/${m.path}.html`,internal:m.internal});
 if(i%100===0)console.log(`${i+1}/${modules.length}: ${m.path}`);
}
const areas=[...new Set(modules.map(m=>m.path.includes('/')?m.path.split('/')[0]:'top level'))];
const overview=`<div class="eyebrow">THE OKKAMA STANDARD LIBRARY</div><h1>A small question.<br>A precise answer.</h1><p class="lead">Explore modules, read signatures, and find the action you need. The same reference as your terminal, with a little more room to breathe.</p><div class="stats"><div><strong>${modules.length}</strong><span>modules</span></div><div><strong>${search.length-modules.length}</strong><span>declarations & actions</span></div><div><strong>0&lt;</strong><span>one source of truth</span></div></div><h2>Start with a module</h2><div class="cards">${['io/stdout','collections/list','text/string','async/channel'].filter(p=>modules.some(m=>m.path===p)).map(p=>{const m=modules.find(m=>m.path===p);return `<a class="card" href="modules/${p}.html"><code>${esc(p)}</code><p>${esc(m.summary)}</p><span>Read reference ↗</span></a>`}).join('')}</div><h2>Browse by area</h2><div class="areas">${areas.map(a=>`<button class="area" data-area="${esc(a)}">${esc(a)} <span>${modules.filter(m=>(m.path.includes('/')?m.path.split('/')[0]:'top level')===a).length}</span></button>`).join('')}</div><div class="hint"><strong>Prefer the terminal?</strong><div class="code-wrap"><pre><code>okkama man io/stdout Stdout.writeln</code></pre></div>Internal modules are included and explicitly marked. Search supports module paths, declarations, and action names.</div>`;
fs.writeFileSync('dist/index.html',template('Reference',overview,[],'./'));
fs.writeFileSync('dist/assets/data.js','window.OKKAMA_DATA='+JSON.stringify({version,modules,search}).replace(/</g,'\\u003c')+';');
fs.writeFileSync('source/index.md',index);fs.writeFileSync('source/manifest.json',JSON.stringify({version,modules:modules.length,entries:search.length,generated:new Date().toISOString()},null,2));
for(const name of ['style.css','app.js'])fs.copyFileSync(`source/${name}`,`dist/assets/${name}`);
console.log(`Built ${modules.length} modules; ${search.length} search entries.`);
