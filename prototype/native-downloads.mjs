import { exportModel } from './export-model.mjs';
import { docx, xlsx } from './office-exports.mjs';
import { hwpx } from './hwpx-export.mjs';
import { normalizePresentation, photoGeometry } from './resume-templates.mjs';
import { decodePhoto } from './resume-photo-tools.mjs';

export const EXPORT_FORMATS={
  docx:{name:'Word',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},
  hwpx:{name:'한글',mime:'application/hwp+zip'},
  xlsx:{name:'Excel',mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
};
export async function croppedPhoto(photo){
  const image=await decodePhoto(photo.data);
  if(image.naturalWidth!==photo.width||image.naturalHeight!==photo.height)throw Error('사진 크기를 확인하세요.');
  const canvas=document.createElement('canvas');canvas.width=300;canvas.height=400;
  const context=canvas.getContext('2d');if(!context)throw Error('사진을 처리할 수 없습니다.');
  const g=photoGeometry(photo);context.fillStyle='#fff';context.fillRect(0,0,300,400);
  context.drawImage(image,g.left*3,g.top*4,g.width*3,g.height*4);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
  if(!blob)throw Error('사진 파일 생성에 실패했습니다.');
  return new Uint8Array(await blob.arrayBuffer());
}
export async function nativeFile(format,doc,answers,presentation,options={}){
  if(!Object.hasOwn(EXPORT_FORMATS,format))throw Error('지원하지 않는 다운로드 형식입니다.');
  const model=exportModel(doc,answers,presentation,options);
  if(!options.blank&&doc.id==='resume'){
    const p=normalizePresentation(presentation);
    if(p.photo)model.photo=await croppedPhoto(p.photo);
  }
  const bytes=({docx,xlsx,hwpx})[format](model);
  return {bytes,mime:EXPORT_FORMATS[format].mime,filename:`${model.title}-${model.blank?'빈양식':'작성본'}.${format}`};
}
