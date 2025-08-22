import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inline report generation function (can't import from src in edge function)
function buildMarkdown(resultado: any) {
  const c = resultado.categorias;
  const md = [] as string[];
  md.push(`# Resultado da Análise ATS`);
  md.push(`\n## Pontuação Geral`);
  md.push(`A pontuação geral do candidato é **${resultado.nota_final}**.`);

  md.push(`\n## 1) Experiência Alinhada`);
  md.push(`**Pontuação:** ${c.experiencia_alinhada.pontuacao_local}/30`);
  if (c.experiencia_alinhada.evidencias?.length) {
    md.push(`Evidências:`);
    c.experiencia_alinhada.evidencias.forEach((e: string) => md.push(`- ${e}`));
  }

  md.push(`\n## 2) Competências Técnicas`);
  md.push(`**Pontuação:** ${c.competencias_tecnicas.pontuacao_local}/25`);
  if (c.competencias_tecnicas.faltantes?.length) {
    md.push(`Faltantes: ${c.competencias_tecnicas.faltantes.join(", ")}`);
  }

  md.push(`\n## 3) Palavras‑chave`);
  md.push(`**Pontuação:** ${c.palavras_chave.pontuacao_local}/15`);
  if (c.palavras_chave.presentes?.length)
    md.push(`Presentes: ${c.palavras_chave.presentes.join(", ")}`);
  if (c.palavras_chave.ausentes?.length)
    md.push(`Ausentes: ${c.palavras_chave.ausentes.join(", ")}`);

  md.push(`\n## 4) Resultados/Impacto`);
  md.push(`**Pontuação:** ${c.resultados_impacto.pontuacao_local}/10`);
  if (c.resultados_impacto.evidencias?.length) {
    md.push(`Evidências:`);
    c.resultados_impacto.evidencias.forEach((e: string) => md.push(`- ${e}`));
  }

  md.push(`\n## 5) Formação/Certificações`);
  md.push(`**Pontuação:** ${c.formacao_certificacoes.pontuacao_local}/10`);
  c.formacao_certificacoes.evidencias?.forEach((e: string) => md.push(`- ${e}`));

  md.push(`\n## 6) Formatação ATS`);
  md.push(`**Pontuação:** ${c.formatacao_ats.pontuacao_local}/10`);
  if (c.formatacao_ats.riscos?.length) md.push(`Riscos: ${c.formatacao_ats.riscos.join(", ")}`);

  md.push(`\n## Ações Prioritárias (com ganho estimado)`);
  resultado.acoes_prioritarias.forEach((a: any, i: number) => {
    md.push(`${i+1}. **${a.titulo}** — Ganho estimado: ${a.ganho_estimado_pontos} pontos.`);
    md.push(`   Como fazer: ${a.como_fazer}`);
  });

  if (resultado.frases_prontas?.length) {
    md.push(`\n## Frases prontas para colar`);
    resultado.frases_prontas.forEach((f: string) => md.push(`- ${f}`));
  }

  const p = resultado.perfil_detectado;
  md.push(`\n## Perfil Detectado`);
  md.push(`Cargos: ${p.cargos.join(", ") || "—"}`);
  md.push(`Ferramentas: ${p.ferramentas.join(", ") || "—"}`);
  md.push(`Domínios: ${p.dominios.join(", ") || "—"}`);

  return md.join("\n");
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const diagnosticoId = url.pathname.split('/').pop();
    
    if (!diagnosticoId) {
      return new Response(JSON.stringify({ error: 'ID do diagnóstico não fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get diagnostic data
    const { data: diagnostico, error } = await supabase
      .from('diagnosticos')
      .select('*')
      .eq('id', diagnosticoId)
      .single();

    if (error || !diagnostico) {
      console.error('Erro ao buscar diagnóstico:', error);
      return new Response(JSON.stringify({ error: 'Diagnóstico não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!diagnostico.pago) {
      return new Response(JSON.stringify({ error: 'Acesso negado - versão premium necessária' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let markdownContent = '';

    // Try to get rich result first, fallback to legacy
    if (diagnostico.json_result_rich) {
      markdownContent = buildMarkdown(diagnostico.json_result_rich);
    } else if (diagnostico.resultado_completo) {
      markdownContent = `# Resultado da Análise ATS\n\nPontuação: ${diagnostico.nota_ats}\n\n${JSON.stringify(diagnostico.resultado_completo, null, 2)}`;
    } else {
      markdownContent = `# Resultado da Análise ATS\n\nPontuação: ${diagnostico.nota_ats}\n\nRelatório não disponível.`;
    }

    // Simple HTML template for PDF generation
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório ATS - ${diagnostico.email}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
            h1 { color: #2563eb; }
            h2 { color: #1e40af; margin-top: 30px; }
            pre { background: #f3f4f6; padding: 15px; border-radius: 5px; }
            .score { font-size: 24px; font-weight: bold; color: #059669; }
            .date { color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="date">Gerado em: ${new Date().toLocaleDateString('pt-BR')}</div>
          ${markdownContent.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </body>
      </html>
    `;

    // For now, return HTML content that can be used with browser print
    // In production, you would integrate with a PDF generation service
    return new Response(htmlContent, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="relatorio-ats-${diagnosticoId}.html"`
      },
    });

  } catch (error) {
    console.error('Erro na geração de PDF:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});