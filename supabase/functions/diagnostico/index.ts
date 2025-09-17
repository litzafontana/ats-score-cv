import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

// ===================== CORS =====================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===================== TYPES =====================
interface DiagnosticInput {
  email: string;
  cv_content: string;
  job_description: string; // pode ser texto OU URL
}

interface ResultadoParcial {
  nota_ats: number;
  alertas_top2: Array<{
    tipo: string;
    titulo: string;
    descricao: string;
    impacto: string;
    sugestao: string;
  }>;
  resumo_rapido: string;
  json_result_rich?: any;
}

// ===================== HELPERS =====================
function truncate(str: string, max = 15000): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) : str;
}

function isLikelyUrl(s: string) {
  try { const u = new URL(s); return !!u.protocol && !!u.hostname; } catch { return false; }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function scrapeJobPage(src: string): Promise<{ text: string; ok: boolean }> {
  try {
    const res = await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({ urlOrText: src })
    });
    
    if (!res.ok) return { text: "", ok: false };
    
    const result = await res.json();
    return { text: result.text || "", ok: result.ok || false };
  } catch (error) {
    console.error('Erro no scraping:', error);
    return { text: "", ok: false };
  }
}

function uniq(arr: string[] = []): string[] {
  return Array.from(new Set(arr.map(s => (s || "").trim()).filter(Boolean)));
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// valida e corrige o JSON do modelo
function validateAndRepair(json: any) {
  if (!json || typeof json !== "object") throw new Error("JSON vazio/ inválido");

  const cat = json.categorias || {};
  const ensureCat = (name: string, max: number) => {
    cat[name] = cat[name] || {};
    cat[name].pontuacao_local = clamp(Number(cat[name].pontuacao_local ?? 0), 0, max);
    const listFields: Record<string, boolean> = {
      evidencias: true, faltantes: true, presentes: true, ausentes: true, riscos: true
    };
    Object.keys(listFields).forEach(k => {
      if (cat[name][k] != null) cat[name][k] = uniq(cat[name][k]);
    });
    if (name === "resultados_impacto") {
      cat[name].tem_metricas = Boolean(cat[name]?.tem_metricas);
    }
  };

  ensureCat("experiencia_alinhada", 30);
  ensureCat("competencias_tecnicas", 25);
  ensureCat("palavras_chave", 15);
  ensureCat("resultados_impacto", 10);
  ensureCat("formacao_certificacoes", 10);
  ensureCat("formatacao_ats", 10);

  json.categorias = cat;

  const soma =
    cat.experiencia_alinhada.pontuacao_local +
    cat.competencias_tecnicas.pontuacao_local +
    cat.palavras_chave.pontuacao_local +
    cat.resultados_impacto.pontuacao_local +
    cat.formacao_certificacoes.pontuacao_local +
    cat.formatacao_ats.pontuacao_local;

  json.nota_final = clamp(soma, 0, 100);

  json.alertas = uniq(json.alertas || []);
  if (Array.isArray(json.acoes_prioritarias)) {
    json.acoes_prioritarias = json.acoes_prioritarias.map((a: any) => ({
      titulo: String(a?.titulo || "").trim(),
      como_fazer: String(a?.como_fazer || "").trim(),
      ganho_estimado_pontos: clamp(Number(a?.ganho_estimado_pontos ?? 0), 0, 30)
    }));
  } else {
    json.acoes_prioritarias = [];
  }
  json.frases_prontas = uniq(json.frases_prontas || []);

  json.perfil_detectado = json.perfil_detectado || {};
  json.perfil_detectado.cargos = uniq(json.perfil_detectado.cargos || []);
  json.perfil_detectado.ferramentas = uniq(json.perfil_detectado.ferramentas || []);
  json.perfil_detectado.dominios = uniq(json.perfil_detectado.dominios || []);

  if (typeof json.descricao_vaga_invalida !== "boolean") {
    json.descricao_vaga_invalida = false;
  }

  return json;
}

// ===================== HANDLER HTTP =====================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: DiagnosticInput = await req.json();
    const { email, cv_content, job_description } = body;

    if (!email || !cv_content || !job_description) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, cv_content, job_description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (cv_content.length < 50 || job_description.length < 50) {
      return new Response(
        JSON.stringify({ error: 'CV e descrição da vaga devem ter pelo menos 50 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emailLowercase = email.toLowerCase().trim();
    let { data: usuarioGratuito } = await supabase
      .from('usuarios_gratuitos')
      .select('*')
      .eq('email', emailLowercase)
      .maybeSingle();

    if (!usuarioGratuito) {
      const { data: novoUsuario } = await supabase
        .from('usuarios_gratuitos')
        .insert({ email: emailLowercase, analises_realizadas: 0, analises_limite: 2 })
        .select()
        .single();
      usuarioGratuito = novoUsuario;
    }

    const podeAnaliseGratuita = usuarioGratuito.analises_realizadas < usuarioGratuito.analises_limite;
    let resultadoParcial: ResultadoParcial;

    if (podeAnaliseGratuita) {
      resultadoParcial = await executarAnaliseReal({ email, cv_content, job_description });
      await supabase.from('usuarios_gratuitos')
        .update({ analises_realizadas: usuarioGratuito.analises_realizadas + 1 })
        .eq('id', usuarioGratuito.id);
    } else {
      resultadoParcial = await executarAnaliseSimulada({ email, cv_content, job_description });
    }

    const { data: diagnostico } = await supabase
      .from('diagnosticos')
      .insert({
        email: emailLowercase,
        cv_content: truncate(cv_content, 25000).trim(),
        job_description: truncate(job_description, 20000).trim(),
        nota_ats: resultadoParcial.nota_ats,
        alertas_top2: resultadoParcial.alertas_top2,
        json_result_rich: resultadoParcial.json_result_rich,
        pago: false
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        id: diagnostico.id,
        nota_ats: resultadoParcial.nota_ats,
        alertas_top2: resultadoParcial.alertas_top2,
        resumo_rapido: resultadoParcial.resumo_rapido,
        created_at: diagnostico.created_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ===================== ANALISE SIMULADA =====================
async function executarAnaliseSimulada(input: DiagnosticInput): Promise<ResultadoParcial> {
  await new Promise(r => setTimeout(r, 1000));
  const nota = Math.floor(Math.random() * 30) + 65;

  const alertas = [
    {
      tipo: "critico",
      titulo: "Limite de análises gratuitas atingido",
      descricao: "Você já utilizou suas 2 análises robustas gratuitas. Esta é uma análise básica com feedback limitado.",
      impacto: "Análise limitada não inclui recomendações completas",
      sugestao: "Para análise detalhada, considere o upgrade premium"
    }
  ];

  return {
    nota_ats: nota,
    alertas_top2: alertas,
    resumo_rapido: "Esta é uma análise básica. Para recomendações detalhadas, faça o upgrade premium."
  };
}

// ===================== ANALISE REAL =====================
async function executarAnaliseReal(input: DiagnosticInput): Promise<ResultadoParcial> {
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIKey) throw new Error('Chave da OpenAI não configurada');

  let vagaTexto = input.job_description;
  let descricaoVagaInvalida = false;
  if (isLikelyUrl(input.job_description)) {
    const { text, ok } = await scrapeJobPage(input.job_description);
    if (ok && text.length > 200) vagaTexto = text;
    else descricaoVagaInvalida = true;
  }

  const cvTxt = truncate(input.cv_content, 20000);
  const vagaTxt = truncate(vagaTexto, 18000);

  const systemMsg = `
Você é um avaliador ATS especialista em triagem de currículos.
Responda SEMPRE em JSON válido estrito, sem texto fora do objeto.
A nota_final deve ser a soma exata das seis categorias.
Todos os inteiros devem respeitar os limites de cada categoria.
`;

  const userPrompt = `
Você receberá:
1) DESCRICAO_DA_VAGA
2) CURRICULO

### Categorias e limites
1) experiencia_alinhada (0–30)
2) competencias_tecnicas (0–25)
3) palavras_chave (0–15)
4) resultados_impacto (0–10)
5) formacao_certificacoes (0–10)
6) formatacao_ats (0–10)

### Instruções
- Extraia 10–20 keywords da vaga (hard/soft).
- Para cada categoria, gere "pontuacao_local" e "evidencias".
- Gere 2–4 "alertas".
- Gere 3–5 "acoes_prioritarias".
- Gere 1–5 "frases_prontas".
- Detecte "perfil_detectado".
- Se a vaga veio por link e não foi possível extrair, use "descricao_vaga_invalida": true.

### Critérios específicos para formatação_ats
- Avaliar clareza estrutural: seções bem definidas.
- Avaliar legibilidade técnica: texto puro, bullets simples, sem tabelas complexas.
- Avaliar eficiência de mercado: currículos muito longos (>4 páginas) devem ser penalizados.
- Evidencias: listar aspectos positivos.
- Riscos: listar problemas (ex.: "Currículo com 6 páginas").
- Se houver riscos relevantes, a nota não pode ser 10/10.

---

DESCRICAO_DA_VAGA:
${vagaTxt}

CURRICULO:
${cvTxt}

\`\`\`json
{
  "nota_final": <int 0-100>,
  "descricao_vaga_invalida": true|false,
  "alertas": ["..."],
  "categorias": {
    "experiencia_alinhada": { "pontuacao_local": <0-30>, "evidencias": ["..."] },
    "competencias_tecnicas": { "pontuacao_local": <0-25>, "faltantes": ["..."], "evidencias": ["..."] },
    "palavras_chave": { "pontuacao_local": <0-15>, "presentes": ["..."], "ausentes": ["..."] },
    "resultados_impacto": { "pontuacao_local": <0-10>, "evidencias": ["..."], "tem_metricas": true|false },
    "formacao_certificacoes": { "pontuacao_local": <0-10>, "evidencias": ["..."] },
    "formatacao_ats": { "pontuacao_local": <0-10>, "evidencias": ["..."], "riscos": ["..."] }
  },
  "acoes_prioritarias": [
    { "titulo": "...", "como_fazer": "...", "ganho_estimado_pontos": <int> }
  ],
  "frases_prontas": ["..."],
  "perfil_detectado": { "cargos": ["..."], "ferramentas": ["..."], "dominios": ["..."] }
}
\`\`\`
`;

  const payload = {
    model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 2200,
    response_format: { type: "json_object" }
  };

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json();
  const rawJson = data?.choices?.[0]?.message?.content ?? "";
  const analiseRica = JSON.parse(rawJson);
  if (descricaoVagaInvalida) analiseRica.descricao_vaga_invalida = true;

  const validado = validateAndRepair(analiseRica);
  const alertasLegacy = (validado.alertas || []).slice(0, 2).map((a: string) => ({
    tipo: "critico",
    titulo: "Ponto de Melhoria Identificado",
    descricao: a,
    impacto: "Pode reduzir significativamente suas chances",
    sugestao: "Revise e ajuste conforme recomendações"
  }));

  return {
    nota_ats: validado.nota_final,
    alertas_top2: alertasLegacy,
    resumo_rapido: `Análise concluída com ${validado.nota_final} pontos.`,
    json_result_rich: validado
  };
}
