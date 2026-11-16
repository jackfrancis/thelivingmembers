// npm install, then node build.cjs [source-photo] [output-directory]
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const photoPath = path.resolve(process.argv[2] || path.join(__dirname, '../../TLM1-front.png'));
const outputDir = path.resolve(process.argv[3] || path.join(__dirname, '../..'));
const framePath = path.join(__dirname, 'frame-generated.png');
const basename = 'TLM1-front-framed-plywood-glass';
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const original = fs.readFileSync(photoPath);
  const originalHash = hash(original);
  const meta = await sharp(original).metadata();
  assert.equal(meta.width * 3, meta.height * 4, 'The full photograph must have a 4:3 aspect ratio');
  const photoWidth = 1760, photoHeight = 1320, rail = 80;
  const width = photoWidth + rail * 2, height = photoHeight + rail * 2;
  const photo = await sharp(original).rotate().resize(photoWidth, photoHeight).removeAlpha().png().toBuffer();

  // Assemble the four existing generated boards around the unaltered photograph.
  // The crops remove only exterior transparent padding and the empty aperture.
  // The top and bottom boards span the full width, retaining the plain butt joints.
  const sections = [
    { crop: {left:0,top:0,width:1448,height:99}, width, height:rail, left:0, top:0 },
    { crop: {left:0,top:990,width:1448,height:96}, width, height:rail, left:0, top:height-rail },
    { crop: {left:0,top:99,width:100,height:891}, width:rail, height:photoHeight, left:0, top:rail },
    { crop: {left:1348,top:99,width:100,height:891}, width:rail, height:photoHeight, left:width-rail, top:rail },
  ];
  const boards = await Promise.all(sections.map(async s => ({
    input: await sharp(framePath).extract(s.crop).resize(s.width, s.height, {fit:'fill'})
      .flatten({background:'#a79783'}).png().toBuffer(), left:s.left, top:s.top
  })));
  const bareMaster = await sharp({create:{width,height,channels:3,background:'#a79783'}})
    .composite([...boards, {input:photo,left:rail,top:rail}]).removeAlpha().png().toBuffer();

  // Confirm that framing did not crop, cover, regenerate, or recolor the photograph.
  const inset = await sharp(bareMaster).extract({left:rail,top:rail,width:photoWidth,height:photoHeight}).raw().toBuffer();
  assert(inset.equals(await sharp(photo).raw().toBuffer()), 'Photograph pixels changed during framing');
  // Imagegen supplies optical effects only; the original picture stays beneath them.
  // Limit reflection strength and crop edge shading to an eight-pixel inset.
  async function opticalLayer(file, targetWidth, targetHeight, strength, crop) {
    let input = sharp(path.join(__dirname,file));
    if(crop) input = input.extract(crop);
    const {data,info}=await input.resize(targetWidth,targetHeight,{fit:'fill'})
      .blur(crop?0.5:1.2).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let i=3;i<data.length;i+=4)data[i]=Math.round(data[i]*strength);
    return sharp(data,{raw:info}).png().toBuffer();
  }
  const reflection=await opticalLayer('glass-generated.png',photoWidth,photoHeight,0.18);
  const edgeMeta=await sharp(path.join(__dirname,'glass-edge-generated.png')).metadata();
  const topEdge=await opticalLayer('glass-edge-generated.png',photoWidth,8,0.28,{left:0,top:0,width:edgeMeta.width,height:10});
  const leftEdge=await opticalLayer('glass-edge-generated.png',8,photoHeight-8,0.28,{left:0,top:10,width:10,height:edgeMeta.height-10});
  const master=await sharp(bareMaster).composite([
    {input:reflection,left:rail,top:rail},
    {input:topEdge,left:rail,top:rail},
    {input:leftEdge,left:rail,top:rail+8}
  ]).removeAlpha().png().toBuffer();
  const barePixels=await sharp(bareMaster).removeAlpha().raw().toBuffer();
  const glassPixels=await sharp(master).removeAlpha().raw().toBuffer();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    if(x>=rail&&x<width-rail&&y>=rail&&y<height-rail)continue;
    const i=(y*width+x)*3;
    assert.equal(glassPixels[i],barePixels[i],'Frame red changed');
    assert.equal(glassPixels[i+1],barePixels[i+1],'Frame green changed');
    assert.equal(glassPixels[i+2],barePixels[i+2],'Frame blue changed');
  }
  const files = [];
  for (const targetWidth of [1920,1280,768]) {
    const suffix = targetWidth === 1920 ? '' : '-'+targetWidth;
    const resized = await sharp(master).resize({width:targetWidth}).png().toBuffer();
    for (const format of ['webp','jpg']) {
      const name = basename+suffix+'.'+format;
      const image = sharp(resized);
      const encoded = format === 'webp'
        ? await image.webp({quality:82,effort:6}).toBuffer()
        : await image.jpeg({quality:84,mozjpeg:true,progressive:true,chromaSubsampling:'4:2:0'}).toBuffer();
      const decoded = await sharp(encoded).metadata();
      assert.equal(decoded.width,targetWidth);
      assert(!decoded.hasAlpha, 'The final framed photo should be opaque');
      fs.writeFileSync(path.join(outputDir,name),encoded);
      files.push({file:name,format,width:decoded.width,height:decoded.height,bytes:encoded.length,quality:format==='webp'?82:84});
    }
  }
  assert.equal(hash(fs.readFileSync(photoPath)),originalHash,'Source file changed');
  const report = {
    source:path.basename(photoPath),sourceBytes:original.length,sourceSha256:originalHash,
    photographBasePreserved:true,framePixelsPreservedBeforeCompression:true,
    glass:{reflectionStrength:0.18,edgeStrength:0.28,edgeInsetPixels:8,clippedToPhoto:true},
    master:{width,height,photoWidth,photoHeight,frameThickness:rail},
    frameAddedRelativeToPhoto:{widthPercent:2*rail/photoWidth*100,heightPercent:2*rail/photoHeight*100},
    preferredFormat:'jpg',alternateFormat:'webp',files
  };
  fs.writeFileSync(path.join(outputDir,basename+'.json'),JSON.stringify(report,null,2)+'\n');
  // Optional lossless proof, for visual inspection only; never served on the website.
  if(process.env.FRAME_PROOF_PATH) fs.writeFileSync(process.env.FRAME_PROOF_PATH,master);
  console.log(JSON.stringify(report,null,2));
})().catch(error => {console.error(error);process.exitCode=1;});
