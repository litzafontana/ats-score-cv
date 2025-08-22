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
    const resultadoParcial = await executarAnaliseSimulada({ email, cv_content, job_description });

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

// Real OpenAI analysis function (to be implemented)
async function executarAnaliseReal(input: DiagnosticInput): Promise<ResultadoParcial> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  const prompt = `
Você é um especialista em ATS (Applicant Tracking System). Analise o CV considerando a vaga.

**CV:**
${input.cv_content}

**VAGA:**
${input.job_description}

Retorne APENAS um JSON válido com:
{
  "nota_ats": number (0-100),
  "alertas_top2": [
    {
      "tipo": "critico|importante|sugestao",
      "titulo": "string",
      "descricao": "string",
      "impacto": "string",
      "sugestao": "string"
    }
  ],
  "resumo_rapido": "string (máx 200 chars)"
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista em ATS. Retorne apenas JSON válido.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  
  return result;
}