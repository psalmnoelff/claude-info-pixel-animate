// Generate app icon (PNG + ICO) from the leader sprite face data
// Run: node scripts/generate-icon.js

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// PICO-8 palette [R, G, B]
const PALETTE = [
  [0x00, 0x00, 0x00], // 0  black
  [0x1d, 0x2b, 0x53], // 1  dark blue
  [0x7e, 0x25, 0x53], // 2  dark purple
  [0x00, 0x87, 0x51], // 3  dark green
  [0xab, 0x52, 0x36], // 4  brown
  [0x5f, 0x57, 0x4f], // 5  dark grey
  [0xc2, 0xc3, 0xc7], // 6  light grey
  [0xff, 0xf1, 0xe8], // 7  white
  [0xff, 0x00, 0x4d], // 8  red
  [0xff, 0xa3, 0x00], // 9  orange
  [0xff, 0xec, 0x27], // 10 yellow
  [0x00, 0xe4, 0x36], // 11 green
  [0x29, 0xad, 0xff], // 12 blue
  [0x83, 0x76, 0x9c], // 13 indigo
  [0xff, 0x77, 0xa8], // 14 pink
  [0xff, 0xcc, 0xaa], // 15 peach
];

const T = -1; // transparent

// 16x16 leader face (sprite rows 2-17, cols 8-23)
const FACE = [
  [T,T,T,T, 0,0,0,0, 0,0,0,0, T,T,T,T],          // hair top outline
  [T,T, 0, 4,4,4,4,4,4,4,4,4,4, 0, T,T],          // hair
  [T, 0, 4,4,4,4,4,4,4,4,4,4,4,4, 0, T],          // hair wider
  [0, 4,4,4, 9, 4,4,4,4,4,4, 9, 4,4,4, 0],        // hair highlights
  [0, 4,4,4,4,4,4,4,4,4,4,4,4,4,4, 0],            // hair full
  [0, 4,4, 15,15,15,15,15,15,15,15,15,15, 4,4, 0], // forehead
  [0, 4, 15,15,15,15,15,15,15,15,15,15,15,15, 4, 0], // upper face
  [0, 4, 15,15, 4,4, 15,15,15,15, 4,4, 15,15, 4, 0], // eyebrows
  [0, 4, 15, 12, 7,7, 12, 15,15, 12, 7,7, 12, 15, 4, 0], // eyes (glasses)
  [0, 4, 15, 12, 0,0, 12, 15,15, 12, 0,0, 12, 15, 4, 0], // pupils
  [0, 4, 15,15,15,15,15,15,15,15,15,15,15,15, 4, 0], // cheeks
  [0, 4, 15,15,15,15,15,15,15,15,15,15,15,15, 4, 0], // lower face
  [0, 4, 15,15,15,15,15, 8,8, 15,15,15,15,15, 4, 0], // mouth
  [T, 0, 15,15,15,15,15,15,15,15,15,15,15,15, 0, T], // chin
  [T,T,T, 0, 15,15,15,15,15,15,15,15, 0, T,T,T],  // neck
  [T,T, 0, 1,1,1,1, 7,7, 1,1,1,1, 0, T,T],        // collar
];

const FACE_SIZE = 16;
const SCALE = 16; // 16x16 * 16 = 256x256
const SIZE = FACE_SIZE * SCALE;

// Generate RGBA pixel buffer scaled up
function generatePixels() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const srcY = Math.floor(y / SCALE);
      const srcX = Math.floor(x / SCALE);
      const idx = (y * SIZE + x) * 4;
      const c = FACE[srcY][srcX];
      if (c === T) {
        buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
      } else {
        buf[idx] = PALETTE[c][0];
        buf[idx + 1] = PALETTE[c][1];
        buf[idx + 2] = PALETTE[c][2];
        buf[idx + 3] = 255;
      }
    }
  }
  return buf;
}

// CRC-32
function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Build a PNG chunk
function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Create PNG from RGBA pixel buffer
function createPNG(pixels, w, h) {
  // Prepend filter byte (0 = None) to each row
  const filtered = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const off = y * (1 + w * 4);
    filtered[off] = 0;
    pixels.copy(filtered, off + 1, y * w * 4, (y + 1) * w * 4);
  }

  const compressed = zlib.deflateSync(filtered);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Wrap PNG in ICO container (Windows icon)
function createICO(pngData) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);  // reserved
  header.writeUInt16LE(1, 2);  // type: ICO
  header.writeUInt16LE(1, 4);  // 1 image

  const entry = Buffer.alloc(16);
  entry[0] = 0;  // width 256 (0 = 256)
  entry[1] = 0;  // height 256
  entry[2] = 0;  // no palette
  entry[3] = 0;  // reserved
  entry.writeUInt16LE(1, 4);   // color planes
  entry.writeUInt16LE(32, 6);  // bits per pixel
  entry.writeUInt32LE(pngData.length, 8);  // image size
  entry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngData]);
}

// Generate
const pixels = generatePixels();
const png = createPNG(pixels, SIZE, SIZE);
const ico = createICO(png);

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

fs.writeFileSync(path.join(assetsDir, 'icon.png'), png);
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), ico);

console.log(`Generated assets/icon.png (${png.length} bytes)`);
console.log(`Generated assets/icon.ico (${ico.length} bytes)`);
console.log(`Size: ${SIZE}x${SIZE} (${FACE_SIZE}x${FACE_SIZE} scaled ${SCALE}x)`);
