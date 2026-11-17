import { escapeHtml,formatFieldNumber } from './engine.mjs';
import {BUSINESS_IDS,businessItemTable,businessTotals} from './business-rules.mjs';
export function renderBusinessDocument(doc,answers,{blank=false}={}){
  const empty='<span class="blank-line">________________</span>';
  const view=value=>String(value??'').trim()?escapeHtml(value).replace(/\r\n|\r|\n/g,'<br>'):empty;
  const field=f=>{
    const value=blank?(f.blankTemplate||''):answers[f.id];
    const display=!blank&&f.type==='number'&&String(value??'').trim()&&Number.isFinite(Number(value))?view(formatFieldNumber(f,value)):view(value);
    const space=blank&&doc.layout==='structured'&&f.type==='textarea'&&!f.blankTemplate?` style="min-height:${Math.max(2,Math.min(10,Number(f.rows)||3))*1.5}em"`:'';
    return `<div class="business-field${f.type==='textarea'?' wide':''}"><dt>${escapeHtml(f.label)}</dt><dd${space}>${display}</dd></div>`;
  };
  const groups=[];
  for(const f of doc.fields){let group=groups.find(g=>g.name===f.group);if(!group){group={name:f.group,fields:[]};groups.push(group);}group.fields.push(f);}
  const section=g=>`<section class="business-section"><h3>${escapeHtml(g.name)}</h3><dl class="business-fields">${g.fields.map(field).join('')}</dl></section>`;
  const table=b=>`<table class="business-items"><thead><tr>${b.rows[0].map(c=>`<th>${escapeHtml(c.text)}</th>`).join('')}</tr></thead><tbody>${b.rows.slice(1).map(row=>`<tr>${row.map(c=>`<td>${view(c.text)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const parts=[];let parties=false;const partyGroups=doc.partyGroups||[];
  for(const g of groups){
    if(partyGroups.includes(g.name)){
      if(!parties){parts.push(`<div class="business-parties">${partyGroups.map(name=>section(groups.find(g=>g.name===name))).join('')}</div>`);parties=true;}continue;
    }
    if(BUSINESS_IDS.has(doc.id)&&g.fields.some(f=>f.id==='items')){
      const rate=g.fields.find(f=>f.id==='taxRate');
      parts.push(`<section class="business-section"><h3>품목·금액</h3>${rate?`<dl class="business-fields">${field(rate)}</dl>`:''}${table(businessItemTable(doc,answers,blank))}<dl class="business-totals">${businessTotals(doc,answers,blank).rows.map(([label,value])=>`<div><dt>${escapeHtml(label.text)}</dt><dd>${view(value.text)}</dd></div>`).join('')}</dl></section>`);
    }else parts.push(section(g));
  }
  return `<article class="document-sheet business-sheet business-${doc.businessTheme}" aria-label="${escapeHtml(doc.title)} 미리보기"><header class="business-head"><small>BUSINESS DOCUMENT</small><h2>${escapeHtml(doc.title)}</h2></header>${parts.join('')}<footer class="business-footer"><p>${escapeHtml(doc.closing)}</p><p>${escapeHtml(doc.signature)}</p><small>${escapeHtml(doc.notice)}</small></footer></article>`;
}
