import test from 'node:test';import assert from 'node:assert/strict';
import {definitions} from '../prototype/generated-catalog.mjs';
import {emptyAnswers,normalizeImportedAnswers,validateAnswers} from '../prototype/engine.mjs';
import {renderBusinessDocument} from '../prototype/business-renderer.mjs';
import {renderResumeDocument} from '../prototype/resume-templates.mjs';
import {exportModel} from '../prototype/export-model.mjs';
import {calculateItems} from '../prototype/business-rules.mjs';
const newIds=['statement','cover-letter','employment-certificate','employment-contract','resignation','meeting-minutes','pledge','proposal','content-certified-mail','nda','power-of-attorney','promissory-note','lease-agreement'];
function sample(doc){
 const a=emptyAnswers(doc);
 for(const f of doc.fields){
  if(f.type==='date')a[f.id]=f.id.toLowerCase().includes('birth')?'1990-01-01':f.id==='endDate'||f.id==='leaveDate'||f.id==='repayDate'?'2026-12-31':'2026-11-18';
  else if(f.type==='number')a[f.id]=f.unit==='%'?'5.5':f.unit==='년'?'3':'1000000';
  else if(f.type==='select')a[f.id]=f.options[0];
  else if(f.type==='repeater')a[f.id]=[{description:'실제 품목',quantity:'2',unitPrice:'1000'}];
  else a[f.id]='PRIVATE_'+f.id;
 }
 return a;
}
test('thirteen new documents plus existing aliases form twenty unique public forms',()=>{
 assert.equal(definitions.length,20);assert.equal(new Set(definitions.map(d=>d.id)).size,20);
 for(const id of newIds)assert.ok(definitions.some(d=>d.id===id));
 assert.equal(definitions.filter(d=>d.id==='resume').length,1);assert.equal(definitions.filter(d=>d.id==='incident').length,1);
 assert.ok(!definitions.some(d=>d.id==='meeting-notes'));
});
test('new forms render and export all provided fields while blank forms discard edited content',()=>{
 for(const id of newIds){
  const d=definitions.find(d=>d.id===id),a=sample(d);assert.deepEqual(validateAnswers(d,a),[],id);
  const html=renderBusinessDocument(d,a),model=JSON.stringify(exportModel(d,a,null));
  assert.ok(html.includes('PRIVATE_')||id==='statement');assert.ok(model.includes('PRIVATE_'));
  const blank=renderBusinessDocument(d,a,{blank:true})+JSON.stringify(exportModel(d,a,null,{blank:true}));assert.ok(!blank.includes('PRIVATE_'),id);
  assert.ok(!blank.includes('1990-01-01'),id);
 }
});
test('new defaults never invent example identities, cover-letter facts, apologies, or a noncompete promise',()=>{
 for(const id of newIds){
  const d=definitions.find(d=>d.id===id),empty=JSON.stringify(emptyAnswers(d));
  for(const marker of ['홍길동','김철수','샘플기업','이직을 제한','깊이 반성','3년간 영업','2026-12-31'])assert.ok(!empty.includes(marker),id+marker);
 }
});
test('NDA years and loan percentages keep their units without becoming currency',()=>{
 for(const [id,field,text] of [['nda','validYears','3년'],['promissory-note','interestRate','5.5%']]){
  const d=definitions.find(d=>d.id===id),a=sample(d),m=exportModel(d,a,null);
  assert.ok(renderBusinessDocument(d,a).includes(text));
  const c=m.blocks.flatMap(b=>b.rows.flat()).find(c=>c.numeric===Number(a[field]));assert.equal(c.text,text);assert.equal(c.currency,false);
  assert.ok(!c.text.endsWith('원'));
 }
});
test('date-range adapters reuse the verified scalar order rule across four new periods',()=>{
 for(const id of ['resignation','power-of-attorney','promissory-note','lease-agreement']){
  const d=definitions.find(d=>d.id===id),a=sample(d),r=d.dateRanges[0];
  assert.ok(validateAnswers(d,{...a,[r.fromField]:'2026-12-31',[r.toField]:'2026-11-18'}).some(i=>i.field===r.toField),id);
 }
});
test('optional resume birthday restores compatibly from old backups and appears in all templates',()=>{
 const d=definitions.find(d=>d.id==='resume');const restored=normalizeImportedAnswers(d,{fullName:'테스트'});assert.equal(restored.birthDate,'');
 for(const template of ['basic','accent','banner']){
  const a={...restored,birthDate:'1990-01-01'};assert.ok(renderResumeDocument(d,a,{template,photo:null}).includes('1990-01-01'));
  assert.ok(!renderResumeDocument(d,a,{template,photo:null},{blank:true}).includes('1990-01-01'));
 }
 assert.ok(validateAnswers(d,{...restored,birthDate:'2026-02-30'}).some(i=>i.field==='birthDate'));
});
test('transaction statement shares quantity, VAT and total calculations instead of original fixed totals',()=>{
 const d=definitions.find(d=>d.id==='statement'),a=sample(d);
 assert.equal(calculateItems(d,a).total,2200);
 assert.equal(calculateItems(d,{...a,items:[{description:'품목',quantity:'3',unitPrice:'1000'}]}).total,3300);
});
