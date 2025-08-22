import { z } from "zod";

// Esquema para input da análise
export const AnaliseInputSchema = z.object({
  vaga_texto: z.string().min(50, "Descrição da vaga deve ter pelo menos 50 caracteres"),
  curriculo_texto: z.string().min(50, "CV deve ter pelo menos 50 caracteres"),
});

// Esquemas para extração de CV
export const ContactsSchema = z.object({
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  links: z.array(z.string()),
});

export const PeriodSchema = z.object({
  start: z.string().nullable(),
  end: z.string().nullable(),
  current: z.boolean(),
});

export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  period: PeriodSchema,
  bullets: z.array(z.string()),
});

export const CandidateSchema = z.object({
  name: z.string().nullable(),
  contacts: ContactsSchema,
  experiences: z.array(ExperienceSchema),
  skills: z.array(z.string()),
  education: z.array(z.string()),
  certs: z.array(z.string()),
});

export const CVStructSchema = z.object({
  candidate: CandidateSchema,
});

// Esquemas para avaliação ATS
export const BreakdownItemSchema = z.object({
  score: z.number(),
});

export const TechSkillsSchema = BreakdownItemSchema.extend({
  matched: z.array(z.string()),
  missing: z.array(z.string()),
});

export const KeywordsSchema = BreakdownItemSchema.extend({
  present: z.array(z.string()),
  absent: z.array(z.string()),
});

export const EvidenceSchema = BreakdownItemSchema.extend({
  evidence: z.array(z.string()),
});

export const FormattingSchema = BreakdownItemSchema.extend({
  issues: z.array(z.string()),
});

export const RisksSchema = BreakdownItemSchema.extend({
  items: z.array(z.string()),
});

export const BreakdownSchema = z.object({
  experience_alignment: EvidenceSchema,
  tech_skills_tools: TechSkillsSchema,
  keywords: KeywordsSchema,
  impact_results: EvidenceSchema,
  education_certs: EvidenceSchema,
  ats_formatting: FormattingSchema,
  risks_gaps: RisksSchema,
});

export const TopActionSchema = z.object({
  title: z.string(),
  why: z.string(),
  how_example: z.string(),
  est_impact_points: z.number(),
});

export const DetectedEntitiesSchema = z.object({
  roles: z.array(z.string()),
  tools: z.array(z.string()),
  domains: z.array(z.string()),
});

export const ATSResultSchema = z.object({
  overall_score: z.number().min(0).max(100),
  breakdown: BreakdownSchema,
  top_actions: z.array(TopActionSchema),
  ready_to_paste_bullets: z.array(z.string()),
  detected_entities: DetectedEntitiesSchema,
  errors: z.array(z.string()),
});

export const AnaliseResultSchema = z.object({
  cv_struct: CVStructSchema,
  ats_json: ATSResultSchema,
  ats_report_md: z.string(),
});

// Types
export type AnaliseInput = z.infer<typeof AnaliseInputSchema>;
export type CVStruct = z.infer<typeof CVStructSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type ATSResult = z.infer<typeof ATSResultSchema>;
export type TopAction = z.infer<typeof TopActionSchema>;
export type AnaliseResult = z.infer<typeof AnaliseResultSchema>;

// Novo schema rico para análise detalhada
export const CategoriaSchema = z.object({
  pontuacao_local: z.number().int(),
  evidencias: z.array(z.string()).default([]),
  faltantes: z.array(z.string()).optional(),
  presentes: z.array(z.string()).optional(),
  ausentes: z.array(z.string()).optional(),
  riscos: z.array(z.string()).optional(),
  tem_metricas: z.boolean().optional()
});

export const ATSRichSchema = z.object({
  nota_final: z.number().int().min(0).max(100),
  alertas: z.array(z.string()).min(1).max(4),
  categorias: z.object({
    experiencia_alinhada: CategoriaSchema.extend({ pontuacao_local: z.number().int().min(0).max(30) }),
    competencias_tecnicas: CategoriaSchema.extend({ pontuacao_local: z.number().int().min(0).max(25) }),
    palavras_chave: CategoriaSchema.extend({ pontuacao_local: z.number().int().min(0).max(15) }),
    resultados_impacto: CategoriaSchema.extend({ pontuacao_local: z.number().int().min(0).max(10) }),
    formacao_certificacoes: CategoriaSchema.extend({ pontuacao_local: z.number().int().min(0).max(10) }),
    formatacao_ats: CategoriaSchema.extend({ pontuacao_local: z.number().int().min(0).max(10) })
  }),
  acoes_prioritarias: z.array(z.object({
    titulo: z.string(),
    como_fazer: z.string(),
    ganho_estimado_pontos: z.number().int().min(0).max(30)
  })).min(3).max(6),
  frases_prontas: z.array(z.string()).min(1).max(10),
  perfil_detectado: z.object({
    cargos: z.array(z.string()).default([]),
    ferramentas: z.array(z.string()).default([]),
    dominios: z.array(z.string()).default([])
  })
});

export type ATSRich = z.infer<typeof ATSRichSchema>;
export type Categoria = z.infer<typeof CategoriaSchema>;