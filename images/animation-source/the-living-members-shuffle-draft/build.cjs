// Preserve the supplied artwork; animate each existing letter independently.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=__dirname,output=process.argv[2]||path.join(root,'render');
const WIDTH=1280,PADDING=16,FRAMES=8,DELAY=200;
const TAU=2*Math.PI;
function randomFactory(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

async function main(){
 fs.mkdirSync(output,{recursive:true});
 const source=path.join(root,'reference/the-living-members.png');
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const W=info.width,H=info.height,seen=new Uint8Array(W*H),queue=new Int32Array(W*H),parts=[];
 // Connected components locate the 16 letters without interpreting or redrawing them.
 for(let i=0;i<W*H;i++){
  if(seen[i]||data[i*4+3]<96)continue;
  let head=0,tail=0,left=W,right=0,top=H,bottom=0;queue[tail++]=i;seen[i]=1;
  while(head<tail){
   const p=queue[head++],x=p%W,y=Math.floor(p/W);
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   const visit=n=>{if(!seen[n]&&data[n*4+3]>=96){seen[n]=1;queue[tail++]=n;}};
   if(x>0)visit(p-1);if(x<W-1)visit(p+1);if(y>0)visit(p-W);if(y<H-1)visit(p+W);
  }
  if(tail>300){
   left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(W-1,right+2);bottom=Math.min(H-1,bottom+2);
   parts.push({left,top,width:right-left+1,height:bottom-top+1,pixels:tail});
  }
 }
 assert.equal(parts.length,16,'Expected exactly 16 separate letters');
 parts.sort((a,b)=>(a.top<320?0:1)-(b.top<320?0:1)||a.left-b.left);
 const scale=(WIDTH-PADDING*2)/W,height=Math.ceil(H*scale)+PADDING*2;
 const rand=randomFactory(261115),labels=[...'THELIVINGMEMBERS'];
 for(let i=0;i<parts.length;i++){
  const p=parts[i];p.label=labels[i];p.phase=rand()*TAU;p.phase2=rand()*TAU;p.amplitude=.7+rand()*.3;
  p.image=await loadImage(await sharp(source).extract({left:p.left,top:p.top,width:p.width,height:p.height}).png().toBuffer());
 }
 const canvas=createCanvas(WIDTH,height),ctx=canvas.getContext('2d');
 function draw(frame,still=false){
  const theta=TAU*((frame%FRAMES+FRAMES)%FRAMES)/FRAMES;
  ctx.resetTransform();ctx.clearRect(0,0,WIDTH,height);
  for(const p of parts){
   const dx=still?0:p.amplitude*(.9*Math.sin(theta+p.phase)+.2*Math.sin(2*theta+p.phase2));
   const dy=still?0:p.amplitude*(.75*Math.cos(theta+p.phase)+.15*Math.sin(2*theta+p.phase2));
   const rotation=still?0:p.amplitude*(.30*Math.sin(theta+p.phase2)+.08*Math.cos(2*theta+p.phase))*Math.PI/180;
   const w=p.width*scale,h=p.height*scale,x=PADDING+(p.left+p.width/2)*scale+dx,y=PADDING+(p.top+p.height/2)*scale+dy;
   ctx.setTransform(Math.cos(rotation),Math.sin(rotation),-Math.sin(rotation),Math.cos(rotation),x,y);
   ctx.drawImage(p.image,-w/2,-h/2,w,h);
  }
  ctx.resetTransform();
  return Buffer.from(ctx.getImageData(0,0,WIDTH,height).data);
 }
 assert.deepEqual(draw(0),draw(FRAMES),'Motion must return exactly to the starting pose');
 draw(0,true);fs.writeFileSync(path.join(output,'the-living-members-still.png'),canvas.toBuffer('image/png'));
 const raw=Buffer.alloc(WIDTH*height*4*FRAMES);
 for(let f=0;f<FRAMES;f++){
  draw(f).copy(raw,f*WIDTH*height*4);
  fs.writeFileSync(path.join(output,`frame-${f}.png`),canvas.toBuffer('image/png'));
 }
 const file=path.join(output,'the-living-members-animated-1.gif');
 await sharp(raw,{raw:{width:WIDTH,height:height*FRAMES,channels:4,pageHeight:height},limitInputPixels:false}).gif({loop:0,delay:Array(FRAMES).fill(DELAY),colours:16,dither:0,effort:8,keepDuplicateFrames:true}).toFile(file);
 const meta=await sharp(file,{animated:true}).metadata();
 assert.equal(meta.pages,FRAMES);assert.equal(meta.loop,0);assert.equal(meta.width,WIDTH);assert.equal(meta.pageHeight,height);assert.equal(meta.delay.reduce((a,b)=>a+b,0),FRAMES*DELAY);assert(meta.hasAlpha);
 // Decode all frames to check that moving transparent letters do not leave trails.
 const frames=await sharp(file,{animated:true}).ensureAlpha().raw().toBuffer();
 const stride=WIDTH*height*4,counts=[];
 for(let f=0;f<FRAMES;f++){
  let count=0;
  for(let i=0;i<stride;i+=4)if(frames[f*stride+i+3])count++;
  counts.push(count);
  for(const i of [0,(WIDTH-1)*4,(WIDTH*(height-1))*4,(WIDTH*height-1)*4])assert.equal(frames[f*stride+i+3],0,'Corners must be transparent');
 }
 assert(Math.max(...counts)/Math.min(...counts)<1.02,'Unexpected trail or missing letter');
 const report={file:path.basename(file),width:WIDTH,height,frames:FRAMES,frameDelayMs:DELAY,durationMs:FRAMES*DELAY,loop:'infinite',background:'transparent',letters:16,maximumTranslationPixels:{x:1.1,y:.9},maximumRotationDegrees:.38,bytes:fs.statSync(file).size,opaquePixelCounts:counts};
 fs.writeFileSync(path.join(output,'animation-info.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(output,'letter-bounds.json'),JSON.stringify(parts.map(({image,...p})=>p),null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
