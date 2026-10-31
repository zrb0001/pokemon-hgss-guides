import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

const guides = defineCollection({
  loader: glob({
    base: './docs/guide',
    pattern: ['**/*.md', '!index.md', '!abilities.md']
  })
})

const home = defineCollection({
  loader: glob({
    base: './docs/home',
    pattern: '**/*.md'
  })
})

export const collections = { guides, home }
