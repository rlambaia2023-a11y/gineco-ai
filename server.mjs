// Gineco-AI em hospedagem própria (sem Base44, sem dependências).
// 1) Serve dist/ com fallback SPA.
// 2) API própria em /api/*: auth local, entidades (Protocol, Advertisement,
//    SearchHistory), upload de arquivos e IA.
//    - Dados em DATA_DIR (ou /app/data se existir, ou ./data). Com volume
//      montado em /app/data na Railway, os dados sobrevivem a redeploys.
//      Sem volume, os dados são efêmeros.
//    - Senhas: scrypt com salt, nunca em texto claro. Tokens aleatórios.
//    - IA: só Gemini, sem OpenAI. Se GEMINI_API_KEY estiver configurada,
//      chama o Gemini pela base compatível com OpenAI
//      (https://generativelanguage.googleapis.com/v1beta/openai/),
//      modelo GEMINI_MODEL (padrão gemini-3.8-flash, com fallback para o
//      mesmo modelo se o configurado der 404). Imagem pelo modelo
//      gemini-2.5-flash-image da API nativa do Gemini.
//      Sem chave, a IA devolve uma resposta honesta (sem inventar resposta
//      médica): validação de escopo por palavras-chave, aviso de IA não
//      configurada com as fontes oficiais, e imagem genérica local.
//      Nunca inventar diretriz, artigo ou conduta clínica.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = Number(process.env.PORT || 8080)
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, 'data'))
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const DB_FILE = path.join(DATA_DIR, 'gineco-db.json')
const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
const GEMINI_BASE = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/').replace(/\/$/, '')
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

function loadDb() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
    db.users ||= {}
    db.tokens ||= {}
    db.protocols ||= []
    db.advertisements ||= []
    db.history ||= []
    return db
  } catch {
    return { users: {}, tokens: {}, protocols: [], advertisements: [], history: [] }
  }
}
function saveDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db))
  fs.renameSync(tmp, DB_FILE)
}
let db = loadDb()

function json(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}
function readBody(req, maxBytes = 2_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > maxBytes) { reject(new Error('Corpo muito grande')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf-8')
      if (!text) return resolve({})
      try { resolve(JSON.parse(text)) } catch { reject(new Error('JSON inválido')) }
    })
    req.on('error', reject)
  })
}
function readRaw(req, maxBytes = 12_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > maxBytes) { reject(new Error('Arquivo muito grande')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex')
}
function authEmail(req) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return null
  return db.tokens[token] || null
}
function sortList(list, sort) {
  const arr = [...list]
  if (sort === '-created_date') arr.sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)))
  else if (sort === 'created_date') arr.sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)))
  return arr
}
function applyFilter(list, filter) {
  if (!filter) return list
  let where = null
  try { where = JSON.parse(filter) } catch { return list }
  return list.filter((item) => Object.entries(where).every(([k, v]) => item[k] === v))
}
function cleanStr(v, max = 20000) {
  return typeof v === 'string' ? v.slice(0, max) : ''
}
function cleanTags(v) {
  return Array.isArray(v) ? v.filter((t) => typeof t === 'string').map((t) => t.slice(0, 100)).slice(0, 50) : []
}

const COLLECTIONS = { Protocol: 'protocols', Advertisement: 'advertisements', SearchHistory: 'history' }
function entityPayload(name, body, createdBy) {
  const now = new Date().toISOString()
  const base = { id: crypto.randomUUID(), created_date: now, updated_date: now, created_by: createdBy || null }
  if (name === 'Protocol') {
    return { ...base, name: cleanStr(body.name, 300), category: ['ginecologia', 'obstetricia'].includes(body.category) ? body.category : 'obstetricia', summary: cleanStr(body.summary), full_content: cleanStr(body.full_content, 100000), tags: cleanTags(body.tags), file_url: cleanStr(body.file_url, 1000) }
  }
  if (name === 'Advertisement') {
    return { ...base, title: cleanStr(body.title, 300), description: cleanStr(body.description), clinic_name: cleanStr(body.clinic_name, 300), website_link: cleanStr(body.website_link, 1000), contact_phone: cleanStr(body.contact_phone, 100), specialty: ['ginecologia', 'obstetricia', 'ambos'].includes(body.specialty) ? body.specialty : 'ambos', image_url: cleanStr(body.image_url, 1000) }
  }
  return { ...base, query: cleanStr(body.query, 5000), result: cleanStr(body.result, 100000), search_type: ['protocolo', 'artigo', 'busca_geral'].includes(body.search_type) ? body.search_type : 'busca_geral', sources: cleanTags(body.sources) }
}
function entityUpdate(item, name, body) {
  item.updated_date = new Date().toISOString()
  for (const key of Object.keys(body)) {
    if (key === 'tags' || key === 'sources') item[key] = cleanTags(body[key])
    else if (typeof body[key] === 'string') item[key] = cleanStr(body[key], key === 'full_content' || key === 'result' ? 100000 : 20000)
  }
  return item
}

// ---------- IA ----------
const SCOPE_WORDS = ['gineco', 'obstetr', 'gestação', 'gestacao', 'gravidez', 'grávida', 'gravida', 'parto', 'puerpério', 'puerperio', 'menopausa', 'climatério', 'climaterio', 'contracept', 'fertil', 'endometriose', 'ovário', 'ovario', 'útero', 'utero', 'mama', 'colo do útero', 'colo uterino', 'pré-eclâmpsia', 'pre-eclampsia', 'eclampsia', 'sop', 'ovários policísticos', 'ovarios policisticos', 'mioma', 'candidíase', 'candidiase', 'vagin', 'hpv', 'citologia', 'papanicolau', 'amament', 'aleitamento', 'abort', 'infertil', 'saúde da mulher', 'saude da mulher', 'dpp', 'idade gestacional', 'ultrassom obst', 'pré-natal', 'pre-natal', 'cesárea', 'cesarea', 'indução', 'inducao', 'bishop', 'sangramento uterino', 'tpm', 'menstrua']
function inScope(text) {
  const t = String(text || '').toLowerCase()
  return SCOPE_WORDS.some((w) => t.includes(w))
}
function fallbackAi(prompt, schema) {
  const p = String(prompt || '')
  if (/validador especializado|SIM ou NAO/i.test(p)) {
    const quoted = p.match(/"([\s\S]{1,2000})"/)
    return inScope(quoted ? quoted[1] : p) ? 'SIM' : 'NAO'
  }
  if (/traduza/i.test(p)) return 'TEXTO JÁ EM PORTUGUÊS'
  if (schema || /FORMATO DA RESPOSTA \(JSON\)/i.test(p)) {
    return {
      status: 'NÃO_ENCONTRADO',
      name: '',
      category: 'obstetricia',
      summary: 'IA não configurada neste servidor. Configure GEMINI_API_KEY nas variáveis da Railway para buscar e atualizar protocolos automaticamente. Enquanto isso, use os protocolos já salvos ou cadastre um manualmente.',
      full_content: '',
      tags: [],
      fonte_oficial: '',
    }
  }
  if (/título|titulo/i.test(p) && /propaganda/i.test(p)) return 'Cuidado especializado em saúde da mulher'
  if (/propaganda|marketing médico/i.test(p)) return 'Atendimento humanizado em ginecologia e obstetrícia, com foco em cuidado, experiência e bem-estar da mulher. Agende sua consulta.'
  return `A busca por IA ainda não está configurada neste servidor, por isso não vou inventar uma resposta clínica aqui.\n\nPara ativar a busca completa, configure a variável GEMINI_API_KEY na Railway. Enquanto isso, consulte os protocolos já salvos na aba Protocolos e as fontes oficiais abaixo.\n\n## FONTES CIENTÍFICAS:\n1. FEBRASGO - Protocolos Brasileiros - https://www.febrasgo.org.br/\n2. ACOG - Guidelines Internacionais - https://www.acog.org/\n3. OMS - Diretrizes da Organização Mundial da Saúde - https://www.who.int/\n4. PubMed - Literatura Científica Indexada - https://pubmed.ncbi.nlm.nih.gov/\n\nAviso: as informações desta aplicação são para fins educacionais e de referência e não substituem o julgamento clínico nem os protocolos institucionais.`
}
async function callGemini(prompt, schema) {
  // Gemini pela base compatível com OpenAI (mesmo padrão do Meta 2).
  // Se o modelo configurado der 404 (modelo descontinuado para novos
  // usuários, como aconteceu com o gemini-2.5-flash), tenta de novo com
  // gemini-3.8-flash, sem precisar mexer na Railway.
  const models = [...new Set([GEMINI_MODEL, 'gemini-3.8-flash'])]
  let lastError = null
  for (const model of models) {
    const body = {
      model,
      messages: [
        { role: 'system', content: 'Você é um assistente especializado em ginecologia e obstetrícia. Responda sempre em português brasileiro, com tom profissional e baseado em evidências. Nunca invente diretriz, artigo, autor, ano ou link: se não tiver certeza de uma fonte, diga isso e cite apenas fontes oficiais conhecidas (FEBRASGO, ACOG, OMS, Ministério da Saúde, RCOG).' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    }
    if (schema) body.response_format = { type: 'json_object' }
    const res = await fetch(`${GEMINI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${GEMINI_KEY}` },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      lastError = new Error(data?.error?.message || `Gemini retornou ${res.status}`)
      if (res.status !== 404 || model === models[models.length - 1]) break
      continue
    }
    const content = data?.choices?.[0]?.message?.content || ''
    if (schema) {
      const clean = String(content).replace(/```json|```/g, '').trim()
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      try { return JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean) }
      catch { throw new Error('Gemini devolveu JSON inválido para o protocolo') }
    }
    return content
  }
  throw lastError || new Error('Falha na IA')
}

async function generateGeminiImage(prompt) {
  // Imagem pela API nativa do Gemini (a base compatível com OpenAI não
  // gera imagem). Se falhar, quem chama decide o fallback.
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: String(prompt || 'Professional medical clinic photograph, no text') }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `Gemini imagens retornou ${res.status}`)
  const parts = data?.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((part) => part.inlineData?.data)
  if (!imagePart) throw new Error('Gemini não devolveu imagem')
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const name = `ia-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.png`
  fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(imagePart.inlineData.data, 'base64'))
  return `/uploads/${name}`
}

async function handleApi(req, res, url) {
  const pathname = url.pathname
  try {
    // Auth
    if (req.method === 'POST' && (pathname === '/api/auth/register' || pathname === '/api/auth/login')) {
      const body = await readBody(req)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: 'E-mail inválido' })
      if (password.length < 6) return json(res, 400, { error: 'A senha precisa ter pelo menos 6 caracteres' })
      if (pathname === '/api/auth/register') {
        if (db.users[email]) return json(res, 409, { error: 'Já existe uma conta com este e-mail. Entre com ela.' })
        const salt = crypto.randomBytes(16).toString('hex')
        db.users[email] = { salt, hash: hashPassword(password, salt), created_date: new Date().toISOString() }
      } else {
        const user = db.users[email]
        if (!user || user.hash !== hashPassword(password, user.salt)) return json(res, 401, { error: 'E-mail ou senha inválidos' })
      }
      const token = crypto.randomBytes(32).toString('hex')
      db.tokens[token] = email
      saveDb(db)
      return json(res, 200, { token, email })
    }
    if (req.method === 'GET' && pathname === '/api/auth/me') {
      const email = authEmail(req)
      if (!email || !db.users[email]) return json(res, 401, { error: 'Não autenticado' })
      return json(res, 200, { email, full_name: email.split('@')[0] })
    }
    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      const h = req.headers.authorization || ''
      if (h.startsWith('Bearer ')) { delete db.tokens[h.slice(7)]; saveDb(db) }
      return json(res, 200, { ok: true })
    }
    if (req.method === 'POST' && pathname === '/api/auth/reset-request') {
      await readBody(req).catch(() => ({}))
      return json(res, 200, { ok: true, email_enviado: false, aviso: 'Redefinição por e-mail ainda não está ativa nesta versão própria.' })
    }
    if (req.method === 'POST' && pathname === '/api/auth/reset') {
      return json(res, 400, { error: 'Token de redefinição inválido ou expirado. A redefinição por e-mail ainda não está ativa.' })
    }

    // Entidades
    const entityMatch = pathname.match(/^\/api\/entities\/([A-Za-z]+)(?:\/([^/]+))?$/)
    if (entityMatch) {
      const name = entityMatch[1]
      const id = entityMatch[2]
      const key = COLLECTIONS[name]
      if (!key) return json(res, 404, { error: 'Entidade desconhecida' })
      if (req.method === 'GET' && !id) {
        let list = applyFilter(db[key], url.searchParams.get('filter'))
        list = sortList(list, url.searchParams.get('sort'))
        const limit = Number(url.searchParams.get('limit') || 0)
        if (limit > 0) list = list.slice(0, limit)
        return json(res, 200, list)
      }
      if (req.method === 'GET' && id) {
        const item = db[key].find((x) => x.id === id)
        return item ? json(res, 200, item) : json(res, 404, { error: 'Não encontrado' })
      }
      if (req.method === 'POST' && !id) {
        const body = await readBody(req)
        if (name === 'Protocol' && (!body.name || !body.summary)) return json(res, 400, { error: 'Nome e resumo do protocolo são obrigatórios' })
        if (name === 'Advertisement' && (!body.title || !body.description || !body.clinic_name)) return json(res, 400, { error: 'Título, descrição e clínica são obrigatórios' })
        if (name === 'SearchHistory' && (!body.query || !body.result)) return json(res, 400, { error: 'Pergunta e resultado são obrigatórios' })
        if (name === 'Advertisement') {
          const email = authEmail(req)
          const today = new Date().toISOString().slice(0, 10)
          const todayCount = db.advertisements.filter((a) => a.created_by === email && String(a.created_date).slice(0, 10) === today).length
          if (email && todayCount >= 3) return json(res, 429, { error: 'Você já publicou 3 propagandas hoje. Aguarde até amanhã.' })
        }
        const item = entityPayload(name, body, authEmail(req))
        db[key].unshift(item)
        saveDb(db)
        return json(res, 201, item)
      }
      if (req.method === 'PUT' && id) {
        const item = db[key].find((x) => x.id === id)
        if (!item) return json(res, 404, { error: 'Não encontrado' })
        const body = await readBody(req)
        entityUpdate(item, name, body)
        saveDb(db)
        return json(res, 200, item)
      }
      if (req.method === 'DELETE' && id) {
        const before = db[key].length
        db[key] = db[key].filter((x) => x.id !== id)
        if (db[key].length === before) return json(res, 404, { error: 'Não encontrado' })
        saveDb(db)
        return json(res, 200, { ok: true })
      }
      return json(res, 405, { error: 'Método não permitido' })
    }

    // IA
    if (req.method === 'POST' && pathname === '/api/ai/invoke') {
      const body = await readBody(req)
      const prompt = String(body.prompt || '')
      if (!prompt) return json(res, 400, { error: 'Prompt vazio' })
      let result
      if (GEMINI_KEY) {
        try { result = await callGemini(prompt, body.response_json_schema || null) }
        catch (e) { return json(res, 502, { error: `Falha na IA: ${e.message}` }) }
      } else {
        result = fallbackAi(prompt, body.response_json_schema || null)
      }
      return json(res, 200, { result, ia_configurada: Boolean(GEMINI_KEY), provedor: GEMINI_KEY ? 'gemini' : 'nenhum', modelo: GEMINI_MODEL })
    }
    if (req.method === 'POST' && pathname === '/api/ai/image') {
      const body = await readBody(req)
      if (GEMINI_KEY) {
        try {
          const url = await generateGeminiImage(body.prompt)
          return json(res, 200, { url })
        } catch (e) {
          console.error('Falha ao gerar imagem com Gemini, usando imagem genérica:', e.message)
          return json(res, 200, { url: '/api/placeholder.svg' })
        }
      }
      return json(res, 200, { url: '/api/placeholder.svg' })
    }
    if (req.method === 'POST' && pathname === '/api/upload') {
      const contentType = req.headers['content-type'] || ''
      const boundaryMatch = contentType.match(/boundary=(.+)$/)
      if (!boundaryMatch) return json(res, 400, { error: 'Envie o arquivo como multipart/form-data' })
      const boundary = boundaryMatch[1].trim()
      const raw = await readRaw(req)
      const headerEnd = raw.indexOf('\r\n\r\n')
      if (headerEnd < 0) return json(res, 400, { error: 'Upload inválido' })
      const header = raw.slice(0, headerEnd).toString('utf-8')
      const filenameMatch = header.match(/filename="([^"]*)"/)
      const original = filenameMatch ? filenameMatch[1] : 'arquivo'
      const ext = path.extname(original).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin'
      if (!['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.gif'].includes(ext)) return json(res, 400, { error: 'Tipo de arquivo não permitido (use imagem ou PDF)' })
      const endMarker = Buffer.from(`\r\n--${boundary}`)
      const end = raw.lastIndexOf(endMarker)
      if (end < 0) return json(res, 400, { error: 'Upload inválido' })
      const fileData = raw.slice(headerEnd + 4, end)
      if (fileData.length > 10_000_000) return json(res, 400, { error: 'Arquivo maior que 10 MB' })
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
      const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
      fs.writeFileSync(path.join(UPLOAD_DIR, name), fileData)
      return json(res, 200, { file_url: `/uploads/${name}` })
    }
    if (req.method === 'GET' && pathname === '/api/placeholder.svg') {
      res.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8' })
      res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><text x="512" y="540" font-family="Arial,sans-serif" font-size="72" fill="white" text-anchor="middle">Gineco-AI</text></svg>`)
      return
    }
    return json(res, 404, { error: 'Rota da API não encontrada' })
  } catch (e) {
    return json(res, 400, { error: e.message || 'Requisição inválida' })
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, app: 'gineco-ai', ia_configurada: Boolean(GEMINI_KEY), provedor: GEMINI_KEY ? 'gemini' : 'nenhum', modelo: GEMINI_MODEL, protocolos: db.protocols.length, propagandas: db.advertisements.length, historico: db.history.length, data_dir: DATA_DIR }))
    return
  }
  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url)
    return
  }
  if (url.pathname.startsWith('/uploads/')) {
    const name = path.basename(decodeURIComponent(url.pathname))
    const filePath = path.join(UPLOAD_DIR, name)
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Não encontrado'); return }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' })
    fs.createReadStream(filePath).pipe(res)
    return
  }
  let filePath = path.join(DIST, decodeURIComponent(url.pathname))
  if (!filePath.startsWith(DIST)) { res.writeHead(403); res.end('Forbidden'); return }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html')
  }
  const ext = path.extname(filePath).toLowerCase()
  res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, () => {
  console.log(`Gineco-AI ouvindo na porta ${PORT} (dados em ${DATA_DIR}, IA configurada: ${Boolean(GEMINI_KEY)} (provedor gemini))`)
})
