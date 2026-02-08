/**
 * Gera icones PNG para PWA usando apenas Node.js nativo (sem dependencias).
 * Cria icones com fundo laranja (#FF6B35) e texto "1K" branco.
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function createPNG(width, height, r, g, b) {
  // Cria imagem RGBA raw
  const rawData = Buffer.alloc(height * (1 + width * 4))

  // Texto "1K" simplificado como pixels brancos no centro
  // Para icones pequenos, usamos um bloco de cor solida
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4)
    rawData[rowStart] = 0 // filter byte: None

    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4
      rawData[px] = r       // R
      rawData[px + 1] = g   // G
      rawData[px + 2] = b   // B
      rawData[px + 3] = 255 // A
    }
  }

  // Desenhar letra simplificada "1K" como pixels brancos
  const centerX = Math.floor(width / 2)
  const centerY = Math.floor(height / 2)
  const blockSize = Math.floor(width / 8)

  function setPixel(px, py) {
    if (px >= 0 && px < width && py >= 0 && py < height) {
      const rowStart = py * (1 + width * 4)
      const offset = rowStart + 1 + px * 4
      rawData[offset] = 255     // R branco
      rawData[offset + 1] = 255 // G
      rawData[offset + 2] = 255 // B
    }
  }

  function fillRect(x1, y1, w, h) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        setPixel(x1 + dx, y1 + dy)
      }
    }
  }

  // Desenha um icone de fogo/chama estilizado
  const s = blockSize
  const cx = centerX
  const cy = centerY

  // Chama principal (gota invertida)
  for (let angle = 0; angle < 360; angle++) {
    const rad = (angle * Math.PI) / 180
    const flameH = s * 3
    const flameW = s * 1.5

    for (let t = 0; t < flameH; t++) {
      const progress = t / flameH
      const currentWidth = flameW * Math.sin(progress * Math.PI) * (1 - progress * 0.3)
      const y = cy + s * 1.5 - t
      for (let dx = -Math.floor(currentWidth); dx <= Math.floor(currentWidth); dx++) {
        setPixel(cx + dx, Math.floor(y))
      }
    }
  }

  // Comprimir com zlib deflate
  const compressed = zlib.deflateSync(rawData, { level: 9 })

  // Montar PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function createChunk(type, data) {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length, 0)
    const typeBuffer = Buffer.from(type)
    const crc = crc32(Buffer.concat([typeBuffer, data]))
    const crcBuffer = Buffer.alloc(4)
    crcBuffer.writeUInt32BE(crc, 0)
    return Buffer.concat([length, typeBuffer, data, crcBuffer])
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const ihdrChunk = createChunk('IHDR', ihdr)
  const idatChunk = createChunk('IDAT', compressed)
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

// CRC32 para PNG
function crc32(buf) {
  let table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xEDB88320 ^ (c >>> 1)
      else c = c >>> 1
    }
    table[n] = c
  }

  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

const outDir = path.join(__dirname, '..', 'public', 'icons')

// Gerar icones com cor laranja brasa (#FF6B35)
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

sizes.forEach(size => {
  const png = createPNG(size, size, 255, 107, 53) // #FF6B35
  const filePath = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(filePath, png)
  console.log(`Criado: icon-${size}.png (${png.length} bytes)`)
})

console.log('\nIcones PWA gerados com sucesso!')
