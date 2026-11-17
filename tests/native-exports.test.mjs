import test from 'node:test';
import assert from 'node:assert/strict';
import { definitions } from '../prototype/generated-catalog.mjs';
import { exportModel } from '../prototype/export-model.mjs';
import { zip, xml } from '../prototype/export-zip.mjs';
import { docx, xlsx } from '../prototype/office-exports.mjs';
import { hwpx } from '../prototype/hwpx-export.mjs';
const resume=definitions.find(d=>d.id==='resume'),receipt=definitions.find(d=>d.id==='receipt');
const text=bytes=>new TextDecoder().decode(bytes);
function xmlParts(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),parts=[];let offset=0;
  while(v.getUint32(offset,true)===0x04034b50){
    const size=v.getUint32(offset+18,true),n=v.getUint16(offset+26,true),extra=v.getUint16(offset+28,true);
    const name=text(bytes.subarray(offset+30,offset+30+n)),start=offset+30+n+extra;
    if(name.endsWith('.xml'))parts.push(text(bytes.subarray(start,start+size)));
    offset=start+size;
  }
  return parts.join('\n');
}

test('blank exports never inspect answers or photo and keep usable field labels',()=>{
  const answers=new Proxy({}, {get(){throw Error('blank read entered data');}});
  const presentation={template:'accent',get photo(){throw Error('blank read photo');}};
  const m=exportModel(resume,answers,presentation,{blank:true});
  assert.equal(m.template,'accent');assert.equal(m.photo,null);
  assert.equal(m.blocks.find(b=>b.heading==='학력').rows.length,4);
  assert.ok(m.blocks.flatMap(b=>b.rows.flat()).some(c=>c.text==='이름'));
  for(const make of [docx,xlsx,hwpx])assert.ok(make(m).length>1000);
});
test('completed exports enforce required fields and numeric boundaries',()=>{
  assert.throws(()=>exportModel(resume,{},null),/이름/);
  const a={kind:'계약금',date:'2026-11-18',payer:'지급',payee:'수령',purpose:'실제 수령',amount:'100000'};
  assert.throws(()=>exportModel(receipt,{...a,amount:'-1'},null),/숫자/);
  assert.throws(()=>exportModel(receipt,{...a,amount:'1000000000000'},null),/금액/);
  const m=exportModel(receipt,a,null);
  assert.equal(m.blocks.flatMap(b=>b.rows.flat()).find(c=>c.numeric!==undefined).numeric,100000);
  assert.ok(JSON.stringify(m).includes('십만원'));
});
test('all repeater rows and multiline user text survive model normalization',()=>{
  const a={fullName:'김 & <하늘>',introduction:'첫 줄\n둘째 줄',education:[{school:'학교1'},{school:'학교2',major:'과정'}],work:[{}, {company:'회사'}]};
  const m=exportModel(resume,a,{template:'banner',photo:null});
  assert.equal(m.blocks.find(b=>b.heading==='학력').rows.length,3);
  assert.equal(m.blocks.find(b=>b.heading==='경력').rows.length,2);
  assert.ok(JSON.stringify(m).includes('첫 줄\\n둘째 줄'));
});
test('XML escapes markup, removes invalid controls and preserves Korean/emoji',()=>{
  assert.equal(xml('<tag a="x">&\u0000한글😀</tag>'), '&lt;tag a=&quot;x&quot;&gt;&amp;한글😀&lt;/tag&gt;');
  assert.equal(xml('\ud800\ufffe\t\n'), '\t\n');
});
test('ZIP writer emits stored UTF-8 entries and rejects traversal',()=>{
  const bytes=zip({'mimetype':'application/hwp+zip','문서.xml':'내용'}),v=new DataView(bytes.buffer);
  assert.equal(v.getUint32(0,true),0x04034b50);assert.equal(v.getUint16(8,true),0);
  assert.equal(v.getUint32(bytes.length-22,true),0x06054b50);
  assert.throws(()=>zip({'../escape':'bad'}));
});
test('all native formats embed literal text with no formulas or external relationships',()=>{
  const m=exportModel(resume,{fullName:'=HYPERLINK("https://example.invalid")',introduction:'<attack>&한글😀\u0001'},null);
  for(const make of [docx,xlsx,hwpx]){
    const s=xmlParts(make(m));assert.ok(s.includes('&lt;attack&gt;&amp;한글😀'));
    assert.ok(!s.includes('<attack>'));assert.ok(!s.includes('TargetMode="External"'));
  }
  const sheet=text(xlsx(m));assert.ok(sheet.includes('t="inlineStr"'));assert.ok(!sheet.includes('<f>'));
});
test('blank packages omit values, photos, and receipt defaults from every part',()=>{
  for(const d of definitions.filter(d=>d.status==='public')){
    const m=exportModel(d,{fullName:'PRIVATE_NAME',amount:123456},{template:'banner',photo:{data:'PRIVATE_PHOTO'}},{blank:true});
    for(const make of [docx,xlsx,hwpx]){
      const s=text(make(m));assert.ok(!s.includes('PRIVATE_'));assert.ok(!s.includes('123456'));
      assert.ok(!s.includes('photo.jpg'));assert.ok(!s.includes('BIN0001'));
    }
  }
  assert.ok(!text(hwpx(exportModel(receipt,{},null,{blank:true}))).includes('계약금'));
});
