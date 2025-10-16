import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

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
    const { storage_path, mime_type } = await req.json();

    if (!storage_path || !mime_type) {
      return new Response(
        JSON.stringify({ error: 'storage_path e mime_type são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📄 Extraindo arquivo:', { storage_path, mime_type });

    // Inicializar cliente Supabase com service_role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Baixar arquivo do Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cv-uploads')
      .download(storage_path);

    if (downloadError || !fileData) {
      console.error('❌ Erro ao baixar arquivo:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Arquivo não encontrado no storage' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Arquivo baixado, tamanho:', fileData.size);

    // Extrair texto baseado no tipo
    let extractedText = '';

    if (mime_type === 'application/pdf') {
      // Para PDF: usar pdfjs-dist (método principal) com fallback para pdf-parse
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Método 1: pdfjs-dist (mais robusto para PDFs complexos)
        let extractedPdfText = '';
        try {
          const pdfjsLib = await import('npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs');
          const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            isEvalSupported: false,
            disableFontFace: true,
            useWorkerFetch: false
          });
          const pdf = await loadingTask.promise;
          console.log('📄 PDF possui', pdf.numPages, 'páginas');

          const textParts: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item?.str || '').join(' ');
            textParts.push(pageText);
            if (i <= 3) {
              console.log(`🧩 Página ${i}: ${pageText.length} caracteres`);
            }
          }
          
          extractedPdfText = textParts.join('\n');
          console.log('✅ pdfjs-dist extraiu:', extractedPdfText.length, 'caracteres (bruto)');
        } catch (pdfjsError) {
          console.warn('⚠️ pdfjs-dist falhou:', pdfjsError);
        }

        // Normalizar texto: remover caracteres de controle, múltiplos espaços
        const normalizeText = (text: string): string => {
          return text
            .replace(/[^\x20-\x7E\n\r\t\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, ' ') // Remove caracteres não imprimíveis
            .replace(/\s+/g, ' ') // Múltiplos espaços -> um espaço
            .trim();
        };

        extractedPdfText = normalizeText(extractedPdfText);
        console.log('📊 Texto normalizado:', extractedPdfText.length, 'caracteres');
        console.log('📝 Preview:', extractedPdfText.substring(0, 200));

        // Fallback: se resultado insuficiente, tentar pdf-parse
        if (extractedPdfText.length < 50) {
          console.log('⚠️ Tentando fallback com pdf-parse...');
          try {
            const pdfParse = (await import('npm:pdf-parse@1.1.1')).default;
            const pdfData = await pdfParse(uint8Array);
            const fallbackText = normalizeText(pdfData.text || '');
            console.log('📊 pdf-parse extraiu:', fallbackText.length, 'caracteres');
            
            // Usar o maior resultado
            if (fallbackText.length > extractedPdfText.length) {
              extractedPdfText = fallbackText;
              console.log('✅ Usando resultado de pdf-parse (maior)');
            }
          } catch (parseError) {
            console.warn('⚠️ Fallback pdf-parse também falhou:', parseError);
          }
        }

        extractedText = extractedPdfText;
        console.log('✅ PDF extração final:', extractedText.length, 'caracteres');
        
      } catch (error) {
        console.error('❌ Erro ao extrair PDF:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao processar PDF',
            hint: 'Tente colar o texto manualmente',
            details: error.message
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
    } else if (
      mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime_type === 'application/docx'
    ) {
      // Para DOCX: usar mammoth
      try {
        const mammoth = (await import('npm:mammoth@1.6.0')).default;
        const arrayBuffer = await fileData.arrayBuffer();
        const result = await mammoth.extractRawText({ buffer: new Uint8Array(arrayBuffer) });
        
        // Normalizar texto
        extractedText = result.value
          .replace(/[^\x20-\x7E\n\r\t\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log('✅ DOCX extraído:', extractedText.length, 'caracteres');
        console.log('📝 Preview:', extractedText.substring(0, 200));
      } catch (error) {
        console.error('❌ Erro ao extrair DOCX:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao processar DOCX',
            hint: 'Tente colar o texto manualmente',
            details: error.message
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
    } else if (mime_type === 'application/msword' || mime_type === 'application/doc') {
      // DOC antigo - fallback para texto simples (limitado)
      try {
        const text = await fileData.text();
        extractedText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
        console.log('⚠️ DOC antigo extraído (qualidade limitada):', extractedText.length, 'caracteres');
      } catch (error) {
        console.error('❌ Erro ao extrair DOC:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao processar DOC',
            hint: 'Arquivos DOC antigos têm suporte limitado. Converta para PDF ou DOCX, ou cole o texto manualmente'
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
    } else {
      // Tipo não suportado
      console.error('❌ Tipo não suportado:', mime_type);
      return new Response(
        JSON.stringify({ 
          error: 'Formato não suportado',
          supported: ['PDF', 'DOCX', 'DOC'],
          received: mime_type
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação básica
    if (!extractedText || extractedText.trim().length < 50) {
      console.error('❌ Texto extraído insuficiente:', extractedText.length);
      
      const isSuspectedScannedPdf = mime_type === 'application/pdf' && extractedText.length < 200;
      
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível extrair texto suficiente do arquivo',
          hint: isSuspectedScannedPdf 
            ? 'Este PDF parece ser escaneado (somente imagens). Por favor, cole o texto do CV manualmente no campo de texto.' 
            : 'Verifique se o arquivo não está vazio ou corrompido. Tente colar o texto manualmente.',
          extracted_length: extractedText.length,
          suspected_scanned_pdf: isSuspectedScannedPdf,
          methods_tried: mime_type === 'application/pdf' ? ['pdfjs-dist', 'pdf-parse'] : ['mammoth']
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Extração completa: ${extractedText.length} caracteres`);

    // Limpar arquivo do storage após extração bem-sucedida (opcional)
    try {
      await supabase.storage.from('cv-uploads').remove([storage_path]);
      console.log('🗑️ Arquivo temporário removido do storage');
    } catch (cleanupError) {
      console.warn('⚠️ Não foi possível remover arquivo temporário:', cleanupError);
      // Não falhar por causa disso
    }

    return new Response(
      JSON.stringify({ 
        text: extractedText,
        length: extractedText.length,
        mime_type: mime_type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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