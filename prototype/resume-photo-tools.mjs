import {RESUME_TEMPLATES,MAX_PHOTO_LENGTH,normalizePresentation,photoGeometry} from './resume-templates.mjs';

export async function decodePhoto(data) {
  const img=new Image();img.src=data;
  try{await img.decode();}catch{throw Error('사진을 읽을 수 없습니다. 다른 사진 파일을 선택하세요.');}
  return img;
}
export async function verifyImportedPhoto(photo) {
  if(!photo)return;
  const img=await decodePhoto(photo.data);
  if(img.naturalWidth!==photo.width||img.naturalHeight!==photo.height)throw Error('사진의 실제 크기가 백업 정보와 다릅니다.');
}
async function preparePhoto(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('JPG, PNG, WebP 사진을 선택하세요.');
  if(file.size>5*1024*1024)throw Error('사진은 5MB 이하로 선택하세요.');
  const url=URL.createObjectURL(file);
  try {
    const img=await decodePhoto(url);
    if(img.naturalWidth*img.naturalHeight>25000000)throw Error('사진은 2,500만 화소 이하로 선택하세요.');
    const scale=Math.min(1,800/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let data;
    for(const quality of [.82,.7,.55,.4,.25]){data=canvas.toDataURL('image/jpeg',quality);if(data.length<=MAX_PHOTO_LENGTH)break;}
    if(data.length>MAX_PHOTO_LENGTH)throw Error('사진이 복잡해 저장하기 어렵습니다. 더 작은 사진을 선택하세요.');
    return {data,width:canvas.width,height:canvas.height,zoom:1,x:50,y:50};
  } finally {URL.revokeObjectURL(url);}
}

export function createPhotoTools({getPresentation,onChange,onMessage,isActive}) {
  const panel=document.createElement('section');panel.className='resume-tools';panel.setAttribute('aria-label','이력서 꾸미기');
  panel.innerHTML=`<div class="resume-tools-head"><h3>내 이력서 스타일</h3><span>내용은 그대로, 디자인만 변경</span></div>
    <div class="template-picker" role="group" aria-label="이력서 템플릿">${RESUME_TEMPLATES.map(t=>`<button type="button" class="template-card" data-template="${t.id}" aria-pressed="false"><span class="template-thumb thumb-${t.id}" aria-hidden="true"><i></i><b></b><em></em></span><strong>${t.name}</strong><small>${t.description}</small></button>`).join('')}</div>
    <div class="photo-actions"><div><strong>프로필 사진 <span>선택</span></strong><p>사진은 이 브라우저에만 보관됩니다.</p></div><div><button type="button" class="btn outline" data-photo-choose>사진 넣기</button><button type="button" class="text-button" data-photo-edit hidden>위치 조절</button><button type="button" class="text-button danger" data-photo-remove hidden>사진 삭제</button></div></div>
    <input class="file-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="이력서 사진 파일"><p class="photo-feedback" role="status"></p>`;
  const feedback=panel.querySelector('.photo-feedback');
  const tell=(text,error=false)=>{feedback.textContent=text;feedback.classList.toggle('error',error);onMessage(text,error?'error':'good');};
  const sync=()=>{
    const p=getPresentation();
    for(const button of panel.querySelectorAll('[data-template]'))button.setAttribute('aria-pressed',String(button.dataset.template===p.template));
    panel.querySelector('[data-photo-edit]').hidden=!p.photo;panel.querySelector('[data-photo-remove]').hidden=!p.photo;
    panel.querySelector('[data-photo-choose]').textContent=p.photo?'사진 변경':'사진 넣기';
  };
  const commit=(presentation,text)=>{
    const ok=onChange(presentation);sync();
    tell(ok?text:'화면에 적용했지만 임시 저장하지 못했습니다. 편집본을 백업하세요.',!ok);
  };
  panel.addEventListener('click',event=>{
    const button=event.target.closest('[data-template]');
    if(button)commit({...getPresentation(),template:button.dataset.template},'템플릿을 변경했습니다.');
  });
  const input=panel.querySelector('input[type=file]');
  panel.querySelector('[data-photo-choose]').onclick=()=>input.click();
  panel.querySelector('[data-photo-remove]').onclick=()=>commit({...getPresentation(),photo:null},'사진을 삭제했습니다.');
  const dialog=document.getElementById('photo-dialog');
  function edit(photo) {
    if(!isActive())return;
    const pending={...photo};const img=dialog.querySelector('.photo-crop img');img.src=pending.data;
    function update(){
      for(const key of ['zoom','x','y'])pending[key]=Number(dialog.querySelector('[name='+key+']').value);
      const g=photoGeometry(pending);Object.assign(img.style,{width:g.width+'%',height:g.height+'%',left:g.left+'%',top:g.top+'%'});
      dialog.querySelector('output').textContent=pending.zoom.toFixed(1)+'배';
    }
    for(const key of ['zoom','x','y']){const slider=dialog.querySelector('[name='+key+']');slider.value=pending[key];slider.oninput=update;}
    update();
    dialog.querySelector('[data-crop-apply]').onclick=()=>{if(isActive())commit(normalizePresentation({...getPresentation(),photo:pending}),'사진과 위치를 저장했습니다.');dialog.close();};
    dialog.querySelector('[data-crop-cancel]').onclick=()=>dialog.close();
    dialog.showModal();
  }
  panel.querySelector('[data-photo-edit]').onclick=()=>edit(getPresentation().photo);
  input.onchange=async()=>{
    const file=input.files[0];input.value='';if(!file)return;
    const choose=panel.querySelector('[data-photo-choose]');choose.disabled=true;
    try{tell('사진을 준비하고 있습니다…');const photo=await preparePhoto(file);if(isActive())edit(photo);}
    catch(error){tell(error.message,true);}finally{choose.disabled=false;}
  };
  sync();return panel;
}
