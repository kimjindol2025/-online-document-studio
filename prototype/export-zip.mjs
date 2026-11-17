const encoder = new TextEncoder();
const crcTable = Array.from({length:256}, (_, n) => {
  for(let i=0;i<8;i++) n=n&1 ? 0xedb88320^(n>>>1) : n>>>1;
  return n>>>0;
});
function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
export function xml(value){
  return String(value??'').replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
export const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

// Native Office packages are small ZIP archives. STORE avoids a runtime dependency
// and also satisfies HWPX's first, uncompressed mimetype entry requirement.
export function zip(files){
  const chunks=[],central=[];let offset=0,centralSize=0;
  const append=(size,write)=>{const b=new Uint8Array(size);write(new DataView(b.buffer));return b;};
  for(const [name,value] of Object.entries(files)){
    if(!name||name.startsWith('/')||name.split('/').includes('..'))throw Error('잘못된 파일 경로');
    const filename=encoder.encode(name),bytes=typeof value==='string'?encoder.encode(value):value;
    if(!(bytes instanceof Uint8Array))throw Error('잘못된 파일 데이터');
    const crc=crc32(bytes);
    const local=append(30,v=>{
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);
      v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);
      v.setUint32(22,bytes.length,true);v.setUint16(26,filename.length,true);
    });
    const entry=append(46,v=>{
      v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);
      v.setUint16(14,33,true);v.setUint32(16,crc,true);v.setUint32(20,bytes.length,true);
      v.setUint32(24,bytes.length,true);v.setUint16(28,filename.length,true);v.setUint32(42,offset,true);
    });
    chunks.push(local,filename,bytes);central.push(entry,filename);
    offset+=30+filename.length+bytes.length;centralSize+=46+filename.length;
  }
  const count=Object.keys(files).length;
  const end=append(22,v=>{
    v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);
    v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
  });
  const result=new Uint8Array(offset+centralSize+22);let pos=0;
  for(const b of [...chunks,...central,end]){result.set(b,pos);pos+=b.length;}
  return result;
}
