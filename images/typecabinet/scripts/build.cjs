// npm install, then npm run build from images/typecabinet.
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'exclamation', 'period'];
const digits = [...'0123456789'];
const symbols = ['star-1', 'star-2', 'star-3', 'star-4', 'sun', 'cloud', 'flower', 'heart', 'cookie', 'ice-cream', 'campfire', 'eighth-note', 'beamed-notes', 'quarter-note', 'guitar', 'tree'];
const titleDrawings = ['T-TLM', 'H-TLM', 'E-TLM-1', 'L-TLM', 'I-TLM-1', 'V-TLM', 'I-TLM-2', 'N-TLM', 'G-TLM', 'M-TLM-1', 'E-TLM-2', 'M-TLM-2', 'B-TLM', 'E-TLM-3', 'R-TLM', 'S-TLM'];
const titleExtensions = [...'FDOAC8P'].map(letter => letter+'-TLM-filled');
const titleLetters = [...titleDrawings.flatMap(name => [name+'-filled', name+'-outline']), ...titleExtensions];
const outlineSymbols = [...symbols, 'skull'];
const names = [...alphabet, ...digits, ...symbols, ...titleLetters, 'skull'];
const sizes = [1024, 256, 128];

async function inspect(file) {
  const {data, info} = await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width, top=info.height, right=-1, bottom=-1, opaque=0, transparent=0;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    const i=(y*info.width+x)*4, a=data[i+3];
    assert.equal(data[i]+data[i+1]+data[i+2],0,'RGB must be pure black, including transparent pixels');
    if(a) {left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);if(a===255)opaque++;}
    else transparent++;
  }
  assert(opaque>0 && transparent>0,'Expected solid black and fully transparent pixels');
  return {width:info.width,height:info.height,bounds:{left,top,width:right-left+1,height:bottom-top+1},bytes:fs.statSync(file).size};
}

async function normalize(name) {
  const folder = titleLetters.includes(name) ? 'title' : outlineSymbols.includes(name) ? 'outlined' : 'filled';
  const {data,info}=await sharp(path.join(root,'reference',folder,name+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++) {
    const i=(y*info.width+x)*4,a=data[i+3]>=128?255:0;
    data[i]=data[i+1]=data[i+2]=0;data[i+3]=a;
    if(a){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  }
  assert(right>=left && bottom>=top, 'Empty glyph: '+name);
  return sharp(data,{raw:{width:info.width,height:info.height,channels:4}})
    .extract({left,top,width:right-left+1,height:bottom-top+1}).png().toBuffer();
}

async function saveSized(input,name,size) {
  const pad=size/64, glyphHeight=name==='period'?size*5/32:size;
  const glyph=await sharp(input).resize({height:glyphHeight,kernel:'lanczos3'}).png().toBuffer();
  await sharp(glyph).extend({left:pad,right:pad,top:pad+size-glyphHeight,bottom:pad,background:{r:0,g:0,b:0,alpha:0}})
    .png({compressionLevel:9}).toFile(path.join(root,String(size),name+'.png'));
}

async function makePreview(previewNames, filename, columns=7) {
  const tileWidth=220,tileHeight=252,composite=[];
  for(let i=0;i<previewNames.length;i++) {
    const name=previewNames[i],left=(i%columns)*tileWidth,top=Math.floor(i/columns)*tileHeight;
    const image=await sharp(path.join(root,'256',name+'.png')).resize({width:200,height:198,fit:'inside'}).png().toBuffer();
    const meta=await sharp(image).metadata();
    composite.push({input:image,left:left+Math.floor((tileWidth-meta.width)/2),top:top+35+198-meta.height});
    composite.push({input:Buffer.from(`<svg width="220" height="30"><text x="14" y="22" fill="#555" font-family="Arial" font-size="16">${name}</text></svg>`),left,top});
  }
  const width=columns*tileWidth,height=Math.ceil(previewNames.length/columns)*tileHeight,bg=Buffer.alloc(width*height*3);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const v=(Math.floor(x/16)+Math.floor(y/16))%2?239:250,i=(y*width+x)*3;bg[i]=bg[i+1]=bg[i+2]=v;
  }
  await sharp(bg,{raw:{width,height,channels:3}}).composite(composite).png().toFile(path.join(root,filename));
}

async function makeTitleWebPreview() {
  const lines=[titleDrawings.slice(0,3),titleDrawings.slice(3,9),titleDrawings.slice(9)];
  const rows=[];
  let panelWidth=740;
  for(const style of ['filled','outline'])for(let row=0;row<lines.length;row++) {
    const images=[];let width=0;
    for(const drawing of lines[row]) {
      const input=path.join(root,'128',drawing+'-'+style+'.png');
      const meta=await sharp(input).metadata();
      images.push({input,left:width});width+=meta.width+6;
    }
    rows.push({style,row,images});panelWidth=Math.max(panelWidth,width+60);
  }
  const width=panelWidth*2,height=770,composite=[],bg=Buffer.alloc(width*height*3);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const v=(Math.floor(x/16)+Math.floor(y/16))%2?239:250,i=(y*width+x)*3;bg[i]=bg[i+1]=bg[i+2]=v;
  }
  for(const [index,style] of ['filled','outline'].entries()) {
    composite.push({input:Buffer.from(`<svg width="700" height="50"><text x="0" y="34" font-family="Arial" font-size="25" fill="#333">${style==='filled'?'Filled fronts':'Outlined fronts'}</text></svg>`),left:index*panelWidth+30,top:15});
    for(const row of rows.filter(r=>r.style===style))for(const img of row.images)composite.push({input:img.input,left:index*panelWidth+30+img.left,top:85+row.row*180});
  }
  composite.push({input:path.join(root,'128/skull.png'),left:30,top:615});
  composite.push({input:Buffer.from('<svg width="1100" height="85"><text x="0" y="30" font-family="Arial" font-size="19" fill="#555">Actual 128 px exports — all drawings share the same visible height</text><text x="0" y="60" font-family="Arial" font-size="17" fill="#666">Checkerboard is for preview only. The PNG backgrounds are transparent.</text></svg>'),left:160,top:635});
  await sharp(bg,{raw:{width,height,channels:3}}).composite(composite).png().toFile(path.join(root,'preview-title-web.png'));
}

(async()=>{
  for(const size of sizes)fs.mkdirSync(path.join(root,String(size)),{recursive:true});
  const manifest={description:'Hand-drawn uppercase alphabet, digits, punctuation, outline symbols, and dimensional TLM letter variants.',color:'#000000',sizes:{},glyphs:{}};
  for(const size of sizes)manifest.sizes[size]={capHeight:size,canvasHeight:size+size/32,padding:size/64,baseline:size+size/64};
  for(const name of names) {
    const master=path.join(root,'1024',name+'.png');
    // Keep the user-approved A master byte-for-byte unchanged.
    if(name!=='A'||!fs.existsSync(master))await saveSized(await normalize(name),name,1024);
    const metric=await inspect(master);
    const tightMaster=await sharp(master).extract(metric.bounds).png().toBuffer();
    for(const size of [256,128])await saveSized(tightMaster,name,size);
    const isTitle=titleLetters.includes(name),isSymbol=outlineSymbols.includes(name);
    const glyph={character:isSymbol?null:isTitle?name[0]:name==='period'?'.':name==='exclamation'?'!':name,label:name,category:isSymbol?'symbol':digits.includes(name)||name==='8-TLM-filled'?'digit':isTitle||name.length===1?'letter':'punctuation',style:isTitle?(name.endsWith('-filled')?'filled-front':'outline'):isSymbol?'outline':'filled',variants:{}};
    if(titleExtensions.includes(name)) {
      Object.assign(glyph,{family:'TLM',drawing:name.replace(/-filled$/,''),origin:'style-extension',sourceReferences:['E-TLM-2-filled','R-TLM-filled','G-TLM-filled'].map(n=>'reference/title/'+n+'.png')});
    } else if(isTitle) {
      const drawing=name.replace(/-(filled|outline)$/,'');
      Object.assign(glyph,{family:'TLM',drawing,occurrence:Number(drawing.match(/-(\d+)$/)?.[1]||1),source:'reference/alphabet036.jpg',sourceOrder:titleDrawings.indexOf(drawing)+1});
    } else if(name==='skull') glyph.source='reference/alphabet036.jpg';
    for(const size of sizes) {
      const file=path.join(root,String(size),name+'.png'),m=await inspect(file),pad=size/64,expected=name==='period'?size*5/32:size;
      assert.equal(m.height,size+2*pad,`${name}/${size} canvas height`);
      assert.equal(m.bounds.height,expected,`${name}/${size} visible height`);
      assert.equal(m.bounds.top+m.bounds.height,size+pad,`${name}/${size} baseline`);
      assert(m.bounds.left>0 && m.bounds.left+m.bounds.width<m.width,`${name}/${size} horizontal padding`);
      glyph.variants[size]={file:`${size}/${name}.png`,...m};
    }
    manifest.glyphs[name]=glyph;
  }
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await makePreview(names,'preview.png');
  await makePreview(alphabet,'preview-alphabet.png');
  await makePreview([...digits,...symbols],'preview-numbers-symbols.png');
  await makePreview(titleDrawings.map(name=>name+'-filled'),'preview-title-filled.png',4);
  await makePreview(titleDrawings.map(name=>name+'-outline'),'preview-title-outline.png',4);
  await makePreview([...titleLetters,'skull'],'preview-title-sheet.png');
  await makeTitleWebPreview();
  const totals=Object.fromEntries(sizes.map(size=>[size,names.reduce((n,name)=>n+manifest.glyphs[name].variants[size].bytes,0)]));
  console.log(JSON.stringify({validatedFiles:names.length*sizes.length,totalBytesBySize:totals},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
