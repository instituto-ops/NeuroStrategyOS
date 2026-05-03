/**
 * agentd/src/skills/vortex/schema.ts
 * 
 * Contrato semântico para páginas e seções do Vórtex.
 * Garante que o agente gere estruturas compatíveis com o renderer.
 */

import { z } from 'zod';

export const SectionSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(['hero', 'content', 'cta', 'gallery', 'faq', 'clinical_profile', 'testimonial']),
  props: z.record(z.unknown()),
  metadata: z.object({
    seo_score: z.number().min(0).max(100).optional(),
    clinical_validation: z.boolean().default(false)
  }).optional()
});

export const PageSchema = z.object({
  meta: z.object({
    title: z.string().min(5),
    description: z.string().min(10),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    hub: z.string().optional()
  }),
  sections: z.array(SectionSchema)
});

export type VortexSection = z.infer<typeof SectionSchema>;
export type VortexPage = z.infer<typeof PageSchema>;
