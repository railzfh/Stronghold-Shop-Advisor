import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
const dist = path.join(root, 'dist');
const unpacked = path.join(dist, 'unpacked');
const archive = path.join(dist, `shop-advisor-${manifest.version}.zip`);
const files = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'popup.css',
  'popup-layout.js',
  'core.js',
  'content.js',
  'catalog.json',
  'default-config.json',
  'attention-notes.json',
  'yan-strategy.json',
  'CONFIG.md',
  'ATTENTION-NOTES.md',
  'CHANGELOG.md',
  'README.md',
  'LICENSE',
  'NOTICE.md',
];

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(unpacked, { recursive: true });
for (const file of files) {
  await fs.copyFile(path.join(root, file), path.join(unpacked, file));
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = (buffer) => {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};
const u16 = (value) => {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
};
const u32 = (value) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
};
const dosTime = (date = new Date()) => ({
  time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
});

const localParts = [];
const centralParts = [];
let offset = 0;
const stamp = dosTime();
for (const file of files) {
  const name = Buffer.from(file.replaceAll(path.sep, '/'));
  const source = await fs.readFile(path.join(unpacked, file));
  const compressed = zlib.deflateRawSync(source, { level: 9 });
  const checksum = crc32(source);
  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(0), u16(8), u16(stamp.time), u16(stamp.date),
    u32(checksum), u32(compressed.length), u32(source.length), u16(name.length), u16(0), name, compressed,
  ]);
  localParts.push(local);
  const central = Buffer.concat([
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(stamp.time), u16(stamp.date),
    u32(checksum), u32(compressed.length), u32(source.length), u16(name.length), u16(0), u16(0),
    u16(0), u16(0), u32(0), u32(offset), name,
  ]);
  centralParts.push(central);
  offset += local.length;
}

const localData = Buffer.concat(localParts);
const centralData = Buffer.concat(centralParts);
const end = Buffer.concat([
  u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
  u32(centralData.length), u32(localData.length), u16(0),
]);
await fs.writeFile(archive, Buffer.concat([localData, centralData, end]));
console.log(`Package written: ${path.relative(root, archive)}`);
