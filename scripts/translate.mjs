/**
 * Traduz automaticamente messages/pt.json para os 5 outros idiomas usando a API DeepL.
 *
 * Uso:
 *   DEEPL_API_KEY=your_key node scripts/translate.mjs
 *
 * O script preserva chaves existentes e só traduz strings que mudaram ou são novas.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')
const MESSAGES  = path.join(ROOT, 'messages')

const TARGETS = [
  { locale: 'en', deepl: 'EN-US' },
  { locale: 'es', deepl: 'ES' },
  { locale: 'fr', deepl: 'FR' },
  { locale: 'de', deepl: 'DE' },
  { locale: 'zh', deepl: 'ZH' },
]

const API_KEY = process.env.DEEPL_API_KEY
if (!API_KEY) {
  console.error('❌  DEEPL_API_KEY não definida')
  process.exit(1)
}

async function deepLTranslate(texts, targetLang) {
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `DeepL-Auth-Key ${API_KEY}` },
    body: JSON.stringify({ text: texts, source_lang: 'PT', target_lang: targetLang }),
  })
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.translations.map((t) => t.text)
}

function flatten(obj, prefix = '') {
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null) Object.assign(result, flatten(v, key))
    else result[key] = v
  }
  return result
}

function unflatten(flat) {
  const result = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let cur = result
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] ??= {}
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
  }
  return result
}

// Keys that should NOT be translated (proper nouns, codes, etc.)
const SKIP_KEYS = new Set([
  'language.pt', 'language.en', 'language.es', 'language.fr', 'language.de', 'language.zh',
  'months.0', 'months.1', 'months.2', 'months.3', 'months.4', 'months.5',
  'months.6', 'months.7', 'months.8', 'months.9', 'months.10', 'months.11',
])

async function translateLocale(source, targetLocale, deeplCode) {
  const outFile  = path.join(MESSAGES, `${targetLocale}.json`)
  const existing = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf-8')) : {}

  const flatSource   = flatten(source)
  const flatExisting = flatten(existing)

  // Find keys that need translation (new or changed)
  const toTranslate = {}
  for (const [key, value] of Object.entries(flatSource)) {
    if (SKIP_KEYS.has(key)) continue
    if (typeof value !== 'string') continue
    if (flatExisting[key]) continue // already translated
    toTranslate[key] = value
  }

  if (Object.keys(toTranslate).length === 0) {
    console.log(`  ✓ ${targetLocale}: sem mudanças`)
    return existing
  }

  console.log(`  → ${targetLocale}: traduzindo ${Object.keys(toTranslate).length} strings...`)

  // Translate in batches of 50
  const keys   = Object.keys(toTranslate)
  const values = Object.values(toTranslate)
  const translated = {}
  const BATCH = 50
  for (let i = 0; i < keys.length; i += BATCH) {
    const batchKeys   = keys.slice(i, i + BATCH)
    const batchValues = values.slice(i, i + BATCH)
    const results = await deepLTranslate(batchValues, deeplCode)
    batchKeys.forEach((k, j) => { translated[k] = results[j] })
  }

  // Merge: existing + newly translated + skip keys (copy from source)
  const merged = { ...flatExisting, ...translated }
  for (const key of SKIP_KEYS) {
    if (flatSource[key]) merged[key] = flatSource[key]
  }

  return unflatten(merged)
}

async function main() {
  const source = JSON.parse(fs.readFileSync(path.join(MESSAGES, 'pt.json'), 'utf-8'))
  console.log('🌐 Iniciando tradução automática...\n')

  for (const { locale, deepl } of TARGETS) {
    const result = await translateLocale(source, locale, deepl)
    fs.writeFileSync(
      path.join(MESSAGES, `${locale}.json`),
      JSON.stringify(result, null, 2) + '\n',
    )
    console.log(`  ✅ messages/${locale}.json`)
  }

  console.log('\n✅ Tradução concluída!')
}

main().catch((err) => { console.error(err); process.exit(1) })
