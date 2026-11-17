import {lineSupply,lineTax,addAmount,depositWithinAmount,orderedPeriod} from './generated-business-core.mjs';
export const BUSINESS_IDS=new Set(['quotation','invoice','purchase-order','contract','statement']);
export const MAX_MONEY=999999999999;
const whole=(value,min,max)=>/^(?:0|[1-9]\d*)(?:\.0+)?$/.test(String(value??'').trim())&&Number.isSafeInteger(Number(value))&&Number(value)>=min&&Number(value)<=max;
export function calculateItems(doc,answers){
  const source=Array.isArray(answers.items)?answers.items:[];
  const rate=doc.id==='purchase-order'?0:answers.taxRate==='10%'?10:answers.taxRate==='0%'?0:null;
  let supply=0,tax=0,total=0,valid=rate!==null;
  const rows=source.filter(row=>row&&typeof row==='object'&&!Array.isArray(row)&&Object.values(row).some(v=>String(v??'').trim())).map(row=>{
    let good=rate!==null&&whole(row.quantity,1,1000000)&&whole(row.unitPrice,0,MAX_MONEY);
    const amount=good?lineSupply(Number(row.quantity),Number(row.unitPrice)):null;
    const vat=good?lineTax(amount,rate):null;
    const sum=good?addAmount(amount,vat):null;
    good=good&&[amount,vat,sum].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=MAX_MONEY);
    if(good){supply=addAmount(supply,amount);tax=addAmount(tax,vat);total=addAmount(total,sum);}
    valid=valid&&good;
    return {source:row,valid:good,supply:good?amount:null,tax:good?vat:null,total:good?sum:null};
  });
  valid=valid&&rows.length>0&&[supply,tax,total].every(v=>Number.isSafeInteger(v)&&v<=MAX_MONEY);
  return {rows,valid,supply:valid?supply:null,tax:valid?tax:null,total:valid?total:null};
}
export function businessIssues(doc,answers){
  const issues=[];
  for(const range of doc.dateRanges||[]){
    const start=answers[range.fromField],end=answers[range.toField];
    if(/^\d{4}-\d{2}-\d{2}$/.test(start)&&/^\d{4}-\d{2}-\d{2}$/.test(end)&&!orderedPeriod(Number(start.replaceAll('-','')),Number(end.replaceAll('-',''))))issues.push({field:range.toField,message:(range.label||'기간')+': 종료일은 시작일보다 빠를 수 없습니다.'});
  }
  if(!BUSINESS_IDS.has(doc.id))return issues;
  if(doc.id!=='contract'){
    const calc=calculateItems(doc,answers);
    if(calc.rows.length&&!calc.valid)issues.push({field:'items',message:'품목 수량·단가와 부가세를 확인하세요. 합계는 999,999,999,999원 이하입니다.'});
  }else{
    if(whole(answers.amount,1,MAX_MONEY)&&whole(answers.deposit,0,MAX_MONEY)&&!depositWithinAmount(Number(answers.amount),Number(answers.deposit)))issues.push({field:'deposit',message:'계약금은 총 계약금액을 초과할 수 없습니다.'});
    if(/^\d{4}-\d{2}-\d{2}$/.test(answers.startDate)&&/^\d{4}-\d{2}-\d{2}$/.test(answers.endDate)&&!orderedPeriod(Number(answers.startDate.replaceAll('-','')),Number(answers.endDate.replaceAll('-',''))))issues.push({field:'endDate',message:'완료예정일은 착수일보다 빠를 수 없습니다.'});
  }
  return issues;
}
export function businessItemTable(doc,answers,blank=false){
  const order=doc.id==='purchase-order';
  const labels=order?['품명 / 규격','수량','단위','단가','금액','납기']:['품목 / 규격','수량','단가','공급가액','부가세','합계'];
  const cell=(text='',numeric)=>({text:String(text??''),...(numeric===undefined?{}:{numeric})});
  const rows=blank?Array.from({length:3},()=>labels.map(()=>cell())):calculateItems(doc,answers).rows.map(r=>{
    const number=(raw,money=false)=>cell(raw===null?'입력 확인':money?Number(raw).toLocaleString('ko-KR')+'원':raw,raw===null?undefined:Number(raw));
    return order?[cell(r.source.description),cell(r.source.quantity),cell(r.source.unit),number(whole(r.source.unitPrice,0,MAX_MONEY)?Number(r.source.unitPrice):null,true),number(r.supply,true),cell(r.source.dueDate)]:[cell(r.source.description),cell(r.source.quantity),number(whole(r.source.unitPrice,0,MAX_MONEY)?Number(r.source.unitPrice):null,true),number(r.supply,true),number(r.tax,true),number(r.total,true)];
  });
  return {heading:'품목',widths:labels.map(()=>1/6),rows:[labels.map(text=>({text,label:true})),...(rows.length?rows:[labels.map(()=>cell())])]};
}
export function businessTotals(doc,answers,blank=false){
  const order=doc.id==='purchase-order',c=blank?{}:calculateItems(doc,answers);
  return {heading:order?'합계 (VAT 별도)':'금액 합계',widths:[1/3,2/3],rows:(order?[['공급금액 합계',c.supply]]:[['공급가액 합계',c.supply],['부가세 합계',c.tax],['총 합계',c.total]]).map(([label,n])=>[{text:label,label:true},{text:blank?'':n===null?'입력 확인':Number(n).toLocaleString('ko-KR')+'원',...(!blank&&n!==null?{numeric:n}:{})}])};
}
