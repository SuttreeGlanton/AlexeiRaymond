import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Account prose lives in Markdown, one file per account; site-data.json
// stays the index of which pieces have one (piece.account.slug = file name).
const accounts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/accounts' }),
  schema: z.object({
    title: z.string().optional(),
    epigraph: z.boolean().optional(),
    format: z.enum(['log']).optional()
  })
});

export const collections = { accounts };
