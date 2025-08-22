import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadArea } from "./UploadArea";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DiagnosticForm() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [email, setEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [cvInputType, setCvInputType] = useState<"upload" | "text">("upload");
  const [jobInputType, setJobInputType] = useState<"url" | "text">("url");
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

    setIsAnalyzing(true);
    
    try {
      // Prepare CV content
      let cvContent = '';
      if (cvInputType === "upload" && cvFile) {
        cvContent = `[Arquivo enviado: ${cvFile.name}] - Conteúdo será extraído automaticamente`;
      } else if (cvInputType === "text" && cvText.trim()) {
        cvContent = cvText.trim();
      }

      // Prepare job description
      let jobDescription = '';
      if (jobInputType === "url" && jobUrl.trim()) {
        jobDescription = `[URL da vaga: ${jobUrl.trim()}] - Conteúdo será extraído automaticamente`;
      } else if (jobInputType === "text" && jobText.trim()) {
        jobDescription = jobText.trim();
      }

      // Validate minimum content length
      if (cvContent.length < 50) {
        toast({
          title: "Conteúdo insuficiente",
          description: "O CV deve ter pelo menos 50 caracteres para análise.",
          variant: "destructive"
        });
        return;
      }

      if (jobDescription.length < 50) {
        toast({
          title: "Conteúdo insuficiente", 
          description: "A descrição da vaga deve ter pelo menos 50 caracteres para análise.",
          variant: "destructive"
        });
        return;
      }

      // Call API
      const response = await fetch('https://hytkdtgndmljgxwuutyu.supabase.co/functions/v1/diagnostico', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          cv_content: cvContent,
          job_description: jobDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na análise');
      }

      const result = await response.json();
      
      toast({
        title: "Análise concluída!",
        description: "Seu CV foi analisado com sucesso. Redirecionando...",
      });
      
      // Redirect to results page
      window.location.href = `/resultado/${result.id}`;
      
    } catch (error) {
      console.error('Erro na análise:', error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Ocorreu um erro durante a análise. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
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
      </CardContent>
    </Card>
  );
}