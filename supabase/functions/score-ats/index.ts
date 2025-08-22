import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função para separar JSON do Markdown
function splitJsonAndMarkdown(raw: string): { json: any; markdown: string } {
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("JSON não encontrado no início da resposta.");
  
  let depth = 0;
  let end = -1;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error("JSON aparentemente incompleto.");
  
  const jsonStr = raw.slice(start, end + 1);
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error("Falha ao parsear JSON: " + (e as Error).message);
  }
  
  const markdown = raw.slice(end + 1).trim();
  return { json: parsed, markdown };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vaga_texto, cv_struct } = await req.json();

    if (!vaga_texto || !cv_struct) {
      return new Response(
        JSON.stringify({ error: 'Vaga e CV estruturado são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const system = `Você é um analista de recrutamento especializado em ATS. Compare o OBJETO_CV com a VAGA e produza:
1) um JSON seguindo EXATAMENTE o schema indicado; 
2) um RELATÓRIO em Markdown (após o JSON), usando as seções obrigatórias.

REGRAS GERAIS
- Cada item marcado como "presente" deve vir com EVIDÊNCIA literal (trecho do CV entre aspas). Se não houver, marque como "ausente" e proponha frase pronta.
- Use o RUBRIC e explique o porquê das notas.
- Recomendações devem ser acionáveis, com verbos e números (quanto/como/onde).
- Nada de conselhos vagos ("melhore…", "seja…"). Seja específico.

RUBRIC (0–100):
- Experiência alinhada (30)
- Competências técnicas/ferramentas (25)
- Palavras-chave da vaga (15)
- Resultados/impacto quantificável (10)
- Formação/Certificações (10)
- Formatação amigável ao ATS (5)
- Riscos/Lacunas (5)

SCHEMA JSON (saída #1):
{
  "overall_score": 0,
  "breakdown": {
    "experience_alignment": {"score": 0, "evidence": [""]},
    "tech_skills_tools": {"score": 0, "matched": [""] , "missing": [""]},
    "keywords": {"score": 0, "present": [""], "absent": [""]},
    "impact_results": {"score": 0, "evidence": [""]},
    "education_certs": {"score": 0, "evidence": [""]},
    "ats_formatting": {"score": 0, "issues": [""]},
    "risks_gaps": {"score": 0, "items": [""]}
  },
  "top_actions": [
    {"title": "", "why": "", "how_example": "", "est_impact_points": 0}
  ],
  "ready_to_paste_bullets": [
    "Ex.: • Aumentei a taxa de conversão em 23% ao redesenhar o fluxo de checkout (Figma, GA4, testes A/B)."
  ],
  "detected_entities": {
    "roles": ["UX Designer"],
    "tools": ["Figma","Jira","GA4"],
    "domains": ["OTT","Telecom"]
  },
  "errors": []
}

RELATÓRIO MARKDOWN (saída #2, após o JSON):
- Título: "Resultado da Análise ATS"
- Seções: Pontuação Geral; 1) Experiência Alinhada; 2) Competências Técnicas; 3) Palavras-chave; 4) Resultados/Impacto; 5) Formação/Certificações; 6) Formatação ATS; 7) Riscos/Lacunas; Ações Prioritárias (com ganho estimado); Frases prontas para colar.
- Em cada seção, referenciar evidências com trechos do CV entre aspas.
- Se a VAGA estiver vazia, retornar JSON com {"errors":["vaga_nao_fornecida"]} e não gerar relatório.

A PRIMEIRA parte da sua resposta DEVE ser um JSON válido seguindo o schema. Somente DEPOIS venha o relatório em Markdown.`;

    const user = `[VAGA]\n${vaga_texto}\n\n[OBJETO_CV] (JSON da etapa de extração)\n${JSON.stringify(cv_struct)}`;

    console.log('🔍 Analisando compatibilidade ATS...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.1,
        max_tokens: 1800,
        top_p: 0.9,
      }),
    });

    const data = await response.json();
    console.log('✅ Análise concluída');

    if (!response.ok) {
      console.error('Erro na API OpenAI:', data);
      return new Response(
        JSON.stringify({ error: 'Erro na análise de IA' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const rawResponse = data.choices[0].message.content;
    
    try {
      const { json: ats_json, markdown: ats_report_md } = splitJsonAndMarkdown(rawResponse);
      
      return new Response(
        JSON.stringify({ 
          ats_json,
          ats_report_md,
          cv_struct
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (parseError) {
      console.error('Erro ao parsear resposta:', parseError);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar resposta da IA' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Erro na função score-ats:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});