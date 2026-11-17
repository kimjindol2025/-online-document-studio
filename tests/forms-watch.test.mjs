import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assessDefinition,assessChanges,canFastForward,inspectBranch,checkCredentialMetadata} from '../tools/watch-github-forms.mjs';
const minimal={schemaVersion:1,id:'sample',slug:'sample',title:'예제',summary:'예제 설명',status:'public',fields:[{id:'content',label:'내용',type:'textarea'}]};
test('a one-field stub is a draft even though legacy schema validation succeeds',()=>{
 const a=assessDefinition(minimal);assert.deepEqual(a.schemaIssues,[]);assert.equal(a.singleContent,true);assert.equal(a.emptyAccepted,true);assert.equal(a.quality,'DRAFT');
});
test('metadata headers alone do not turn a tax or legal stub into a complete form',()=>{
 const a=assessDefinition({...minimal,fields:[{id:'documentNo',label:'문서번호',type:'text',required:true},{id:'date',label:'작성일',type:'date',required:true},{id:'writer',label:'작성자',type:'text',required:true},{id:'content',label:'내용',type:'textarea'}]});
 assert.equal(a.quality,'DRAFT');assert.ok(a.reasons.includes('문서별 전용 항목 부족'));assert.equal(a.emptyAccepted,false);
});
test('specific fields are candidates for review, never a claim of verified legal completeness',()=>{
 const a=assessDefinition({...minimal,fields:[{id:'fullName',label:'이름',type:'text',required:true},{id:'startDate',label:'시작일',type:'date',required:true},{id:'endDate',label:'종료일',type:'date',required:true},{id:'reason',label:'사유',type:'textarea',required:true}]});
 assert.equal(a.quality,'FUNCTIONAL_REVIEW_NEEDED');assert.equal(a.emptyAccepted,false);
});
test('unsafe paths and secret payloads block mirroring; malformed drafts are reported separately',()=>{
 const token='ghp_'+'A'.repeat(36);
 for(const entry of [{name:'src/run.js',bytes:'do not execute'},{name:'definitions/sample.json',bytes:'{'},{name:'definitions/sample.json',bytes:'null'},{name:'definitions/sample.json',bytes:JSON.stringify({...minimal,default:token})}])assert.ok(assessChanges([entry]).errors.length);
 assert.equal(assessChanges([{name:'definitions/sample.json',bytes:'{'}]).blockers.length,0);
 assert.equal(assessChanges([{name:'src/run.js',bytes:''}]).blockers.length,1);
 assert.equal(assessChanges([{name:'definitions/sample.json',bytes:JSON.stringify({...minimal,default:token})}]).blockers.length,1);
});
test('Unicode filenames are audited without Git quoting loss while invalid schema IDs remain failures',()=>{
 const a=assessChanges([{name:'definitions/한글양식.json',bytes:JSON.stringify({...minimal,id:'한글양식',slug:'한글양식'})}]);
 assert.equal(a.rows.length,1);assert.equal(a.schemaInvalid,1);assert.equal(a.blockers.length,0);assert.equal(a.rows[0].quality,'DRAFT');
});
test('duplicate IDs and path/ID mismatches are rejected',()=>{
 const result=assessChanges([{name:'definitions/sample.json',bytes:JSON.stringify(minimal)},{name:'definitions/other.json',bytes:JSON.stringify(minimal)}]);
 assert.ok(result.errors.some(e=>e.reason.includes('중복')));assert.ok(result.errors.some(e=>e.reason.includes('불일치')));
});
test('fast-forward check accepts ancestry and rejects divergent Git histories',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-watch-test-'));
 try{
  const git=(args,input)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',input,stdio:['pipe','pipe','pipe']}).trim();
  git(['init','--initial-branch=main']);const tree=git(['mktree'],'');
  const base=git(['commit-tree',tree], 'base\n'),first=git(['commit-tree',tree,'-p',base],'one\n'),second=git(['commit-tree',tree,'-p',base],'two\n');
  assert.equal(canFastForward(dir,null,first),true);assert.equal(canFastForward(dir,base,first),true);assert.equal(canFastForward(dir,first,second),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('unsafe branch strings fail before running Git',()=>{
 for(const b of ['../outside','main; echo bad','-main'])assert.throws(()=>inspectBranch('/missing',b),/잘못된 브랜치/);
});
test('credential metadata allows mode 600 and rejects broad permissions without reading values',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-auth-metadata-')),file=path.join(dir,'credential.fixture');
 try{fs.writeFileSync(file,'synthetic fixture',{mode:0o600});assert.doesNotThrow(()=>checkCredentialMetadata(file));fs.chmodSync(file,0o644);assert.throws(()=>checkCredentialMetadata(file),/600/);assert.throws(()=>checkCredentialMetadata(path.join(dir,'missing')),/권한/);}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
