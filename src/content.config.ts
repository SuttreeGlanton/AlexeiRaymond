import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Account prose lives in Markdown, one file per account; site-data.json
// stays the index of which pieces have one (piece.account.slug = file name).
const accounts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/accounts' }),
  schema: z.object({
    title: z.string().optional(),
    epigraph: z.boolean().optional(),
    fullText: z.boolean().optional(),
    format: z.enum(['log', 'tracked']).optional()
  })
});

export const collections = { accounts };
