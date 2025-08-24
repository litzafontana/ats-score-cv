import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função para extrair apenas JSON da resposta
function extractJsonFromResponse(raw: string): any {
  console.log('Raw response preview:', raw.substring(0, 200));
  
  // Remove markdown code blocks se presentes
  let cleanedResponse = raw;
  if (raw.includes('```json')) {
    cleanedResponse = raw.replace(/```json\s*/g, '').replace(/\s*```/g, '');
  }
  if (raw.includes('```')) {
    cleanedResponse = cleanedResponse.replace(/```[a-zA-Z]*\s*/g, '').replace(/\s*```/g, '');
  }
  
  const start = cleanedResponse.indexOf("{");
  if (start === -1) throw new Error("JSON não encontrado na resposta.");
  
  let depth = 0;
  let end = -1;
  for (let i = start; i < cleanedResponse.length; i++) {
    const c = cleanedResponse[i];
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
  
  const jsonStr = cleanedResponse.slice(start, end + 1);
  console.log('Extracted JSON preview:', jsonStr.substring(0, 200));
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON parse error:', e);
    console.error('JSON string that failed:', jsonStr.substring(0, 500));
    throw new Error("Falha ao parsear JSON: " + (e as Error).message);
  }
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

    const system = `Você é um avaliador ATS especialista em triagem de currículos. Receberá:
1) DESCRICAO_DA_VAGA (texto completo ou link)
2) CURRICULO (estrutura JSON extraída)

### Objetivo
Analisar a vaga e o currículo e retornar APENAS JSON válido no exato schema abaixo, com nota final (0–100) e breakdown em 6 categorias. Não escreva nada fora do JSON.

### Entrada da Vaga (DESCRICAO_DA_VAGA)
- Se for texto: use diretamente o conteúdo.
- Se for link: acesse a página e extraia somente as informações úteis: responsabilidades, atribuições, requisitos, competências, diferenciais, formação e certificações.
- Caso o link esteja indisponível ou não contenha informações relevantes, retorne "descricao_vaga_invalida": true no JSON, sem quebrar o schema.

### Mapeamento e Evidências
- Compare vaga vs CV em experiências, competências, palavras-chave, resultados, formação e formatação.
- Evidencias: sempre do CV, em bullets curtas e objetivas, citando onde foi encontrado (ex.: "TÜV Rheinland — Eng. Civil Pleno (mai/2024–abr/2025): definiu estratégia de manutenção PNR-47/48").
- Se faltar informação → listas vazias + pontuação proporcionalmente reduzida.

### Palavras-chave
- Extraia 10–20 keywords da vaga (hard/soft skills).
- Marque presentes (CV contém) e ausentes (CV não contém).
- Considere sinônimos/lemmas (ex.: "Python" ~ "pandas", "manutenção preditiva" ~ "predictive maintenance").
- Ignore duplicatas.

### Escore e Limites
Categorias obrigatórias e pesos:
1. experiencia_alinhada (0–30)
2. competencias_tecnicas (0–25)
3. palavras_chave (0–15)
4. resultados_impacto (0–10)
5. formacao_certificacoes (0–10)
6. formatacao_ats (0–10)

Regras:
- pontuacao_local deve respeitar o teto de cada categoria.
- nota_final = soma das seis categorias (0–100).
- Apenas inteiros.
- Seção sem dados = pontuação 0.

### Alertas e Ações
- Gerar 2–4 alertas técnicos de alto impacto (ex.: "Falta palavra-chave obrigatória", "Datas inconsistentes").
- Gerar 3–5 acoes_prioritarias com { "titulo", "como_fazer", "ganho_estimado_pontos" }.
- Gerar 1–5 frases_prontas (bullets prontos para colar no CV, sempre com verbo de ação + números quando possível).

### Perfil Detectado
Inferir:
- "cargos" (ex.: Engenheira de Manutenção, Coordenadora de Projetos)
- "ferramentas" (ex.: AutoCAD, Power BI, Python)
- "dominios" (ex.: Siderurgia, Mineração, Telecom)

### Validações finais obrigatórias
- A soma das pontuações = nota_final.
- Todas dentro dos limites.
- Arrays sem duplicatas.
- JSON bem-formado.
- Nada fora do JSON.

### Saída esperada — APENAS JSON:
{
  "nota_final": <int 0-100>,
  "descricao_vaga_invalida": false,
  "alertas": ["..."],
  "categorias": {
    "experiencia_alinhada": { "pontuacao_local": <0-30>, "evidencias": ["..."] },
    "competencias_tecnicas": { "pontuacao_local": <0-25>, "faltantes": ["..."], "evidencias": ["..."] },
    "palavras_chave": { "pontuacao_local": <0-15>, "presentes": ["..."], "ausentes": ["..."] },
    "resultados_impacto": { "pontuacao_local": <0-10>, "evidencias": ["..."], "tem_metricas": true },
    "formacao_certificacoes": { "pontuacao_local": <0-10>, "evidencias": ["..."] },
    "formatacao_ats": { "pontuacao_local": <0-10>, "evidencias": ["..."], "riscos": ["..."] }
  },
  "acoes_prioritarias": [
    { "titulo": "...", "como_fazer": "...", "ganho_estimado_pontos": <int> }
  ],
  "frases_prontas": ["..."],
  "perfil_detectado": { "cargos": ["..."], "ferramentas": ["..."], "dominios": ["..."] }
}`;

    const user = `[VAGA]\n${vaga_texto}\n\n[OBJETO_CV] (JSON da etapa de extração)\n${JSON.stringify(cv_struct)}`;

    console.log('🔍 Analisando compatibilidade ATS...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_completion_tokens: 2000,
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
      const ats_json = extractJsonFromResponse(rawResponse);
      
      // Validar que a soma das pontuações = nota_final
      if (ats_json.categorias) {
        const somaCalculada = Object.values(ats_json.categorias).reduce((sum: number, cat: any) => sum + (cat.pontuacao_local || 0), 0);
        if (somaCalculada !== ats_json.nota_final) {
          console.warn(`⚠️ Soma das categorias (${somaCalculada}) ≠ nota_final (${ats_json.nota_final}). Corrigindo...`);
          ats_json.nota_final = somaCalculada;
        }
      }
      
      return new Response(
        JSON.stringify({ 
          ats_json,
          ats_report_md: "", // Não geramos mais markdown separado
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