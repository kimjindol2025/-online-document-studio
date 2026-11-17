import { escapeHtml } from './engine.mjs';

export const RESUME_TEMPLATES = [
  {id:'basic',name:'기본형',description:'단정한 표와 구분선'},
  {id:'accent',name:'컬러 포인트형',description:'따뜻한 앰버 포인트'},
  {id:'banner',name:'프로필 배너형',description:'사진과 이름을 크게'}
];
export const MAX_PHOTO_LENGTH = 120000;
export const defaultPresentation = () => ({template:'basic',photo:null});
export function normalizePresentation(value) {
  if(value === undefined || value === null) return defaultPresentation();
  if(typeof value!=='object'||Array.isArray(value)||!RESUME_TEMPLATES.some(t=>t.id===value.template)) throw Error('지원하지 않는 이력서 템플릿입니다.');
  let photo=null;
  if(value.photo!==undefined&&value.photo!==null){
    const p=value.photo;
    if(typeof p!=='object'||typeof p.data!=='string'||p.data.length>MAX_PHOTO_LENGTH||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(p.data)) throw Error('사진 데이터가 올바르지 않습니다.');
    for(const [key,min,max] of [['width',1,800],['height',1,800],['zoom',1,3],['x',0,100],['y',0,100]]){
      if(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error('사진 크기 또는 위치가 올바르지 않습니다.');
    }
    if(!Number.isInteger(p.width)||!Number.isInteger(p.height))throw Error('사진 크기가 올바르지 않습니다.');
    photo={data:p.data,width:p.width,height:p.height,zoom:p.zoom,x:p.x,y:p.y};
  }
  return {template:value.template,photo};
}
export function photoGeometry(photo) {
  const ratio=photo.width/photo.height,frameRatio=3/4;
  const width=Math.max(1,ratio/frameRatio)*photo.zoom*100;
  const height=Math.max(1,frameRatio/ratio)*photo.zoom*100;
  return {width,height,left:(100-width)*photo.x/100,top:(100-height)*photo.y/100};
}
export function renderPhoto(photo) {
  if(!photo)return '';
  const g=photoGeometry(photo);
  return `<div class="resume-photo"><img alt="이력서 사진" src="${escapeHtml(photo.data)}" style="width:${g.width}%;height:${g.height}%;left:${g.left}%;top:${g.top}%"></div>`;
}
export function renderResumeDocument(doc, answers, proposed, {blank=false}={}) {
  const presentation=normalizePresentation(proposed);
  const text=value=>blank||!String(value??'').trim()?'<span class="blank-line">________________</span>':escapeHtml(value).replace(/\n/g,'<br>');
  const photo=blank?'':renderPhoto(presentation.photo);
  const contact=[['birthDate','생년월일'],['phone','연락처'],['email','이메일'],['address','주소']]
    .filter(([id])=>blank||String(answers[id]??'').trim())
    .map(([id,label])=>`<div><dt>${label}</dt><dd>${text(answers[id])}</dd></div>`).join('');
  const tables=['education','work'].map(id=>{
    const field=doc.fields.find(f=>f.id===id);
    const entered=blank?[]:(Array.isArray(answers[id])?answers[id]:[]).filter(row=>row&&Object.values(row).some(v=>String(v??'').trim()));
    const rows=entered.length?entered:[{}];
    return `<section class="resume-section"><h3>${escapeHtml(field.label)}</h3><table class="resume-table"><thead><tr>${field.columns.map(c=>`<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${field.columns.map(c=>`<td>${text(row[c.id])}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`;
  }).join('');
  const notes=[['certifications','자격·면허'],['introduction','자기소개']].map(([id,label])=>`<section class="resume-section resume-notes"><h3>${label}</h3><div>${text(answers[id])}</div></section>`).join('');
  return `<article class="document-sheet resume-sheet resume-${presentation.template}${photo?' has-photo':''}" aria-label="이력서 미리보기">
    <div class="resume-kicker">RESUME <span>이력서</span></div>
    <header class="resume-header">${photo}<div class="resume-identity"><p class="resume-label">나를 소개하는 한 장</p><h2>${text(answers.fullName)}</h2><dl class="resume-contact">${contact}</dl></div></header>
    <div class="resume-body">${tables}<div class="resume-note-grid">${notes}</div></div>
    <footer class="resume-footer"><p>${escapeHtml(doc.notice)}</p><span>작성자 / 확인자: ____________________ (서명 또는 날인)</span></footer>
  </article>`;
}
