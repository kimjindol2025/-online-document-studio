import { declaration as X, xml, zip } from './export-zip.mjs';
const relNS='http://schemas.openxmlformats.org/package/2006/relationships';
const officeRel='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const ctNS='http://schemas.openxmlformats.org/package/2006/content-types';
const relationship=(id,type,target)=>`<Relationship Id="${id}" Type="${officeRel+type}" Target="${target}"/>`;
const rels=body=>X+`<Relationships xmlns="${relNS}">${body}</Relationships>`;
const types=(overrides,image=false)=>X+`<Types xmlns="${ctNS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${image?'<Default Extension="jpg" ContentType="image/jpeg"/>':''}${overrides.map(([p,t])=>`<Override PartName="${p}" ContentType="${t}"/>`).join('')}</Types>`;

export function docx(model){
  const paragraph=(text='',style='',lines=1)=>{
    const parts=String(text).split(/\r\n|\r|\n/);
    while(parts.length<lines)parts.push('');
    return parts.map(t=>`<w:p>${style?`<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`:''}<w:r><w:t xml:space="preserve">${xml(t)}</w:t></w:r></w:p>`).join('');
  };
  const image=model.photo?`<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1080000" cy="1440000"/><wp:docPr id="1" name="이력서 사진" descr="사용자가 선택한 이력서 사진"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="photo.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rPhoto"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1080000" cy="1440000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`:'';
  const tables=model.blocks.map(b=>paragraph(b.heading,'Heading1')+`<w:tbl><w:tblPr><w:tblW w:w="10206" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="single" w:sz="4" w:color="CBD5DC"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${b.widths.map(w=>`<w:gridCol w:w="${Math.round(w*10206)}"/>`).join('')}</w:tblGrid>${b.rows.map(row=>`<w:tr><w:trPr><w:trHeight w:val="400" w:hRule="atLeast"/></w:trPr>${row.map((c,i)=>`<w:tc><w:tcPr><w:tcW w:w="${Math.round(b.widths[i]*10206)}" w:type="dxa"/><w:vAlign w:val="center"/>${c.label?`<w:shd w:fill="${model.light}"/>`:''}</w:tcPr>${paragraph(c.text,c.label?'Label':'',c.lines||1)}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`).join('');
  const files={
    '[Content_Types].xml':types([['/word/document.xml','application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'],['/word/styles.xml','application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml']],!!model.photo),
    '_rels/.rels':rels(relationship('rDoc','officeDocument','word/document.xml')),
    'word/_rels/document.xml.rels':rels(relationship('rStyles','styles','styles.xml')+(model.photo?relationship('rPhoto','image','media/photo.jpg'):'')),
    'word/styles.xml':X+`<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="맑은 고딕"/><w:sz w:val="20"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="270" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${[['Title',40],['Heading1',24],['Label',20]].map(([name,size])=>`<w:style w:type="paragraph" w:styleId="${name}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:pPr>${name==='Title'?'<w:jc w:val="center"/>':''}${name!=='Label'?'<w:keepNext/><w:spacing w:before="180" w:after="100"/>':''}</w:pPr><w:rPr><w:b/><w:color w:val="${model.accent}"/><w:sz w:val="${size}"/></w:rPr></w:style>`).join('')}</w:styles>`,
    'word/document.xml':X+`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="${officeRel.slice(0,-1)}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${paragraph(model.title,'Title')}${image}${tables}${paragraph(model.signature)}${paragraph(model.notice)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr></w:body></w:document>`
  };
  if(model.photo)files['word/media/photo.jpg']=model.photo;
  return zip(files);
}

export function xlsx(model){
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rows=[],merges=[];let row=0;
  const add=(cells,spans,style=0,height=26)=>{
    const r=++row;let col=0;
    const cellsXml=cells.map((c,i)=>{
      const start=col,span=spans[i];col+=span;
      const ref=String.fromCharCode(65+start)+r;
      if(span>1)merges.push(`${ref}:${String.fromCharCode(64+col)}${r}`);
      const s=c.numeric!==undefined?(c.currency===false?6:4):c.label?2:style;
      // inlineStr prevents =,+,-,@ user text from becoming a spreadsheet formula.
      const value=c.numeric!==undefined?`<v>${c.numeric}</v>`:`<is><t xml:space="preserve">${xml(c.text.replace(/_x([0-9a-fA-F]{4})_/g,'_x005F_x$1_'))}</t></is>`;
      let result=`<c r="${ref}" s="${s}"${c.numeric!==undefined?'':' t="inlineStr"'}>${value}</c>`;
      for(let k=1;k<span;k++)result+=`<c r="${String.fromCharCode(65+start+k)}${r}" s="${s}"/>`;
      return result;
    }).join('');
    rows.push(`<row r="${r}" ht="${Math.min(409,height)}" customHeight="1">${cellsXml}</row>`);
  };
  add([{text:model.title}],[6],1,38);
  if(model.photo){for(let i=0;i<7;i++)add([{text:''}],[6],0,20);}
  for(const b of model.blocks){
    add([{text:b.heading}],[6],3,29);
    const spans=b.widths.map(w=>Math.round(w*6));
    for(const cells of b.rows){
      const lines=Math.max(...cells.map((c,i)=>Math.max(c.lines||1,...c.text.split(/\r\n|\r|\n/).map(t=>Math.ceil(t.length/(spans[i]*8))||1))));
      const explicit=Math.max(...cells.map(c=>c.text.split(/\r\n|\r|\n/).length));
      add(cells,spans,0,Math.max(27,Math.max(lines,explicit)*18+8));
    }
  }
  add([{text:model.signature}],[6],0,30);add([{text:model.notice}],[6],5,50);
  const files={
    '[Content_Types].xml':types([['/xl/workbook.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'],['/xl/worksheets/sheet1.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'],['/xl/styles.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'],...(model.photo?[['/xl/drawings/drawing1.xml','application/vnd.openxmlformats-officedocument.drawing+xml']]:[])],!!model.photo),
    '_rels/.rels':rels(relationship('rBook','officeDocument','xl/workbook.xml')),
    'xl/workbook.xml':X+`<workbook xmlns="${ns}" xmlns:r="${officeRel.slice(0,-1)}"><bookViews><workbookView/></bookViews><sheets><sheet name="${xml(model.title)}" sheetId="1" r:id="rSheet"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">'${xml(model.title)}'!$A$1:$F$${row}</definedName></definedNames><calcPr calcId="191029"/></workbook>`,
    'xl/_rels/workbook.xml.rels':rels(relationship('rSheet','worksheet','worksheets/sheet1.xml')+relationship('rStyles','styles','styles.xml')),
    'xl/styles.xml':X+`<styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0&quot;원&quot;"/></numFmts><fonts count="3">${[11,20,11].map((size,i)=>`<font><sz val="${size}"/><color rgb="FF${i?model.accent:'253342'}"/><name val="맑은 고딕"/><family val="2"/>${i?'<b/>':''}</font>`).join('')}</fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${model.light}"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>${['left','right','top','bottom'].map(s=>`<${s} style="thin"><color rgb="FFCBD5DC"/></${s}>`).join('')}<diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7">${[[0,0,1,0,'left'],[1,2,0,0,'center'],[2,2,1,0,'left'],[2,2,0,0,'left'],[0,0,1,164,'right'],[0,0,0,0,'left'],[0,0,1,0,'right']].map(([font,fill,border,num,align])=>`<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyAlignment="1"${num?' applyNumberFormat="1"':''}><alignment horizontal="${align}" vertical="center" wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    'xl/worksheets/sheet1.xml':X+`<worksheet xmlns="${ns}" xmlns:r="${officeRel.slice(0,-1)}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:F${row}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="26"/><cols><col min="1" max="6" width="13" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.45" right="0.45" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>${model.photo?'<drawing r:id="rDrawing"/>':''}</worksheet>`
  };
  if(model.photo){
    files['xl/worksheets/_rels/sheet1.xml.rels']=rels(relationship('rDrawing','drawing','../drawings/drawing1.xml'));
    files['xl/drawings/_rels/drawing1.xml.rels']=rels(relationship('rPhoto','image','../media/photo.jpg'));
    files['xl/media/photo.jpg']=model.photo;
    files['xl/drawings/drawing1.xml']=X+`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officeRel.slice(0,-1)}"><xdr:oneCellAnchor><xdr:from><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="1080000" cy="1440000"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="이력서 사진"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rPhoto"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1080000" cy="1440000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
  }
  return zip(files);
}
