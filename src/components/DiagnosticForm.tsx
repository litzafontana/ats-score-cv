import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadArea } from "./UploadArea";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
export function DiagnosticForm() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [email, setEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [cvInputType, setCvInputType] = useState<"upload" | "text">("upload");
  const [jobInputType, setJobInputType] = useState<"url" | "text">("url");
  const [forceTextOnly, setForceTextOnly] = useState(false);
  const [showRetryMessage, setShowRetryMessage] = useState(false);
  const {
    toast
  } = useToast();

  // Verificar parâmetros URL para forçar modo texto
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const retry = urlParams.get('retry');
    const mode = urlParams.get('mode');
    if (retry === 'url_failed' && mode === 'text_only') {
      setForceTextOnly(true);
      setJobInputType('text');
      setShowRetryMessage(true);

      // Limpar URL params
      window.history.replaceState({}, '', window.location.pathname);
      toast({
        title: "Refaça a análise com o texto da vaga",
        description: "A URL não pôde ser lida automaticamente. Cole o texto completo da vaga abaixo.",
        variant: "destructive",
        duration: 8000
      });
    }
  }, [toast]);
  const handleAnalyze = async () => {
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira seu email para continuar.",
        variant: "destructive"
      });
      return;
    }

    // Prepare CV content
    let cvContent: any = '';
    if (cvInputType === "upload" && !cvFile) {
      toast({
        title: "CV obrigatório",
        description: "Por favor, envie seu currículo.",
        variant: "destructive"
      });
      return;
    }
    if (cvInputType === "text" && !cvText.trim()) {
      toast({
        title: "CV obrigatório",
        description: "Por favor, cole o texto do seu currículo.",
        variant: "destructive"
      });
      return;
    }
    
    // Upload file to Storage if needed
    if (cvInputType === "upload" && cvFile) {
      toast({
        title: "Enviando arquivo",
        description: "Fazendo upload do seu CV..."
      });

      const fileName = `${Date.now()}-${cvFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cv-uploads')
        .upload(fileName, cvFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("❌ Erro no upload:", uploadError);
        toast({
          title: "Erro no upload",
          description: "Não foi possível enviar o arquivo. Tente colar o texto.",
          variant: "destructive"
        });
        return;
      }

      console.log("✅ Arquivo enviado:", uploadData.path);
      
      // Preparar payload com metadata do arquivo
      cvContent = {
        type: 'file',
        storage_path: uploadData.path,
        file_name: cvFile.name,
        mime_type: cvFile.type,
        size: cvFile.size
      };
    } else if (cvInputType === "text" && cvText.trim()) {
      cvContent = cvText.trim();
    }

    // Prepare job description
    let vagaTexto = '';
    if (jobInputType === "url" && !jobUrl.trim()) {
      toast({
        title: "Vaga obrigatória",
        description: "Por favor, insira o link da vaga.",
        variant: "destructive"
      });
      return;
    }
    if (jobInputType === "text" && !jobText.trim()) {
      toast({
        title: "Vaga obrigatória",
        description: "Por favor, cole a descrição da vaga.",
        variant: "destructive"
      });
      return;
    }
    if (jobInputType === "url" && jobUrl.trim()) {
      vagaTexto = `[URL da vaga: ${jobUrl.trim()}] - Conteúdo será extraído automaticamente`;
    } else if (jobInputType === "text" && jobText.trim()) {
      vagaTexto = jobText.trim();
    }
    // Validar se há conteúdo do CV (objeto OU string)
    const hasCvContent = typeof cvContent === 'object' 
      ? cvContent.type === 'file' 
      : cvContent.trim().length > 0;

    if (!vagaTexto.trim() || !hasCvContent) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a vaga e o currículo para continuar",
        variant: "destructive"
      });
      return;
    }
    // Para upload, pular validação de tamanho (será validada no backend após extração)
    // Para texto colado, validar tamanho mínimo
    const skipSizeValidation = typeof cvContent === 'object' && cvContent.type === 'file';

    if (!skipSizeValidation && (vagaTexto.length < 50 || cvContent.length < 50)) {
      toast({
        title: "Conteúdo insuficiente",
        description: "Vaga e currículo devem ter pelo menos 50 caracteres",
        variant: "destructive"
      });
      return;
    }
    setIsAnalyzing(true);
    try {
      console.log("🚀 Iniciando análise ATS...");
      
      const analysisMessage = typeof cvContent === 'object' && cvContent.type === 'file'
        ? "Extraindo texto do arquivo e analisando..."
        : "Processando seu CV e comparando com a vaga...";
      
      toast({
        title: "Analisando currículo",
        description: analysisMessage
      });

      // Chama a função diagnostico que implementa o controle de limite
      const {
        data: diagnosticoData,
        error: diagnosticoError
      } = await supabase.functions.invoke('diagnostico', {
        body: {
          email: email.toLowerCase().trim(),
          cv_content: cvContent,
          job_description: vagaTexto
        }
      });
      if (diagnosticoError) {
        // Propagar o erro com contexto completo para tratamento abaixo
        const error = new Error(diagnosticoError.message);
        (error as any).context = diagnosticoError.context;
        throw error;
      }
      console.log("✅ Diagnóstico concluído:", diagnosticoData);

      // Redirecionar para a página de resultado
      window.location.href = `/resultado/${diagnosticoData.id}`;
    } catch (error: any) {
      console.error("❌ Erro na análise:", error);
      console.log("📊 Error context:", error.context);
      
      // Parsear erro do edge function
      // O erro pode vir em error.context.body (formato Supabase)
      // ou em error.message como JSON string
      let errorData = error.context?.body;
      
      // Tentar parsear error.message se for JSON
      if (!errorData && error.message) {
        try {
          errorData = JSON.parse(error.message);
        } catch (_) {
          // Não é JSON, usar como está
        }
      }
      
      console.log("📋 Error data parsed:", errorData);
      
      // Verificar flags específicos de erro
      const isSuspectedScanned = errorData?.suspected_scanned_pdf === true || 
                                  errorData?.code === 'SCANNED_PDF_SUSPECTED';
      const isInvalidPdf = errorData?.code === 'INVALID_PDF_HEADER' || 
                           errorData?.code === 'PDF_TOO_SMALL';
      const isDownloadFailed = errorData?.code === 'DOWNLOAD_FAILED';
      
      if (isSuspectedScanned) {
        // UX: mudar aba automaticamente para "Colar texto"
        setCvInputType("text");
        
        toast({
          title: "PDF escaneado detectado",
          description: errorData?.hint || "Este PDF contém apenas imagens. Cole o texto do seu currículo na aba 'Colar texto' para continuar.",
          variant: "destructive",
          duration: 10000
        });
        
        // Focar no textarea após um pequeno delay
        setTimeout(() => {
          const textarea = document.querySelector('textarea[placeholder*="currículo"]') as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
          }
        }, 300);
      } else if (isInvalidPdf || isDownloadFailed) {
        toast({
          title: isDownloadFailed ? "Falha ao baixar o arquivo" : "Arquivo inválido",
          description: errorData?.hint || "O link do arquivo pode ter expirado ou o PDF está corrompido. Reenvie o arquivo ou cole o texto.",
          variant: "destructive",
          duration: 8000
        });
      } else if (errorData?.code === 'PDF_TEXT_ENCODING_ISSUE') {
        toast({
          title: "Texto do PDF ilegível",
          description: errorData?.hint || "O PDF possui fontes/encoding que impedem a leitura automática. Exporte como PDF/A, envie em DOCX, ou cole o texto.",
          variant: "destructive",
          duration: 10000
        });
        setCvInputType("text");
        setTimeout(() => {
          const textarea = document.querySelector('textarea[placeholder*="currículo"]') as HTMLTextAreaElement;
          textarea?.focus();
        }, 300);
      } else {
        toast({
          title: "Erro na análise",
          description: errorData?.hint || error.message || "Tente novamente em alguns momentos",
          variant: "destructive"
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };
  const copiarFrasesProntas = () => {
    toast({
      title: "Funcionalidade atualizada",
      description: "As frases prontas agora estão disponíveis na página de resultado completa."
    });
  };
  return <Card className="max-w-4xl mx-auto shadow-xl border-0 bg-gradient-to-br from-white to-secondary/30">
      <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Análise ATS do seu Currículo
        </CardTitle>
        <CardDescription className="text-sm sm:text-base text-muted-foreground">
          Descubra em segundos se seu CV está otimizado para sistemas de recrutamento
          <br className="hidden sm:block" />
          <span className="text-xs sm:text-sm font-medium text-primary block mt-1 sm:mt-0">
            ✨ Primeiras 2 análises robustas GRATUITAS com IA
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        <div>
          <Label htmlFor="email" className="text-sm sm:text-base">Email para receber o resultado</Label>
          <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 min-h-[44px] text-base" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* CV Input */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm sm:text-base font-semibold">Seu Currículo</Label>
            <Tabs value={cvInputType} onValueChange={value => setCvInputType(value as "upload" | "text")}>
              <TabsList className="grid w-full grid-cols-2 h-auto">
                <TabsTrigger value="upload" className="text-xs sm:text-sm py-2 sm:py-2.5">Upload de arquivo</TabsTrigger>
                <TabsTrigger value="text" className="text-xs sm:text-sm py-2 sm:py-2.5">Colar texto</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-3 sm:mt-4">
                <UploadArea label="" description="Envie seu CV em PDF, DOC ou DOCX" onFileSelect={setCvFile} accept=".pdf,.doc,.docx" maxSize={5} />
              </TabsContent>
              
              <TabsContent value="text" className="mt-3 sm:mt-4">
                <Textarea placeholder="Cole aqui o texto completo do seu currículo..." value={cvText} onChange={e => setCvText(e.target.value)} className="min-h-[120px] sm:min-h-[140px] resize-none text-sm sm:text-base" />
              </TabsContent>
            </Tabs>
          </div>

          {/* Job Input */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm sm:text-base font-semibold">Vaga de Interesse</Label>
            
            {/* Aviso de nova tentativa */}
            {showRetryMessage && <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-red-800 mb-1">
                  🔄 Nova tentativa necessária
                </p>
                <p className="text-xs text-red-700">
                  A URL anterior não pôde ser processada automaticamente. 
                  Cole o texto completo da vaga abaixo para obter uma análise precisa.
                </p>
              </div>}
            
            <Tabs value={jobInputType} onValueChange={value => !forceTextOnly && setJobInputType(value as "url" | "text")}>
              <TabsList className="grid w-full grid-cols-2 h-auto">
                <TabsTrigger value="text" className="text-xs sm:text-sm py-2 sm:py-2.5">Descrição</TabsTrigger>
                <TabsTrigger value="url" disabled={forceTextOnly} className="text-xs sm:text-sm py-2 sm:py-2.5">Link da vaga</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text" className="mt-3 sm:mt-4">
                <Textarea placeholder={forceTextOnly ? "Cole aqui o texto completo da vaga que não pôde ser lida automaticamente..." : "Cole aqui a descrição completa da vaga..."} value={jobText} onChange={e => setJobText(e.target.value)} className="min-h-[120px] sm:min-h-[140px] resize-none text-sm sm:text-base" />
                {forceTextOnly && <p className="text-xs text-green-700 mt-2 bg-green-50 p-2 rounded border border-green-200">
                    ✅ Usando texto da vaga para análise precisa
                  </p>}
              </TabsContent>
              
              <TabsContent value="url" className="mt-3 sm:mt-4">
                {!forceTextOnly ? <div className="space-y-2">
                    <Input placeholder="https://empresa.com/vaga-exemplo" value={jobUrl} onChange={e => setJobUrl(e.target.value)} className="min-h-[44px] text-sm sm:text-base" />
                    <p className="text-xs text-muted-foreground">Cole a descrição ou link da vaga no LinkedIn, Catho, InfoJobs ou site da empresa</p>
                    <div className="mt-3 p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800">
                        <strong>Não conseguimos ler automaticamente?</strong><br />
                        Algumas plataformas (como Gupy e Vale) bloqueiam leitura automática. 
                        Se isso acontecer, você será informado para colar o texto da vaga manualmente.
                      </p>
                    </div>
                  </div> : <div className="p-3 sm:p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-xs sm:text-sm text-gray-600 text-center">
                      Opção temporariamente desabilitada.<br />
                      Use a aba "Descrição" para colar o texto da vaga.
                    </p>
                  </div>}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="pt-2 sm:pt-4">
          <Button onClick={handleAnalyze} disabled={isAnalyzing} variant="hero" size="lg" className="w-full min-h-[48px] sm:min-h-[52px] text-base">
            {isAnalyzing ? <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2">Analisando seu currículo...</span>
              </> : <>
                <Sparkles className="h-5 w-5" />
                <span className="ml-2">Analisar Gratuitamente</span>
              </>}
          </Button>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground text-center leading-relaxed px-2">
          <strong>Análise gratuita robusta:</strong> Suas primeiras 2 análises incluem IA avançada com recomendações detalhadas.
          <br className="hidden sm:block" />
          <span className="block sm:inline sm:ml-1">Após isso, análises básicas gratuitas ou upgrade para análise premium completa.</span>
        </p>

        {/* Resultado será mostrado na página dedicada */}
        {/* Removido o resultado inline pois agora redireciona para página específica */}
      </CardContent>
    </Card>;
}