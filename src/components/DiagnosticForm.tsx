import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadArea } from "./UploadArea";
import { Loader2, Sparkles, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ResultadoAnalise } from "./ResultadoAnalise";
import type { AnaliseResult } from "@/lib/aiSchema";

export function DiagnosticForm() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [email, setEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [cvInputType, setCvInputType] = useState<"upload" | "text">("upload");
  const [jobInputType, setJobInputType] = useState<"url" | "text">("url");
  const [resultado, setResultado] = useState<AnaliseResult | null>(null);
  const { toast } = useToast();

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
        variant: "destructive",
      });
      return;
    }

    if (vagaTexto.length < 50 || cvContent.length < 50) {
      toast({
        title: "Conteúdo insuficiente",
        description: "Vaga e currículo devem ter pelo menos 50 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log("🚀 Iniciando análise ATS...");

      // Passo 1: Extrair estrutura do CV
      toast({
        title: "Extraindo dados do CV",
        description: "Analisando a estrutura do seu currículo...",
      });

      const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-cv', {
        body: { curriculo_texto: cvContent }
      });

      if (extractError) {
        throw new Error(extractError.message);
      }

      console.log("✅ CV extraído:", extractData.cv_struct);

      // Passo 2: Análise ATS completa
      toast({
        title: "Analisando compatibilidade ATS",
        description: "Comparando seu CV com a vaga...",
      });

      const { data: scoreData, error: scoreError } = await supabase.functions.invoke('score-ats', {
        body: { 
          vaga_texto: vagaTexto,
          cv_struct: extractData.cv_struct
        }
      });

      if (scoreError) {
        throw new Error(scoreError.message);
      }

      console.log("✅ Análise concluída:", scoreData);

      const analiseResult: AnaliseResult = {
        cv_struct: extractData.cv_struct,
        ats_json: scoreData.ats_json,
        ats_report_md: scoreData.ats_report_md
      };

      setResultado(analiseResult);

      toast({
        title: "Análise concluída!",
        description: `Sua pontuação ATS: ${scoreData.ats_json.overall_score}/100`,
      });

    } catch (error: any) {
      console.error("❌ Erro na análise:", error);
      toast({
        title: "Erro na análise",
        description: error.message || "Tente novamente em alguns momentos",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copiarFrasesProntas = () => {
    if (resultado?.ats_json.ready_to_paste_bullets) {
      const frases = resultado.ats_json.ready_to_paste_bullets.join('\n');
      navigator.clipboard.writeText(frases);
      toast({
        title: "Copiado!",
        description: "Frases prontas copiadas para a área de transferência",
      });
    }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-xl border-0 bg-gradient-to-br from-white to-secondary/30">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Análise ATS do seu Currículo
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Descubra em segundos se seu CV está otimizado para sistemas de recrutamento
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="email">Email para receber o resultado</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* CV Input */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Seu Currículo</Label>
            <Tabs value={cvInputType} onValueChange={(value) => setCvInputType(value as "upload" | "text")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload de arquivo</TabsTrigger>
                <TabsTrigger value="text">Colar texto</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-4">
                <UploadArea
                  label=""
                  description="Envie seu CV em PDF, DOC ou DOCX"
                  onFileSelect={setCvFile}
                  accept=".pdf,.doc,.docx"
                  maxSize={5}
                />
              </TabsContent>
              
              <TabsContent value="text" className="mt-4">
                <Textarea
                  placeholder="Cole aqui o texto completo do seu currículo..."
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Job Input */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Vaga de Interesse</Label>
            <Tabs value={jobInputType} onValueChange={(value) => setJobInputType(value as "url" | "text")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">Link da vaga</TabsTrigger>
                <TabsTrigger value="text">Descrição</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="mt-4">
                <div className="space-y-2">
                  <Input
                    placeholder="https://empresa.com/vaga-exemplo"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole o link da vaga no LinkedIn, Catho, InfoJobs ou site da empresa
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="text" className="mt-4">
                <Textarea
                  placeholder="Cole aqui a descrição completa da vaga..."
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            variant="hero"
            size="lg"
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analisando seu currículo...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Analisar Gratuitamente
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Análise gratuita inclui pontuação geral e principais alertas. 
          Para relatório completo com dicas personalizadas, você pode adquirir o diagnóstico premium.
        </p>

        {resultado && (
          <div className="space-y-6 mt-8">
            <div className="flex justify-center">
              <Button
                onClick={copiarFrasesProntas}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar Frases Prontas
              </Button>
            </div>
            
            <ResultadoAnalise resultado={resultado} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}