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
    let cvContent = '';
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
    if (cvInputType === "upload" && cvFile) {
      cvContent = `[Arquivo enviado: ${cvFile.name}] - Conteúdo será extraído automaticamente`;
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
    if (!vagaTexto.trim() || !cvContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a vaga e o currículo para continuar",
        variant: "destructive"
      });
      return;
    }
    if (vagaTexto.length < 50 || cvContent.length < 50) {
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
      toast({
        title: "Analisando currículo",
        description: "Processando seu CV e comparando com a vaga..."
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
        throw new Error(diagnosticoError.message);
      }
      console.log("✅ Diagnóstico concluído:", diagnosticoData);

      // Redirecionar para a página de resultado
      window.location.href = `/resultado/${diagnosticoData.id}`;
    } catch (error: any) {
      console.error("❌ Erro na análise:", error);
      toast({
        title: "Erro na análise",
        description: error.message || "Tente novamente em alguns momentos",
        variant: "destructive"
      });
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
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Análise ATS do seu Currículo
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Descubra em segundos se seu CV está otimizado para sistemas de recrutamento<br />
          <span className="text-sm font-medium text-primary">
            ✨ Primeiras 2 análises robustas GRATUITAS com IA
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="email">Email para receber o resultado</Label>
          <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* CV Input */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Seu Currículo</Label>
            <Tabs value={cvInputType} onValueChange={value => setCvInputType(value as "upload" | "text")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload de arquivo</TabsTrigger>
                <TabsTrigger value="text">Colar texto</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-4">
                <UploadArea label="" description="Envie seu CV em PDF, DOC ou DOCX" onFileSelect={setCvFile} accept=".pdf,.doc,.docx" maxSize={5} />
              </TabsContent>
              
              <TabsContent value="text" className="mt-4">
                <Textarea placeholder="Cole aqui o texto completo do seu currículo..." value={cvText} onChange={e => setCvText(e.target.value)} className="min-h-[120px] resize-none" />
              </TabsContent>
            </Tabs>
          </div>

          {/* Job Input */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Vaga de Interesse</Label>
            
            {/* Aviso de nova tentativa */}
            {showRetryMessage && <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">
                  🔄 Nova tentativa necessária
                </p>
                <p className="text-xs text-red-700">
                  A URL anterior não pôde ser processada automaticamente. 
                  Cole o texto completo da vaga abaixo para obter uma análise precisa.
                </p>
              </div>}
            
            <Tabs value={jobInputType} onValueChange={value => !forceTextOnly && setJobInputType(value as "url" | "text")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" disabled={forceTextOnly}>Link da vaga</TabsTrigger>
                <TabsTrigger value="text">Descrição</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="mt-4">
                {!forceTextOnly ? <div className="space-y-2">
                    <Input placeholder="https://empresa.com/vaga-exemplo" value={jobUrl} onChange={e => setJobUrl(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Cole a descrição ou link da vaga no LinkedIn, Catho, InfoJobs ou site da empresa</p>
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800">
                        <strong>Não conseguimos ler automaticamente?</strong><br />
                        Algumas plataformas (como Gupy e Vale) bloqueiam leitura automática. 
                        Se isso acontecer, você será informado para colar o texto da vaga manualmente.
                      </p>
                    </div>
                  </div> : <div className="p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-sm text-gray-600 text-center">
                      Opção temporariamente desabilitada.<br />
                      Use a aba "Descrição" para colar o texto da vaga.
                    </p>
                  </div>}
              </TabsContent>
              
              <TabsContent value="text" className="mt-4">
                <Textarea placeholder={forceTextOnly ? "Cole aqui o texto completo da vaga que não pôde ser lida automaticamente..." : "Cole aqui a descrição completa da vaga..."} value={jobText} onChange={e => setJobText(e.target.value)} className="min-h-[120px] resize-none" />
                {forceTextOnly && <p className="text-xs text-green-700 mt-2 bg-green-50 p-2 rounded border border-green-200">
                    ✅ Usando texto da vaga para análise precisa
                  </p>}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={handleAnalyze} disabled={isAnalyzing} variant="hero" size="lg" className="w-full">
            {isAnalyzing ? <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analisando seu currículo...
              </> : <>
                <Sparkles className="h-5 w-5" />
                Analisar Gratuitamente
              </>}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          <strong>Análise gratuita robusta:</strong> Suas primeiras 2 análises incluem IA avançada com recomendações detalhadas.<br />
          Após isso, análises básicas gratuitas ou upgrade para análise premium completa.
        </p>

        {/* Resultado será mostrado na página dedicada */}
        {/* Removido o resultado inline pois agora redireciona para página específica */}
      </CardContent>
    </Card>;
}