# AGENTS.md

## 项目说明

基于 Astro 的《宝可梦 心金·魂银》中文攻略站，使用 TypeScript、Astro 组件和 Markdown，不依赖前端框架运行时。

## 常用命令

- `npm run docs:dev`：启动开发服务器。
- `npm run docs:check`：检查 Astro 组件与 TypeScript 类型。
- `npm run docs:build`：构建静态站点。
- `npm run docs:preview`：预览构建产物。
- `npm run pokedex:update`：更新本地图鉴数据与精灵图。
- `npm run moves:update`：更新第四世代本地招式数据。
- `npm run abilities:update`：更新第四世代本地特性数据。

## 目录约定

- `src/pages/`：首页、资料页、动态路由与全站搜索索引。
- `src/components/`：导航、查询和数据展示组件。
- `src/layouts/`、`src/styles/`：共享布局与视觉样式。
- `src/utils/site.ts`：顶部导航、攻略篇章与专题索引。
- `src/content.config.ts`：攻略 Markdown 内容集合。
- `astro.config.mjs`：Astro、静态资源目录和 Markdown 处理器配置。
- `docs/home/`：首页直接展示的 Markdown 内容，不提供独立攻略路由。
- `docs/guide/`：流程攻略 Markdown 源文件。
- `docs/data/`：`pokemon.json`、`move-data.json` 和 `abilities.json` 为持久化的本地数据。
- `docs/public/`：精灵图等静态资源，构建时复制到站点根目录。

## 维护规范

- 攻略使用 Markdown，首行以 `# 标题` 开头；交互页面使用 Astro 组件。
- 新增攻略后，同步更新 `src/utils/site.ts` 中的攻略索引；必要时更新顶部导航。
- Markdown 提示框使用 `:::tip[标题]` 语法，支持 `info`、`tip`、`warning`、`danger`。
- 宝可梦、招式和道具名称使用「中文（日文 / English）」格式。
- 保持现有目录结构、命名方式和中文表述风格。
- 保留 `docs/data/` 和 `docs/public/images/` 中的持久化资料，不将其视为生成文件。
- 不提交 `node_modules/`、`dist/` 或 `.astro/` 等生成文件。
- 修改后运行 `npm run docs:check` 和 `npm run docs:build` 验证。
