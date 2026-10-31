# 宝可梦 心金·魂银 攻略站

基于 [Astro](https://astro.build/) 构建的中文攻略与资料站。攻略使用 Markdown，图鉴、招式与特性页面由本地 JSON 静态生成。

## 常用命令

```bash
npm install           # 安装依赖
npm run docs:dev      # 启动开发服务器（默认 http://localhost:4321）
npm run docs:check    # 检查 Astro 组件与 TypeScript 类型
npm run docs:build    # 构建静态站点（输出到 dist）
npm run docs:preview  # 本地预览构建产物
npm run pokedex:update  # 更新本地图鉴数据与精灵图
npm run moves:update  # 更新第四世代本地招式数据
npm run abilities:update # 更新第四世代本地特性数据
```

## 目录结构

```
├── astro.config.mjs        # Astro 与 Markdown 处理器配置
├── src/
│   ├── pages/              # 首页、资料页与动态路由
│   ├── components/         # 导航、搜索、图鉴和招式等组件
│   ├── layouts/            # 全站共享布局
│   ├── styles/             # 全局样式
│   ├── utils/              # 数据与站点导航配置
│   └── content.config.ts   # Markdown 内容集合
└── docs/
    ├── home/               # 首页直接展示的 Markdown 内容
    ├── guide/              # 流程攻略 Markdown 源文件
    ├── data/               # 持久化的图鉴、招式与特性 JSON
    └── public/             # 精灵图与其他静态资源
```

## 新增攻略页面

1. 在 `docs/guide/` 下新建 `.md` 文件，首行以 `# 标题` 开头，页面路由由文件名自动生成。
2. 在 `src/utils/site.ts` 的 `guideTopics` 中添加标题、链接和简介，同步攻略总览与首页索引。
3. 如需调整顶部导航，编辑同文件中的 `mainNav`。

提示框支持 `info`、`tip`、`warning` 和 `danger` 四种类型：

```md
:::tip[提示标题]
提示内容，支持 Markdown。
:::
```

## 命名格式约定

宝可梦、招式、道具名称采用「中文（日文 / English）」对照格式，例如：

`名称（日文名 / English Name）`

`docs/data/` 中的 JSON 和 `docs/public/images/` 中的图片是持久化资料，不应作为构建产物清理。`dist/`、`.astro/` 与 `node_modules/` 不提交到版本库。
