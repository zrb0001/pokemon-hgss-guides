import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)
const csvBase = 'https://cdn.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv/'
const outputFile = new URL('../docs/data/abilities.json', import.meta.url)
const files = ['abilities.csv', 'ability_names.csv', 'ability_flavor_text.csv', 'ability_prose.csv']

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }

  const [headers, ...values] = rows
  return values.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])))
}

async function download(url) {
  const urls = [
    url,
    url.replace('https://cdn.jsdelivr.net/gh/PokeAPI/', 'https://raw.githubusercontent.com/PokeAPI/').replace('@master/', '/master/')
  ]
  let lastError
  for (const source of urls) {
    try {
      const { stdout } = await run('curl', [
        '-L', '--fail', '--silent', '--show-error', '--retry', '3', '--retry-delay', '1', '--max-time', '45', source
      ], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
      return stdout
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function localizedNames(rows, key) {
  const names = new Map()
  for (const row of rows) {
    const id = Number(row[key])
    const entry = names.get(id) ?? {}
    entry[Number(row.local_language_id)] = row
    names.set(id, entry)
  }
  return names
}

function cleanText(value) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

async function mapLimit(items, limit, task) {
  let index = 0
  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const item = items[index++]
      await task(item)
    }
  })
  await Promise.all(workers)
}

const csvEntries = []
await mapLimit(files, 4, async (file) => {
  csvEntries.push([file, parseCsv(await download(csvBase + file))])
})
const csv = Object.fromEntries(csvEntries)
const abilityNames = localizedNames(csv['ability_names.csv'], 'ability_id')
const descriptions = new Map()
for (const row of csv['ability_flavor_text.csv']) {
  const abilityId = Number(row.ability_id)
  if (abilityId > 123) continue
  const languageId = Number(row.language_id)
  const versionGroupId = Number(row.version_group_id)
  const entry = descriptions.get(abilityId) ?? {}
  if (languageId === 12 && (!entry.zh || versionGroupId > entry.zh.versionGroupId)) {
    entry.zh = { versionGroupId, text: cleanText(row.flavor_text) }
  } else if (languageId === 9 && versionGroupId === 10) {
    entry.hgss = cleanText(row.flavor_text)
  }
  descriptions.set(abilityId, entry)
}

const effects = new Map()
for (const row of csv['ability_prose.csv']) {
  if (Number(row.local_language_id) === 9) effects.set(Number(row.ability_id), row)
}

const abilities = csv['abilities.csv']
  .filter((row) => Number(row.id) <= 123 && Number(row.generation_id) <= 4 && row.is_main_series === '1')
  .map((row) => {
    const id = Number(row.id)
    const names = abilityNames.get(id) ?? {}
    const description = descriptions.get(id) ?? {}
    const effect = effects.get(id)
    return {
      id,
      slug: row.identifier,
      generation: Number(row.generation_id),
      names: {
        zh: names[12]?.name || names[9]?.name,
        ja: names[11]?.name || names[1]?.name || names[9]?.name,
        en: names[9]?.name
      },
      descriptions: {
        zh: description.zh?.text ?? '',
        hgss: description.hgss ?? ''
      },
      effect: {
        short: cleanText(effect?.short_effect),
        full: cleanText(effect?.effect)
      }
    }
  })

if (abilities.length !== 123) throw new Error(`特性应有 123 条，实际为 ${abilities.length} 条`)
for (const entry of abilities) {
  if (!entry.names.zh || !entry.names.ja || !entry.names.en || !entry.descriptions.zh || !entry.descriptions.hgss) {
    throw new Error(`特性 #${entry.id} ${entry.slug} 的必要数据不完整`)
  }
}

await writeFile(outputFile, JSON.stringify({
  source: 'PokéAPI',
  sourceUrl: 'https://github.com/PokeAPI/pokeapi',
  versionGroup: 'heartgold-soulsilver',
  generation: 4,
  count: abilities.length,
  abilities
}, null, 2) + '\n')

console.log(`已保存 ${abilities.length} 条第四世代特性数据：${outputFile.pathname}`)
