import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {
 validateDefinition,validateAnswers,emptyAnswers,renderDocument,
 validISODate,toHangulWon,formatWon,normalizeImportedAnswers
} from "../prototype/engine.mjs";
import {definitions} from "../prototype/generated-catalog.mjs";
const base=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const load=name=>JSON.parse(readFileSync(resolve(base,"definitions",name+".json"),"utf8"));
const resume=load("resume"),incident=load("incident"),receipt=load("receipt"),minutes=load("meeting-notes");

test("정의 4종 모두 스키마 유효성 통과",()=>{
  for(const doc of [resume,incident,receipt,minutes])assert.deepEqual(validateDefinition(doc),[]);
  assert.equal(definitions.length,3);
  assert.equal(definitions.some(d=>d.slug==="meeting-notes"),false,"내부 테스트 문서는 공개하지 않음");
});
test("4번째 이질적인 문서 JSON만으로 유효성·출력",()=>{
  const input={topic:"설계 검토",date:"2026-11-17",attendees:"A, B",items:[{agenda:"템플릿",result:"다음 단계 검토"}],next:"사례 점검"};
  assert.deepEqual(validateAnswers(minutes,input),[]);
  const html=renderDocument(minutes,input);
  assert.match(html,/회의록/);assert.match(html,/다음 단계 검토/);assert.match(html,/<table/);
});
test("이력서: 필수 이름 누락 오류와 경력 항목 출력",()=>{
  const data=emptyAnswers(resume);
  assert.equal(validateAnswers(resume,data).some(e=>e.field==="fullName"),true);
  data.fullName="홍길동";data.education=[{school:"서울고등학교",period:"2022~2025"}];
  assert.equal(validateAnswers(resume,data).length,0);
  assert.match(renderDocument(resume,data),/홍길동/);
  assert.match(renderDocument(resume,data),/서울고등학교/);
});
test("시말서: 사건 내용은 서비스가 창작하지 않고 입력 그대로 출력",()=>{
  const input={fullName:"작성자",date:"2026-11-17",subject:"경위",description:"제가 본 사실만 적었습니다."};
  assert.deepEqual(validateAnswers(incident,input),[]);
  const html=renderDocument(incident,input);
  assert.match(html,/제가 본 사실만 적었습니다/);
  assert.doesNotMatch(html,/책임을 모두 인정/);
});
test("영수증: 유효 금액·지급자·수령자 검증",()=>{
  const input={kind:"계약금",date:"2026-11-17",payer:"김철수",payee:"박영희",amount:"660000",purpose:"기계장치 계약금"};
  assert.deepEqual(validateAnswers(receipt,input),[]);
  assert.match(renderDocument(receipt,input),/660,000원/);
  assert.match(renderDocument(receipt,input),/육십육만원/);
  assert.ok(validateAnswers(receipt,{...input,amount:"0"}).some(e=>e.field==="amount"));
  assert.ok(validateAnswers(receipt,{...input,amount:"-100"}).some(e=>e.field==="amount"));
  assert.ok(validateAnswers(receipt,{...input,payee:" "}).some(e=>e.field==="payee"));
  assert.ok(validateAnswers(receipt,{...input,kind:"잘못된 항목"}).some(e=>e.field==="kind"));
});
test("날짜·숫자 경계값",()=>{
  assert.equal(validISODate("2026-02-30"),false);
  assert.equal(validISODate("2024-02-29"),true);
  assert.equal(toHangulWon(660000),"육십육만원");
  assert.equal(toHangulWon(0),"영원");
  assert.equal(toHangulWon(10000),"일만원");
  assert.equal(formatWon(33000),"33,000원");
});
test("출력·백업의 사용자 HTML 삽입이 이스케이프된다",()=>{
  const doc=resume;
  const data={...emptyAnswers(doc),fullName:"<script>alert('x')</script>",introduction:"<img src=x onerror=alert(1)>"};
  const result=renderDocument(doc,data);
  assert.doesNotMatch(result,/<script>/);assert.doesNotMatch(result,/<img src=x/);
  assert.match(result,/&lt;script&gt;/);assert.match(result,/&lt;img/);
  const backup=normalizeImportedAnswers(doc,{fullName:"<script>alert(1)</script>",unknown:"do-not-copy"});
  assert.equal(backup.unknown,undefined);
  assert.equal(backup.fullName,"<script>alert(1)</script>");
});
test("문서별 필수항목 및 길이 제한",()=>{
  assert.throws(()=>normalizeImportedAnswers(receipt,{amount:"x".repeat(12001)}),/너무 깁니다/);
  assert.throws(()=>normalizeImportedAnswers(resume,{education:[null]}),/행 형식 오류/);
  assert.ok(validateAnswers(receipt,{payer:"",payee:"",amount:""}).length>=4);
});
test("빌드한 각 문서별 독립 SEO 안내 페이지 존재",()=>{
  for(const doc of [resume,incident,receipt]){
    const page=readFileSync(resolve(base,"prototype","doc-"+doc.slug+".html"),"utf8");
    assert.match(page,/name='description'/);
    assert.ok(page.includes("index.html?doc="+doc.slug));
  }
});
test("웹 앱에 데이터 송신 함수/분석 모듈 미포함 (정적 범위)",()=>{
  const code=readFileSync(resolve(base,"prototype","app.mjs"),"utf8");
  assert.doesNotMatch(code,/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(/);
  assert.match(code,/localStorage\.setItem/);
  assert.match(code,/window\.print/);
});
