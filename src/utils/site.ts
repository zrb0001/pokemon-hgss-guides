export const mainNav = [
  { label: '首页', href: '/' },
  { label: '流程攻略', href: '/guide/' },
  { label: '宝可梦图鉴', href: '/data/pokedex' },
  { label: '招式资料', href: '/data/moves' },
  { label: '数据总览', href: '/data/' }
]

export const guideChapters = [
  {
    title: '城都篇（一周目）',
    fullTitle: '城都篇（一周目）流程攻略',
    href: '/guide/johto/',
    eyebrow: 'CHAPTER 01 · JOHTO',
    description: '从若叶镇出发，集齐八枚徽章，处理火箭队与封面神兽剧情，最终挑战宝可梦联盟。'
  },
  {
    title: '关都篇（二周目）',
    fullTitle: '关都篇（二周目）流程攻略',
    href: '/guide/kanto/',
    eyebrow: 'CHAPTER 02 · KANTO',
    description: '完成发电厂事件与八枚关都徽章，挑战赤红，并继续收集传说宝可梦。'
  }
]

export const guideTopics = [
  { title: '心金与魂银的区别', href: '/guide/version-differences', description: '剧情神兽、版本限定宝可梦与版本选择建议' },
  { title: '第四世代机制变化', href: '/guide/generation-4-mechanics', description: '物理／特殊分家、对战、培育与地图系统变化' },
  { title: '四大天王与全部馆主资料', href: '/guide/gym-leaders-elite-four', description: '16 位馆主、四天王与冠军渡的初战阵容、等级、徽章和招式学习器奖励' },
  { title: '宝可梦特性列表', href: '/guide/abilities', description: '全部 123 个特性的中日英名称与效果说明' },
  { title: '宝可梦性格', href: '/guide/natures', description: '全部 25 种性格的能力修正、口味偏好、遗传与筛选方法' },
  { title: '所有精灵球介绍', href: '/guide/pokeballs', description: '全部 25 种球的第四世代捕获效果、获取方式与选择建议' },
  { title: '星期家族', href: '/guide/week-siblings', description: '七人的出现星期、地点、属性道具与每周奖章' },
  { title: '所有交换 NPC 一览', href: '/guide/trades', description: '全部 10 组游戏内交换的地点、条件与携带道具' },
  { title: '所有可登记电话的人', href: '/guide/phone-contacts', description: '全部馆主、剧情人物与普通训练家的登记方式、再战时段和电话奖励' },
  { title: '所有道馆馆主电话登记和再战方式', href: '/guide/gym-rematches', description: '16 位馆主的号码登记地点、特殊条件、预约时段与格斗道场再战流程' },
  { title: '日版金手指', href: '/guide/cheats', description: '日版游戏 ID、常用 PAR 代码、使用方法与存档风险提示' },
  { title: '全技能机器列表', href: '/guide/tmhm', description: 'TM01–TM92、HM01–HM08 的招式数值与获取地点' }
]

export function isCurrentPath(currentPath: string, href: string) {
  if (href === '/') return currentPath === '/'
  return currentPath.startsWith(href.endsWith('/') ? href : `${href}/`) || currentPath === href
}
