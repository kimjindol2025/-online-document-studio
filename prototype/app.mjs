import { definitions } from "./generated-catalog.mjs";
import { emptyAnswers, validateAnswers, renderDocument, normalizeImportedAnswers } from "./engine.mjs";
import { RESUME_TEMPLATES, defaultPresentation, normalizePresentation, renderResumeDocument } from "./resume-templates.mjs";
import { createPhotoTools, verifyImportedPhoto } from "./resume-photo-tools.mjs";
import { nativeFile, EXPORT_FORMATS } from './native-downloads.mjs';
import { renderBusinessDocument } from './business-renderer.mjs';

const get = id => document.getElementById(id);
const docs = definitions.filter(doc => doc.status === "public");
const state = { doc: null, answers: {}, presentation: defaultPresentation(), printing: false, templatePickerOpen: false };
const fieldsPanel = get("form-fields"), paper = get("paper"), docList = get("doc-list");
const keyFor = id => "document-studio:v1:" + id;
const icons = { resume:"👤", incident:"✎", receipt:"🧾", quotation:'▤',invoice:'₩','purchase-order':'▣',contract:'✍' };

function node(tag, cls, text) {
  const n=document.createElement(tag);
  if(cls) n.className=cls;
  if(text!==undefined) n.textContent=text;
  return n;
}
function message(text, kind="") {
  const target=get("status");
  target.textContent=text;
  target.className="status-note" + (kind ? " "+kind : "");
}
function readDraft(doc) {
  const empty=()=>({answers:emptyAnswers(doc),presentation:defaultPresentation()});
  try {
    const s=localStorage.getItem(keyFor(doc.id));
    if(!s)return empty();
    const data=JSON.parse(s);
    if(data.schemaVersion!==1||data.documentId!==doc.id)return empty();
    const answers=normalizeImportedAnswers(doc,data.answers);
    let presentation=defaultPresentation();
    try{if(doc.id==='resume')presentation=normalizePresentation(data.presentation);}catch{}
    return {answers,presentation};
  }catch{return empty();}
}
function saveDraft() {
  try {
    localStorage.setItem(keyFor(state.doc.id),JSON.stringify({
      schemaVersion:1,documentId:state.doc.id,updatedAt:new Date().toISOString(),answers:state.answers,
      ...(state.doc.id==='resume'?{presentation:state.presentation}:{})
    }));
    return true;
  }catch{message("브라우저 저장이 차단됐습니다. 편집본을 파일로 백업하세요.","error");return false;}
}
function catalog(search="") {
  docList.replaceChildren();
  const q=search.trim().toLocaleLowerCase("ko-KR");
  const category=get('doc-category').value;
  const visible=docs.filter(d=>(!category||d.category===category)&&(d.title+" "+d.summary+" "+d.category).toLocaleLowerCase("ko-KR").includes(q));
  get('doc-count').textContent=visible.length+' / '+docs.length+'종';
  for(const doc of visible) {
    const btn=node("button","doc-item"+(state.doc?.id===doc.id?" is-active":""));
    btn.type="button";btn.dataset.select=doc.slug;btn.setAttribute("aria-pressed",String(state.doc?.id===doc.id));
    const icon=node("span","doc-symbol",icons[doc.id]||"▤");
    icon.setAttribute("aria-hidden","true");
    const info=node("span");info.append(node("strong","",doc.id==='resume'?'이력서':doc.title),node("small","",doc.category));
    btn.append(icon,info);docList.append(btn);
  }
  if(!docList.childElementCount)docList.append(node("p","empty-state","검색 결과가 없습니다."));
}
function labelledControl(field, value, opts={}) {
  const wrap=node("div","form-field");
  const label=node("label","",field.label+(field.required?" *":""));
  const id=opts.id||"f-"+field.id;
  label.htmlFor=id;
  const type=field.type;
  let input;
  if(type==="textarea") {
    input=node("textarea");input.rows=field.rows||3;input.placeholder=field.placeholder||"";
  } else if(type==="select") {
    input=node("select");
    input.append(node("option","","선택하세요"));
    input.firstChild.value="";
    for(const option of field.options){const o=node("option","",option);o.value=option;input.append(o);}
  } else {
    input=node("input");input.type=type==="number"?"number":type;
    input.placeholder=field.placeholder||"";
    if(type==="number"){input.inputMode="numeric";input.step=field.step||"1";if(field.min!==undefined)input.min=field.min;if(field.max!==undefined)input.max=field.max;}
  }
  input.id=id;input.value=String(value??"");
  input.dataset.field=field.id;input.maxLength=12000;input.autocomplete="off";
  if(opts.row!==undefined){input.dataset.row=opts.row;input.dataset.column=opts.column;}
  wrap.append(label,input);
  if(field.hint)wrap.append(node("p","form-tip",field.hint));
  return wrap;
}
function repeater(field,rows) {
  const wrap=node("div","form-field");
  wrap.append(node("label","",field.label));
  wrap.append(node("p","form-tip",field.hint||"필요한 만큼 항목을 추가하세요. 빈 행은 출력되지 않습니다."));
  const actual=Array.isArray(rows)?rows:[{}];
  actual.forEach((row,i)=>{
    const card=node("div","repeat-item");
    const head=node("div","repeat-head");
    head.append(node("span","",String(i+1)+"번째 항목"));
    const remove=node("button","text-button danger","행 삭제");
    remove.type="button";remove.dataset.remove=field.id;remove.dataset.row=String(i);
    remove.setAttribute("aria-label",String(i+1)+"번째 항목 삭제");
    head.append(remove);card.append(head);
    const cols=node("div","repeat-columns");
    for(const column of field.columns){
      cols.append(labelledControl({...column,id:field.id,type:column.type||"text"},row?.[column.id]??"",{id:field.id+"-"+column.id+"-"+i,row:i,column:column.id}));
    }
    card.append(cols);wrap.append(card);
  });
  const add=node("button","text-button","+ 항목 추가");add.type="button";add.dataset.add=field.id;
  wrap.append(add);
  return wrap;
}
function renderFields(){
  fieldsPanel.replaceChildren();
  if(state.doc.id==='resume')fieldsPanel.append(createPhotoTools({
    getPresentation:()=>state.presentation,isActive:()=>state.doc?.id==='resume'&&!state.printing,
    onChange:changePresentation,onMessage:message
  }));
  let current=null,group=null,counter=0;
  for(const field of state.doc.fields){
    if(field.group!==current){
      current=field.group;group=node("div","field-group");
      const h=node("h3");h.append(node("span","group-number",String(++counter)),document.createTextNode(current||"기본 정보"));
      group.append(h);fieldsPanel.append(group);
    }
    const wrap=field.type==="repeater"?repeater(field,state.answers[field.id]):labelledControl(field,state.answers[field.id]);
    group.append(wrap);
  }
}
function renderCurrentDocument(blank=false){
  if(['business','structured'].includes(state.doc.layout))return renderBusinessDocument(state.doc,state.answers,{blank});
  return state.doc.id==='resume'?renderResumeDocument(state.doc,state.answers,state.presentation,{blank}):renderDocument(state.doc,state.answers,{blank});
}
function syncTemplateControls(){
  const resume=state.doc?.id==='resume';
  if(!resume)state.templatePickerOpen=false;
  get('preview-template-toggle').hidden=!resume;
  get('preview-template-toggle').setAttribute('aria-expanded',String(resume&&state.templatePickerOpen));
  get('preview-template-picker').hidden=!resume||!state.templatePickerOpen;
  for(const button of document.querySelectorAll('[data-template], [data-preview-template]')){
    button.setAttribute('aria-pressed',String((button.dataset.template||button.dataset.previewTemplate)===state.presentation.template));
  }
}
function changePresentation(presentation){
  state.presentation=normalizePresentation(presentation);
  const ok=saveDraft();preview();
  if(ok)message('이력서 스타일을 저장했습니다.','good');
  return ok;
}
function preview(){
  const issues=validateAnswers(state.doc,state.answers);
  paper.innerHTML=renderCurrentDocument();
  syncTemplateControls();
  const chip=get("validation-chip");
  chip.textContent=issues.length?"확인 필요 "+issues.length+"건":"✓ 입력 검증 통과";
  chip.style.background=issues.length?"#fff2e7":"#e8f5ee";
  chip.style.color=issues.length?"#8b550f":"#176244";
}
function selectDoc(doc,updateUrl=true){
  if(!doc)return;
  state.templatePickerOpen=false;
  state.doc=doc;const draft=readDraft(doc);state.answers=draft.answers;state.presentation=draft.presentation;
  get("doc-title").textContent=doc.id==='resume'?'이력서 만들기':doc.title;get("doc-summary").textContent=doc.summary;
  renderFields();preview();catalog(get("doc-search").value);
  if(updateUrl){const url=new URL(location.href);url.searchParams.set("doc",doc.slug);history.replaceState(null,"",url);}
  message("작성 내용은 이 기기에 임시 보관됩니다.");
}
function showErrors(issues){
  get("field-errors")?.remove();
  if(!issues.length)return;
  const n=node("div","error-summary",issues.map(i=>"• "+i.message).join("\n"));
  n.id="field-errors";n.setAttribute("role","alert");n.style.whiteSpace="pre-line";
  fieldsPanel.prepend(n);
  const first=fieldsPanel.querySelector('[data-field="'+issues[0].field+'"]');
  first?.focus();
}
function updateField(target){
  const id=target.dataset.field;
  if(!id)return;
  const field=state.doc.fields.find(f=>f.id===id);
  if(!field)return;
  if(field.type==="repeater"){
    const i=Number(target.dataset.row), column=target.dataset.column;
    if(!Number.isInteger(i)||i<0||i>=40||!field.columns.some(c=>c.id===column))return;
    (state.answers[id] ||= [])[i] ||= {};
    state.answers[id][i][column]=target.value;
  }else state.answers[id]=target.value;
  get("field-errors")?.remove();
  const ok=saveDraft();preview();if(ok)message("입력값을 이 브라우저에 임시 저장했습니다.","good");
}
function mobile(previewVisible){
  get("editor-panel").classList.toggle("hide-mobile",previewVisible);
  get("preview-panel").classList.toggle("show",previewVisible);
}
function printDocument(blank){
  if(state.printing)return;
  const errors=validateAnswers(state.doc,state.answers);
  if(errors.length&&!blank){showErrors(errors);mobile(false);message("필수 항목 오류 "+errors.length+"건을 확인하세요.","error");return;}
  state.printing=true;
  const restore=()=>{paper.innerHTML=renderCurrentDocument();state.printing=false;};
  paper.innerHTML=renderCurrentDocument(!!blank);
  window.addEventListener("afterprint",restore,{once:true});
  message(blank?"빈 양식 인쇄 화면을 엽니다.":"인쇄 화면에서 PDF로 저장을 선택하세요.");
  window.print();
  setTimeout(()=>{if(state.printing)restore();},6000);
}
let exportBlank=false,exportBusy=false;
function validForExport(blank){
  const issues=blank?[]:validateAnswers(state.doc,state.answers);
  if(!issues.length)return true;
  showErrors(issues);mobile(false);message('입력 오류 '+issues.length+'건을 확인하세요.','error');return false;
}
function openDownload(blank){
  if(state.printing||exportBusy||!validForExport(blank))return;
  exportBlank=blank;
  get('download-title').textContent=(blank?'빈 양식':'작성본')+' 다운로드';
  get('download-description').textContent=blank?'입력한 내용과 사진 없이 작성할 수 있는 빈 양식을 저장합니다.':'입력한 내용과 선택한 이력서 사진을 포함해 저장합니다.';
  get('download-feedback').textContent='';get('download-dialog').showModal();
}
async function downloadFormat(format){
  if(exportBusy)return;
  if(!validForExport(exportBlank)){get('download-dialog').close();return;}
  if(format==='pdf'){get('download-dialog').close();printDocument(exportBlank);return;}
  if(!Object.hasOwn(EXPORT_FORMATS,format))return;
  exportBusy=true;
  for(const b of get('download-dialog').querySelectorAll('button'))b.disabled=true;
  const feedback=get('download-feedback');feedback.textContent='파일을 만들고 있습니다…';
  try{
    const file=await nativeFile(format,state.doc,state.answers,state.presentation,{blank:exportBlank});
    const url=URL.createObjectURL(new Blob([file.bytes],{type:file.mime})),a=node('a');
    a.href=url;a.download=file.filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    feedback.textContent=file.filename+' 다운로드를 시작했습니다.';
    message(file.filename+' 파일을 저장했습니다. 출력 전 배치를 확인하세요.','good');
  }catch(error){feedback.textContent='다운로드 실패: '+error.message;message(feedback.textContent,'error');}
  finally{exportBusy=false;for(const b of get('download-dialog').querySelectorAll('button'))b.disabled=false;}
}
function saveBackup(){
  const data={schemaVersion:1,documentId:state.doc.id,documentTitle:state.doc.title,exportedAt:new Date().toISOString(),answers:state.answers,...(state.doc.id==='resume'?{presentation:state.presentation}:{})};
  if(new TextEncoder().encode(JSON.stringify(data)).length>200000){message('백업이 200KB를 넘습니다. 사진이나 긴 내용을 줄여주세요.','error');return;}
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=node("a");
  a.href=url;a.download=state.doc.slug+"-backup.json";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  message("편집 가능한 JSON 백업 파일을 저장했습니다. 개인정보를 안전하게 보관하세요.","good");
}
async function loadBackup(file){
  if(!file)return;
  if(file.size>200000){message("백업 파일은 200KB 이하만 지원합니다.","error");return;}
  try{
    const content=JSON.parse(await file.text());
    if(content.schemaVersion!==1)throw new Error("지원하지 않는 백업 버전");
    const doc=docs.find(d=>d.id===content.documentId);
    if(!doc)throw new Error("해당 문서가 등록되지 않았습니다");
    const answers=normalizeImportedAnswers(doc,content.answers);
    const presentation=doc.id==='resume'?normalizePresentation(content.presentation):defaultPresentation();
    await verifyImportedPhoto(presentation.photo);
    if(!confirm("현재 입력 내용이 백업 내용으로 교체됩니다. 계속할까요?"))return;
    state.doc=doc;state.answers=answers;state.presentation=presentation;
    if(get('doc-category').value!==doc.category)get('doc-category').value='';
    get('doc-search').value='';
    get("doc-title").textContent=doc.id==='resume'?'이력서 만들기':doc.title;get("doc-summary").textContent=doc.summary;
    renderFields();preview();saveDraft();catalog(get("doc-search").value);
    const url=new URL(location.href);url.searchParams.set("doc",doc.slug);history.replaceState(null,"",url);
    message("백업을 불러왔습니다. 출력 전 내용을 확인하세요.","good");
  }catch(e){message("백업 불러오기 실패: "+e.message,"error");}
}

fieldsPanel.addEventListener("input",event=>{if(event.target?.dataset.field)updateField(event.target);});
fieldsPanel.addEventListener("change",event=>{if(event.target?.dataset.field)updateField(event.target);});
fieldsPanel.addEventListener("click",event=>{
  const add=event.target.closest("[data-add]"),remove=event.target.closest("[data-remove]");
  if(add){
    const items=state.answers[add.dataset.add];
    if(Array.isArray(items)&&items.length<40){items.push({});renderFields();saveDraft();preview();}
    else message("항목은 최대 40개까지 추가할 수 있습니다.","error");
  }
  if(remove){
    const items=state.answers[remove.dataset.remove],i=Number(remove.dataset.row);
    if(Array.isArray(items)&&Number.isInteger(i)&&i>=0&&i<items.length){items.splice(i,1);renderFields();saveDraft();preview();}
  }
});
get("doc-search").addEventListener("input",e=>catalog(e.target.value));
get('doc-category').addEventListener('change',()=>catalog(get('doc-search').value));
docList.addEventListener("click",e=>{
  const btn=e.target.closest("[data-select]");if(!btn)return;
  selectDoc(docs.find(d=>d.slug===btn.dataset.select));mobile(false);
});
get("print-button").addEventListener("click",()=>printDocument(false));
get("blank-button").addEventListener("click",()=>printDocument(true));
get('download-button').addEventListener('click',()=>openDownload(false));
get('blank-download-button').addEventListener('click',()=>openDownload(true));
get('download-close').addEventListener('click',()=>get('download-dialog').close());
get('download-dialog').addEventListener('cancel',event=>{if(exportBusy)event.preventDefault();});
for(const button of document.querySelectorAll('[data-download-format]'))button.addEventListener('click',()=>downloadFormat(button.dataset.downloadFormat));
get("backup-button").addEventListener("click",saveBackup);
get("import-button").addEventListener("click",()=>get("import-file").click());
get("import-file").addEventListener("change",e=>{loadBackup(e.target.files?.[0]);e.target.value="";});
get("clear-button").addEventListener("click",()=>{
  if(!confirm("저장된 현재 문서 내용을 삭제합니다. 복구할 수 없습니다. 계속할까요?"))return;
  try{localStorage.removeItem(keyFor(state.doc.id));}catch{}
  state.answers=emptyAnswers(state.doc);state.presentation=defaultPresentation();renderFields();preview();message("문서 입력 내용을 초기화했습니다.");
});
get("mobile-edit").addEventListener("click",()=>mobile(false));
get("mobile-preview").addEventListener("click",()=>mobile(true));
for(const template of RESUME_TEMPLATES){
  const button=node('button','preview-template-option',template.name);
  button.type='button';button.dataset.previewTemplate=template.id;button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{
    if(state.doc?.id==='resume'&&!state.printing)changePresentation({...state.presentation,template:template.id});
  });
  get('preview-template-picker').append(button);
}
get('preview-template-toggle').addEventListener('click',()=>{
  if(state.doc?.id!=='resume'||state.printing)return;
  state.templatePickerOpen=!state.templatePickerOpen;syncTemplateControls();
});
for(const category of [...new Set(docs.map(d=>d.category))]){
  const option=node('option','',category);option.value=category;get('doc-category').append(option);
}
selectDoc(docs.find(d=>d.slug===new URL(location.href).searchParams.get("doc"))||docs[0],false);
