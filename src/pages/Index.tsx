import { DiagnosticForm } from "@/components/DiagnosticForm";
import { ScoreProgress } from "@/components/ScoreProgress";
import ExampleAnalysisModal from "@/components/ExampleAnalysisModal";
import FAQSection from "@/components/FAQSection";
import { ATSScoreLogo } from "@/components/ATSScoreLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Target, Zap, Shield, ArrowRight, Brain } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  console.log("Index component is rendering");
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ATSScoreLogo />
            <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ATS Score
            </span>
          </div>
          <Button variant="outline" size="sm" className="min-h-[44px]">
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Análise instantânea com IA
          </Badge>
          
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight px-2">
            Sua{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              pontuação
            </span>{" "}
            para passar no filtro dos{" "}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              recrutadores
            </span>
          </h1>
          
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto px-2">
            Descubra em segundos se o seu currículo está pronto para vencer o robô do recrutamento. 
            Receba sua nota ATS e saiba exatamente o que melhorar para chegar à entrevista.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-2">
            <Button 
              variant="hero" 
              size="lg" 
              className="shadow-2xl min-h-[48px] sm:min-h-[44px] text-base"
              onClick={() => {
                const formSection = document.getElementById('diagnostic-form');
                formSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Analisar meu CV grátis
              <ArrowRight className="h-5 w-5" />
            </Button>
            <ExampleAnalysisModal />
          </div>

          {/* Preview Score Card */}
          <Card className="max-w-md mx-2 sm:mx-auto shadow-xl border-0 bg-white/80 backdrop-blur">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-muted-foreground mb-2">Exemplo de resultado:</div>
              <ScoreProgress score={73} />
              <div className="mt-3 sm:mt-4 space-y-2 text-left">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className="h-2 w-2 rounded-full bg-warning flex-shrink-0"></div>
                  <span>Adicionar palavras-chave específicas</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className="h-2 w-2 rounded-full bg-danger flex-shrink-0"></div>
                  <span>Melhorar formatação para ATS</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4 bg-white/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 sm:mb-12 px-2">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Por que usar o ATS Score?</h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
              Ferramenta profissional usada por milhares de candidatos
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <Card className="p-4 sm:p-6 border-0 shadow-lg bg-white/80 backdrop-blur">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Análise Instantânea</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Resultado em segundos com tecnologia de IA avançada
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 border-0 shadow-lg bg-white/80 backdrop-blur">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-success/10 flex items-center justify-center mb-3 sm:mb-4">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">100% Preciso</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Simula sistemas reais de recrutamento das maiores empresas
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 border-0 shadow-lg bg-white/80 backdrop-blur sm:col-span-2 lg:col-span-1">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-accent/10 flex items-center justify-center mb-3 sm:mb-4">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Seguro e Privado</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Seus dados são protegidos e nunca compartilhados
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Form */}
      <section id="diagnostic-form" className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4">
        <div className="container mx-auto">
          <DiagnosticForm />
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm py-6 sm:py-8 px-3 sm:px-4">
        <div className="container mx-auto text-center text-xs sm:text-sm text-muted-foreground">
          <p>&copy; 2024 ATS Score. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
