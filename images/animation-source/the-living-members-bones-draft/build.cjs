// Deterministic animation: npm install, then npm run build.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {createCanvas, loadImage} = require('@napi-rs/canvas');
const root = __dirname;
const output = process.argv[2] || path.join(root, 'render');
const W=1280, H=520, FPS=20, DURATION=12, FRAMES=FPS*DURATION;
const TW=1200, TH=Math.round(TW*776/3001), TX=(W-TW)/2, TY=Math.floor((H-TH)/2);
const TAU=Math.PI*2;
function randomFactory(seed) { return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}; }
const rand=randomFactory(19790324);
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
const mix=(a,b,t)=>a+(b-a)*t;

async function main(){
 fs.mkdirSync(output,{recursive:true});
 // The original image supplies both exact destinations and the final title.
 const logoPng=await sharp(path.join(root,'reference/the-living-members.png')).resize(TW,TH).flatten({background:'#fff'}).png().toBuffer();
 const logo=await loadImage(logoPng);
 const {data:pix}=await sharp(logoPng).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {data,info}=await sharp(path.join(root,'reference/femur-generated.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let l=info.width,t=info.height,r=-1,b=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const i=(y*info.width+x)*4;data[i]=data[i+1]=data[i+2]=0;
  if(data[i+3]>127){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 }
 const bonePng=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize({width:180}).png().toBuffer();
 const bone=await loadImage(bonePng), ratio=bone.height/bone.width;
 const gray=createCanvas(bone.width,bone.height),gc=gray.getContext('2d');
 gc.drawImage(bone,0,0);gc.globalCompositeOperation='source-in';gc.fillStyle='#8b8d83';gc.fillRect(0,0,gray.width,gray.height);
 // Stratified destinations preserve every letter, including thin strokes.
 const particles=[];
 const step=7.2;
 for(let gy=2;gy<TH;gy+=step)for(let gx=2;gx<TW;gx+=step){
  const x=Math.min(TW-1,Math.max(0,Math.round(gx+(rand()-.5)*step*.8)));
  const y=Math.min(TH-1,Math.max(0,Math.round(gy+(rand()-.5)*step*.8)));
  const j=(y*TW+x)*4,lum=(pix[j]+pix[j+1]+pix[j+2])/3;
  if(lum>210)continue;
  // Give the starting pieces generous spacing, retaining an organic scatter.
  const i=particles.length;
  particles.push({x:TX+x,y:TY+y,shade:lum>80,
   sx:30+rand()*(W-60),sy:28+rand()*(H-56),phase:rand()*TAU,
   ax:8+rand()*18,ay:6+rand()*12,
   angle:rand()*TAU,spin:(rand()<.5?-1:1)*(1+Math.floor(rand()*2))*TAU,
   length:17+rand()*11,restLength:12+rand()*9,
   bendX:(rand()-.5)*190,bendY:(rand()-.5)*180,
   start:.5+rand()*1.1,arrival:3.7+rand()*1.2,
   depart:7.5+rand()*.7,finish:10.8+rand()*.6,
   leaveX:(rand()-.5)*180,leaveY:(rand()-.5)*160});
 }
 console.log(JSON.stringify({particles:particles.length,width:W,height:H,seconds:DURATION,fps:FPS}));
 const c=createCanvas(W,H),ctx=c.getContext('2d');
 const ink=createCanvas(W,H),ictx=ink.getContext('2d');
 function draw(time){
  // Wrapping time makes positions AND velocities continuous at the seam.
  time=((time%DURATION)+DURATION)%DURATION;
  ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ictx.clearRect(0,0,W,H);
  const blend=smooth((time-4.6)/.65)*(1-smooth((time-7.2)/.65));
  for(const p of particles){
   const joining=smooth((time-p.start)/(p.arrival-p.start));
   const leaving=smooth((time-p.depart)/(p.finish-p.depart));
   const q=joining*(1-leaving),u=TAU*time/DURATION;
   const wx=p.sx+p.ax*Math.sin(u+p.phase),wy=p.sy+p.ay*Math.cos(u+p.phase);
   const curve=Math.sin(Math.PI*q)*(1-blend);
   const bx=time<6?p.bendX:p.leaveX,by=time<6?p.bendY:p.leaveY;
   const x=mix(wx,p.x,q)+curve*bx,y=mix(wy,p.y,q)+curve*by;
   const a=p.angle+(1-q)*(p.spin+.35*Math.sin(u+p.phase));
   const size=mix(p.length,p.restLength,q);
   ictx.setTransform(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),x,y);
   ictx.drawImage(p.shade?gray:bone,-size/2,-size*ratio/2,size,size*ratio);
  }
  ictx.resetTransform();
  ctx.globalAlpha=1-blend;ctx.drawImage(ink,0,0);
  ctx.globalAlpha=blend;ctx.drawImage(logo,TX,TY,TW,TH);ctx.globalAlpha=1;
  return Buffer.from(ctx.getImageData(0,0,W,H).data);
 }
 assert.deepEqual(draw(0),draw(DURATION),'Loop boundary must match exactly');
 const sampleTimes=[0,1.8,3.2,4.45,5.8,7.8,9.6,11.95];
 for(const time of sampleTimes){draw(time);fs.writeFileSync(path.join(output,`frame-${String(time).replace('.','_')}.png`),c.toBuffer('image/png'));}
 // Frame buffers are stacked vertically for libvips' animated GIF encoder.
 const raw=Buffer.alloc(W*H*4*FRAMES);
 for(let f=0;f<FRAMES;f++){
  draw(f/FPS).copy(raw,f*W*H*4);
  if(f%40===0)console.log(`Rendered ${f}/${FRAMES}`);
 }
 const gif=path.join(output,'the-living-members-animated-1.gif');
 console.log('Encoding GIF');
 const rawOptions={raw:{width:W,height:H*FRAMES,channels:4,pageHeight:H},limitInputPixels:false};
 await sharp(raw,rawOptions).gif({loop:0,delay:Array(FRAMES).fill(1000/FPS),colours:16,dither:0,effort:8,interFrameMaxError:2,interPaletteMaxError:8}).toFile(gif);
 const meta=await sharp(gif,{animated:true,limitInputPixels:false}).metadata();
 assert.equal(meta.loop,0);assert.equal(meta.width,W);assert.equal(meta.pageHeight,H);assert.equal(meta.delay.reduce((a,b)=>a+b,0),DURATION*1000);
 const report={file:path.basename(gif),width:W,height:H,durationSeconds:DURATION,fps:FPS,encodedFrames:meta.pages,loop:'infinite',background:'#ffffff',particles:particles.length,bytes:fs.statSync(gif).size,loopBoundary:'identical state and continuous velocity at 0 and 12 seconds',source:'reference/the-living-members.png',boneSource:'reference/femur-generated.png'};
 fs.writeFileSync(path.join(output,'animation-info.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
