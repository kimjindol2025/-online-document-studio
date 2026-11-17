// Build bridge for ONLY this verified FreeLang scalar subset, not a Front compiler.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export function compileScalarRules(source){
  const tokens=source.replace(/;;[^\n]*/g,'').match(/[()[\]]|[^\s()[\]]+/g)||[];
  let pos=0;
  function read(){
    const token=tokens[pos++];
    if(token==='('||token==='['){
      const end=token==='('?')':']',items=[];
      while(tokens[pos]!==end){if(pos>=tokens.length)throw Error('Unclosed FreeLang expression');items.push(read());}
      pos++;return items;
    }
    if(token===')'||token===']'||token===undefined)throw Error('Unexpected FreeLang token');
    return token;
  }
  const forms=[];while(pos<tokens.length)forms.push(read());
  const identifier=x=>typeof x==='string'&&/^[a-zA-Z][a-zA-Z0-9]*$/.test(x)&&!['eval','Function','constructor','prototype','import','export','return','function','new','this','while','for','if','var','let','const','class','delete','throw','try','catch','await','yield','default','switch','case','in','of','do','else','void','typeof','instanceof','super','extends','null','true','false'].includes(x);
  const known=new Map();
  const output=forms.map(form=>{
    if(!Array.isArray(form)||form.length!==4||form[0]!=='defn'||!identifier(form[1])||!Array.isArray(form[2])||!form[2].every(identifier))throw Error('Unsupported FreeLang declaration');
    const [,name,args,body]=form;
    if(known.has(name)||new Set(args).size!==args.length)throw Error('Duplicate scalar symbol');
    function expr(value){
      if(typeof value==='string'){
        if(args.includes(value))return value;
        if(/^-?\d+(?:\.\d+)?$/.test(value))return value;
        throw Error('Unsupported scalar literal');
      }
      if(!Array.isArray(value)||value.length<2)throw Error('Unsupported scalar expression');
      const [op,...operands]=value;
      if(['+','-','*','/','<='].includes(op)&&operands.length===2)return '('+expr(operands[0])+op+expr(operands[1])+')';
      if(op==='floor'&&operands.length===1)return 'Math.floor('+expr(operands[0])+')';
      if(known.get(op)===operands.length)return op+'('+operands.map(expr).join(',')+')';
      throw Error('Unsupported scalar operation: '+op);
    }
    const code=`export function ${name}(${args.join(',')}){return ${expr(body)};}\n`;
    known.set(name,args.length);return code;
  }).join('');
  return '// Generated from core/business-rules.fl; do not edit.\n// Source SHA-256: '+createHash('sha256').update(source).digest('hex')+'\n'+output;
}
export function buildBusinessCore(){
  const source=readFileSync(new URL('./core/business-rules.fl',import.meta.url),'utf8');
  writeFileSync(new URL('./prototype/generated-business-core.mjs',import.meta.url),compileScalarRules(source));
}
if(process.argv[1]===fileURLToPath(import.meta.url))buildBusinessCore();
