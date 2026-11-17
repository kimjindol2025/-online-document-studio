import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultPresentation,normalizePresentation,photoGeometry,renderResumeDocument,MAX_PHOTO_LENGTH} from '../prototype/resume-templates.mjs';
const doc=JSON.parse(readFileSync(new URL('../definitions/resume.json',import.meta.url)));
const photo={data:'data:image/jpeg;base64,/9j/AA==',width:600,height:800,zoom:1,x:50,y:50};
test('old backups without presentation preserve basic/no-photo defaults',()=>{
  assert.deepEqual(normalizePresentation(undefined),{template:'basic',photo:null});
  const a=defaultPresentation();a.template='banner';assert.equal(defaultPresentation().template,'basic');
});
test('only allowlisted templates and normalized local JPEG geometry are accepted',()=>{
  assert.throws(()=>normalizePresentation({template:'x" onclick="alert(1)'}));
  for(const data of ['https://example.com/photo.jpg','data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,/9j/'+ 'A'.repeat(MAX_PHOTO_LENGTH)])assert.throws(()=>normalizePresentation({template:'basic',photo:{...photo,data}}));
  for(const patch of [{zoom:0},{zoom:Infinity},{x:-1},{y:101},{width:801},{height:1.5}])assert.throws(()=>normalizePresentation({template:'basic',photo:{...photo,...patch}}));
});
test('normalization drops unknown backup properties',()=>{
  assert.deepEqual(normalizePresentation({template:'accent',extra:'discard',photo:{...photo,script:'discard'}}),{template:'accent',photo});
});
test('crop pan endpoints never reveal an empty part of the frame',()=>{
  for(const [width,height] of [[800,200],[200,800],[600,800]])for(const zoom of [1,2,3])for(const x of [0,50,100])for(const y of [0,50,100]){
    const g=photoGeometry({...photo,width,height,zoom,x,y});
    assert.ok(g.width>=100&&g.height>=100);assert.ok(g.left<=0&&g.top<=0);assert.ok(g.left+g.width>=99.999&&g.top+g.height>=99.999);
  }
});
test('all templates preserve user data and escape text rather than creating markup',()=>{
  const answers={fullName:'<script>bad()</script>',phone:'010-0000-0000',education:[{school:'테스트학교'}],work:[{company:'테스트회사',duty:'자료 정리'}],introduction:'<img src=x onerror=bad()>'};
  for(const template of ['basic','accent','banner']){
    const html=renderResumeDocument(doc,answers,{template,photo});
    assert.match(html,new RegExp('resume-'+template));assert.match(html,/테스트학교/);assert.match(html,/테스트회사/);assert.match(html,/이력서 사진/);
    assert.doesNotMatch(html,/<script>|<img src=x/);assert.match(html,/&lt;script&gt;/);
  }
});
test('blank resume omits entered values and embedded photo in all three templates',()=>{
  for(const template of ['basic','accent','banner']){
    const html=renderResumeDocument(doc,{fullName:'삭제대상',phone:'개인연락처',education:[{school:'개인학교'}],introduction:'개인소개'},{template,photo},{blank:true});
    assert.doesNotMatch(html,/삭제대상|개인연락처|개인학교|개인소개|data:image/);assert.match(html,/blank-line/);
  }
});
