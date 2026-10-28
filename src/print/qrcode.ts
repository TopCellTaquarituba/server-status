import QRCode from 'qrcode'

/**
 * Gera um QR Code como SVG (string) de forma síncrona, para embutir no HTML de impressão.
 * Usa QRCode.create (síncrono) e desenha os módulos como um único path — fica nítido em
 * qualquer tamanho e imprime bem em impressora térmica.
 */
export function qrSvg(text: string, sizeMm: number): string {
  if (!text) return ''
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
    const size = qr.modules.size
    const data = qr.modules.data
    const quiet = 2
    const dim = size + quiet * 2

    let path = ''
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (data[r * size + c]) path += `M${c + quiet},${r + quiet}h1v1h-1z`
      }
    }
    return `<svg viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" style="width:${sizeMm}mm;height:${sizeMm}mm;display:block"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`
  } catch {
    return ''
  }
}
