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
        
        // ========== VALIDAÇÕES ROBUSTAS ==========
        
        // 1) Validar Content-Type
        const contentType = fileData.type || '';
        console.log('📋 Content-Type recebido:', contentType);
        
        // 2) Validar magic bytes (%PDF-)
        const isPdfValid = (buffer: Uint8Array): boolean => {
          if (buffer.length < 5) return false;
          const header = new TextDecoder().decode(buffer.slice(0, 5));
          return header === '%PDF-';
        };
        
        if (!isPdfValid(uint8Array)) {
          console.error('❌ Arquivo não é um PDF válido (magic bytes incorretos)');
          return new Response(
            JSON.stringify({
              error: 'Arquivo corrompido ou inválido',
              hint: 'O arquivo não parece ser um PDF válido. Tente fazer upload novamente.',
              code: 'INVALID_PDF_HEADER',
              header_bytes: new TextDecoder().decode(uint8Array.slice(0, 10))
            }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // 3) Validar tamanho mínimo
        if (uint8Array.length < 1024) {
          console.error('❌ Arquivo muito pequeno:', uint8Array.length, 'bytes');
          return new Response(
            JSON.stringify({
              error: 'Arquivo muito pequeno',
              hint: 'O arquivo tem menos de 1KB. Verifique se o upload foi completo.',
              code: 'FILE_TOO_SMALL'
            }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('✅ Validações iniciais OK:', {
          size: uint8Array.length,
          sizeKB: (uint8Array.length / 1024).toFixed(2),
          header: new TextDecoder().decode(uint8Array.slice(0, 8)),
          contentType
        });
        
        // ========== EXTRAÇÃO COM PDFJS-DIST (MELHORADO) ==========
        
        // Função para normalizar texto (preservando caracteres unicode)
        const normalizeText = (text: string): string => {
          return text
            .normalize('NFKC') // Normalizar unicode (combinar acentos)
            .replace(/(\w)-\n(\w)/g, '$1$2') // Juntar palavras hifenizadas
            .replace(/\s+/g, ' ') // Múltiplos espaços → 1 espaço
            .trim();
        };
        
        let extractedPdfText = '';
        try {
          const pdfjsLib = await import('npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs');
          
          // Configuração robusta com suporte a CMaps e fontes problemáticas
          const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            isEvalSupported: false,
            disableFontFace: true,
            useWorkerFetch: false,
            useSystemFonts: false, // Forçar uso de fontes padrão
            verbosity: 0, // Reduzir warnings
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/',
            fontExtraProperties: true, // Melhorar extração com fontes problemáticas
            pdfBug: false, // Ignorar bugs de fonte
          });
          
          const pdf = await loadingTask.promise;
          console.log('📄 PDF metadata:', {
            numPages: pdf.numPages,
            fingerprint: pdf.fingerprint,
          });

          const textParts: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            
            console.log(`📄 Página ${i}: ${content.items.length} items de texto`);
            
            // Extrair com mais robustez: verificar str e chars
      const pageText = content.items
        .map((item: any) => {
          // Tentar item.str primeiro
          if (item.str) return item.str;
          // Fallback: tentar item.chars
          if (item.chars) return item.chars.map((c: any) => c.str || '').join('');
          // Fallback final: item.text (algumas versões usam isso)
          if (item.text) return item.text;
          return '';
        })
        .filter(text => text.trim().length > 0)
        .join(' ');
            
            textParts.push(pageText);
            console.log(`🧩 Página ${i}: ${pageText.length} caracteres extraídos`);
            
            if (i === 1) {
              console.log(`📝 Preview p1:`, pageText.substring(0, 300));
            }
          }
          
          extractedPdfText = textParts.join('\n');
          console.log('✅ pdfjs-dist extraiu:', extractedPdfText.length, 'caracteres (bruto)');
        } catch (pdfjsError) {
          console.error('❌ pdfjs-dist falhou:', pdfjsError);
        }

        // Normalizar texto extraído
        extractedPdfText = normalizeText(extractedPdfText);
        console.log('📊 Texto normalizado:', extractedPdfText.length, 'caracteres');
        console.log('📝 Preview normalizado:', extractedPdfText.substring(0, 300));

        // ========== FALLBACK COM PDF-PARSE (MELHORADO) ==========
        
        if (extractedPdfText.length < 50) {
          console.log('⚠️ Tentando fallback com pdf-parse...');
          try {
            const pdfParse = (await import('npm:pdf-parse@1.1.1')).default;
            const pdfData = await pdfParse(uint8Array, {
              max: 0, // sem limite de páginas
              version: 'v2.0.550' // versão específica do pdf.js interno
            });
            
            // CRÍTICO: Logar o length ANTES da normalização
            const rawTextLength = pdfData.text?.length || 0;
            console.log('📊 pdf-parse metadata:', {
              numpages: pdfData.numpages,
              info: pdfData.info,
              textLength: rawTextLength // Antes da normalização
            });
            
            console.log('📝 Preview pdf-parse (bruto):', (pdfData.text || '').substring(0, 300));
            
            // Normalizar DEPOIS de logar o length original
            const fallbackText = normalizeText(pdfData.text || '');
            console.log('📊 pdf-parse normalizado:', fallbackText.length, 'caracteres');
            console.log('📝 Preview pdf-parse (normalizado):', fallbackText.substring(0, 300));
            
            // Usar o maior resultado (comparar DEPOIS da normalização)
            if (fallbackText.length > extractedPdfText.length) {
              extractedPdfText = fallbackText;
              console.log('✅ Usando resultado de pdf-parse (maior)');
            }
          } catch (parseError) {
            console.error('❌ Fallback pdf-parse também falhou:', parseError);
          }
        }

        extractedText = extractedPdfText;
        
        // ========== LOGGING COMPLETO ==========
        
        const wordCount = extractedText.trim().split(/\s+/).length;
        const charsDensity = (extractedText.length / uint8Array.length * 100).toFixed(2);
        
        console.log('🔍 Diagnóstico completo:', {
          fileSize: uint8Array.length,
          fileSizeKB: (uint8Array.length / 1024).toFixed(2),
          extractedLength: extractedText.length,
          extractedTrimmedLength: extractedText.trim().length,
          wordCount,
          charsDensity: charsDensity + '%'
        });
        
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

    // ========== VALIDAÇÃO FINAL COM HEURÍSTICA ROBUSTA ==========
    
    const trimmedText = (extractedText || '').trim();
    const textWithoutSpaces = trimmedText.replace(/\s+/g, '');
    
    if (!extractedText || trimmedText.length < 50) {
      // Obter tamanho do arquivo para heurística
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const fileSizeBytes = uint8Array.length;
      
      console.log('🔍 Diagnóstico final completo:', {
        fileSize: fileSizeBytes,
        fileSizeKB: (fileSizeBytes / 1024).toFixed(2),
        extractedLength: extractedText.length,
        extractedTrimmedLength: trimmedText.length,
        textWithoutSpaces: textWithoutSpaces.length,
        wordCount: trimmedText.split(/\s+/).length,
        charsDensity: (extractedText.length / fileSizeBytes * 100).toFixed(2) + '%'
      });
      
      console.error('❌ Texto extraído insuficiente:', {
        length: extractedText.length,
        trimmedLength: trimmedText.length,
        fileSize: fileSizeBytes,
        fileSizeKB: (fileSizeBytes / 1024).toFixed(2),
        mimeType: mime_type
      });
      
      // Heurística robusta: só marcar como "escaneado" se:
      // 1) É PDF válido (passou validação de header)
      // 2) Tem tamanho razoável (> 100KB)
      // 3) AMBAS as bibliotecas extraíram < 200 chars sem espaços após normalização
      const isSuspectedScannedPdf = 
        mime_type === 'application/pdf' && 
        fileSizeBytes > 100000 && // PDF com mais de 100KB
        textWithoutSpaces.length < 200; // mas quase nenhum texto real
      
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível extrair texto suficiente do arquivo',
          hint: isSuspectedScannedPdf 
            ? 'Este PDF parece ser escaneado (somente imagens). Por favor, cole o texto do CV manualmente no campo de texto.' 
            : 'Não foi possível ler o conteúdo do arquivo. Tente converter para PDF novamente ou cole o texto manualmente.',
          extracted_length: extractedText.length,
          file_size: fileSizeBytes,
          file_size_kb: (fileSizeBytes / 1024).toFixed(2),
          suspected_scanned_pdf: isSuspectedScannedPdf,
          code: isSuspectedScannedPdf ? 'SCANNED_PDF_SUSPECTED' : 'PDF_TEXT_EXTRACTION_FAILED',
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