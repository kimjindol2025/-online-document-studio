import { declaration as X, xml, zip } from './export-zip.mjs';
import { HWPX_PARTS, HWPX_HEADER, HWPX_SECTION_START, HWPX_SECTION_SETUP, HWPX_PICTURE } from './hwpx-base.mjs';

export function hwpx(model){
  let id=100;
  const p=(text='',char=0)=>String(text).split(/\r\n|\r|\n/).map(line=>`<hp:p id="${id++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${char}"><hp:t>${xml(line)}</hp:t></hp:run></hp:p>`).join('');
  const object=body=>`<hp:p id="${id++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0">${body}</hp:run></hp:p>`;
  const tables=model.blocks.map(b=>{
    const widths=b.widths.map(w=>Math.round(w*51024));
    widths[widths.length-1]+=51024-widths.reduce((s,w)=>s+w,0);
    const heights=b.rows.map(row=>Math.max(2300,...row.map(c=>Math.max(c.lines||1,c.text.split(/\r\n|\r|\n/).length)*1500+400)));
    return p(b.heading,7)+object(`<hp:tbl id="${id++}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="${b.rows.length}" colCnt="${widths.length}" cellSpacing="0" borderFillIDRef="3" noAdjust="0"><hp:sz width="51024" widthRelTo="ABSOLUTE" height="${heights.reduce((s,h)=>s+h,0)}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="400" bottom="600"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${b.rows.map((row,r)=>`<hp:tr>${row.map((c,col)=>{
      const text=c.text||'\n'.repeat((c.lines||1)-1);
      return `<hp:tc name="" header="${c.label?1:0}" hasMargin="0" protect="0" editable="0" dirty="1" borderFillIDRef="3"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${p(text,c.label?9:0)}</hp:subList><hp:cellAddr colAddr="${col}" rowAddr="${r}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${widths[col]}" height="${heights[r]}"/><hp:cellMargin left="510" right="510" top="141" bottom="141"/></hp:tc>`;
    }).join('')}</hp:tr>`).join('')}</hp:tbl>`);
  }).join('');
  const files={...HWPX_PARTS};
  files['Contents/header.xml']=X+HWPX_HEADER.replaceAll('#ACCENT','#'+model.accent);
  files['Contents/section0.xml']=X+HWPX_SECTION_START+HWPX_SECTION_SETUP+p(model.title,8)+(model.photo?object(HWPX_PICTURE):'')+tables+p(model.signature)+p(model.notice)+'</hs:sec>';
  files['Contents/content.hpf']=X+`<opf:package xmlns:opf="http://www.idpf.org/2007/opf/" version="" unique-identifier="" id=""><opf:metadata><opf:title>${xml(model.title)}</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">문서 한 장</opf:meta></opf:metadata><opf:manifest><opf:item id="version" href="version.xml" media-type="application/xml"/><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/>${model.photo?'<opf:item id="BIN0001" href="BinData/BIN0001.jpg" media-type="image/jpeg" isEmbeded="1"/>':''}</opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`;
  files['Preview/PrvText.txt']=[model.title,...model.blocks.flatMap(b=>[b.heading,...b.rows.map(row=>row.map(c=>c.text).join('\t'))]),model.signature,model.notice].join('\n');
  if(model.photo)files['BinData/BIN0001.jpg']=model.photo;
  return zip(files);
}
