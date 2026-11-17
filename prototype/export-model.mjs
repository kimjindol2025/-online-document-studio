import { normalizeImportedAnswers, validateAnswers, formatFieldNumber, toHangulWon } from './engine.mjs';
import { normalizePresentation } from './resume-templates.mjs';
import { BUSINESS_IDS,businessItemTable,businessTotals } from './business-rules.mjs';

export function exportModel(doc, proposed, presentation, {blank=false}={}){
  // Blank mode deliberately never reads proposed answers or photo data.
  const answers=blank?{}:normalizeImportedAnswers(doc,proposed);
  if(!blank){const issues=validateAnswers(doc,answers);if(issues.length)throw Error(issues.map(i=>i.message).join('\n'));}
  const template=doc.id==='resume'?(blank?presentation?.template:normalizePresentation(presentation).template):(doc.businessTheme||'basic');
  const colors={basic:['253342','F1F4F6'],accent:['9A6418','FFF3D9'],banner:['345D6C','E8F0F2'],blue:['284D69','EDF3F7'],green:['265C39','EDF5EF']};
  const [accent,light]=colors[template]||colors.basic;
  const blocks=[];let group=null,block=null;
  const cell=(text='',label=false,extra={})=>({text:String(text??''),label,...extra});
  for(const field of doc.fields){
    if(field.type==='repeater'){
      if(BUSINESS_IDS.has(doc.id)&&field.id==='items'){
        blocks.push(businessItemTable(doc,answers,blank),businessTotals(doc,answers,blank));group=null;continue;
      }
      const entered=blank?[]:answers[field.id].filter(row=>Object.values(row).some(v=>String(v).trim()));
      const rows=entered.length?entered:Array.from({length:blank?3:1},()=>({}));
      blocks.push({heading:field.label,widths:field.columns.map(()=>1/field.columns.length),rows:[
        field.columns.map(c=>cell(c.label,true)),...rows.map(row=>field.columns.map(c=>cell(row[c.id])))
      ]});group=null;continue;
    }
    if(group!==field.group){group=field.group;block={heading:group||'기본 정보',widths:[1/3,2/3],rows:[]};blocks.push(block);}
    const value=blank?(field.blankTemplate||''):answers[field.id];
    const numeric=field.type==='number'&&value!==''&&value!==undefined?Number(value):undefined;
    block.rows.push([cell(field.label,true),cell(numeric!==undefined?formatFieldNumber(field,numeric):value,false,
      {...(numeric!==undefined?{numeric,...(field.unit!==undefined&&field.unit!=='원'?{currency:false}:{})}:{}),...(field.type==='textarea'?{lines:blank&&!field.blankTemplate?(doc.layout==='structured'?Math.max(2,Math.min(10,Number(field.rows)||3)):3):1}:{})})]);
    if(doc.id==='receipt'&&field.id==='amount')block.rows.push([cell('한글 금액',true),cell(blank?'':`일금 ${toHangulWon(Number(value))}정`)]);
  }
  return {id:doc.id,title:({resume:'이력서',incident:'시말서',receipt:'영수증'})[doc.id]||doc.title,
    template,accent,light,blank,blocks,notice:doc.notice||'',
    signature:doc.signature||(doc.id==='receipt'?'수령자: ____________________ (서명 또는 날인)':'작성자: ____________________ (서명 또는 날인)'),photo:null};
}
