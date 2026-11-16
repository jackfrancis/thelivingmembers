// npm install, then node build.cjs [source-photo] [output-directory]
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const photoPath = path.resolve(process.argv[2] || path.join(__dirname, '../../TLM1-front.png'));
const outputDir = path.resolve(process.argv[3] || path.join(__dirname, '../..'));
const framePath = path.join(__dirname, 'frame-generated.png');
const basename = 'TLM1-front-framed';
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
    { crop: {left:3,top:2,width:1442,height:92}, width, height:rail, left:0, top:0 },
    { crop: {left:3,top:993,width:1442,height:91}, width, height:rail, left:0, top:height-rail },
    { crop: {left:3,top:94,width:92,height:899}, width:rail, height:photoHeight, left:0, top:rail },
    { crop: {left:1351,top:94,width:94,height:899}, width:rail, height:photoHeight, left:width-rail, top:rail },
  ];
  const boards = await Promise.all(sections.map(async s => ({
    input: await sharp(framePath).extract(s.crop).resize(s.width, s.height, {fit:'fill'})
      .flatten({background:'#c3a17b'}).png().toBuffer(), left:s.left, top:s.top
  })));
  const master = await sharp({create:{width,height,channels:3,background:'#c3a17b'}})
    .composite([...boards, {input:photo,left:rail,top:rail}]).removeAlpha().png().toBuffer();

  // Confirm that framing did not crop, cover, regenerate, or recolor the photograph.
  const inset = await sharp(master).extract({left:rail,top:rail,width:photoWidth,height:photoHeight}).raw().toBuffer();
  assert(inset.equals(await sharp(photo).raw().toBuffer()), 'Photograph pixels changed during framing');
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
    photographPreservedBeforeCompression:true,
    master:{width,height,photoWidth,photoHeight,frameThickness:rail},
    frameAddedRelativeToPhoto:{widthPercent:2*rail/photoWidth*100,heightPercent:2*rail/photoHeight*100},
    preferredFormat:'jpg',alternateFormat:'webp',files
  };
  fs.writeFileSync(path.join(outputDir,basename+'.json'),JSON.stringify(report,null,2)+'\n');
  // Optional lossless proof, for visual inspection only; never served on the website.
  if(process.env.FRAME_PROOF_PATH) fs.writeFileSync(process.env.FRAME_PROOF_PATH,master);
  console.log(JSON.stringify(report,null,2));
})().catch(error => {console.error(error);process.exitCode=1;});
