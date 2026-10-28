// Gineco-AI em hospedagem própria (sem Base44, sem dependências).
// 1) Serve dist/ com fallback SPA.
// 2) API própria em /api/*: auth local, entidades (Protocol, Advertisement,
//    SearchHistory), upload de arquivos e IA.
//    - Dados em DATA_DIR (ou /app/data se existir, ou ./data). Com volume
//      montado em /app/data na Railway, os dados sobrevivem a redeploys.
//      Sem volume, os dados são efêmeros.
//    - Senhas: scrypt com salt, nunca em texto claro. Tokens aleatórios.
//    - IA: só Gemini, sem OpenAI. Se GEMINI_API_KEY estiver configurada,
//      chama o Gemini pela API nativa generateContent
//      (https://generativelanguage.googleapis.com/v1beta/models/...:generateContent),
//      modelo efetivo gemini-3.5-flash-lite (primeiro da lista, mesmo
//      que GEMINI_MODEL esteja configurado para outro modelo; 500/dia
//      no plano grátis, contra 20/dia do gemini-3.8-flash). Imagem pelo modelo
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
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
// Pacote grátis (2026-10-26): Flash-Lite sempre primeiro, mesmo que
// GEMINI_MODEL na Railway ainda aponte para o 3.8-flash (20/dia).
// Ordem: Lite (500/dia) -> modelo configurado -> 3.8 -> 3.7, só para
// 404 (modelo indisponível). Em cota (429) não há retry nem troca de
// modelo: para na hora, para não queimar a cota dos outros modelos.
const GEMINI_LITE = 'gemini-3.5-flash-lite'
const GEMINI_MODELS = [...new Set([GEMINI_LITE, GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.7-flash'])]
const GEMINI_EFFECTIVE_MODEL = GEMINI_MODELS[0]
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
    db.cases ||= []
    return db
  } catch {
    return { users: {}, tokens: {}, protocols: [], advertisements: [], history: [], cases: [] }
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
    // Não ganancioso: antes, o match ia até a ÚLTIMA aspa do prompt e
    // engolia as instruções (que citam ginecologia), então qualquer
    // pergunta passava como dentro do escopo no modo sem chave.
    const quoted = p.match(/"([\s\S]{1,2000}?)"/)
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
// Pesquisa web opcional (mesmo padrão do Meta 2 e da Correção
// Inteligente): só roda se BRAVE_API_KEY existir e o chamador pedir
// contexto da internet. Sem ela, o Gemini responde só com o conhecimento
// do modelo, e o prompt continua dizendo para não inventar fontes.
async function searchBrave(query) {
  const key = process.env.BRAVE_API_KEY || ''
  if (!key) return []
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=pt&country=BR`
    const res = await fetch(url, { headers: { Accept: 'application/json', 'X-Subscription-Token': key } })
    if (!res.ok) return []
    const data = await res.json().catch(() => ({}))
    return (data?.web?.results || []).slice(0, 5).map((x) => ({ titulo: x.title, url: x.url, trecho: x.description || '' }))
  } catch { return [] }
}
function extractTopic(prompt) {
  const m = String(prompt || '').match(/sobre\s+"([^"]{3,200})"/i)
  if (m) return m[1]
  const quoted = String(prompt || '').match(/"([^"]{5,200})"/)
  return quoted ? quoted[1] : ''
}
// Cache no servidor (segunda camada, além do cache do frontend em
// Search.jsx): pergunta já respondida e salva no histórico volta sem
// chamar o Gemini, sem gastar cota. Só vale para busca em texto (sem
// schema JSON). A pergunta do histórico aparece, normalizada, dentro
// do prompt longo da busca, por isso a comparação é por inclusão da
// pergunta inteira normalizada, não por palavra solta.
function normText(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}
function findCachedAiResult(prompt) {
  const normPrompt = normText(prompt)
  if (!normPrompt) return null
  for (const entry of [...db.history].reverse()) {
    const q = normText(entry.query)
    if (q.length < 8 || !entry.result) continue
    if (normPrompt.includes(q)) return entry
  }
  return null
}

// ---------- Análise de caso clínico (novo módulo, código próprio) ----------
// Função inspirada no que um app de apoio clínico faz (caso, hipóteses,
// exames, conduta, referências), refeita do zero para ginecologia e
// obstetrícia, dentro do Gineco-AI. Não copia nome, visual ou código de
// nenhum app. A análise é só apoio ao raciocínio: nunca fecha diagnóstico
// sozinha, nunca prescreve sozinha e nunca substitui o julgamento do
// profissional. O caso deve chegar anonimizado (sem nome, CPF, endereço
// ou qualquer identificador); o servidor não tenta identificar ninguém.
function findCachedCase(caso, examesTexto, email) {
  const alvo = normText(`${caso} ${examesTexto || ''}`)
  if (alvo.length < 20) return null
  for (const entry of [...db.cases].reverse()) {
    if (entry.created_by !== email || !entry.analise) continue
    if (normText(`${entry.caso} ${entry.examesTexto || ''}`) === alvo) return entry
  }
  return null
}
function normAnalise(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const strList = (v) => Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 1000)).slice(0, 20) : []
  const hipoteses = Array.isArray(raw.hipoteses) ? raw.hipoteses.slice(0, 5).map((h) => ({
    nome: cleanStr(h?.nome, 300),
    probabilidade: ['alta', 'media', 'baixa'].includes(h?.probabilidade) ? h.probabilidade : 'media',
    aFavor: strList(h?.aFavor),
    contra: strList(h?.contra),
    proximoPasso: cleanStr(h?.proximoPasso, 1000),
  })).filter((h) => h.nome) : []
  if (!hipoteses.length) return null
  return {
    alertas: strList(raw.alertas),
    hipoteses,
    exames: Array.isArray(raw.exames) ? raw.exames.slice(0, 15).map((e) => ({
      nome: cleanStr(e?.nome, 300),
      motivo: cleanStr(e?.motivo, 1000),
      quando: e?.quando === 'se indicado' ? 'se indicado' : 'recomendado',
      prioridade: e?.prioridade === 'imediata' ? 'imediata' : 'rotina',
    })).filter((e) => e.nome) : [],
    conduta: strList(raw.conduta),
    prescricaoRascunho: cleanStr(raw.prescricaoRascunho, 5000),
    referencias: Array.isArray(raw.referencias) ? raw.referencias.slice(0, 10).map((r) => ({
      titulo: cleanStr(r?.titulo, 300),
      fonte: cleanStr(r?.fonte, 200),
      url: cleanStr(r?.url, 1000),
      confirmado: r?.confirmado === true,
    })).filter((r) => r.titulo) : [],
    resumo: cleanStr(raw.resumo, 2000),
  }
}
function buildCasePrompt(caso, examesTexto) {
  const protocolos = db.protocols.slice(0, 13).map((p) => `- ${p.name}: ${String(p.summary || '').slice(0, 200)}`).join('\n')
  return `Analise o caso clínico abaixo, de ginecologia ou obstetrícia, como professor clínico. O caso chegou anonimizado, sem identificadores, e deve continuar assim: não peça nem invente nome, CPF ou dados pessoais.

Devolva SOMENTE um objeto JSON com exatamente estes campos, sem texto fora do JSON:
{
  "alertas": ["sinal de alerta, se houver"],
  "hipoteses": [{"nome": "", "probabilidade": "alta|media|baixa", "aFavor": [""], "contra": [""], "proximoPasso": ""}],
  "exames": [{"nome": "", "motivo": "", "quando": "recomendado|se indicado", "prioridade": "imediata|rotina"}],
  "conduta": ["passo curto de conduta"],
  "prescricaoRascunho": "rascunho para revisão e assinatura do profissional, ou string vazia se não houver nada a sugerir",
  "referencias": [{"titulo": "", "fonte": "", "url": "", "confirmado": true}],
  "resumo": "resumo em até 3 frases"
}

Regras obrigatórias:
1. No máximo 5 hipóteses, ordenadas da mais para a menos provável, cada uma com o que fala a favor e o que fala contra.
2. Exames só os que mudam a conduta; marque "se indicado" quando o exame depender de um achado ou de uma hipótese.
3. Conduta em passos curtos, sem fechar diagnóstico sozinho e sem prescrever sozinho: a prescrição, quando houver, vai só no campo prescricaoRascunho, como rascunho para revisão e assinatura.
4. Se houver sinal de emergência (sangramento intenso, dor intensa, febre alta, pré-eclâmpsia grave, sofrimento fetal, choque ou outro risco imediato), o primeiro alerta deve dizer, em linguagem direta, para atendimento de emergência imediato, sem esperar a IA.
5. Referências: cite SOMENTE os protocolos salvos listados abaixo e fontes oficiais (FEBRASGO, ACOG, OMS, Ministério da Saúde, RCOG). Se não tiver certeza de uma referência, ponha confirmado:false e não invente ano, autor ou link; se não houver referência segura, devolva a lista vazia.
6. Nunca invente diretriz, artigo, autor, ano ou link.

Protocolos salvos no sistema:
${protocolos || '(nenhum protocolo salvo)'}

Caso:
"""${caso}"""

Exames já disponíveis (texto informado pelo profissional):
"""${examesTexto || '(nenhum informado)'}"""`
}

async function callGemini(prompt, schema, withWeb = false) {
  callGemini.startedAt = Date.now()
  // Gemini pela base compatível com OpenAI (mesmo padrão do Meta 2).
  // Se o modelo configurado der 404 (modelo descontinuado para novos
  // usuários, como aconteceu com o gemini-2.5-flash), tenta de novo com
  // gemini-3.8-flash, sem precisar mexer na Railway.
  let finalPrompt = prompt
  if (withWeb) {
    const topic = extractTopic(prompt)
    if (topic) {
      const results = await searchBrave(`${topic} protocolo FEBRASGO ACOG`)
      if (results.length) {
        finalPrompt = `${prompt}\n\nResultados de busca na web em tempo real (use-os como base e cite apenas links desta lista, sem inventar outros):\n${results.map((r, i) => `${i + 1}. ${r.titulo} — ${r.trecho} (${r.url})`).join('\n')}`
      }
    }
  }
  // 503 do Gemini = sobrecarga temporária do modelo (documentado pelo
  // Google). Por isso, só 503 tem 1 retry com espera crescente, dentro
  // do mesmo modelo. 429 (cota) NÃO tem retry nem troca de modelo:
  // joga o erro na hora, para não queimar a cota do modelo seguinte.
  // 404 (modelo indisponível) é o único caso que passa ao próximo modelo.
  const models = GEMINI_MODELS
  let lastError = null
  for (const model of models) {
   for (let attempt = 1; attempt <= 2; attempt++) {
    const body = {
      model,
      messages: [
        { role: 'system', content: 'Você é um assistente especializado em ginecologia e obstetrícia. Responda sempre em português brasileiro, com tom profissional e baseado em evidências. Nunca invente diretriz, artigo, autor, ano ou link: se não tiver certeza de uma fonte, diga isso e cite apenas fontes oficiais conhecidas (FEBRASGO, ACOG, OMS, Ministério da Saúde, RCOG).' },
        { role: 'user', content: finalPrompt },
      ],
      temperature: 0.3,
    }
    if (schema) body.response_format = { type: 'json_object' }
    // Sem timeout, um fetch travado do Gemini deixava a chamada da IA
    // pendurada por minutos (visto ao vivo em 2026-10-26). Limite de 30s
    // por tentativa e teto total de 90s para a chamada inteira.
    const startedAt = callGemini.startedAt || (callGemini.startedAt = Date.now())
    if (Date.now() - startedAt > 90000) throw lastError || new Error('Gemini demorou mais de 90s para responder')
    // API nativa do Gemini (generateContent), em vez da base compatível
    // com OpenAI: a base compatível ficava pendurada mais de 45s por
    // tentativa ao vivo em 2026-10-26, sem responder. A nativa usa a
    // mesma chave GEMINI_API_KEY, só muda o formato da chamada.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    let res
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Você é um assistente especializado em ginecologia e obstetrícia. Responda sempre em português brasileiro, com tom profissional e baseado em evidências. Nunca invente diretriz, artigo, autor, ano ou link: se não tiver certeza de uma fonte, diga isso e cite apenas fontes oficiais conhecidas (FEBRASGO, ACOG, OMS, Ministério da Saúde, RCOG).\n\n${finalPrompt}` }] }],
          generationConfig: Object.assign({ temperature: 0.3 }, schema ? { responseMimeType: 'application/json' } : {}),
        }),
        signal: controller.signal,
      })
    } catch (e) {
      clearTimeout(timer)
      lastError = new Error(e.name === 'AbortError' ? 'Gemini demorou mais de 30s para responder' : e.message)
      if (attempt < 2) { await new Promise((r) => setTimeout(r, attempt * 3000)); continue }
      break
    }
    clearTimeout(timer)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Sem retry em cota: para imediatamente, sem tentar o próximo modelo.
      if (res.status === 429) throw new Error(`Gemini quota exceeded (429) no modelo ${model}: ${data?.error?.message || ''}`.trim())
      lastError = new Error(data?.error?.message || `Gemini retornou ${res.status}`)
      if (res.status === 503 && attempt < 2) {
        await new Promise((r) => setTimeout(r, attempt * 3000))
        continue
      }
      if (res.status !== 404 || model === models[models.length - 1]) break
      continue
    }
    const content = (data?.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('').trim()
    if (schema) {
      const clean = String(content).replace(/```json|```/g, '').trim()
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      try { return JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean) }
      catch { throw new Error('Gemini devolveu JSON inválido para o protocolo') }
    }
    return content
   }
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

    // Análise de caso clínico — só para profissional logado, porque um
    // caso, mesmo anonimizado, não é busca pública: é raciocínio clínico.
    // O histórico de casos é só do próprio usuário logado.
    const casoMatch = pathname.match(/^\/api\/casos(?:\/([^/]+))?(\/favorito)?$/)
    if (casoMatch) {
      const email = authEmail(req)
      if (!email || !db.users[email]) return json(res, 401, { error: 'Entre com sua conta para analisar um caso.' })
      const id = casoMatch[1]
      const isFavorito = Boolean(casoMatch[2])
      if (req.method === 'GET' && !id) {
        let list = db.cases.filter((c) => c.created_by === email)
        if (url.searchParams.get('favoritos') === '1') list = list.filter((c) => c.favorito)
        list = [...list].sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)))
        return json(res, 200, list)
      }
      if (req.method === 'GET' && id && !isFavorito) {
        const item = db.cases.find((c) => c.id === id && c.created_by === email)
        return item ? json(res, 200, item) : json(res, 404, { error: 'Caso não encontrado' })
      }
      if (req.method === 'POST' && id === 'analisar') {
        const body = await readBody(req)
        const caso = cleanStr(body.caso, 5000)
        const examesTexto = cleanStr(body.examesTexto, 5000)
        if (caso.trim().length < 20) return json(res, 400, { error: 'Descreva o caso com mais detalhes (pelo menos 20 caracteres), sem nome, CPF ou endereço.' })
        if (!inScope(caso)) return json(res, 400, { error: 'Esta ferramenta é só para ginecologia, obstetrícia e saúde da mulher.' })
        const cached = findCachedCase(caso, examesTexto, email)
        if (cached) return json(res, 200, { ...cached, cache: true })
        if (!GEMINI_KEY) return json(res, 503, { error: 'IA não configurada. Configure GEMINI_API_KEY nas variáveis da Railway para analisar casos — sem chave, nenhuma análise é inventada.', ia_configurada: false })
        let raw
        try { raw = await callGemini(buildCasePrompt(caso, examesTexto), true, false) }
        catch (e) {
          const msg = String(e.message || '')
          if (/quota exceeded|exceeded your current quota/i.test(msg)) return json(res, 502, { error: 'Cota gratuita do Gemini esgotada para o modelo em uso. Tente de novo mais tarde; nenhum caso foi salvo como analisado.' })
          return json(res, 502, { error: `Falha na IA: ${msg}` })
        }
        const analise = normAnalise(raw)
        if (!analise) return json(res, 502, { error: 'A IA devolveu um formato inválido para a análise. Tente de novo; nenhum caso foi salvo como analisado.' })
        const now = new Date().toISOString()
        const item = { id: crypto.randomUUID(), created_date: now, updated_date: now, created_by: email, caso, examesTexto, analise, favorito: false, cache: false, modelo: GEMINI_EFFECTIVE_MODEL }
        db.cases.unshift(item)
        saveDb(db)
        return json(res, 201, item)
      }
      if (req.method === 'POST' && id && isFavorito) {
        const item = db.cases.find((c) => c.id === id && c.created_by === email)
        if (!item) return json(res, 404, { error: 'Caso não encontrado' })
        item.favorito = !item.favorito
        item.updated_date = new Date().toISOString()
        saveDb(db)
        return json(res, 200, item)
      }
      if (req.method === 'DELETE' && id && !isFavorito) {
        const before = db.cases.length
        db.cases = db.cases.filter((c) => !(c.id === id && c.created_by === email))
        if (db.cases.length === before) return json(res, 404, { error: 'Caso não encontrado' })
        saveDb(db)
        return json(res, 200, { ok: true })
      }
      return json(res, 405, { error: 'Método não permitido' })
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
        // Cache no servidor antes de qualquer chamada: pergunta já
        // respondida volta do histórico, sem gastar cota do Gemini.
        // Só para busca em texto; schema JSON (protocolo) não usa cache.
        if (!body.response_json_schema) {
          const cached = findCachedAiResult(prompt)
          if (cached) return json(res, 200, { result: cached.result, ia_configurada: true, provedor: 'gemini', modelo: GEMINI_EFFECTIVE_MODEL, cache: true })
        }
        try { result = await callGemini(prompt, body.response_json_schema || null, Boolean(body.add_context_from_internet)) }
        catch (e) {
          // Cota do Google em linguagem clara: antes, o texto cru em
          // inglês do Google ia parar na tela e parecia erro genérico.
          // Sem o "20/dia" fixo: com o Lite em primeiro, a cota é outra.
          const msg = String(e.message || '')
          const retry = msg.match(/retry in ([0-9]+h[0-9]+m[0-9.]+s)/i)
          if (/quota exceeded|exceeded your current quota/i.test(msg)) {
            return json(res, 502, { error: `Cota gratuita do Gemini esgotada para o modelo em uso${retry ? `, tente de novo em cerca de ${retry[1].replace(/\.[0-9]+s$/, 's')}` : ''}. Enquanto isso, a busca mostra os protocolos já salvos, quando houver um sobre o tema.` })
          }
          return json(res, 502, { error: `Falha na IA: ${msg}` })
        }
      } else {
        result = fallbackAi(prompt, body.response_json_schema || null)
      }
      return json(res, 200, { result, ia_configurada: Boolean(GEMINI_KEY), provedor: GEMINI_KEY ? 'gemini' : 'nenhum', modelo: GEMINI_EFFECTIVE_MODEL, modelo_configurado: GEMINI_MODEL })
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
    res.end(JSON.stringify({ ok: true, app: 'gineco-ai', ia_configurada: Boolean(GEMINI_KEY), provedor: GEMINI_KEY ? 'gemini' : 'nenhum', modelo: GEMINI_EFFECTIVE_MODEL, modelo_configurado: GEMINI_MODEL, protocolos: db.protocols.length, propagandas: db.advertisements.length, historico: db.history.length, casos: (db.cases || []).length, data_dir: DATA_DIR }))
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
