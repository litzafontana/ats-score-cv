import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildMarkdown } from "../../../src/lib/report.ts";

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