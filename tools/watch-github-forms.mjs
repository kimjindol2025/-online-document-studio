// Git/process/report integration adapter. Never executes code from the watched ref.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateDefinition,validateAnswers,emptyAnswers} from '../prototype/engine.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const GENERIC=new Set(['documentNo','date','writer','fullName','content']);
const DEFINITION_PATH=/^definitions\/[\p{L}\p{N}][\p{L}\p{N}_-]*\.json$/u;
const SECRET=/(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,}|AKIA[0-9A-Z]{16}|https?:\/\/[^\s/@:]+:[^\s/@]+@)/;
export function assessDefinition(doc){
  let schemaIssues=[];
  try{schemaIssues=validateDefinition(doc);}catch{schemaIssues=['정의 구조를 검사할 수 없습니다.'];}
  const fields=Array.isArray(doc?.fields)?doc.fields:[];
  const substantive=fields.filter(f=>f&&typeof f==='object'&&!GENERIC.has(f.id));
  let emptyAccepted=false;
  if(!schemaIssues.length){try{emptyAccepted=validateAnswers(doc,emptyAnswers(doc)).length===0;}catch{schemaIssues.push('초기 입력 검증 오류');}}
  const reasons=[];
  if(schemaIssues.length)reasons.push('스키마 오류');
  if(fields.length<4)reasons.push('입력 항목 부족');
  if(substantive.length<2)reasons.push('문서별 전용 항목 부족');
  if(emptyAccepted)reasons.push('빈 작성본 출력 허용');
  return {id:doc?.id,title:doc?.title,fieldCount:fields.length,requiredCount:fields.filter(f=>f?.required).length,
    singleContent:fields.length===1&&fields[0]?.id==='content',schemaIssues,emptyAccepted,
    quality:reasons.length?'DRAFT':'FUNCTIONAL_REVIEW_NEEDED',reasons};
}
export function assessChanges(entries){
  const ids=new Set(),rows=[],errors=[],blockers=[];
  const issue=(name,reason,blocking=false)=>{const value={path:name,reason};errors.push(value);if(blocking)blockers.push(value);};
  for(const {name,bytes} of entries){
    if(!DEFINITION_PATH.test(name)){issue(name,'정의 이외 경로 변경',true);continue;}
    if(Buffer.byteLength(bytes)>262144){issue(name,'정의 파일 크기 초과',true);continue;}
    if(SECRET.test(bytes)){issue(name,'비밀값 패턴 발견',true);continue;}
    let doc;try{doc=JSON.parse(bytes);}catch{errors.push({path:name,reason:'JSON 파싱 오류'});continue;}
    if(!doc||typeof doc!=='object'||Array.isArray(doc)){errors.push({path:name,reason:'정의 객체가 아님'});continue;}
    const row={path:name,...assessDefinition(doc)};rows.push(row);
    if(ids.has(doc.id))errors.push({path:name,reason:'정의 ID 중복'});ids.add(doc.id);
    if(doc.id!==path.basename(name,'.json'))errors.push({path:name,reason:'파일명과 ID 불일치'});
    if(row.schemaIssues.length)errors.push({path:name,reason:'스키마 오류'});
  }
  return {rows,errors,blockers,schemaValid:rows.filter(r=>!r.schemaIssues.length).length,schemaInvalid:rows.filter(r=>r.schemaIssues.length).length,singleContent:rows.filter(r=>r.singleContent).length,emptyAccepted:rows.filter(r=>r.emptyAccepted).length,
    drafts:rows.filter(r=>r.quality==='DRAFT').length,reviewCandidates:rows.filter(r=>r.quality==='FUNCTIONAL_REVIEW_NEEDED').length};
}
export function checkCredentialMetadata(file=path.join(os.homedir(),'.config','forgejo','credentials.env')){
  try{const stat=fs.statSync(file);fs.accessSync(file,fs.constants.R_OK);if(!stat.isFile()||(stat.mode&0o777)!==0o600)throw Error();}
  catch{throw Error('FG 인증 파일의 읽기 권한/600 모드를 확인해야 합니다. 내용은 읽지 않습니다.');}
}
function git(root,args){
  if(['ls-remote','fetch','push'].includes(args[0])&&args.includes('fg'))checkCredentialMetadata();
  try{return execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0'},stdio:['ignore','pipe','pipe']}).trim();}
  catch(e){throw Error('Git '+args[0]+' 실패 ('+(e.status??e.code??'unknown')+')');}
}
function checkRemote(root,alias,host,repo){
  for(const push of [false,true]){
    const raw=git(root,['remote','get-url',...(push?['--push']:[]),alias]);let u;
    try{u=new URL(raw);}catch{throw Error('HTTPS 원격 URL이 필요합니다.');}
    if(u.protocol!=='https:'||u.hostname!==host||u.pathname.replace(/\.git$/,'')!==repo||u.username||u.password||u.search||u.hash)throw Error('원격 대상 불일치: '+alias);
  }
}
export function canFastForward(root,oldTip,newTip){
  if(!oldTip||oldTip===newTip)return true;
  try{git(root,['merge-base','--is-ancestor',oldTip,newTip]);return true;}catch{return false;}
}
export function inspectBranch(root,branch){
  if(!/^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(branch)||branch.includes('..'))throw Error('잘못된 브랜치');
  const source='refs/remotes/origin/'+branch;
  git(root,['fetch','--no-tags','origin','refs/heads/'+branch+':'+source]);
  const commit=git(root,['rev-parse',source]),base=git(root,['merge-base','HEAD',source]);
  const names=git(root,['diff','--name-only','-z',base,source]).split('\0').filter(Boolean);
  const entries=names.map(name=>({name,bytes:DEFINITION_PATH.test(name)?git(root,['show',source+':'+name]):''}));
  const audit=assessChanges(entries);
  const sourceNames=git(root,['ls-tree','-r','--name-only','-z',source,'--','definitions']).split('\0').filter(n=>n.endsWith('.json'));
  const seen=new Set();let sourcePublic=0;
  for(const name of sourceNames){
    let doc;try{doc=JSON.parse(git(root,['show',source+':'+name]));}catch{audit.errors.push({path:name,reason:'원격 정의 JSON 오류'});continue;}
    if(!doc||typeof doc!=='object')continue;
    if(seen.has(doc.id))audit.errors.push({path:name,reason:'원격 전체 정의 ID 중복'});seen.add(doc.id);sourcePublic+=doc.status==='public';
  }
  const localNames=fs.readdirSync(path.join(root,'definitions')).filter(n=>n.endsWith('.json'));
  const localPublic=localNames.filter(n=>JSON.parse(fs.readFileSync(path.join(root,'definitions',n),'utf8')).status==='public').length;
  return {commit,base,branch,sourceDefinitions:sourceNames.length,sourceDeclaredPublic:sourcePublic,activePublic:localPublic,changedFiles:names.length,...audit};
}
function mirror(root,branch,commit,stopped){
  const ref='refs/heads/'+branch;
  const line=git(root,['ls-remote','fg',ref]);const remote=line?line.split(/\s+/)[0]:null;
  if(remote===commit)return {status:'PASS',remoteCommit:remote,stopped:false};
  if(stopped)return {status:'BLOCKED',stopped:true,reason:'이전 변경 실패 후 자동 재시도 중지'};
  if(remote){
    git(root,['fetch','--no-tags','fg',ref+':refs/remotes/fg/'+branch]);
    if(!canFastForward(root,remote,commit))return {status:'BLOCKED',stopped:true,reason:'FG 브랜치가 분기됨. 강제 푸시하지 않음'};
  }
  git(root,['push','fg','refs/remotes/origin/'+branch+':'+ref]);
  const after=git(root,['ls-remote','fg',ref]).split(/\s+/)[0];
  if(after!==commit)throw Error('FG ref 검증 불일치');
  return {status:'PASS',remoteCommit:after,stopped:false};
}
export function checkOnce({root=ROOT,branch='add-30-forms',stateDir,mirrorEnabled=false,intervalSeconds=300}){
  fs.mkdirSync(stateDir,{recursive:true});const stateFile=path.join(stateDir,'status.json');let previous={};
  try{previous=JSON.parse(fs.readFileSync(stateFile,'utf8'));}catch{}
  const result={checkedAt:new Date().toISOString(),nextCheckAt:new Date(Date.now()+intervalSeconds*1000).toISOString(),branch,intervalSeconds,
    policy:'소스 동기화와 품질 보고. main/미리보기 자동 병합 없음',mirror:{status:mirrorEnabled?'UNVERIFIED':'NOT_REQUESTED',stopped:Boolean(previous.mirror?.stopped)},pid:process.pid};
  try{
    checkRemote(root,'origin','github.com','/kimjindol2025/-online-document-studio');
    if(mirrorEnabled)checkRemote(root,'fg','fg.dclub.kr','/kim/online_document');
    result.audit=inspectBranch(root,branch);result.status=result.audit.blockers.length?'BLOCKED':result.audit.errors.length?'CHECKED_WITH_ISSUES':'CHECKED';
    if(mirrorEnabled&&!result.audit.blockers.length){
      try{result.mirror=mirror(root,branch,result.audit.commit,previous.mirror?.stopped);}
      catch(e){result.mirror={status:'BLOCKED',stopped:true,reason:e.message};}
    }
    if(result.audit.blockers.length)result.mirror={status:'BLOCKED',stopped:previous.mirror?.stopped||false,reason:'허용 범위/비밀값 검사로 원격 변경 중지'};
  }catch(e){result.status='BLOCKED';result.error=e.message;}
  if(result.status.startsWith('CHECKED')&&result.mirror.status==='BLOCKED')result.status='PARTIAL';
  fs.writeFileSync(stateFile,JSON.stringify(result,null,2));
  const a=result.audit;
  const md=`# GitHub 양식 확인\n\n- 마지막 확인: ${result.checkedAt}\n- 다음 확인: ${result.nextCheckAt}\n- 브랜치: ${branch}\n- 커밋: ${a?.commit||'미확인'}\n- 소스 변경 파일: ${a?.changedFiles??'미확인'}\n- 원격 public 선언: ${a?.sourceDeclaredPublic??'미확인'}\n- 로컬 public 정의: ${a?.activePublic??'미확인'}종\n- 초안: ${a?.drafts??'미확인'}개\n- 신규 스키마 통과/실패: ${a?.schemaValid??'미확인'} / ${a?.schemaInvalid??'미확인'}\n- 전용 필드 보완 후 기능 검토 후보: ${a?.reviewCandidates??'미확인'}개\n- 내용1칸: ${a?.singleContent??'미확인'}개\n- 빈 작성본 허용: ${a?.emptyAccepted??'미확인'}개\n- FG 소스 동기화: ${result.mirror.status}\n- 결과: ${result.status}\n\n${result.policy}\n\n${(a?.rows||[]).map(r=>'- '+r.title+': '+r.quality+' — '+r.reasons.join(', ')).join('\n')}\n`;
  fs.writeFileSync(path.join(stateDir,'status.md'),md);
  fs.appendFileSync(path.join(stateDir,'history.ndjson'),JSON.stringify({checkedAt:result.checkedAt,commit:a?.commit,status:result.status,changedFiles:a?.changedFiles,drafts:a?.drafts,mirror:result.mirror.status})+'\n');
  return result;
}
async function main(){
  const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
  const stateDir=option('--state-dir',null);if(!stateDir)throw Error('--state-dir 경로가 필요합니다.');
  const intervalSeconds=Number(option('--interval-seconds','300'));if(!Number.isInteger(intervalSeconds)||intervalSeconds<60)throw Error('확인 간격은60초 이상입니다.');
  const branch=option('--branch','add-30-forms'),mirrorEnabled=args.includes('--mirror');
  fs.mkdirSync(stateDir,{recursive:true});const lock=path.join(stateDir,'watch.pid');
  if(args.includes('--watch')){
    if(fs.existsSync(lock)){
      const pid=Number(fs.readFileSync(lock,'utf8'));let live=false;try{process.kill(pid,0);live=true;}catch{}if(live)throw Error('이미 실행 중인 감시기: '+pid);
    }
    fs.writeFileSync(lock,String(process.pid));
    const close=()=>{try{if(Number(fs.readFileSync(lock,'utf8'))===process.pid)fs.unlinkSync(lock);}catch{}process.exit(0);};
    process.on('SIGTERM',close);process.on('SIGINT',close);
  }
  do{
    const result=checkOnce({branch,stateDir,mirrorEnabled,intervalSeconds});
    console.log(JSON.stringify({checkedAt:result.checkedAt,commit:result.audit?.commit,status:result.status,changes:result.audit?.changedFiles,drafts:result.audit?.drafts,fg:result.mirror.status}));
    if(!args.includes('--watch')){if(['BLOCKED','PARTIAL'].includes(result.status))process.exitCode=1;break;}
    await new Promise(resolve=>setTimeout(resolve,intervalSeconds*1000));
  }while(true);
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
