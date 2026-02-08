import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { unzipSync } from "npm:fflate@0.8.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const ExtractCVInputSchema = z.object({
  storage_path: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(100)
});

// Configuração do OCR via OpenAI Vision
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();

    // Validate input
    const validationResult = ExtractCVInputSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input data',
          details: validationResult.error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { storage_path, mime_type } = validationResult.data;

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
      // Para PDF: usar pdfjs-dist (método único - pdf-parse removido por incompatibilidade com Deno)
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
          const pdfjsLib = await import('npm:pdfjs-dist@4.8.69/legacy/build/pdf.mjs');
          
          // Configuração otimizada para PDFs do Figma e fontes custom
          const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            isEvalSupported: false,
            disableFontFace: false, // CRÍTICO: Permitir fontes custom (Figma precisa)
            useWorkerFetch: false,
            useSystemFonts: true, // Usar fontes do sistema como fallback
            verbosity: 0,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/standard_fonts/',
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/',
            cMapPacked: true,
            fontExtraProperties: true,
            stopAtErrors: false, // Não parar em erros de fonte
            maxImageSize: -1, // Processar imagens grandes (Figma usa high-res)
            ignoreErrors: true, // Ignorar erros de parsing menores
          });
          
          const pdf = await loadingTask.promise;
          
          // Detectar se é PDF do Figma
          const metadata = await pdf.getMetadata();
          const isFigmaPdf = metadata?.info?.Producer?.includes('Figma');
          console.log('📄 PDF metadata:', {
            numPages: pdf.numPages,
            fingerprint: pdf.fingerprint,
            producer: metadata?.info?.Producer,
            isFigma: isFigmaPdf
          });
          
          if (isFigmaPdf) {
            console.log('🎨 Detectado PDF do Figma - usando extração aprimorada');
          }

          const textParts: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
            
            console.log(`📄 Página ${i}: ${content.items.length} items de texto`);
            
            // Log de estrutura do primeiro item para debugging
            if (i === 1 && content.items.length > 0) {
              const sampleItem = content.items[0];
              console.log('📊 Estrutura do primeiro item:', {
                hasStr: !!sampleItem.str,
                hasChars: !!sampleItem.chars,
                hasText: !!sampleItem.text,
                hasUnicode: !!sampleItem.unicode,
                keys: Object.keys(sampleItem).slice(0, 10)
              });
            }
            
            // Extração aprimorada para PDFs do Figma e outros formatos
            const pageText = content.items
              .map((item: any) => {
                // Prioridade 1: item.str (texto direto)
                if (item.str && typeof item.str === 'string') return item.str;
                
                // Prioridade 2: item.chars (array de caracteres - comum em Figma)
                if (Array.isArray(item.chars)) {
                  return item.chars
                    .map((c: any) => {
                      if (typeof c === 'string') return c;
                      if (c?.str) return c.str;
                      if (c?.c) return c.c; // Figma às vezes usa 'c'
                      return '';
                    })
                    .join('');
                }
                
                // Prioridade 3: item.text (fallback)
                if (item.text && typeof item.text === 'string') return item.text;
                
                // Prioridade 4: item.unicode (Figma pode usar isso)
                if (item.unicode) return String.fromCharCode(item.unicode);
                
                return '';
              })
              .filter((text: string) => text && text.trim().length > 0)
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

        extractedText = extractedPdfText;
        
        // ========== OCR (PDF ESCANEADO) ==========
        // Observação: a OpenAI Vision API aceita apenas *imagens* (png/jpg/webp).
        // Um PDF escaneado precisaria ser renderizado em imagem antes do OCR, o que não
        // está disponível de forma confiável no Edge Runtime.
        // Portanto, aqui apenas detectamos e deixamos o erro/UX orientar o usuário.
        const textWithoutSpaces = extractedText.replace(/\s+/g, '');
        const fileSizeBytes = uint8Array.length;
        if (textWithoutSpaces.length < 200 && fileSizeBytes > 50000) {
          console.log('📷 PDF possivelmente escaneado (imagem) — OCR no Edge desativado');
        }
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
      // Para DOCX: usar mammoth com Buffer.from() para compatibilidade
      try {
        const mammoth = (await import('npm:mammoth@1.6.0')).default;
        const arrayBuffer = await fileData.arrayBuffer();
        
        // CORREÇÃO: Usar Buffer.from() ao invés de Uint8Array diretamente
        // mammoth espera um Buffer do Node, não Uint8Array puro
        const { Buffer } = await import('node:buffer');
        const nodeBuffer = Buffer.from(arrayBuffer);
        
        console.log('📄 DOCX buffer criado:', nodeBuffer.length, 'bytes');
        
        // Tentar com buffer object notation (mais robusto)
        let result;
        try {
          result = await mammoth.extractRawText({ buffer: nodeBuffer });
        } catch (bufferError) {
          console.warn('⚠️ mammoth com buffer falhou, tentando arrayBuffer:', bufferError.message);
          // Fallback: tentar com arrayBuffer direto
          result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        }
        
        console.log('📄 mammoth result:', { 
          valueLength: result.value?.length,
          messages: result.messages?.length
        });
        
        // Normalizar texto (menos agressivo para preservar acentos)
        extractedText = (result.value || '')
          .normalize('NFKC')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log('✅ DOCX extraído:', extractedText.length, 'caracteres');
        console.log('📝 Preview:', extractedText.substring(0, 200));
        
        // ========== OCR (DOCX COM IMAGENS) ==========
        // A Vision API só aceita imagens. Para DOCX do Canva/Figma, normalmente há imagens em word/media/*
        // Então: unzip do DOCX → pegar imagens → OCR nelas.
        const uint8View = new Uint8Array(arrayBuffer);
        const textWithoutSpaces = extractedText.replace(/\s+/g, '');
        const fileSizeBytes = uint8View.length;

        const isProbablyImageDocx = textWithoutSpaces.length < 100 && fileSizeBytes > 100000;
        if (isProbablyImageDocx && OPENAI_API_KEY) {
          console.log('🔍 DOCX parece imagem (Canva/Figma). Extraindo imagens internas para OCR...');

          try {
            const unzip = unzipSync(uint8View);
            const mediaEntries = Object.entries(unzip)
              .filter(([path]) => path.startsWith('word/media/'))
              .map(([path, bytes]) => ({ path, bytes: bytes as Uint8Array }));

            console.log('🖼️ Imagens encontradas no DOCX:', mediaEntries.map(m => ({ path: m.path, size: m.bytes.length })));

            // Pegar até 3 imagens (as maiores) para controlar custo/tempo
            const selected = mediaEntries
              .sort((a, b) => b.bytes.length - a.bytes.length)
              .slice(0, 3);

            const guessMime = (p: string) => {
              const lower = p.toLowerCase();
              if (lower.endsWith('.png')) return 'image/png';
              if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
              if (lower.endsWith('.webp')) return 'image/webp';
              return 'application/octet-stream';
            };

            let ocrCombined = '';

            for (const img of selected) {
              const mime = guessMime(img.path);
              if (!mime.startsWith('image/')) continue;

              const base64Image = encodeBase64(img.bytes);

              const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                    {
                      role: 'system',
                      content: 'Extraia TODO o texto visível do currículo na imagem. Preserve quebras por seção quando fizer sentido. Retorne APENAS o texto.'
                    },
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'text',
                          text: 'Extraia o texto completo desta imagem de currículo.'
                        },
                        {
                          type: 'image_url',
                          image_url: {
                            url: `data:${mime};base64,${base64Image}`,
                            detail: 'high'
                          }
                        }
                      ]
                    }
                  ],
                  max_tokens: 1800,
                  temperature: 0
                })
              });

              if (!ocrResponse.ok) {
                const errorText = await ocrResponse.text();
                console.warn('⚠️ OCR DOCX falhou para', img.path, ocrResponse.status, errorText);
                continue;
              }

              const ocrData = await ocrResponse.json();
              const ocrText = (ocrData.choices?.[0]?.message?.content || '').trim();
              console.log('📝 OCR imagem', img.path, '→', ocrText.length, 'caracteres');

              if (ocrText) {
                ocrCombined += (ocrCombined ? '\n\n' : '') + ocrText;
              }
            }

            const normalizedOcrText = (ocrCombined || '')
              .normalize('NFKC')
              .replace(/\s+/g, ' ')
              .trim();

            if (normalizedOcrText.length > extractedText.length + 50) {
              extractedText = normalizedOcrText;
              console.log('✅ Usando resultado do OCR do DOCX (mais texto)');
            } else {
              console.log('ℹ️ OCR do DOCX não gerou mais texto do que o mammoth');
            }
          } catch (ocrError) {
            console.warn('⚠️ Erro ao tentar OCR do DOCX via imagens:', ocrError);
          }
        }
        
        // Se ainda assim extraiu 0 caracteres, pode ser DOCX corrompido ou formato especial
        if (extractedText.length === 0) {
          console.warn('⚠️ DOCX extraiu 0 caracteres após todas tentativas - formato não-padrão');
          
          // Log detalhado para debug
          console.log('🔍 DOCX debug:', {
            size: uint8View.length,
            header: new TextDecoder().decode(uint8View.slice(0, 50)),
            isZip: uint8View[0] === 0x50 && uint8View[1] === 0x4B // PK = ZIP
          });
        }
        
      } catch (error) {
        console.error('❌ Erro ao extrair DOCX:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao processar DOCX',
            hint: 'O arquivo DOCX pode estar corrompido ou em formato não-padrão. Tente salvar como PDF ou cole o texto manualmente.',
            code: 'DOCX_EXTRACTION_FAILED',
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
        charsDensity: (extractedText.length / fileSizeBytes * 100).toFixed(2) + '%',
        mimeType: mime_type
      });
      
      // Determinar código de erro e mensagem baseado no tipo de arquivo
      let code = 'EXTRACTION_FAILED';
      let hint = 'Não foi possível extrair texto do arquivo. Cole o texto manualmente.';
      let looksScanned = false;
      
      if (mime_type === 'application/pdf') {
        looksScanned = fileSizeBytes > 100000 && textWithoutSpaces.length < 200;
        code = looksScanned ? 'SCANNED_PDF_SUSPECTED' : 'PDF_TEXT_ENCODING_ISSUE';
        hint = looksScanned
          ? 'Este PDF parece ser escaneado (somente imagens). Por favor, cole o texto do CV manualmente no campo de texto.'
          : 'O PDF possui fontes/encoding que impedem leitura de texto. Exporte novamente como PDF/A, salve como DOCX, ou cole o texto manualmente.';
      } else if (mime_type.includes('word') || mime_type.includes('document')) {
        code = 'DOCX_EMPTY_EXTRACTION';
        hint = 'O arquivo DOCX não contém texto extraível. Pode ter sido criado com ferramenta como Canva que salva como imagem. Abra no Word, salve novamente, ou cole o texto manualmente.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível extrair texto suficiente do arquivo',
          hint,
          extracted_length: extractedText.length,
          file_size: fileSizeBytes,
          file_size_kb: (fileSizeBytes / 1024).toFixed(2),
          suspected_scanned_pdf: looksScanned,
          code
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
    console.error('❌ Erro geral na extração:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar arquivo',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
