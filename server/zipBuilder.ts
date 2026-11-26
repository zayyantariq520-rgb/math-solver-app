import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.aistudio',
  'dev-dist',
]);

const EXCLUDED_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.DS_Store',
]);

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function collectFiles(baseDir: string, currentDir: string, files: string[]): void {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
    if (EXCLUDED_FILES.has(entry.name)) continue;

    const fullPath = path.resolve(currentDir, entry.name);
    if (!fullPath.startsWith(baseDir + path.sep)) continue;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      collectFiles(baseDir, fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
}

export function buildProjectZip(rootDir: string): Buffer {
  const resolvedRoot = path.resolve(rootDir);
  const filePaths: string[] = [];
  collectFiles(resolvedRoot, resolvedRoot, filePaths);

  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const absPath of filePaths) {
    const relPath = path.relative(resolvedRoot, absPath).split(path.sep).join('/');
    const nameBuf = Buffer.from(relPath, 'utf8');
    const rawData = fs.readFileSync(absPath);
    const compressed = zlib.deflateRawSync(rawData);
    const crc = crc32(rawData);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 flag
    localHeader.writeUInt16LE(8, 8); // deflate compression
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, compressed);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDirBuffer = Buffer.concat(centralChunks);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(filePaths.length, 8);
  endRecord.writeUInt16LE(filePaths.length, 10);
  endRecord.writeUInt32LE(centralDirBuffer.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralDirBuffer, endRecord]);
}
