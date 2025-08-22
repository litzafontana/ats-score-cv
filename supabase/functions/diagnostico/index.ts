import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface DiagnosticInput {
  email: string;
  cv_content: string;
  job_description: string;
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

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Simulate AI analysis (replace with real OpenAI call when ready)
    const resultadoParcial = await executarAnaliseReal({ email, cv_content, job_description });

    console.log('💾 Salvando diagnóstico no banco...');

    // Save to database
    const { data: diagnostico, error: dbError } = await supabase
      .from('diagnosticos')
      .insert({
        email: email.toLowerCase().trim(),
        cv_content: cv_content.trim(),
        job_description: job_description.trim(),
        nota_ats: resultadoParcial.nota_ats,
        alertas_top2: resultadoParcial.alertas_top2,
        json_result_rich: resultadoParcial.json_result_rich,
        pago: false,
        user_id: null // Will be updated when auth is implemented
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

// Simulated analysis function (replace with real AI when ready)
async function executarAnaliseSimulada(input: DiagnosticInput): Promise<ResultadoParcial> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

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

// Real OpenAI analysis function (implementado)
async function executarAnaliseReal(input: DiagnosticInput): Promise<ResultadoParcial> {
  console.log('Executando análise real com OpenAI...');
  
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIKey) {
    throw new Error('Chave da OpenAI não configurada');
  }

  try {
    // Novo prompt rico para análise detalhada
    const prompt = `Você é um avaliador ATS. Responda SOMENTE com JSON válido conforme o schema abaixo.

Tarefa: analisar DESCRICAO_DA_VAGA e CURRICULO e retornar a pontuação geral (0–100) e um breakdown em 6 categorias com evidências e recomendações.

Categorias e limites:
1) experiencia_alinhada (0–30)
2) competencias_tecnicas (0–25) 
3) palavras_chave (0–15)
4) resultados_impacto (0–10)
5) formacao_certificacoes (0–10)
6) formatacao_ats (0–10)

Instruções:
- Extraia 10–20 keywords da vaga (hard/soft) e marque as presentes/ausentes no CV.
- Para cada categoria, forneça pontuacao_local e evidencias (bullets curtas, concretas, do CV).
- Gere 2–4 alertas técnicos de alto impacto.
- Gere 3–5 acoes_prioritarias, cada uma com titulo, como_fazer e ganho_estimado_pontos.
- Gere 1–5 frases_prontas (bullet points prontos para colar no CV, com verbos de ação e números quando possível).
- Detecte perfil_detectado (cargos, ferramentas, dominios) com base no CV.

DESCRICAO_DA_VAGA:
${input.job_description}

CURRICULO:
${input.cv_content}

Retorne APENAS JSON no formato:
{
  "nota_final": <int 0-100>,
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

Valide internamente limites de cada pontuação. Não inclua texto fora do JSON.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em ATS (Applicant Tracking Systems) que analisa CVs. Responda sempre em JSON válido seguindo o schema fornecido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro da OpenAI:', errorData);
      throw new Error(`Erro da OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const analiseRica = JSON.parse(content);
    
    console.log('Análise rica gerada:', analiseRica);

    // Generate legacy format alerts for backward compatibility
    const alertasLegacy = analiseRica.alertas.slice(0, 2).map((alerta: string) => ({
      tipo: "critico",
      titulo: "Ponto de Melhoria Identificado",
      descricao: alerta,
      impacto: "Pode reduzir significativamente suas chances de aprovação",
      sugestao: "Revise e ajuste conforme as recomendações detalhadas"
    }));

    return {
      nota_ats: analiseRica.nota_final,
      alertas_top2: alertasLegacy,
      resumo_rapido: `Análise concluída com ${analiseRica.nota_final} pontos. ${analiseRica.acoes_prioritarias.length} ações prioritárias identificadas.`,
      json_result_rich: analiseRica
    };

  } catch (error) {
    console.error('Erro na análise real:', error);
    
    // Fallback para análise simulada se OpenAI falhar
    console.log('Fallback para análise simulada...');
    return await executarAnaliseSimulada(input);
  }
}