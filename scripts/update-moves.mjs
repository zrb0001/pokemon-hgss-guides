import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)
const csvBase = 'https://cdn.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv/'
const apiBase = 'https://pokeapi.co/api/v2/move/'
const outputFile = new URL('../docs/data/move-data.json', import.meta.url)
const files = [
  'moves.csv',
  'move_names.csv',
  'type_names.csv',
  'move_damage_classes.csv',
  'move_targets.csv',
  'move_effect_prose.csv',
  'move_flavor_text.csv',
  'move_meta.csv',
  'move_meta_ailments.csv',
  'move_meta_stat_changes.csv',
  'stats.csv',
  'move_changelog.csv',
  'machines.csv'
]

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
  const urls = [url]
  if (url.startsWith('https://cdn.jsdelivr.net/gh/PokeAPI/')) {
    urls.push(url
      .replace('https://cdn.jsdelivr.net/gh/PokeAPI/', 'https://raw.githubusercontent.com/PokeAPI/')
      .replace('@master/', '/master/'))
  }

  let lastError
  for (const source of urls) {
    try {
      const { stdout } = await run('curl', [
        '-L',
        '--fail',
        '--silent',
        '--show-error',
        '--retry',
        '3',
        '--retry-delay',
        '1',
        '--max-time',
        '45',
        source
      ], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
      return stdout
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function byId(rows, key = 'id') {
  return new Map(rows.map((row) => [Number(row[key]), row]))
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

function nameFor(names, id, languageId) {
  return names.get(id)?.[languageId]?.name ?? ''
}

function numberOrNull(value) {
  return value === '' || value === null || value === undefined ? null : Number(value)
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

const typeSlugs = {
  1: 'normal',
  2: 'fighting',
  3: 'flying',
  4: 'poison',
  5: 'ground',
  6: 'rock',
  7: 'bug',
  8: 'ghost',
  9: 'steel',
  10: 'fire',
  11: 'water',
  12: 'grass',
  13: 'electric',
  14: 'psychic',
  15: 'ice',
  16: 'dragon',
  17: 'dark',
  18: 'fairy',
  10001: 'unknown'
}
const targetNames = {
  1: '特定招式',
  2: '选择的对手',
  3: '我方同伴',
  4: '自身场地',
  5: '自身或同伴',
  6: '对手场地',
  7: '自身',
  8: '随机对手',
  9: '除自身外所有宝可梦',
  10: '一只宝可梦',
  11: '所有对手',
  12: '整个场地',
  13: '自身及我方全体',
  14: '场上所有宝可梦',
  15: '我方全体',
  16: '濒死的宝可梦'
}
const ailmentNames = {
  '-1': '未知',
  0: '无',
  1: '麻痹',
  2: '睡眠',
  3: '冰冻',
  4: '灼伤',
  5: '中毒',
  6: '混乱',
  7: '着迷',
  8: '束缚',
  9: '恶梦',
  12: '无理取闹',
  13: '定身法',
  14: '哈欠',
  15: '回复封锁',
  17: '无视属性免疫',
  18: '寄生种子',
  19: '查封',
  20: '灭亡之歌',
  21: '扎根',
  24: '沉默'
}
const statNames = {
  1: 'HP',
  2: '攻击',
  3: '防御',
  4: '特攻',
  5: '特防',
  6: '速度',
  7: '命中率',
  8: '闪避率',
  9: '特殊'
}

const csvEntries = []
await mapLimit(files, 4, async (file) => {
  csvEntries.push([file, parseCsv(await download(csvBase + file))])
})
const csv = Object.fromEntries(csvEntries)
const moveRows = csv['moves.csv'].filter((row) => Number(row.id) <= 467)
const moveNames = localizedNames(csv['move_names.csv'], 'move_id')
const typeNames = localizedNames(csv['type_names.csv'], 'type_id')
const damageClasses = byId(csv['move_damage_classes.csv'])
const targets = byId(csv['move_targets.csv'])
const ailments = byId(csv['move_meta_ailments.csv'])
const stats = byId(csv['stats.csv'])
const metaByMove = byId(csv['move_meta.csv'], 'move_id')
const effects = new Map()
for (const row of csv['move_effect_prose.csv']) {
  if (Number(row.local_language_id) === 9) effects.set(Number(row.move_effect_id), row)
}

const descriptions = new Map()
for (const row of csv['move_flavor_text.csv']) {
  const moveId = Number(row.move_id)
  if (moveId > 467) continue
  const languageId = Number(row.language_id)
  const versionGroupId = Number(row.version_group_id)
  const entry = descriptions.get(moveId) ?? {}
  if (languageId === 12 || languageId === 11 || languageId === 1) {
    if (!entry[languageId] || versionGroupId > entry[languageId].versionGroupId) entry[languageId] = { versionGroupId, text: cleanText(row.flavor_text) }
  } else if (languageId === 9 && versionGroupId === 10) {
    entry.hgss = cleanText(row.flavor_text)
  }
  descriptions.set(moveId, entry)
}

const statChanges = new Map()
for (const row of csv['move_meta_stat_changes.csv']) {
  const moveId = Number(row.move_id)
  const list = statChanges.get(moveId) ?? []
  const statId = Number(row.stat_id)
  list.push({
    slug: stats.get(statId)?.identifier,
    name: statNames[statId] ?? stats.get(statId)?.identifier,
    change: Number(row.change)
  })
  statChanges.set(moveId, list)
}

const machines = new Map()
for (const row of csv['machines.csv']) {
  if (Number(row.version_group_id) !== 10) continue
  const machineNumber = Number(row.machine_number)
  machines.set(Number(row.move_id), machineNumber <= 92
    ? `TM${String(machineNumber).padStart(2, '0')}`
    : `HM${String(machineNumber - 100).padStart(2, '0')}`)
}

const changedMoveIds = [...new Set(csv['move_changelog.csv']
  .filter((row) => Number(row.move_id) <= 467 && Number(row.changed_in_version_group_id) > 10)
  .map((row) => Number(row.move_id)))]
const pastValues = new Map()
await mapLimit(changedMoveIds, 6, async (id) => {
  const move = JSON.parse(await download(apiBase + id))
  const past = move.past_values
    .map((entry) => ({
      ...entry,
      versionGroupId: Number(entry.version_group.url.match(/\/(\d+)\/$/)?.[1])
    }))
    .filter((entry) => entry.versionGroupId > 10)
    .sort((a, b) => a.versionGroupId - b.versionGroupId)[0]
  if (past) pastValues.set(id, past)
})

const damageClassNames = { status: '变化', physical: '物理', special: '特殊' }
const moves = moveRows.map((row) => {
  const id = Number(row.id)
  const past = pastValues.get(id)
  const typeId = past?.type ? Number(past.type.url.match(/\/(\d+)\/$/)?.[1]) : Number(row.type_id)
  const power = past?.power ?? numberOrNull(row.power)
  const pp = past?.pp ?? numberOrNull(row.pp)
  const accuracy = past?.accuracy ?? numberOrNull(row.accuracy)
  const effectChance = past?.effect_chance ?? numberOrNull(row.effect_chance)
  const pastEffect = past?.effect_entries?.find((entry) => entry.language.name === 'en')
  const effect = pastEffect ?? effects.get(Number(row.effect_id))
  const meta = metaByMove.get(id)
  const ailmentId = Number(meta?.meta_ailment_id ?? 0)
  const targetId = Number(row.target_id)
  const names = moveNames.get(id) ?? {}
  const description = descriptions.get(id) ?? {}
  const shortEffect = cleanText(pastEffect?.short_effect ?? effect?.short_effect)
    .replaceAll('$effect_chance', String(effectChance))

  return {
    id,
    slug: row.identifier,
    generation: Number(row.generation_id),
    names: {
      zh: names[12]?.name || names[9]?.name,
      ja: names[11]?.name || names[1]?.name || names[9]?.name,
      en: names[9]?.name
    },
    type: {
      slug: typeSlugs[typeId],
      name: nameFor(typeNames, typeId, 12) || nameFor(typeNames, typeId, 9)
    },
    damageClass: {
      slug: damageClasses.get(Number(row.damage_class_id))?.identifier,
      name: damageClassNames[damageClasses.get(Number(row.damage_class_id))?.identifier]
    },
    power,
    pp,
    accuracy,
    priority: Number(row.priority),
    effectChance,
    target: {
      slug: targets.get(targetId)?.identifier,
      name: targetNames[targetId] ?? targets.get(targetId)?.identifier
    },
    machine: machines.get(id) ?? null,
    descriptions: {
      zh: description[12]?.text ?? '',
      ja: (description[11] ?? description[1])?.text ?? '',
      hgss: description.hgss ?? ''
    },
    effect: {
      short: shortEffect,
      full: cleanText(pastEffect?.effect ?? effect?.effect).replaceAll('$effect_chance', String(effectChance))
    },
    meta: {
      ailment: {
        slug: ailments.get(ailmentId)?.identifier ?? 'none',
        name: ailmentNames[ailmentId] ?? ailments.get(ailmentId)?.identifier ?? '无'
      },
      minHits: numberOrNull(meta?.min_hits),
      maxHits: numberOrNull(meta?.max_hits),
      minTurns: numberOrNull(meta?.min_turns),
      maxTurns: numberOrNull(meta?.max_turns),
      drain: Number(meta?.drain ?? 0),
      healing: Number(meta?.healing ?? 0),
      critRate: Number(meta?.crit_rate ?? 0),
      ailmentChance: Number(meta?.ailment_chance ?? 0),
      flinchChance: Number(meta?.flinch_chance ?? 0),
      statChance: Number(meta?.stat_chance ?? 0)
    },
    statChanges: statChanges.get(id) ?? []
  }
})

if (moves.length !== 467) throw new Error(`招式应有 467 条，实际为 ${moves.length} 条`)
for (const entry of moves) {
  if (!entry.names.zh || !entry.names.ja || !entry.names.en || !entry.type.slug || !entry.type.name || !entry.damageClass.slug || !entry.target.name || !entry.descriptions.hgss || !entry.effect.short) {
    throw new Error(`招式 #${entry.id} ${entry.slug} 的必要数据不完整`)
  }
}

await writeFile(outputFile, JSON.stringify({
  source: 'PokéAPI',
  sourceUrl: 'https://github.com/PokeAPI/pokeapi',
  apiSourceUrl: 'https://pokeapi.co/api/v2/move/',
  versionGroup: 'heartgold-soulsilver',
  generation: 4,
  count: moves.length,
  moves
}, null, 2) + '\n')

console.log(`已保存 ${moves.length} 条第四世代招式数据：${outputFile.pathname}`)
console.log(`已按历史记录还原 ${pastValues.size} 个招式的第四世代数值`)
