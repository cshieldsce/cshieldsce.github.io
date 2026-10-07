import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { STATUSES } from './lib/status';

const video = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('file'),
    src: z.string().startsWith('/video/'),
    poster: z.string().optional(),
    caption: z.string().optional(),
  }),
  z.object({ kind: z.literal('youtube'), id: z.string().regex(/^[\w-]{11}$/), caption: z.string().optional() }),
]);

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string().max(220),
      kind: z.enum(['project', 'series']).default('project'),
      status: z.enum(STATUSES),
      statusNote: z.string().optional(),
      specs: z.string().max(90).optional(),
      tags: z.array(z.string()).min(1),
      year: z.number().int(),
      featured: z.number().int().optional(),
      hero: z.object({ src: image(), alt: z.string().min(1) }),
      gallery: z
        .array(z.object({ src: image(), alt: z.string().min(1), caption: z.string().optional() }))
        .default([]),
      video: video.optional(),
      repo: z.string().url().optional(),
      updated: z.coerce.date().optional(),
    }),
});

const articleSchema = z.object({
  series: z.string(),
  order: z.number().int(),
  title: z.string(),
  summary: z.string().max(220),
  updated: z.coerce.date().optional(),
});

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.{md,mdx}' }),
  schema: articleSchema,
});
const synced = defineCollection({
  loader: glob({ base: './src/content/synced', pattern: '**/*.md' }),
  schema: articleSchema,
});

export const collections = { projects, articles, synced };
