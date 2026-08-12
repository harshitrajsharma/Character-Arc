const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, drawFn) {
  const buffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  const rawLines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawLines[y * (width * 4 + 1)] = 0;
    buffer.copy(rawLines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawLines);

  function calcCRC(buf) {
    let c = 0xffffffff;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let k = n;
      for (let m = 0; m < 8; m++) {
        if (k & 1) k = 0xedb88320 ^ (k >>> 1);
        else k = k >>> 1;
      }
      table[n] = k;
    }
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    const crc = calcCRC(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

function drawCharacterArcIcon(x, y, width, height, isMaskable = false) {
  const nx = x / width;
  const ny = y / height;

  const cx = nx - 0.5;
  const cy = ny - 0.5;

  let bgAlpha = 255;
  if (!isMaskable) {
    const cornerRadius = 0.22;
    const dx = Math.max(0, Math.abs(cx) - (0.5 - cornerRadius));
    const dy = Math.max(0, Math.abs(cy) - (0.5 - cornerRadius));
    const cornerDist = Math.sqrt(dx * dx + dy * dy);
    if (cornerDist > cornerRadius) {
      return [0, 0, 0, 0];
    }
  }

  const bgProgress = ny;
  const bgR = Math.round(11 + bgProgress * 12);
  const bgG = Math.round(15 + bgProgress * 13);
  const bgB = Math.round(23 + bgProgress * 17);

  const scale = isMaskable ? 0.75 : 1.0;
  const snx = 0.5 + (nx - 0.5) / scale;
  const sny = 0.5 + (ny - 0.5) / scale;

  let r = bgR;
  let g = bgG;
  let b = bgB;
  let a = bgAlpha;

  if (snx >= 0 && snx <= 1 && sny >= 0 && sny <= 1) {
    let minDist = 999;
    let bestT = 0;
    for (let t = 0; t <= 1.0; t += 0.01) {
      const bx = (1 - t) * (1 - t) * 0.24 + 2 * (1 - t) * t * 0.35 + t * t * 0.76;
      const by = (1 - t) * (1 - t) * 0.72 + 2 * (1 - t) * t * 0.3 + t * t * 0.28;
      const d = Math.sqrt((snx - bx) * (snx - bx) + (sny - by) * (sny - by));
      if (d < minDist) {
        minDist = d;
        bestT = t;
      }
    }

    const strokeRadius = 0.042;
    const glowRadius = 0.09;

    let arcR = 79 + bestT * (6 - 79);
    let arcG = 70 + bestT * (182 - 70);
    let arcB = 229 + bestT * (212 - 229);

    if (minDist <= strokeRadius) {
      const edge = minDist / strokeRadius;
      const factor = Math.cos(edge * (Math.PI / 2));
      r = Math.round(r * (1 - factor) + arcR * factor);
      g = Math.round(g * (1 - factor) + arcG * factor);
      b = Math.round(b * (1 - factor) + arcB * factor);
    } else if (minDist <= glowRadius) {
      const glowFactor = Math.pow(1 - (minDist - strokeRadius) / (glowRadius - strokeRadius), 2) * 0.55;
      r = Math.min(255, Math.round(r + arcR * glowFactor));
      g = Math.min(255, Math.round(g + arcG * glowFactor));
      b = Math.min(255, Math.round(b + arcB * glowFactor));
    }

    const nodes = [
      { t: 0.15, radius: 0.03, color: [99, 102, 241] },
      { t: 0.55, radius: 0.035, color: [139, 92, 246] },
      { t: 0.9, radius: 0.04, color: [6, 182, 212] }
    ];

    for (const node of nodes) {
      const t = node.t;
      const nx_pos = (1 - t) * (1 - t) * 0.24 + 2 * (1 - t) * t * 0.35 + t * t * 0.76;
      const ny_pos = (1 - t) * (1 - t) * 0.72 + 2 * (1 - t) * t * 0.3 + t * t * 0.28;
      const ndist = Math.sqrt((snx - nx_pos) * (snx - nx_pos) + (sny - ny_pos) * (sny - ny_pos));

      if (ndist <= node.radius) {
        const factor = Math.cos((ndist / node.radius) * (Math.PI / 2));
        r = Math.round(r * (1 - factor) + node.color[0] * factor);
        g = Math.round(g * (1 - factor) + node.color[1] * factor);
        b = Math.round(b * (1 - factor) + node.color[2] * factor);
      } else if (ndist <= node.radius * 2.2) {
        const gfactor = (1 - (ndist - node.radius) / (node.radius * 1.2)) * 0.4;
        r = Math.min(255, Math.round(r + node.color[0] * gfactor));
        g = Math.min(255, Math.round(g + node.color[1] * gfactor));
        b = Math.min(255, Math.round(b + node.color[2] * gfactor));
      }
    }

    const spX = 0.78;
    const spY = 0.22;
    const dx = Math.abs(snx - spX);
    const dy = Math.abs(sny - spY);
    const starDist = Math.min(dx * 0.3 + dy, dy * 0.3 + dx);

    if (starDist < 0.045) {
      const sFactor = Math.pow(1 - starDist / 0.045, 2);
      r = Math.min(255, Math.round(r + 244 * sFactor));
      g = Math.min(255, Math.round(g + 114 * sFactor));
      b = Math.min(255, Math.round(b + 182 * sFactor));
    }
  }

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA Icons...');

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPNG(192, 192, (x, y, w, h) => drawCharacterArcIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPNG(512, 512, (x, y, w, h) => drawCharacterArcIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), createPNG(192, 192, (x, y, w, h) => drawCharacterArcIcon(x, y, w, h, true)));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), createPNG(512, 512, (x, y, w, h) => drawCharacterArcIcon(x, y, w, h, true)));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPNG(180, 180, (x, y, w, h) => drawCharacterArcIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), createPNG(32, 32, (x, y, w, h) => drawCharacterArcIcon(x, y, w, h, false)));

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F17" />
      <stop offset="50%" stop-color="#131722" />
      <stop offset="100%" stop-color="#1A1F2C" />
    </linearGradient>
    <linearGradient id="arcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="45%" stop-color="#7C3AED" />
      <stop offset="80%" stop-color="#06B6D4" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>
    <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F472B6" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <circle cx="256" cy="256" r="180" fill="none" stroke="url(#arcGrad)" stroke-width="2" opacity="0.2" />

  <path d="M 120 370 C 140 250, 220 160, 360 150" 
        fill="none" 
        stroke="url(#arcGrad)" 
        stroke-width="36" 
        stroke-linecap="round" 
        filter="url(#glow)" />

  <circle cx="155" cy="305" r="14" fill="#4F46E5" stroke="#FFFFFF" stroke-width="4" />
  <circle cx="240" cy="215" r="16" fill="#7C3AED" stroke="#FFFFFF" stroke-width="4" />
  <circle cx="340" cy="155" r="18" fill="#06B6D4" stroke="#FFFFFF" stroke-width="4" filter="url(#glow)" />

  <path d="M 370 110 L 376 130 L 396 136 L 376 142 L 370 162 L 364 142 L 344 136 L 364 130 Z" 
        fill="url(#sparkleGrad)" 
        filter="url(#glow)" />
</svg>`;

fs.writeFileSync(path.join(__dirname, '../public/icon.svg'), svgContent);

console.log('Successfully generated PWA icons!');
