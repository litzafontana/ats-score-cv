import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  diagnostico_id: string;
  email?: string;
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
    console.log('💳 Iniciando processo de checkout...');

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const { diagnostico_id, email } = body;

    if (!diagnostico_id) {
      return new Response(
        JSON.stringify({ error: 'ID do diagnóstico é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify diagnostic exists
    const { data: diagnostico, error: diagnosticError } = await supabase
      .from('diagnosticos')
      .select('id, email, pago')
      .eq('id', diagnostico_id)
      .single();

    if (diagnosticError || !diagnostico) {
      console.error('❌ Diagnóstico não encontrado:', diagnosticError);
      return new Response(
        JSON.stringify({ error: 'Diagnóstico não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already paid
    if (diagnostico.pago) {
      return new Response(
        JSON.stringify({ 
          error: 'Este diagnóstico já foi pago',
          redirect_url: `/resultado/${diagnostico_id}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💰 Criando registro de pagamento...');

    // Create payment record
    const { data: pagamento, error: paymentError } = await supabase
      .from('pagamentos')
      .insert({
        diagnostico_id: diagnostico_id,
        valor_centavos: 2990, // R$ 29,90
        moeda: 'brl',
        status: 'pending',
        external_id: `checkout_${diagnostico_id}_${Date.now()}`
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Erro ao criar pagamento:', paymentError);
      throw new Error('Falha ao criar registro de pagamento');
    }

    // TODO: Replace with actual Stripe integration when ready
    // For now, return a mock checkout URL
    const checkoutUrl = createMockCheckoutUrl(diagnostico_id, pagamento.id);

    console.log('✅ Checkout criado com sucesso');

    return new Response(
      JSON.stringify({
        checkout_url: checkoutUrl,
        pagamento_id: pagamento.id,
        valor: 'R$ 29,90',
        status: 'pending'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro no checkout:', error);
    
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

// Create mock checkout URL (replace with Stripe when ready)
function createMockCheckoutUrl(diagnosticoId: string, pagamentoId: string): string {
  const baseUrl = Deno.env.get('APP_URL') || 'https://ats-score-cv.lovable.app';
  
  // For now, create a mock payment page
  // In production, this would be a Stripe checkout session URL
  return `${baseUrl}/pagamento?diagnostico=${diagnosticoId}&pagamento=${pagamentoId}&mock=true`;
}

// TODO: Implement real Stripe checkout when Stripe is configured
async function createStripeCheckout(diagnosticoId: string, email: string): Promise<string> {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  
  if (!stripeKey) {
    throw new Error('Stripe não configurado');
  }

  // Stripe checkout session creation would go here
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'brl',
      'line_items[0][price_data][product_data][name]': 'Análise ATS Completa',
      'line_items[0][price_data][unit_amount]': '2990',
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${Deno.env.get('APP_URL')}/resultado/${diagnosticoId}?paid=true`,
      'cancel_url': `${Deno.env.get('APP_URL')}/resultado/${diagnosticoId}`,
      'customer_email': email,
      'metadata[diagnostico_id]': diagnosticoId,
    }),
  });

  if (!response.ok) {
    throw new Error('Falha ao criar sessão de checkout');
  }

  const session = await response.json();
  return session.url;
}