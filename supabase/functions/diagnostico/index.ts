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

// ===================== HELPERS (acima do serve) =====================
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
    const res = await fetch(src, {
      headers: {
        "User-Agent": "Mozilla/5.0 ATS-Evaluator/1.0",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    });
    if (!res.ok) return { text: "", ok: false };
    const html = await res.text();
    const text = stripHtml(html);
    // tenta iniciar no bloco mais relevante
    const rx = /(responsabilid|requisitos|atividad|qualific|requirements|duties|about the role)/i;
    const idx = text.search(rx);
    const sliced = idx > -1 ? text.slice(idx) : text;
    return { text: truncate(sliced, 18000), ok: true };
  } catch {
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

// valida e corrige o JSON do modelo para sempre entregar algo consistente
function validateAndRepair(json: any) {
  if (!json || typeof json !== "object") throw new Error("JSON vazio/ inválido");

  const cat = json.categorias || {};
  const ensureCat = (name: string, max: number) => {
    cat[name] = cat[name] || {};
    cat[name].pontuacao_local = clamp(Number(cat[name].pontuacao_local ?? 0), 0, max);
    // listas
    const listFields: Record<string, boolean> = {
      evidencias: true, faltantes: true, presentes: true, ausentes: true, riscos: true
    };
    Object.keys(listFields).forEach(k => {
      if (cat[name][k] != null) cat[name][k] = uniq(cat[name][k]);
    });
    // flags
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

  // força a nota a ser exatamente a soma das categorias
  json.nota_final = clamp(soma, 0, 100);

  // arrays raiz
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

  // perfil
  json.perfil_detectado = json.perfil_detectado || {};
  json.perfil_detectado.cargos = uniq(json.perfil_detectado.cargos || []);
  json.perfil_detectado.ferramentas = uniq(json.perfil_detectado.ferramentas || []);
  json.perfil_detectado.dominios = uniq(json.perfil_detectado.dominios || []);

  // flag extra para quando a vaga por link não foi legível
  if (typeof json.descricao_vaga_invalida !== "boolean") {
    json.descricao_vaga_invalida = false;
  }

  return json;
}

// ===================== HANDLER HTTP =====================
serve(async (req) => {
  // CORS preflight
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
    console.log('🚀 Iniciando diagnóstico...');

    // Parse request body
    const body: DiagnosticInput = await req.json();
    const { email, cv_content, job_description } = body;

    // Validate input
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('📊 Executando análise ATS...');

    // Execução real da análise (com scraping, validação etc.)
    const resultadoParcial = await executarAnaliseReal({
      email,
      cv_content,
      job_description
    });

    console.log('💾 Salvando diagnóstico no banco...');

    // Sanitiza para banco
    const cvToSave = truncate(cv_content, 25000);
    const jdToSave = truncate(job_description, 20000);

    const { data: diagnostico, error: dbError } = await supabase
      .from('diagnosticos')
      .insert({
        email: email.toLowerCase().trim(),
        cv_content: cvToSave.trim(),
        job_description: jdToSave.trim(),
        nota_ats: resultadoParcial.nota_ats,
        alertas_top2: resultadoParcial.alertas_top2,
        json_result_rich: resultadoParcial.json_result_rich,
        pago: false,
        user_id: null
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Erro ao salvar diagnóstico:', dbError);
      throw new Error('Falha ao salvar diagnóstico');
    }

    console.log('✅ Diagnóstico criado com sucesso:', diagnostico.id);

    // Return partial result with diagnostic ID
    return new Response(
      JSON.stringify({
        id: diagnostico.id,
        nota_ats: resultadoParcial.nota_ats,
        alertas_top2: resultadoParcial.alertas_top2,
        resumo_rapido: resultadoParcial.resumo_rapido,
        created_at: diagnostico.created_at
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);

    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor. Tente novamente em alguns instantes.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ===================== ANALISE SIMULADA (fallback) =====================
async function executarAnaliseSimulada(input: DiagnosticInput): Promise<ResultadoParcial> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const nota = Math.floor(Math.random() * 40) + 60; // 60-100

  const alertas = [
    {
      tipo: "critico",
      titulo: "Falta de palavras-chave",
      descricao: "Seu CV não contém palavras-chave importantes da vaga",
      impacto: "Reduz significativamente as chances de passar pelo filtro ATS",
      sugestao: "Inclua termos específicos da área e da vaga no seu CV"
    },
    {
      tipo: "importante",
      titulo: "Formatação inadequada",
      descricao: "A formatação pode dificultar a leitura pelos sistemas ATS",
      impacto: "Informações importantes podem não ser identificadas",
      sugestao: "Use formatação simples, sem tabelas ou gráficos complexos"
    }
  ];

  return {
    nota_ats: nota,
    alertas_top2: alertas,
    resumo_rapido: "Seu CV possui boa estrutura geral, mas precisa de ajustes nas palavras-chave e formatação para melhor performance em sistemas ATS. A análise completa revelará pontos específicos de melhoria."
  };
}

// ===================== ANALISE REAL (robusta) =====================
async function executarAnaliseReal(input: DiagnosticInput): Promise<ResultadoParcial> {
  console.log('Executando análise real com OpenAI...');

  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIKey) {
    throw new Error('Chave da OpenAI não configurada');
  }

  // 1) Se job_description for link, tenta extrair texto da página
  let vagaTexto = input.job_description;
  let descricaoVagaInvalida = false;
  if (isLikelyUrl(input.job_description)) {
    console.log("🔎 Detectado link da vaga. Tentando extrair conteúdo...");
    const { text, ok } = await scrapeJobPage(input.job_description);
    if (ok && text.length > 200) {
      vagaTexto = text;
    } else {
      descricaoVagaInvalida = true;
      console.warn("⚠️ Falha ao extrair a vaga por link; seguindo com texto original.");
    }
  }

  // 2) Sanitiza e limita tamanho
  const cvTxt = truncate(input.cv_content, 20000);
  const vagaTxt = truncate(vagaTexto, 18000);

  // 3) Mensagens e payload com response_format JSON
  const systemMsg = [
    "Você é um avaliador ATS especialista em triagem de currículos.",
    "Responda SEMPRE em JSON válido estrito, sem texto fora do objeto.",
    "nota_final deve ser a soma exata das seis pontuações por categoria.",
    "Todos os inteiros devem respeitar os limites por categoria."
  ].join(" ");

  const userPrompt = `
Você receberá:
1) DESCRICAO_DA_VAGA (texto já extraído; se link falhou, o campo será curto)
2) CURRICULO (texto plano extraído do PDF/DOCX)

Objetivo: analisar e retornar APENAS JSON válido no schema abaixo, com nota final (0–100) = soma das 6 categorias.

Categorias e limites:
1) experiencia_alinhada (0–30)
2) competencias_tecnicas (0–25)
3) palavras_chave (0–15)
4) resultados_impacto (0–10)
5) formacao_certificacoes (0–10)
6) formatacao_ats (0–10)

Instruções:
- Extraia 10–20 keywords da vaga (hard/soft). Marque presentes/ausentes no CV.
- Para cada categoria, gere "pontuacao_local" e "evidencias" (bullets curtas e concretas do CV).
- Gere 2–4 "alertas" técnicos de alto impacto.
- Gere 3–5 "acoes_prioritarias" ({ "titulo", "como_fazer", "ganho_estimado_pontos" }).
- Gere 1–5 "frases_prontas" (bullets prontos de CV com verbos de ação e números quando possível).
- Detecte "perfil_detectado" ({ "cargos", "ferramentas", "dominios" }).
- Se a vaga veio por link e não foi possível extrair conteúdo útil, use "descricao_vaga_invalida": true, mas mantenha o schema.

DESCRICAO_DA_VAGA (texto):
${vagaTxt}

CURRICULO (texto):
${cvTxt}

Responda APENAS com JSON no formato:
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

  async function callOnce() {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const errTxt = await r.text().catch(() => String(r.status));
      throw new Error(`OpenAI HTTP ${r.status}: ${errTxt}`);
    }
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    return raw;
  }

  // 4) retries com backoff leve
  let rawJson = "";
  const maxRetries = 2;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      rawJson = await callOnce();
      break;
    } catch (e) {
      if (i === maxRetries) throw e;
      await new Promise(res => setTimeout(res, 600 * (i + 1)));
    }
  }

  // 5) parse + validação/correção
  let analiseRica: any;
  try {
    analiseRica = JSON.parse(rawJson);
  } catch {
    const match = rawJson.match(/\{[\s\S]*\}$/);
    if (!match) throw new Error("Resposta da OpenAI não pôde ser parseada como JSON");
    analiseRica = JSON.parse(match[0]);
  }

  if (descricaoVagaInvalida) {
    analiseRica.descricao_vaga_invalida = true;
  }

  const validado = validateAndRepair(analiseRica);
  console.log('✅ Análise validada:', validado);

  const alertasLegacy = (validado.alertas || []).slice(0, 2).map((a: string) => ({
    tipo: "critico",
    titulo: "Ponto de Melhoria Identificado",
    descricao: a,
    impacto: "Pode reduzir significativamente suas chances de aprovação",
    sugestao: "Revise e ajuste conforme as recomendações detalhadas"
  }));

  return {
    nota_ats: validado.nota_final,
    alertas_top2: alertasLegacy,
    resumo_rapido: `Análise concluída com ${validado.nota_final} pontos. ${validado.acoes_prioritarias?.length || 0} ações prioritárias identificadas.`,
    json_result_rich: validado
  };
}
