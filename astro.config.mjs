import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import remarkDirective from 'remark-directive'
import { remarkAdmonitions } from './src/plugins/remark-admonitions.js'
import { rehypeTableWrapper } from './src/plugins/rehype-table-wrapper.js'

export default defineConfig({
  output: 'static',
  publicDir: 'docs/public',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkDirective, remarkAdmonitions],
      rehypePlugins: [rehypeTableWrapper],
      shikiConfig: {
        theme: 'github-dark-default'
      }
    })
  }
})
