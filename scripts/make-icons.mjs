// Generates the extension icons without any image dependency: a dark rounded tile with a
// three-segment (green/amber/red) gauge bar — the same visual language as the HUD.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const r = size * 0.22; // corner radius
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      // rounded-rect mask
      const dx = Math.max(r - x, x - (size - 1 - r), 0);
      const dy = Math.max(r - y, y - (size - 1 - r), 0);
      const inside = dx * dx + dy * dy <= r * r;
      let [R, G, B, A] = [24, 26, 32, inside ? 255 : 0];
      // gauge bar in lower-middle band
      const by0 = size * 0.55, by1 = size * 0.75, bx0 = size * 0.15, bx1 = size * 0.85;
      if (inside && y >= by0 && y < by1 && x >= bx0 && x < bx1) {
        const t = (x - bx0) / (bx1 - bx0);
        [R, G, B] = t < 0.6 ? [46, 204, 113] : t < 0.85 ? [241, 196, 15] : [231, 76, 60];
      }
      // "DOM" hint: three small light squares at top
      const sy0 = size * 0.22, sy1 = size * 0.4;
      if (inside && y >= sy0 && y < sy1) {
        for (let i = 0; i < 3; i++) {
          const sx0 = size * (0.15 + i * 0.25), sx1 = sx0 + size * 0.2;
          if (x >= sx0 && x < sx1) [R, G, B] = [200, 205, 215];
        }
      }
      raw[o] = R; raw[o + 1] = G; raw[o + 2] = B; raw[o + 3] = A;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
for (const s of [16, 32, 48, 128]) writeFileSync(`icons/icon${s}.png`, png(s));
console.log('icons written');
