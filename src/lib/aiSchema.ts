import { z } from "zod";

// Esquema para input do diagnóstico
export const DiagnosticInputSchema = z.object({
  email: z.string().email("Email inválido"),
  cv_content: z.string().min(50, "CV deve ter pelo menos 50 caracteres"),
  job_description: z.string().min(50, "Descrição da vaga deve ter pelo menos 50 caracteres"),
});

// Esquema para alertas individuais
export const AlertaSchema = z.object({
  tipo: z.enum(["critico", "importante", "sugestao"]),
  titulo: z.string(),
  descricao: z.string(),
  impacto: z.string(),
  sugestao: z.string(),
});

// Esquema para seção do resultado
export const SecaoResultadoSchema = z.object({
  pontuacao: z.number().min(0).max(100),
  feedback: z.string(),
  pontos_fortes: z.array(z.string()),
  pontos_melhoria: z.array(z.string()),
});

// Esquema para resultado completo da análise
export const ResultadoCompletoSchema = z.object({
  nota_ats: z.number().min(0).max(100),
  resumo_geral: z.string(),
  alertas_todos: z.array(AlertaSchema),
  secoes: z.object({
    palavras_chave: SecaoResultadoSchema,
    formatacao: SecaoResultadoSchema,
    estrutura: SecaoResultadoSchema,
    experiencia: SecaoResultadoSchema,
    educacao: SecaoResultadoSchema,
    habilidades: SecaoResultadoSchema,
  }),
  recomendacoes_finais: z.array(z.string()),
  comparacao_vaga: z.object({
    compatibilidade: z.number().min(0).max(100),
    requisitos_atendidos: z.array(z.string()),
    requisitos_faltantes: z.array(z.string()),
  }),
});

// Esquema para resposta parcial (gratuita)
export const ResultadoParcialSchema = z.object({
  nota_ats: z.number().min(0).max(100),
  alertas_top2: z.array(AlertaSchema),
  resumo_rapido: z.string(),
});

export type DiagnosticInput = z.infer<typeof DiagnosticInputSchema>;
export type Alerta = z.infer<typeof AlertaSchema>;
export type SecaoResultado = z.infer<typeof SecaoResultadoSchema>;
export type ResultadoCompleto = z.infer<typeof ResultadoCompletoSchema>;
export type ResultadoParcial = z.infer<typeof ResultadoParcialSchema>;