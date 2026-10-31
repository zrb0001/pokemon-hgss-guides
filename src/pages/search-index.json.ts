import { getCollection } from 'astro:content'
import { pokedex, moveData, abilityData, localizedName, number } from '../utils/data'
import { guideTopics, guideChapters } from '../utils/site'

function markdownText(markdown = '') {
  return markdown
    .replace(/^# .+$/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/:::\s*\w+[^\n]*/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function GET() {
  const [guides, home] = await Promise.all([getCollection('guides'), getCollection('home')])
  const guideEntries = guides.map((entry) => ({
    title: entry.body?.match(/^# (.+)$/m)?.[1] ?? '流程攻略',
    text: markdownText(entry.body),
    url: `/guide/${entry.id.replace(/\/index$/, '')}`,
    category: '流程攻略'
  }))
  const weeklyEvents = home.find((entry) => entry.id === 'weekly-events')

  const entries = [
    { title: '心金·魂银攻略站', text: '宝可梦 心金·魂银 中文流程攻略与资料站 HeartGold SoulSilver', url: '/', category: '首页' },
    { title: '每周事件时间表', text: markdownText(weeklyEvents?.body), url: '/#weekly-events', category: '首页' },
    { title: '流程攻略总览', text: guideTopics.map((topic) => `${topic.title} ${topic.description}`).join(' '), url: '/guide/', category: '流程攻略' },
    { title: '宝可梦特性列表', text: abilityData.abilities.map((entry) => `${localizedName(entry)} ${entry.descriptions.zh} ${entry.descriptions.hgss}`).join(' '), url: '/guide/abilities', category: '专题攻略' },
    { title: '宝可梦图鉴', text: `全国图鉴前 ${pokedex.count} 只宝可梦的名称、属性、特性、进化链、升级招式与第四世代能力值`, url: '/data/pokedex', category: '数据资料' },
    { title: '招式资料', text: `第四世代全部 ${moveData.count} 个招式的数值、效果与学习机信息`, url: '/data/moves', category: '数据资料' },
    { title: '数据资料总览', text: '宝可梦图鉴 招式资料 特性列表', url: '/data/', category: '数据资料' },
    { title: '关于本站', text: '非官方攻略站 资料来源 Pokémon Nintendo Creatures GAME FREAK', url: '/about', category: '本站' },
    ...guideChapters.map((chapter) => ({ title: chapter.fullTitle, text: chapter.description, url: chapter.href, category: '流程攻略' })),
    ...guideEntries,
    ...pokedex.pokemon.map((entry) => ({
      title: `${localizedName(entry)} #${number(entry.id)}`,
      text: [
        entry.id,
        number(entry.id),
        entry.slug,
        entry.genus,
        entry.types.map((type) => `${type.slug} ${type.name}`).join(' '),
        entry.abilities.map((ability) => ability.name).join(' '),
        entry.acquisition.map((record) => `${record.method} ${record.location} ${record.text} ${record.conditions.join(' ')}`).join(' ')
      ].join(' '),
      url: `/data/pokedex/${number(entry.id)}`,
      category: '宝可梦'
    })),
    ...moveData.moves.map((entry) => ({
      title: `${localizedName(entry)} #${number(entry.id)}`,
      text: `${entry.id} ${number(entry.id)} ${entry.slug} ${entry.type.name} ${entry.damageClass.name} ${entry.machine ?? ''} ${entry.descriptions.zh} ${entry.descriptions.ja} ${entry.descriptions.hgss} ${entry.effect.full}`,
      url: `/data/moves/${number(entry.id)}`,
      category: '招式'
    }))
  ]

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}
