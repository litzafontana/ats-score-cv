import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, FileText, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ResultadoAnalise } from "./ResultadoAnalise";
import type { AnaliseResult } from "@/lib/aiSchema";

export function AnalisadorATS() {
  const [vagaTexto, setVagaTexto] = useState("");
  const [curriculoTexto, setCurriculoTexto] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<AnaliseResult | null>(null);
  const { toast } = useToast();

  const handleAnalizar = async () => {
    if (!vagaTexto.trim() || !curriculoTexto.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a vaga e o currículo para continuar",
        variant: "destructive",
      });
      return;
    }

    if (vagaTexto.length < 50 || curriculoTexto.length < 50) {
      toast({
        title: "Conteúdo insuficiente",
        description: "Vaga e currículo devem ter pelo menos 50 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("🚀 Iniciando análise ATS...");

      // Passo 1: Extrair estrutura do CV
      toast({
        title: "Extraindo dados do CV",
        description: "Analisando a estrutura do seu currículo...",
      });

      const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-cv', {
        body: { curriculo_texto: curriculoTexto }
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
        description: `Sua pontuação ATS: ${scoreData.ats_json.nota_final}/100`,
      });

    } catch (error: any) {
      console.error("❌ Erro na análise:", error);
      toast({
        title: "Erro na análise",
        description: error.message || "Tente novamente em alguns momentos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copiarFrasesProntas = () => {
    if (resultado?.ats_json.frases_prontas) {
      const frases = resultado.ats_json.frases_prontas.join('\n');
      navigator.clipboard.writeText(frases);
      toast({
        title: "Copiado!",
        description: "Frases prontas copiadas para a área de transferência",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Análise ATS do seu Currículo
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Analise a compatibilidade do seu CV com sistemas ATS e obtenha insights detalhados
            para melhorar suas chances de aprovação.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Descrição da Vaga
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="vaga">Cole aqui a descrição da vaga</Label>
              <Textarea
                id="vaga"
                placeholder="Cole a descrição completa da vaga de interesse..."
                value={vagaTexto}
                onChange={(e) => setVagaTexto(e.target.value)}
                className="min-h-[200px] mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {vagaTexto.length} caracteres
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Seu Currículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="curriculo">Cole aqui o texto do seu currículo</Label>
              <Textarea
                id="curriculo"
                placeholder="Cole o conteúdo completo do seu currículo..."
                value={curriculoTexto}
                onChange={(e) => setCurriculoTexto(e.target.value)}
                className="min-h-[200px] mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {curriculoTexto.length} caracteres
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mb-8">
          <Button
            onClick={handleAnalizar}
            disabled={isLoading}
            size="lg"
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              "Analisar Compatibilidade"
            )}
          </Button>
        </div>

        {resultado && (
          <div className="space-y-6">
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
      </div>
    </div>
  );
}