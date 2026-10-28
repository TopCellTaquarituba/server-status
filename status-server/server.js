/**
 * Servidor de acompanhamento do Assistec Pro.
 *
 * Recebe os status das ordens de serviço enviados pelo app desktop e serve a
 * página pública que o cliente abre pelo QR Code. Sem dependências externas —
 * roda em qualquer lugar com Node.js (Render, Railway, Fly.io, VPS, etc.).
 *
 * Variáveis de ambiente:
 *   PORT      porta (padrão 8787)
 *   API_KEY   chave que o app usa para publicar (defina a MESMA no app)
 *   DATA_FILE arquivo de persistência (padrão ./data/status.json)
 */
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { URL } = require('node:url')

const PORT = Number(process.env.PORT) || 8787
const API_KEY = process.env.API_KEY || 'troque-esta-chave'
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'status.json')
const PAGE = fs.readFileSync(path.join(__dirname, 'public', 'status.html'), 'utf-8')

/* ----------------------------- armazenamento ----------------------------- */

let store = {}
try {
  store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
} catch {
  store = {}
}

let saveTimer = null
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    fs.mkdir(path.dirname(DATA_FILE), { recursive: true }, () => {
      fs.writeFile(DATA_FILE, JSON.stringify(store), () => {})
    })
  }, 300)
}

/* ------------------------------- utilidades ------------------------------- */

const VALID_TOKEN = /^[a-z0-9]{8,80}$/i

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
}

function json(res, code, body) {
  cors(res)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 1_000_000) reject(new Error('payload grande'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/* --------------------------------- rotas --------------------------------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const parts = url.pathname.split('/').filter(Boolean)

  if (req.method === 'OPTIONS') {
    cors(res)
    res.writeHead(204)
    return res.end()
  }

  // GET /api/health
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'assistec-status', count: Object.keys(store).length })
  }

  // GET /api/public/:token  → dados públicos
  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'public' && parts[2]) {
    const data = store[parts[2]]
    if (!data) return json(res, 404, { error: 'not_found' })
    return json(res, 200, data)
  }

  // POST /api/os/:token  → o app publica o status (requer chave)
  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'os' && parts[2]) {
    if (req.headers['x-api-key'] !== API_KEY) return json(res, 401, { error: 'unauthorized' })
    if (!VALID_TOKEN.test(parts[2])) return json(res, 400, { error: 'invalid_token' })
    try {
      const payload = JSON.parse(await readBody(req))
      store[parts[2]] = { ...payload, token: parts[2], receivedAt: new Date().toISOString() }
      persist()
      return json(res, 200, { ok: true })
    } catch {
      return json(res, 400, { error: 'invalid_json' })
    }
  }

  // DELETE /api/os/:token  → remove (requer chave)
  if (req.method === 'DELETE' && parts[0] === 'api' && parts[1] === 'os' && parts[2]) {
    if (req.headers['x-api-key'] !== API_KEY) return json(res, 401, { error: 'unauthorized' })
    delete store[parts[2]]
    persist()
    return json(res, 200, { ok: true })
  }

  // GET /s/:token  → página de acompanhamento
  if (req.method === 'GET' && parts[0] === 's' && parts[1]) {
    cors(res)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(PAGE)
  }

  // GET /  → página inicial simples
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end('<!doctype html><meta charset="utf-8"><title>Assistec Status</title><body style="font-family:sans-serif;padding:40px;color:#334"><h1>Assistec Pro — Servidor de acompanhamento</h1><p>Servidor no ar. O cliente acessa pelo QR Code impresso na ordem de serviço.</p></body>')
  }

  json(res, 404, { error: 'not_found' })
})

server.listen(PORT, () => {
  console.log(`[assistec-status] no ar na porta ${PORT}`)
  if (API_KEY === 'troque-esta-chave') console.warn('[assistec-status] ATENÇÃO: defina a variável API_KEY antes de usar em produção!')
})
