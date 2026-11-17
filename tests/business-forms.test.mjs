import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {definitions} from '../prototype/generated-catalog.mjs';
import {emptyAnswers,validateAnswers,normalizeImportedAnswers} from '../prototype/engine.mjs';
import {calculateItems} from '../prototype/business-rules.mjs';
import {renderBusinessDocument} from '../prototype/business-renderer.mjs';
import {exportModel} from '../prototype/export-model.mjs';
import {compileScalarRules} from '../build-business-core.mjs';
const docs=definitions.filter(d=>d.layout==='business'),quote=docs.find(d=>d.id==='quotation'),contract=docs.find(d=>d.id==='contract');
const q={documentNo:'QT-TEST',date:'2026-11-18',validity:'30일',supplierName:'공급사',customerName:'고객사',taxRate:'10%',items:[{description:'웹사이트 제작',quantity:'1',unitPrice:'5000000'},{description:'유지보수',quantity:'1',unitPrice:'1200000'}]};
test('five item/contract forms join the public catalog with empty identities',()=>{
 assert.equal(docs.length,5);
 for(const d of docs){assert.ok(validateAnswers(d,emptyAnswers(d)).length);assert.ok(!JSON.stringify(emptyAnswers(d)).includes('샘플기업'));}
});
test('original example totals recalculate when quantity changes',()=>{
 assert.deepEqual(validateAnswers(quote,q),[]);assert.equal(calculateItems(quote,q).total,6820000);
 const changed={...q,items:[{...q.items[0],quantity:'2'},q.items[1]]};
 assert.equal(calculateItems(quote,changed).total,12320000);
 assert.match(renderBusinessDocument(quote,changed),/12,320,000원/);
 assert.ok(JSON.stringify(exportModel(quote,changed,null)).includes('12,320,000원'));
});
test('VAT selection, per-item fractional-won truncation, and VAT-exclusive purchase orders',()=>{
 assert.equal(calculateItems(quote,{...q,taxRate:'0%'}).total,6200000);
 assert.equal(calculateItems(quote,{...q,items:[{description:'소액',quantity:'1',unitPrice:'19'}]}).tax,1);
 assert.equal(calculateItems(quote,{...q,items:[{description:'정수 표기',quantity:'1.0',unitPrice:'19.0'}]}).total,20);
 assert.equal(calculateItems(docs.find(d=>d.id==='purchase-order'),q).total,6200000);
});
test('negative/fractional/missing quantities, bad dates, and overflow block export',()=>{
 for(const row of [{quantity:'-1',unitPrice:'5000'},{quantity:'1.5',unitPrice:'5000'},{quantity:'1',unitPrice:'-1'},{quantity:'1000000',unitPrice:'999999999999'},{quantity:'',unitPrice:'5000'}]){
  const a={...q,items:[{description:'품목',...row}]};assert.ok(validateAnswers(quote,a).length);assert.throws(()=>exportModel(quote,a,null));
 }
 const order=docs.find(d=>d.id==='purchase-order');assert.ok(validateAnswers(order,{...q,items:[{description:'품목',quantity:'1',unitPrice:'10',dueDate:'2026-02-30'}]}).some(i=>i.field==='items'));
});
test('contract preserves editable supplied clauses and rejects reversed dates and excessive deposit',()=>{
 const a={...emptyAnswers(contract),date:'2026-11-18',clientName:'갑',providerName:'을',purpose:'문서 제작',scope:'범위',amount:'100',deposit:'50',paymentTerms:'협의 조건',startDate:'2026-11-18',endDate:'2026-12-18'};
 assert.deepEqual(validateAnswers(contract,a),[]);
 assert.ok(validateAnswers(contract,{...a,deposit:'101'}).some(i=>i.field==='deposit'));
 assert.ok(validateAnswers(contract,{...a,endDate:'2026-11-17'}).some(i=>i.field==='endDate'));
 const html=renderBusinessDocument(contract,{...a,warranty:'합의한 변경 조항'});assert.match(html,/합의한 변경 조항/);
});
test('blank forms omit entered data and sums but retain source contract boilerplate',()=>{
 for(const d of docs){
  const a={...emptyAnswers(d),...q,clientName:'PRIVATE_CLIENT',notes:'PRIVATE_NOTE',warranty:'PRIVATE_CLAUSE'};
  const html=renderBusinessDocument(d,a,{blank:true}),m=JSON.stringify(exportModel(d,a,null,{blank:true}));
  for(const output of [html,m]){assert.ok(!output.includes('PRIVATE_'));assert.ok(!output.includes('5,000,000'));assert.ok(!output.includes('6820000'));}
 }
 assert.match(renderBusinessDocument(contract,{}, {blank:true}),/1년간 무상 하자보수/);
});
test('user markup remains literal and unknown imported values cannot become calculated totals',()=>{
 const a={...q,notes:'<script>attack()</script>',items:[{description:'<img src=x onerror=attack()>',quantity:'1',unitPrice:'10',total:'999999'}]};
 const restored=normalizeImportedAnswers(quote,a);assert.equal(restored.items[0].total,undefined);
 const html=renderBusinessDocument(quote,restored);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;script&gt;/);assert.equal(calculateItems(quote,restored).total,11);
});
test('browser scalar rules are generated from FreeLang source and unsupported syntax fails closed',()=>{
 const source=fs.readFileSync(new URL('../core/business-rules.fl',import.meta.url),'utf8');
 assert.equal(compileScalarRules(source),fs.readFileSync(new URL('../prototype/generated-business-core.mjs',import.meta.url),'utf8'));
 for(const input of ['(defn inject [x] (eval x))','(defn bad [x] (fetch x))','(defn bad [x] (floor x)','(defn bad [x x] (+ x x))'])assert.throws(()=>compileScalarRules(input));
});
