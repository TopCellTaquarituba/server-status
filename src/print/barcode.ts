import JsBarcode from 'jsbarcode'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Gera um código de barras CODE128 como SVG em string (para inserir no HTML de impressão) */
export function barcodeSvg(value: string, heightMm: number, showText = true): string {
  if (!value) return ''
  try {
    const svg = document.createElementNS(SVG_NS, 'svg')
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: 2,
      height: 60,
      margin: 0,
      displayValue: showText,
      fontSize: 18,
      textMargin: 2,
      font: 'Arial',
      background: '#ffffff',
      lineColor: '#000000',
    })
    const w = parseFloat(svg.getAttribute('width') ?? '0')
    const h = parseFloat(svg.getAttribute('height') ?? '0')
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.setAttribute('class', 'barcode')
    svg.setAttribute('style', `height:${heightMm}mm;width:100%;display:block`)
    return svg.outerHTML
  } catch {
    return ''
  }
}

/** Desenho do padrão de desbloqueio (sequência "1-5-9") */
export function patternSvg(sequence: string, sizeMm = 16): string {
  const points = sequence
    .split('-')
    .map(Number)
    .filter((n) => n >= 1 && n <= 9)
  const pos = (n: number) => ({ x: ((n - 1) % 3) * 40 + 20, y: Math.floor((n - 1) / 3) * 40 + 20 })
  const dots = Array.from({ length: 9 }, (_, i) => {
    const { x, y } = pos(i + 1)
    return `<circle cx="${x}" cy="${y}" r="5" fill="#000"/>`
  }).join('')
  const line = points.length > 1 ? `<polyline points="${points.map((n) => `${pos(n).x},${pos(n).y}`).join(' ')}" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` : ''
  const start = points.length ? `<circle cx="${pos(points[0]).x}" cy="${pos(points[0]).y}" r="11" fill="none" stroke="#000" stroke-width="3"/>` : ''
  return `<svg viewBox="0 0 120 120" style="width:${sizeMm}mm;height:${sizeMm}mm">${dots}${line}${start}</svg>`
}
