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