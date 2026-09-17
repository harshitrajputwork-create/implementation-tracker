import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

// Brand: blue-600 (#2563eb) rounded-square with the Sidebar's ClipboardList glyph, white.
const glyph = `
  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  <path d="M12 11h4"/>
  <path d="M12 16h4"/>
  <path d="M8 11h.01"/>
  <path d="M8 16h.01"/>
`

function icon({ size, cornerRadius, glyphScale, bg = '#2563eb' }) {
  const g = 24 * glyphScale
  const offset = (24 - g) / 2
  return `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" rx="${cornerRadius}" fill="${bg}"/>
  <g transform="translate(${offset} ${offset}) scale(${glyphScale})"
     fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${glyph}
  </g>
</svg>`
}

const jobs = [
  { name: 'icon-192.png', size: 192, cornerRadius: 5, glyphScale: 0.72 },
  { name: 'icon-512.png', size: 512, cornerRadius: 5, glyphScale: 0.72 },
  // Maskable: content kept inside Android's ~80% safe zone, background fills the full canvas.
  { name: 'icon-maskable-512.png', size: 512, cornerRadius: 0, glyphScale: 0.55 },
  { name: 'apple-touch-icon.png', size: 180, cornerRadius: 5, glyphScale: 0.72 },
]

for (const job of jobs) {
  const svg = icon(job)
  await sharp(Buffer.from(svg)).resize(job.size, job.size).png().toFile(`public/icons/${job.name}`)
  console.log('wrote', job.name)
}
