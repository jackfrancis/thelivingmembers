// Approved speaker-vibration animation. Rebuilds into render/ by default.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=__dirname;
const source=path.join(root,'reference/the-living-members.png');
const outputDir=process.argv[2]||path.join(root,'render');
const output=path.join(outputDir,'the-living-members-animated-1.gif');
const WIDTH=1280,HEIGHT=355,PAD=16;
// Each impulse alternates direction and loses amplitude as the cone settles.
const timeline=[
 {phase:'still',pulse:0,delay:2500},
 ...[1,-.8,.48,-.20].map(pulse=>({phase:'first hit',pulse,delay:50})),
 {phase:'still',pulse:0,delay:1000},
 ...[1.2,-.98,.68,-.40,.16].map(pulse=>({phase:'second hit',pulse,delay:50}))
];

async function main(){
 fs.mkdirSync(outputDir,{recursive:true});
 const logo=await loadImage(source);
 const canvas=createCanvas(WIDTH,HEIGHT),ctx=canvas.getContext('2d');
 const w=WIDTH-PAD*2,h=w*logo.height/logo.width;
 const raw=Buffer.alloc(WIDTH*HEIGHT*4*timeline.length);
 for(let f=0;f<timeline.length;f++){
  const {pulse}=timeline[f];
  ctx.resetTransform();ctx.clearRect(0,0,WIDTH,HEIGHT);
  ctx.translate(WIDTH/2+pulse*.6,HEIGHT/2+pulse*1.1);
  ctx.rotate(pulse*.045*Math.PI/180);
  ctx.scale(1+pulse*.005,1+pulse*.014);
  ctx.drawImage(logo,-w/2,-h/2,w,h);
  ctx.resetTransform();
  Buffer.from(ctx.getImageData(0,0,WIDTH,HEIGHT).data).copy(raw,f*WIDTH*HEIGHT*4);
  fs.writeFileSync(path.join(outputDir,`frame-${f}.png`),canvas.toBuffer('image/png'));
 }
 await sharp(raw,{raw:{width:WIDTH,height:HEIGHT*timeline.length,channels:4,pageHeight:HEIGHT}})
  .gif({loop:0,delay:timeline.map(f=>f.delay),colours:16,dither:0,effort:8,keepDuplicateFrames:true}).toFile(output);
 const meta=await sharp(output,{animated:true}).metadata();
 assert.equal(meta.pages,11);assert.equal(meta.loop,0);assert.equal(meta.width,WIDTH);assert.equal(meta.pageHeight,HEIGHT);assert(meta.hasAlpha);
 assert.deepEqual(meta.delay,timeline.map(f=>f.delay));
 const decoded=await sharp(output,{animated:true}).ensureAlpha().raw().toBuffer();
 const stride=WIDTH*HEIGHT*4,counts=[];
 assert.deepEqual(decoded.subarray(0,stride),decoded.subarray(5*stride,6*stride),'Both pauses must display exactly the same still image');
 for(let f=0;f<timeline.length;f++){
  let n=0;
  for(let i=3;i<stride;i+=4)if(decoded[f*stride+i])n++;
  counts.push(n);
  // Every border stays clear, including the strongest outward displacement.
  for(let x=0;x<WIDTH;x++)for(const y of [0,HEIGHT-1])assert.equal(decoded[f*stride+(y*WIDTH+x)*4+3],0);
  for(let y=0;y<HEIGHT;y++)for(const x of [0,WIDTH-1])assert.equal(decoded[f*stride+(y*WIDTH+x)*4+3],0);
 }
 assert(Math.max(...counts)/Math.min(...counts)<1.1,'Unexpected cumulative trails');
 const report={file:path.basename(output),width:WIDTH,height:HEIGHT,frames:meta.pages,durationMs:meta.delay.reduce((a,b)=>a+b,0),loop:'infinite',background:'transparent',bytes:fs.statSync(output).size,timeline};
 fs.writeFileSync(path.join(outputDir,'animation-info.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
