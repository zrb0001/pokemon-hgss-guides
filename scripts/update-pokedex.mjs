import { execFile } from 'node:child_process'
import { mkdir, writeFile, access } from 'node:fs/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)
const csvBase = 'https://cdn.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv/'
const spriteBase = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-iv/heartgold-soulsilver/'
const availabilityUrl = 'https://altissimo1.github.io/Main-Series/DPPt/gen-4-games.html'
const outputFile = new URL('../docs/data/pokemon.json', import.meta.url)
const spriteDirectory = new URL('../docs/public/images/pokemon/', import.meta.url)
const files = [
  'pokemon.csv',
  'pokemon_species.csv',
  'pokemon_species_names.csv',
  'pokemon_types.csv',
  'pokemon_types_past.csv',
  'type_names.csv',
  'pokemon_abilities.csv',
  'pokemon_abilities_past.csv',
  'abilities.csv',
  'ability_names.csv',
  'pokemon_stats.csv',
  'pokemon_stats_past.csv',
  'pokemon_evolution.csv',
  'evolution_triggers.csv',
  'item_names.csv',
  'pokemon_moves.csv',
  'encounters.csv',
  'encounter_slots.csv',
  'encounter_methods.csv',
  'encounter_condition_value_map.csv',
  'encounter_condition_values.csv',
  'location_areas.csv',
  'locations.csv'
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

async function download(url, encoding = 'utf8') {
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
        '120',
        source
      ], { encoding, maxBuffer: 50 * 1024 * 1024 })
      return stdout
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function byId(rows, key) {
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

function nameFor(names, id, languageId, field = 'name') {
  return names.get(id)?.[languageId]?.[field] ?? ''
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
  18: 'fairy'
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

function parseAvailability(html) {
  const availability = new Map()
  for (const row of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td class="([^"]+)"[^>]*>([\s\S]*?)<\/td>/g)]
    if (cells.length !== 8) continue
    const name = cells[1][2].replace(/<[^>]+>/g, '').trim()
      .replace(/ \((?:West|East)\)$/, '')
      .replace("Farfetch'd", 'Farfetch’d')
    availability.set(name, {
      heartgold: cells[5][1].startsWith('heartgold-'),
      soulsilver: cells[6][1].startsWith('soulsilver-')
    })
  }
  return availability
}

const availabilityByName = parseAvailability(await download(availabilityUrl))
if (availabilityByName.size !== 493) throw new Error(`版本获得数据应有 493 条，实际为 ${availabilityByName.size} 条`)

const csvEntries = []
await mapLimit(files, 4, async (file) => {
  csvEntries.push([file, parseCsv(await download(csvBase + file))])
})
const csv = Object.fromEntries(csvEntries)
const pokemonRows = csv['pokemon.csv'].filter((row) => Number(row.id) <= 493 && row.is_default === '1')
const speciesRows = byId(csv['pokemon_species.csv'], 'id')
const abilityRows = byId(csv['abilities.csv'], 'id')
const speciesNames = localizedNames(csv['pokemon_species_names.csv'], 'pokemon_species_id')
const typeNames = localizedNames(csv['type_names.csv'], 'type_id')
const abilityNames = localizedNames(csv['ability_names.csv'], 'ability_id')
const itemNames = localizedNames(csv['item_names.csv'], 'item_id')
const evolutionTriggers = byId(csv['evolution_triggers.csv'], 'id')
const statKeys = {
  1: 'hp',
  2: 'attack',
  3: 'defense',
  4: 'specialAttack',
  5: 'specialDefense',
  6: 'speed'
}
const evolutionLocationNames = {
  8: '百代森林',
  10: '天冠山',
  48: '217号道路'
}

const evolutionRows = new Map()
for (const row of csv['pokemon_evolution.csv']) {
  const targetId = Number(row.evolved_species_id)
  const versionGroup = Number(row.version_group_id)
  if (targetId > 493 || versionGroup > 10) continue
  const current = evolutionRows.get(targetId)
  if (!current || versionGroup > Number(current.version_group_id)) evolutionRows.set(targetId, row)
}

function evolutionItem(id) {
  if (!id) return null
  const itemId = Number(id)
  return {
    id: itemId,
    name: nameFor(itemNames, itemId, 12) || nameFor(itemNames, itemId, 9)
  }
}

function evolutionType(id) {
  if (!id) return null
  const typeId = Number(id)
  return {
    slug: typeSlugs[typeId],
    name: nameFor(typeNames, typeId, 12) || nameFor(typeNames, typeId, 9)
  }
}

function evolutionCondition(row) {
  return {
    trigger: evolutionTriggers.get(Number(row.evolution_trigger_id))?.identifier,
    level: row.minimum_level ? Number(row.minimum_level) : null,
    item: evolutionItem(row.trigger_item_id),
    heldItem: evolutionItem(row.held_item_id),
    timeOfDay: row.time_of_day || null,
    knownMoveId: row.known_move_id ? Number(row.known_move_id) : null,
    knownMoveType: evolutionType(row.known_move_type_id),
    happiness: row.minimum_happiness ? Number(row.minimum_happiness) : null,
    beauty: row.minimum_beauty ? Number(row.minimum_beauty) : null,
    affection: row.minimum_affection ? Number(row.minimum_affection) : null,
    gender: row.gender_id ? Number(row.gender_id) : null,
    location: row.location_id ? {
      id: Number(row.location_id),
      name: evolutionLocationNames[Number(row.location_id)] ?? `地点 #${row.location_id}`
    } : null,
    relativePhysicalStats: row.relative_physical_stats ? Number(row.relative_physical_stats) : null,
    partySpeciesId: row.party_species_id ? Number(row.party_species_id) : null,
    partyType: evolutionType(row.party_type_id),
    tradeSpeciesId: row.trade_species_id ? Number(row.trade_species_id) : null
  }
}

const evolutionsBySource = new Map()
for (const [targetId, row] of evolutionRows) {
  const sourceId = Number(speciesRows.get(targetId)?.evolves_from_species_id)
  if (!sourceId || sourceId > 493) continue
  const list = evolutionsBySource.get(sourceId) ?? []
  list.push({ id: targetId, condition: evolutionCondition(row) })
  evolutionsBySource.set(sourceId, list)
}
for (const list of evolutionsBySource.values()) list.sort((a, b) => a.id - b.id)

const levelMoves = new Map()
for (const row of csv['pokemon_moves.csv']) {
  const pokemonId = Number(row.pokemon_id)
  const moveId = Number(row.move_id)
  if (pokemonId > 493 || moveId > 467 || Number(row.version_group_id) !== 10 || Number(row.pokemon_move_method_id) !== 1) continue
  const list = levelMoves.get(pokemonId) ?? new Map()
  list.set(`${moveId}:${Number(row.level)}`, {
    id: moveId,
    level: Number(row.level),
    order: Number(row.order || 0)
  })
  levelMoves.set(pokemonId, list)
}
for (const [id, rows] of levelMoves) {
  levelMoves.set(id, [...rows.values()]
    .sort((a, b) => a.level - b.level || a.order - b.order || a.id - b.id)
    .map(({ id, level }) => ({ id, level })))
}

const currentTypes = new Map()
for (const row of csv['pokemon_types.csv']) {
  const id = Number(row.pokemon_id)
  if (id > 493) continue
  const list = currentTypes.get(id) ?? []
  list.push({ id: Number(row.type_id), slot: Number(row.slot) })
  currentTypes.set(id, list)
}

const pastTypes = new Map()
for (const row of csv['pokemon_types_past.csv']) {
  const id = Number(row.pokemon_id)
  const generation = Number(row.generation_id)
  if (id > 493 || generation < 4) continue
  const current = pastTypes.get(id)
  if (!current || generation < current.generation) pastTypes.set(id, { generation, rows: [] })
  if (pastTypes.get(id).generation === generation) {
    pastTypes.get(id).rows.push({ id: Number(row.type_id), slot: Number(row.slot) })
  }
}

const currentAbilities = new Map()
for (const row of csv['pokemon_abilities.csv']) {
  const id = Number(row.pokemon_id)
  if (id > 493) continue
  const list = currentAbilities.get(id) ?? []
  list.push({ id: Number(row.ability_id), hidden: row.is_hidden === '1', slot: Number(row.slot) })
  currentAbilities.set(id, list)
}

const pastAbilities = new Map()
for (const row of csv['pokemon_abilities_past.csv']) {
  const id = Number(row.pokemon_id)
  const generation = Number(row.generation_id)
  if (id > 493 || generation > 4) continue
  const current = pastAbilities.get(id)
  if (!current || generation > current.generation) pastAbilities.set(id, { generation, rows: [] })
  if (pastAbilities.get(id).generation === generation) pastAbilities.get(id).rows.push(row)
}

const currentStats = new Map()
for (const row of csv['pokemon_stats.csv']) {
  const id = Number(row.pokemon_id)
  if (id > 493 || !statKeys[row.stat_id]) continue
  const stats = currentStats.get(id) ?? {}
  stats[statKeys[row.stat_id]] = Number(row.base_stat)
  currentStats.set(id, stats)
}

const pastStats = new Map()
for (const row of csv['pokemon_stats_past.csv']) {
  const id = Number(row.pokemon_id)
  const generation = Number(row.generation_id)
  if (id > 493 || generation < 4 || !statKeys[row.stat_id]) continue
  const current = pastStats.get(id)
  if (!current || generation < current.generation) pastStats.set(id, { generation, rows: [] })
  if (pastStats.get(id).generation === generation) pastStats.get(id).rows.push(row)
}

const acquisitionLocationNames = {
  'azalea-town': '桧皮镇',
  'bell-tower': '铃铛塔',
  'blackthorn-city': '烟墨市',
  'burned-tower': '烧焦塔',
  'celadon-city': '玉虹市',
  'cerulean-cave': '华蓝洞窟',
  'cerulean-city': '华蓝市',
  'cherrygrove-city': '吉花市',
  'cianwood-city': '湛蓝市',
  'cinnabar-island': '红莲镇',
  'dark-cave': '黑暗穴',
  'digletts-cave': '地鼠洞穴',
  'dragons-den': '龙穴',
  'ecruteak-city': '缘朱市',
  'embedded-tower': '埋藏之塔',
  'fuchsia-city': '浅红市',
  'goldenrod-city': '满金市',
  'ice-path': '冰雪小径',
  'ilex-forest': '桐树林',
  'johto-pokemart': '城都地区宝可梦商店',
  'johto-safari-zone': '城都狩猎地带',
  'kanto-power-plant': '无人发电厂',
  'kanto-victory-road-1': '冠军之路',
  'lake-of-rage': '愤怒之湖',
  'mt-moon': '月见山',
  'mt-mortar': '擂钵山',
  'mt-silver': '白银山',
  'national-park': '自然公园',
  'new-bark-town': '若叶镇',
  'olivine-city': '浅葱市',
  'pallet-town': '真新镇',
  'pewter-city': '深灰市',
  'roaming-johto': '城都地区游走',
  'rock-tunnel': '岩山隧道',
  'ruins-of-alph': '阿露福遗迹',
  'safari-zone-gate': '狩猎地带大门',
  'saffron-city': '金黄市',
  'seafoam-islands': '双子岛',
  'sinjoh-ruins': '神都遗迹',
  'slowpoke-well': '呆呆兽之井',
  'sprout-tower': '喇叭芽之塔',
  'team-rocket-hq': '火箭队基地',
  'tohjo-falls': '都城瀑布',
  'union-cave': '互连洞',
  'unknown-all-bugs': '捕虫大赛会场',
  'vermilion-city': '枯叶市',
  'violet-city': '桔梗市',
  'viridian-city': '常青市',
  'viridian-forest': '常青森林',
  'whirl-islands': '漩涡岛'
}

const acquisitionMethodNames = {
  walk: '草丛／洞穴遭遇',
  headbutt: '撞树',
  'super-rod': '厉害钓竿',
  'good-rod': '好钓竿',
  'old-rod': '破旧钓竿',
  surf: '冲浪遭遇',
  static: '定点遭遇',
  gift: '赠送／兑换',
  'gift-egg': '赠送蛋',
  'rock-smash': '碎岩遭遇',
  'npc-trade': 'NPC 交换',
  'roaming-grass': '游走遭遇',
  pokeflute: '宝可梦之笛唤醒',
  'squirt-bottle': '使用喷壶后遭遇',
  'pokemon-ranger': '《宝可梦巡护员》联动'
}

const acquisitionCategories = {
  gift: 'gift',
  'gift-egg': 'gift',
  static: 'static',
  'npc-trade': 'trade',
  'roaming-grass': 'roaming',
  pokeflute: 'static',
  'squirt-bottle': 'static',
  'pokemon-ranger': 'transfer'
}

const ignoredEncounterConditions = new Set([
  'radio-off',
  'johto-safari-blocks-inactive',
  'swarm-no',
  'bug-catching-contest-no'
])

const encounterConditionNames = {
  'time-morning': '早晨',
  'time-day': '白天',
  'time-night': '夜晚',
  'radio-hoenn': '丰缘之声（星期三）',
  'radio-sinnoh': '神奥之声（星期四）',
  'headbutt-tree-common': '普通撞树点',
  'headbutt-tree-rare': '稀有撞树点',
  'headbutt-tree-secret': '特殊撞树点',
  'swarm-yes': '大量出现期间',
  'bug-catching-contest-yes': '捕虫大赛期间',
  'story-progress-national-dex': '获得全国图鉴后',
  'story-progress-before-national-dex': '获得全国图鉴前',
  'story-progress-beat-red': '击败赤红后',
  'other-correct-password': '向空木博士的助手说出正确密语',
  'other-received-kanto-starter': '领取关都最初的伙伴后',
  'other-event-arceus-in-party': '队伍携带来自活动的阿尔宙斯',
  'story-progress-awakened-beasts': '在烧焦塔唤醒三兽后',
  'story-progress-returned-machine-part': '归还发电厂零件后',
  'story-progress-vermilion-copycat': '获得全国图鉴并完成枯叶市模仿少女事件后',
  'story-progress-receive-tm-from-claire': '完成龙穴试炼后',
  'other-snorlax-11-beat-league': '击败宝可梦联盟后可再次出现',
  'story-progress-zephyr-badge': '获得飞行徽章后',
  'weekday-tuesday': '星期二',
  'weekday-thursday': '星期四',
  'weekday-friday': '星期五',
  'weekday-saturday': '星期六',
  'trade-bellsprout': '用喇叭芽交换',
  'trade-drowzee': '用催眠貘交换',
  'trade-krabby': '用大钳蟹交换',
  'trade-dragonair': '用雌性哈克龙交换',
  'trade-dugtrio': '用三地鼠交换',
  'trade-haunter': '用鬼斯通交换',
  'trade-pikachu': '用来自常青森林的皮卡丘交换',
  'trade-forretress': '用佛烈托斯交换',
  'trade-bonsly': '用盆才怪交换',
  'trade-any-pokemon': '可用任意宝可梦交换'
}

const safariBlockNames = {
  plains: '草原',
  forest: '森林',
  peak: '岩壁',
  water: '水边'
}

function encounterConditionName(identifier) {
  if (encounterConditionNames[identifier]) return encounterConditionNames[identifier]
  const coins = identifier.match(/^coins-(\d+)$/)
  if (coins) return `游戏城兑换：${Number(coins[1]).toLocaleString('zh-CN')} 枚代币`
  const fossil = identifier.match(/^item-(.+)-fossil$/)
  const fossilNames = {
    helix: '贝壳化石',
    dome: '甲壳化石',
    root: '根状化石',
    claw: '爪子化石',
    skull: '头盖化石',
    armor: '盾甲化石'
  }
  if (fossil) return `携带${fossilNames[fossil[1]]}复活`
  if (identifier === 'item-old-amber') return '携带秘密琥珀复活'
  const blocks = identifier.match(/^johto-safari-blocks-(plains|forest|peak|water)-min-(\d+)$/)
  if (blocks) return `狩猎地带${safariBlockNames[blocks[1]]}区放置至少 ${blocks[2]} 个对应模块`
  throw new Error(`未翻译的遭遇条件：${identifier}`)
}

function acquisitionLocationName(locationId) {
  const slug = locations.get(locationId)?.identifier
  if (acquisitionLocationNames[slug]) return acquisitionLocationNames[slug]
  const route = slug?.match(/^(?:johto|kanto)-(?:sea-)?route-(\d+)$/)
  if (route) return `${Number(route[1])}号道路`
  throw new Error(`未翻译的遭遇地点：${slug ?? locationId}`)
}

const encounterSlots = byId(csv['encounter_slots.csv'], 'id')
const encounterMethods = byId(csv['encounter_methods.csv'], 'id')
const encounterConditionValues = byId(csv['encounter_condition_values.csv'], 'id')
const locationAreas = byId(csv['location_areas.csv'], 'id')
const locations = byId(csv['locations.csv'], 'id')
const encounterConditions = new Map()
for (const row of csv['encounter_condition_value_map.csv']) {
  const list = encounterConditions.get(row.encounter_id) ?? []
  list.push(encounterConditionValues.get(Number(row.encounter_condition_value_id))?.identifier)
  encounterConditions.set(row.encounter_id, list)
}

const encountersByPokemon = new Map()
for (const row of csv['encounters.csv']) {
  const pokemonId = Number(row.pokemon_id)
  const versionId = Number(row.version_id)
  const area = locationAreas.get(Number(row.location_area_id))
  const locationSlug = locations.get(Number(area?.location_id))?.identifier
  if (pokemonId > 493 || ![15, 16].includes(versionId) || ['unknown-all-poliwag', 'unknown-all-rattata'].includes(locationSlug)) continue
  const list = encountersByPokemon.get(pokemonId) ?? []
  list.push(row)
  encountersByPokemon.set(pokemonId, list)
}

const extraAcquisitions = {
  172: ['breeding', '孵蛋', '由皮卡丘或雷丘孵蛋获得'],
  173: ['breeding', '孵蛋', '由皮皮或皮可西孵蛋获得'],
  174: ['breeding', '孵蛋', '由胖丁或胖可丁孵蛋获得'],
  238: ['pokewalker', '宝可计步器', '在“昏暗洞窟”路线遭遇'],
  239: ['pokewalker', '宝可计步器', '在“郊外”路线遭遇'],
  240: ['pokewalker', '宝可计步器', '在“崎岖山路”路线遭遇'],
  300: ['pokewalker', '宝可计步器', '在“丰缘草原”路线遭遇'],
  318: ['pokewalker', '宝可计步器', '在“温暖海边”路线遭遇'],
  320: ['pokewalker', '宝可计步器', '在“温暖海边”路线遭遇'],
  360: ['breeding', '薰香孵蛋', '让果然翁携带悠闲薰香后孵蛋获得'],
  438: ['breeding', '薰香孵蛋', '让树才怪携带岩石薰香后孵蛋获得'],
  439: ['breeding', '薰香孵蛋', '让魔墙人偶携带奇异薰香后孵蛋获得'],
  440: ['breeding', '薰香孵蛋', '让吉利蛋或幸福蛋携带幸运薰香后孵蛋获得'],
  446: ['breeding', '薰香孵蛋', '让卡比兽携带饱腹薰香后孵蛋获得'],
  458: ['breeding', '薰香孵蛋', '让巨翅飞鱼携带涟漪薰香后孵蛋获得'],
  489: ['breeding', '孵蛋', '让玛纳霏与百变怪孵蛋获得；玛纳霏本身需要联动或活动获得']
}

const eventOnlyPokemon = new Set([151, 251, 385, 386, 491, 492, 493])

function customAcquisition(category, method, text, sourceId = null) {
  return {
    versions: ['heartgold', 'soulsilver'],
    category,
    method,
    location: '',
    minLevel: null,
    maxLevel: null,
    conditions: [],
    text,
    sourceId
  }
}

const pokemon = pokemonRows.map((row) => {
  const id = Number(row.id)
  const speciesId = Number(row.species_id)
  const species = speciesRows.get(speciesId)
  const names = speciesNames.get(speciesId) ?? {}
  const types = [...(pastTypes.get(id)?.rows ?? currentTypes.get(id) ?? [])]
    .sort((a, b) => Number(a.slot) - Number(b.slot))
    .map((type) => ({
      slug: typeSlugs[type.id],
      name: nameFor(typeNames, type.id, 12) || nameFor(typeNames, type.id, 9)
    }))

  const abilities = (currentAbilities.get(id) ?? []).map((ability) => ({ ...ability }))
  for (const past of pastAbilities.get(id)?.rows ?? []) {
    const slot = Number(past.slot)
    const index = abilities.findIndex((ability) => ability.slot === slot)
    if (!past.ability_id) {
      if (index >= 0) abilities.splice(index, 1)
    } else {
      const ability = { id: Number(past.ability_id), hidden: past.is_hidden === '1', slot }
      if (index >= 0) abilities[index] = ability
      else abilities.push(ability)
    }
  }

  const stats = { ...currentStats.get(id) }
  for (const past of pastStats.get(id)?.rows ?? []) stats[statKeys[past.stat_id]] = Number(past.base_stat)
  const availability = availabilityByName.get(names[9]?.name)
  if (!availability) throw new Error(`图鉴 #${id} 缺少版本获得数据：${names[9]?.name}`)

  return {
    id,
    slug: row.identifier,
    availability,
    names: {
      zh: names[12]?.name || names[9]?.name,
      ja: names[1]?.name || names[11]?.name || names[9]?.name,
      en: names[9]?.name
    },
    genus: names[12]?.genus || names[9]?.genus || '',
    types,
    height: Number(row.height) / 10,
    weight: Number(row.weight) / 10,
    abilities: abilities.sort((a, b) => a.slot - b.slot).map((ability) => ({
      slug: abilityRows.get(ability.id)?.identifier,
      name: nameFor(abilityNames, ability.id, 12) || nameFor(abilityNames, ability.id, 9)
    })),
    stats,
    baseExperience: Number(row.base_experience),
    captureRate: Number(species.capture_rate),
    evolvedFrom: Number(species.evolves_from_species_id) || null,
    evolutions: evolutionsBySource.get(id) ?? [],
    levelMoves: levelMoves.get(id) ?? []
  }
})

const pokemonById = new Map(pokemon.map((entry) => [entry.id, entry]))
for (const entry of pokemon) {
  const grouped = new Map()
  for (const row of encountersByPokemon.get(entry.id) ?? []) {
    const area = locationAreas.get(Number(row.location_area_id))
    const location = acquisitionLocationName(Number(area.location_id))
    const methodId = encounterSlots.get(Number(row.encounter_slot_id))?.encounter_method_id
    const methodSlug = encounterMethods.get(Number(methodId))?.identifier
    const method = acquisitionMethodNames[methodSlug]
    if (!method) throw new Error(`未翻译的遭遇方式：${methodSlug}`)
    const conditions = (encounterConditions.get(row.id) ?? [])
      .filter((condition) => condition && !ignoredEncounterConditions.has(condition))
      .map(encounterConditionName)
      .sort()
    const version = Number(row.version_id) === 15 ? 'heartgold' : 'soulsilver'
    const category = acquisitionCategories[methodSlug] ?? 'wild'
    const key = JSON.stringify([version, category, method, location, conditions])
    const current = grouped.get(key)
    const minLevel = Number(row.min_level)
    const maxLevel = Number(row.max_level)
    if (current) {
      current.minLevel = Math.min(current.minLevel, minLevel)
      current.maxLevel = Math.max(current.maxLevel, maxLevel)
    } else {
      grouped.set(key, {
        versions: [version],
        category,
        method,
        location,
        minLevel,
        maxLevel,
        conditions,
        text: '',
        sourceId: null
      })
    }
  }

  const combined = new Map()
  const records = [...grouped.values()].sort((a, b) =>
    a.location.localeCompare(b.location, 'zh-CN')
    || a.method.localeCompare(b.method, 'zh-CN')
    || a.conditions.join('|').localeCompare(b.conditions.join('|'), 'zh-CN'))
  for (const record of records) {
    const key = JSON.stringify([record.category, record.method, record.location, record.minLevel, record.maxLevel, record.conditions])
    const current = combined.get(key)
    if (current && !current.versions.includes(record.versions[0])) {
      current.versions.push(record.versions[0])
      current.versions.sort((a, b) => a === 'heartgold' ? -1 : b === 'heartgold' ? 1 : 0)
    }
    else if (!current) combined.set(key, record)
  }
  entry.acquisition = [...combined.values()]

  const extra = extraAcquisitions[entry.id]
  if (extra) entry.acquisition.push(customAcquisition(...extra))
  if (entry.evolvedFrom) {
    const source = pokemonById.get(entry.evolvedFrom)
    entry.acquisition.push(customAcquisition('evolution', '进化', `由${source.names.zh}进化；具体条件见进化链`, source.id))
  }
  if (!entry.acquisition.length && eventOnlyPokemon.has(entry.id)) {
    entry.acquisition.push(customAcquisition('event', '活动限定', '历史活动赠送宝可梦；正常游戏流程无法获得，也可从其他版本传入或交换获得'))
  }
  if (!entry.acquisition.length) {
    entry.acquisition.push(customAcquisition('transfer', '跨版本传入', '本作常规流程无法获得，需要从《钻石／珍珠／白金》等其他第四世代游戏传入或交换获得'))
  }
}

for (const entry of pokemon) {
  if (!entry.acquisition.length) throw new Error(`图鉴 #${entry.id} 缺少获取信息`)
  if (!entry.names.zh || !entry.names.ja || !entry.names.en || !entry.types.length || !entry.abilities.length) {
    throw new Error(`图鉴 #${entry.id} 的必要数据不完整`)
  }
  if (entry.types.some((type) => !type.slug || !type.name) || entry.abilities.some((ability) => !ability.slug || !ability.name)) {
    throw new Error(`图鉴 #${entry.id} 的属性或特性名称不完整`)
  }
  if (Object.keys(statKeys).some((id) => !Number.isFinite(entry.stats[statKeys[id]]))) {
    throw new Error(`图鉴 #${entry.id} 的能力值不完整`)
  }
}

await mkdir(new URL('../docs/data/', import.meta.url), { recursive: true })
await writeFile(outputFile, JSON.stringify({
  source: 'PokéAPI',
  sourceUrl: 'https://github.com/PokeAPI/pokeapi',
  availabilitySource: 'Altissimo — Generation 4 Pokémon Games',
  availabilitySourceUrl: availabilityUrl,
  versionGroup: 'heartgold-soulsilver',
  generation: 4,
  count: pokemon.length,
  pokemon
}, null, 2) + '\n')

if (!process.argv.includes('--data-only')) {
  await mkdir(spriteDirectory, { recursive: true })
  await mapLimit(pokemon, 4, async (entry) => {
    const filename = `${String(entry.id).padStart(3, '0')}.png`
    const target = new URL(filename, spriteDirectory)
    try {
      await access(target)
      return
    } catch {}
    const image = await download(spriteBase + entry.id + '.png', 'buffer')
    await writeFile(target, image)
  })
}

console.log(`已保存 ${pokemon.length} 条图鉴数据：${outputFile.pathname}`)
if (!process.argv.includes('--data-only')) console.log(`已保存 ${pokemon.length} 张本地精灵图：${spriteDirectory.pathname}`)
