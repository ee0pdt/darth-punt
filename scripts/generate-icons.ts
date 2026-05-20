// Generates icons/icon.svg, icons/icon-192.png, icons/icon-512.png.
// Pure Deno — no external dependencies. Uses built-in CompressionStream for PNG DEFLATE.

const ICONS_DIR = new URL("../icons/", import.meta.url).pathname;

await Deno.mkdir(ICONS_DIR, { recursive: true });

// ---- PNG encoder (CRC-32 + zlib-wrapped DEFLATE) ----

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u32be(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0);
  return b;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const crcBytes = u32be(crc32(concat(typeBytes, data)));
  return concat(u32be(data.length), typeBytes, data, crcBytes);
}

async function zlibCompress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  // Write + read concurrently — awaiting write before reading deadlocks on large inputs
  // because the stream's internal buffer fills until the reader drains it.
  const writePromise = writer.write(data as unknown as Uint8Array<ArrayBuffer>).then(() =>
    writer.close()
  );
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  await writePromise;
  return concat(...chunks);
}

async function encodePNG(width: number, height: number, rgba: Uint8Array): Promise<Uint8Array> {
  const stride = width * 4;
  const filtered = new Uint8Array(height * (stride + 1));
  for (let row = 0; row < height; row++) {
    filtered[row * (stride + 1)] = 0;
    filtered.set(rgba.subarray(row * stride, (row + 1) * stride), row * (stride + 1) + 1);
  }

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA

  return concat(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", await zlibCompress(filtered)),
    pngChunk("IEND", new Uint8Array(0)),
  );
}

// ---- Icon rasterizer: cyan->purple gradient circle with three EQ bars ----

function inRoundedRect(px: number, py: number, size: number, r: number): boolean {
  const left = r, right = size - r, top = r, bottom = size - r;
  const dx = px < left ? left - px : px > right ? px - right : 0;
  const dy = py < top ? top - py : py > bottom ? py - bottom : 0;
  return dx * dx + dy * dy <= r * r;
}

function rasterize(size: number): Uint8Array {
  const rgba = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const circleR = size * 0.36;
  const cornerR = size * 0.22;
  const barH = Math.max(2, Math.round(size * 0.05));
  const barSpacing = size * 0.1;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      if (!inRoundedRect(px, py, size, cornerR)) continue;

      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= circleR) {
        // Cyan (#00f5ff) -> purple (#9b59ff) radial gradient
        const t = dist / circleR;
        rgba[idx] = Math.round(0 + t * 155);
        rgba[idx + 1] = Math.round(245 - t * 156);
        rgba[idx + 2] = 255;
        rgba[idx + 3] = 255;

        // Three vertical-ish bars centred on the disk
        for (let bi = -1; bi <= 1; bi++) {
          const barCx = cx + bi * barSpacing;
          const halfH = circleR * (0.55 - Math.abs(bi) * 0.1);
          if (Math.abs(px - barCx) < barH / 2 && Math.abs(py - cy) < halfH) {
            rgba[idx] = 1;
            rgba[idx + 1] = 6;
            rgba[idx + 2] = 8;
            rgba[idx + 3] = 230;
          }
        }
      } else {
        // Dark background #010608
        rgba[idx] = 1;
        rgba[idx + 1] = 6;
        rgba[idx + 2] = 8;
        rgba[idx + 3] = 255;
      }
    }
  }
  return rgba;
}

// ---- Write files ----

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00f5ff" />
      <stop offset="100%" stop-color="#9b59ff" />
    </radialGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="#010608" />
  <circle cx="50" cy="50" r="28" fill="url(#g)" />
  <rect x="40"   y="36" width="3.5" height="28" rx="1.75" fill="#010608" opacity="0.85" />
  <rect x="48.25" y="32" width="3.5" height="36" rx="1.75" fill="#010608" opacity="0.85" />
  <rect x="56.5" y="36" width="3.5" height="28" rx="1.75" fill="#010608" opacity="0.85" />
</svg>
`;

await Deno.writeTextFile(`${ICONS_DIR}icon.svg`, SVG);
console.log("icons/icon.svg");

for (const size of [192, 512]) {
  const pixels = rasterize(size);
  const png = await encodePNG(size, size, pixels);
  await Deno.writeFile(`${ICONS_DIR}icon-${size}.png`, png);
  console.log(`icons/icon-${size}.png`);
}
