from html.parser import HTMLParser
from pathlib import Path
import json,re
class P(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[]
 def handle_starttag(self,t,a):
  a=dict(a)
  if 'id' in a:self.ids.append(a['id'])
  if t in ('a','script','link'):self.links.append(a.get('href',a.get('src','')))
errors=[]; pages=list(Path('dist').rglob('*.html'));parsed={}
for f in pages:
 p=P();p.feed(f.read_text());parsed[str(f.resolve())]=p
 if len(p.ids)!=len(set(p.ids)):errors.append((str(f),'duplicate ids'))
for f in pages:
 p=parsed[str(f.resolve())]
 for l in p.links:
  if not l or ':' in l:continue
  rel,_,anchor=l.partition('#');target=(f.parent/rel if rel else f).resolve()
  if not target.exists():errors.append((str(f),'missing '+l))
  elif anchor and str(target) in parsed and anchor not in parsed[str(target)].ids:errors.append((str(f),'missing anchor '+l))
data=json.loads(Path('dist/assets/data.js').read_text().removeprefix('window.OKKAMA_DATA=').removesuffix(';'))
for item in data['search']:
 rel,_,anchor=item['url'].partition('#');p=parsed.get(str((Path('dist')/rel).resolve()))
 if not p or (anchor and anchor not in p.ids):errors.append(('search',item['url']))
paths=[m['path'] for m in data['modules']]
collisions=[(a,b) for a in paths for b in paths if b.startswith(a+'/')]
print('Module/file tree collisions:',collisions)
print('HTML pages:',len(pages),'Search entries:',len(data['search']),'Errors:',len(errors));print(errors[:20])
assert not errors
print('Internal warnings:',sum('class="internal-note"' in f.read_text() for f in pages))
assert len(pages)==len(paths)+1
