import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { curriculo_texto } = await req.json();

    if (!curriculo_texto) {
      return new Response(
        JSON.stringify({ error: 'CV text is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const system = `Você recebe um CURRÍCULO em texto (sem vaga). Extraia informações de forma ESTRUTURADA, sem opinar, sem avaliar. 
Saída: estritamente JSON no schema abaixo. Não inclua comentários ou texto fora do JSON.

Schema:
{
  "candidate": {
    "name": "string|null",
    "contacts": {"email": "string|null", "phone": "string|null", "location": "string|null", "links": ["string"]},
    "experiences": [
      {
        "title": "string",
        "company": "string|null",
        "period": {"start":"YYYY-MM|YYYY|null", "end":"YYYY-MM|YYYY|null", "current": true|false},
        "bullets": ["string"] 
      }
    ],
    "skills": ["string"],
    "education": ["string"],
    "certs": ["string"]
  }
}
Regras:
- Datas: detectar mês/ano quando possível (YYYY-MM). Se só ano, use YYYY.
- Bullets: 1–6 por experiência, manter verbos e números de impacto.
- Não invente dados. Campos desconhecidos = null ou [].`;

    const user = `[CURRÍCULO]\n${curriculo_texto}`;

    console.log('🔍 Extraindo estrutura do CV...');

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
        max_tokens: 1200,
      }),
    });

    const data = await response.json();
    console.log('✅ Extração concluída');

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

    const extractedContent = data.choices[0].message.content;
    
    try {
      const cvStruct = JSON.parse(extractedContent);
      
      return new Response(
        JSON.stringify({ cv_struct: cvStruct }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar resposta da IA' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Erro na função extract-cv:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});