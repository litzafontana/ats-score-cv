import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('🔍 Buscando diagnóstico...');

    // Get diagnostic ID from URL
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID do diagnóstico é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch diagnostic from database
    const { data: diagnostico, error: dbError } = await supabase
      .from('diagnosticos')
      .select('*')
      .eq('id', id)
      .single();

    if (dbError || !diagnostico) {
      console.error('❌ Diagnóstico não encontrado:', dbError);
      return new Response(
        JSON.stringify({ error: 'Diagnóstico não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Diagnóstico encontrado - Pago: ${diagnostico.pago}`);

    // Check if it's paid to return full or partial result
    if (diagnostico.pago) {
      // Return full result
      const resultado = {
        id: diagnostico.id,
        email: diagnostico.email,
        nota_ats: diagnostico.nota_ats,
        resultado_completo: diagnostico.resultado_completo,
        created_at: diagnostico.created_at,
        updated_at: diagnostico.updated_at,
        pago: true
      };

      return new Response(
        JSON.stringify(resultado),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Return partial result only
      const resultado = {
        id: diagnostico.id,
        email: diagnostico.email,
        nota_ats: diagnostico.nota_ats,
        alertas_top2: diagnostico.alertas_top2,
        resumo_rapido: gerarResumoRapido(diagnostico.alertas_top2),
        created_at: diagnostico.created_at,
        pago: false,
        upgrade_available: true
      };

      return new Response(
        JSON.stringify(resultado),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Erro ao buscar diagnóstico:', error);
    
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

// Generate quick summary from top alerts
function gerarResumoRapido(alertas: any[]): string {
  if (!alertas || alertas.length === 0) {
    return "Seu CV foi analisado. Adquira a versão completa para ver todos os detalhes.";
  }

  const primeiroAlerta = alertas[0];
  return `${primeiroAlerta.titulo}: ${primeiroAlerta.descricao.substring(0, 100)}...`;
}