import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

// ===================== CORS =====================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===================== TYPES =====================
interface DiagnosticInput {
  email: string;
  cv_content?: string;  // Opcional - texto direto (colado ou extraído no browser)
  cv_file?: {           // Opcional - arquivo via signed URL (fallback)
    name: string;
    size: number;
    mime: string;
    signed_url: string;
    storage_path?: string;
  };
  job_description: string; // pode ser texto OU URL
}

interface ResultadoParcial {
  nota_ats: number;
  alertas_top2: Array<{
    tipo: string;
    titulo: string;
    descricao: string;
    impacto: string;
    sugestao: string;
  }>;
  resumo_rapido: string;
  json_result_rich?: any;
}

// ===================== HELPERS =====================
function truncate(str: string, max = 15000): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) : str;
}

function isLikelyUrl(s: string) {
  try { const u = new URL(s); return !!u.protocol && !!u.hostname; } catch { return false; }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function scrapeJobPage(src: string): Promise<{ text: string; ok: boolean }> {
  try {
    const res = await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({ urlOrText: src })
    });
    
    if (!res.ok) return { text: "", ok: false };
    
    const result = await res.json();
    return { text: result.text || "", ok: result.ok || false };
  } catch (error) {
    console.error('Erro no scraping:', error);
    return { text: "", ok: false };
  }
}

function uniq(arr: string[] = []): string[] {
  return Array.from(new Set(arr.map(s => (s || "").trim()).filter(Boolean)));
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// valida e corrige o JSON do modelo
function validateAndRepair(json: any) {
  if (!json || typeof json !== "object") throw new Error("JSON vazio/ inválido");

  const cat = json.categorias || {};
  const ensureCat = (name: string, max: number) => {
    cat[name] = cat[name] || {};
    cat[name].pontuacao_local = clamp(Number(cat[name].pontuacao_local ?? 0), 0, max);
    const listFields: Record<string, boolean> = {
      evidencias: true, faltantes: true, presentes: true, ausentes: true, riscos: true
    };
    Object.keys(listFields).forEach(k => {
      if (cat[name][k] != null) cat[name][k] = uniq(cat[name][k]);
    });
    if (name === "resultados_impacto") {
      cat[name].tem_metricas = Boolean(cat[name]?.tem_metricas);
    }
  };

  ensureCat("experiencia_alinhada", 30);
  ensureCat("competencias_tecnicas", 25);
  ensureCat("palavras_chave", 15);
  ensureCat("resultados_impacto", 10);
  ensureCat("formacao_certificacoes", 10);
  ensureCat("formatacao_ats", 10);

  json.categorias = cat;

  const soma =
    cat.experiencia_alinhada.pontuacao_local +
    cat.competencias_tecnicas.pontuacao_local +
    cat.palavras_chave.pontuacao_local +
    cat.resultados_impacto.pontuacao_local +
    cat.formacao_certificacoes.pontuacao_local +
    cat.formatacao_ats.pontuacao_local;

  json.nota_final = clamp(soma, 0, 100);

  json.alertas = uniq(json.alertas || []);
  if (Array.isArray(json.acoes_prioritarias)) {
    json.acoes_prioritarias = json.acoes_prioritarias.map((a: any) => ({
      titulo: String(a?.titulo || "").trim(),
      como_fazer: String(a?.como_fazer || "").trim(),
      ganho_estimado_pontos: clamp(Number(a?.ganho_estimado_pontos ?? 0), 0, 30)
    }));
  } else {
    json.acoes_prioritarias = [];
  }
  json.frases_prontas = uniq(json.frases_prontas || []);

  json.perfil_detectado = json.perfil_detectado || {};
  json.perfil_detectado.cargos = uniq(json.perfil_detectado.cargos || []);
  json.perfil_detectado.ferramentas = uniq(json.perfil_detectado.ferramentas || []);
  json.perfil_detectado.dominios = uniq(json.perfil_detectado.dominios || []);

  if (typeof json.descricao_vaga_invalida !== "boolean") {
    json.descricao_vaga_invalida = false;
  }

  return json;
}

// ===================== HANDLER HTTP =====================
serve(async (req) => {
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
    const payload = await req.json();

    // DEBUG obrigatório
    console.log("🔍 [DIAGNOSTICO] Payload recebido:", {
      email: payload.email,
      has_cv_content: Boolean(payload.cv_content),
      cv_content_type: typeof payload.cv_content,
      cv_content_length: typeof payload.cv_content === 'string' ? payload.cv_content.length : 0,
      has_cv_file: Boolean(payload.cv_file),
      cv_file_keys: payload.cv_file ? Object.keys(payload.cv_file) : []
    });

    // ✅ FAIL-FAST: cv_content deve ser string se existir
    if (payload.cv_content !== undefined && typeof payload.cv_content !== "string") {
      return new Response(JSON.stringify({
        error: "cv_content inválido (deve ser string). Use cv_file para enviar arquivo.",
        code: "INVALID_CV_CONTENT_TYPE",
        got_type: typeof payload.cv_content
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { email, job_description } = payload;

    if (!email || !job_description) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, job_description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ PRECEDÊNCIA: usar texto se veio pronto
    let cvText: string | null = null;

    if (typeof payload.cv_content === "string" && payload.cv_content.trim().length > 0) {
      // Cenário 1: cv_content como string (texto colado OU extraído no browser)
      cvText = payload.cv_content.trim();
      console.log('📝 CV recebido como texto:', cvText.length, 'caracteres');
      
    } else if (payload.cv_file?.signed_url) {
      // Cenário 2: cv_file com signed_url (fallback do browser)
      console.log('📄 Detectado cv_file, baixando do storage...');
      console.log('   - signed_url:', payload.cv_file.signed_url);
      console.log('   - mime:', payload.cv_file.mime);
      
      try {
        // Baixar arquivo do storage via signed URL
        const fileRes = await fetch(payload.cv_file.signed_url);
        
        if (!fileRes.ok) {
          return new Response(JSON.stringify({
            error: 'Falha ao baixar arquivo do storage',
            code: 'DOWNLOAD_FAILED',
            hint: 'O link pode ter expirado. Reenvie o arquivo ou cole o texto.',
            status: fileRes.status
          }), { 
            status: 422, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        
        const fileBlob = await fileRes.blob();
        const fileBuffer = await fileBlob.arrayBuffer();
        
        // Chamar extract-cv com storage_path (mantém compatibilidade)
        const extractRes = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/extract-cv`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              storage_path: payload.cv_file.storage_path,
              mime_type: payload.cv_file.mime
            })
          }
        );

        if (!extractRes.ok) {
          const errData = await extractRes.json();
          console.error('❌ Erro na extração:', errData);
          
          return new Response(JSON.stringify({
            error: errData.error || 'Falha na extração do CV',
            hint: errData.hint,
            suspected_scanned_pdf: Boolean(errData.suspected_scanned_pdf),
            code: errData.code,
            ...errData
          }), { 
            status: 422, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const { text } = await extractRes.json();
        cvText = text;
        console.log(`✅ CV extraído do arquivo: ${cvText.length} caracteres`);
        
      } catch (extractError: any) {
        console.error('❌ Erro ao processar arquivo:', extractError);
        return new Response(JSON.stringify({ 
          error: 'Erro ao processar arquivo enviado',
          code: 'FILE_PROCESSING_ERROR',
          details: extractError.message,
          hint: 'Tente colar o texto do seu CV manualmente'
        }), { 
          status: 422, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // ✅ VALIDAÇÃO: deve ter texto suficiente
    if (!cvText || cvText.replace(/\s+/g, "").length < 200) {
      return new Response(JSON.stringify({
        error: "Texto do CV insuficiente para análise",
        code: "CV_TEXT_TOO_SHORT",
        hint: "O CV deve ter pelo menos 200 caracteres úteis. Cole o texto completo do seu currículo.",
        extracted_length: cvText?.length || 0
      }), { 
        status: 422, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validação da vaga
    if (!job_description || job_description.trim().length < 50) {
      return new Response(JSON.stringify({
        error: "Descrição da vaga muito curta",
        code: "JOB_DESCRIPTION_TOO_SHORT"
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Preparar para o restante do fluxo
    const cv_content = cvText;  // ✅ Garantido como string

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emailLowercase = email.toLowerCase().trim();
    let { data: usuarioGratuito } = await supabase
      .from('usuarios_gratuitos')
      .select('*')
      .eq('email', emailLowercase)
      .maybeSingle();

    if (!usuarioGratuito) {
      const { data: novoUsuario } = await supabase
        .from('usuarios_gratuitos')
        .insert({ email: emailLowercase, analises_realizadas: 0, analises_limite: 2 })
        .select()
        .single();
      usuarioGratuito = novoUsuario;
    }

    const podeAnaliseGratuita = usuarioGratuito.analises_realizadas < usuarioGratuito.analises_limite;
    let resultadoParcial: ResultadoParcial;

    if (podeAnaliseGratuita) {
      resultadoParcial = await executarAnaliseReal({ 
        email, 
        cv_content,  // já é string aqui
        job_description 
      });
      await supabase.from('usuarios_gratuitos')
        .update({ analises_realizadas: usuarioGratuito.analises_realizadas + 1 })
        .eq('id', usuarioGratuito.id);
    } else {
      resultadoParcial = await executarAnaliseSimulada({ 
        email, 
        cv_content, 
        job_description 
      });
    }

    const { data: diagnostico } = await supabase
      .from('diagnosticos')
      .insert({
        email: emailLowercase,
        cv_content: truncate(cv_content, 25000).trim(),
        job_description: truncate(job_description, 20000).trim(),
        nota_ats: resultadoParcial.nota_ats,
        alertas_top2: resultadoParcial.alertas_top2,
        json_result_rich: resultadoParcial.json_result_rich,
        pago: false
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        id: diagnostico.id,
        nota_ats: resultadoParcial.nota_ats,
        alertas_top2: resultadoParcial.alertas_top2,
        resumo_rapido: resultadoParcial.resumo_rapido,
        created_at: diagnostico.created_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ===================== ANALISE SIMULADA =====================
async function executarAnaliseSimulada(input: DiagnosticInput): Promise<ResultadoParcial> {
  await new Promise(r => setTimeout(r, 1000));
  const nota = Math.floor(Math.random() * 30) + 65;

  const alertas = [
    {
      tipo: "critico",
      titulo: "Limite de análises gratuitas atingido",
      descricao: "Você já utilizou suas 2 análises robustas gratuitas. Esta é uma análise básica com feedback limitado.",
      impacto: "Análise limitada não inclui recomendações completas",
      sugestao: "Para análise detalhada, considere o upgrade premium"
    }
  ];

  return {
    nota_ats: nota,
    alertas_top2: alertas,
    resumo_rapido: "Esta é uma análise básica. Para recomendações detalhadas, faça o upgrade premium."
  };
}

// ===================== ANALISE REAL =====================
async function executarAnaliseReal(input: DiagnosticInput): Promise<ResultadoParcial> {
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIKey) throw new Error('Chave da OpenAI não configurada');

  let vagaTexto = input.job_description;
  let descricaoVagaInvalida = false;
  if (isLikelyUrl(input.job_description)) {
    const { text, ok } = await scrapeJobPage(input.job_description);
    if (ok && text.length > 200) vagaTexto = text;
    else descricaoVagaInvalida = true;
  }

  // Importar funções de parsing e validação
  const { parseCV, formatCVForLLM } = await import('./cv-parser.ts');
  const { validateSemanticConsistency, addInconsistencyAlerts } = await import('./semantic-validator.ts');

  // Parse estruturado do CV
  console.log('[DIAGNOSTICO] Iniciando parse estruturado do CV...');
  const cvParsed = parseCV(input.cv_content);
  const cvFormatado = formatCVForLLM(cvParsed);
  const cvTxt = truncate(cvFormatado, 20000);
  const vagaTxt = truncate(vagaTexto, 18000);
  
  console.log('[DIAGNOSTICO] CV parseado - Seções encontradas:', {
    experiencias: cvParsed.experiencias.length,
    habilidades: cvParsed.habilidades.length,
    formacao: cvParsed.formacao.length,
    certificacoes: cvParsed.certificacoes.length
  });

  const systemMsg = `
  Você é um avaliador especialista em compatibilidade entre currículos e vagas, com foco em sistemas ATS.

  Sua tarefa é cruzar informações de um CURRÍCULO (já estruturado em seções) com uma DESCRIÇÃO_DE_VAGA, avaliando a aderência com base em critérios definidos.

  Você deve retornar SEMPRE um JSON válido e estrito. Nenhum texto fora do JSON é permitido.

  Importante:
  - A nota final deve ser a soma exata das 6 categorias avaliadas.
  - Não ultrapasse os limites definidos por categoria.
  - ANTES DE RESPONDER: Valide cada item de 'evidencias' ou 'presentes' contra o CV real. Se não encontrar menção explícita, coloque em 'faltantes' ou 'ausentes'.
  - NUNCA marque como presente algo que não está explicitamente no currículo.
  `;

  const userPrompt = `
  Você receberá dois blocos de entrada:

  1. DESCRICAO_DA_VAGA (em texto ou por link)
  2. CURRICULO (em texto extraído de PDF ou Word)

  Seu objetivo é cruzar e validar todas as exigências da vaga com as informações contidas no currículo.

  ---

  ## ✅ CATEGORIAS DE AVALIAÇÃO

  1. experiencia_alinhada (0–30)
  2. competencias_tecnicas (0–25)
  3. palavras_chave (0–15)
  4. resultados_impacto (0–10)
  5. formacao_certificacoes (0–10)
  6. formatacao_ats (0–10)

  ---

  ## 📌 AVALIAÇÃO DETALHADA

  ### 1. experiencia_alinhada (0–30)
  - Avalie se o histórico de experiência se alinha às responsabilidades e ambiente técnico da vaga (ex: manuseio de materiais, cálculos estruturais, máquinas industriais, etc.).
  - Liste evidências que comprovam o alinhamento com os ativos, processos e contexto mencionados.

  ### 2. competencias_tecnicas (0–25)
  - **Valide cada tecnologia, norma técnica, software ou processo citado na vaga.**
  - Considere como “presente” qualquer menção explícita no currículo.
  - Gere:
  - 'normas_encontradas': lista de normas da vaga que estão no currículo
  - 'softwares_encontrados': softwares da vaga identificados no currículo

### 3. palavras_chave (0–15)
- Extraia 10–20 palavras-chave da vaga (ex: competências, termos técnicos, comportamentais).
- Compare com o currículo e conte quantas estão presentes.
- Gere:
  - 'palavras_chave_extraidas': da vaga
  - 'palavras_chave_batidas': encontradas no currículo

### 4. resultados_impacto (0–10)
- Avalie presença de resultados, impactos, indicadores (ex: redução de falhas, aumento de disponibilidade, otimização de custos, projetos críticos etc.).
- Liste frases e contextos que comprovam isso.

### 5. formacao_certificacoes (0–10)
- Valide formação exigida e especializações/pós-graduações desejáveis.
- Considere como equivalentes termos similares. Exemplo:
  - “Engenharia de Máquinas e Integridade Estrutural” pode ser aceito como Pós em Engenharia Estrutural.
- Considere cursos livres, certificações técnicas, menção de CREA Ativo.

### 6. formatacao_ats (0–10)
- Avalie a estrutura: seções visíveis, legibilidade (sem tabelas), bullets simples.
- Penalize se o currículo tiver mais de 4 páginas.
- Gere:
  - 'evidencias': pontos positivos
  - 'riscos': problemas encontrados (ex: "Currículo com 5 páginas", "Texto com imagens complexas")

> ⚠️ Se houver riscos relevantes, a nota não pode ser 10/10.

---

## 🧠 VALIDAÇÃO FORÇADA

Antes de pontuar, execute obrigatoriamente:

1. Leia linha por linha a descrição da vaga.
2. Para cada item citado (norma, software, certificado, ferramenta), verifique se aparece no currículo.
3. Crie duas listas:
   - 'itens_presentes_no_curriculo'
   - 'itens_ausentes_no_curriculo'

> Exemplo: Se “SAP PM” está em contato ou experiência, deve ser marcado como presente.

Inclua essas listas na seção 'competencias_tecnicas'.

## 📋 EQUIVALÊNCIAS EXPLÍCITAS

Considere sempre estas equivalências ao analisar:
- Pacote Office: considere presente se houver Excel, Word, PowerPoint ou Outlook mencionados
- Canteiro de obras: considere presente se houver execução de obras ou construção civil
- Subestação: inclui variações como subestações e substation
- Climatização: inclui HVAC e ar condicionado
- Manutenção: inclui maintenance
- Orçamento, cronograma, gestão, equipe, qualidade, processos, serviços, contratos, energia, água, materiais: considere variações comuns, singular e plural, e termos relacionados (ex: gestão de equipe = gerenciamento de time)

Em caso de dúvida, NÃO marque como presente. Seja rigoroso na validação inicial.

---

DESCRICAO_DA_VAGA:
${vagaTxt}

---

CURRICULO (estruturado):
${cvTxt}

---

## 📤 FORMATO DE SAÍDA (JSON estrito)

\`\`\`json
{
  "nota_final": <int 0-100>,
  "descricao_vaga_invalida": true|false,
  "alertas": ["..."],
  "categorias": {
    "experiencia_alinhada": { "pontuacao_local": <0-30>, "evidencias": ["..."] },
    "competencias_tecnicas": { "pontuacao_local": <0-25>, "faltantes": ["..."], "evidencias": ["..."] },
    "palavras_chave": { "pontuacao_local": <0-15>, "presentes": ["..."], "ausentes": ["..."] },
    "resultados_impacto": { "pontuacao_local": <0-10>, "evidencias": ["..."], "tem_metricas": true|false },
    "formacao_certificacoes": { "pontuacao_local": <0-10>, "evidencias": ["..."] },
    "formatacao_ats": { "pontuacao_local": <0-10>, "evidencias": ["..."], "riscos": ["..."] }
  },
  "acoes_prioritarias": [
    { "titulo": "...", "como_fazer": "...", "ganho_estimado_pontos": <int> }
  ],
  "frases_prontas": ["..."],
  "perfil_detectado": { "cargos": ["..."], "ferramentas": ["..."], "dominios": ["..."] }
}
\`\`\`
`;

  const payload = {
    model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 2200,
    response_format: { type: "json_object" }
  };

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json();
  const rawJson = data?.choices?.[0]?.message?.content ?? "";
  console.log('[DIAGNOSTICO] Resposta raw do LLM recebida, tamanho:', rawJson.length);
  
  const analiseRica = JSON.parse(rawJson);
  if (descricaoVagaInvalida) analiseRica.descricao_vaga_invalida = true;

  // Validação estrutural básica
  console.log('[DIAGNOSTICO] Aplicando validateAndRepair...');
  let validado = validateAndRepair(analiseRica);

  // Validação semântica (nova)
  console.log('[DIAGNOSTICO] Aplicando validação semântica...');
  validado = validateSemanticConsistency(validado, input.cv_content);
  validado = addInconsistencyAlerts(validado);
  const alertasLegacy = (validado.alertas || []).slice(0, 2).map((a: string) => ({
    tipo: "critico",
    titulo: "Ponto de Melhoria Identificado",
    descricao: a,
    impacto: "Pode reduzir significativamente suas chances",
    sugestao: "Revise e ajuste conforme recomendações"
  }));

  return {
    nota_ats: validado.nota_final,
    alertas_top2: alertasLegacy,
    resumo_rapido: `Análise concluída com ${validado.nota_final} pontos.`,
    json_result_rich: validado
  };
}
