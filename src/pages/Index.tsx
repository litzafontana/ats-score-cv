import { DiagnosticForm } from "@/components/DiagnosticForm";
import { ScoreProgress } from "@/components/ScoreProgress";
import ExampleAnalysisModal from "@/components/ExampleAnalysisModal";
import FAQSection from "@/components/FAQSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Target, Zap, Shield, ArrowRight, Brain } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  console.log("Index component is rendering");
  return (
    <div className="min-h-screen animated-gradient relative overflow-hidden">
      {/* Particle Background */}
      <div className="particles-bg"></div>
      
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center hover-glow">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">
              ATS Score
            </span>
          </div>
          <Button variant="outline" size="sm" className="glass-effect hover-glow">
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-8 px-6 py-3 glass-effect hover-scale">
            <Zap className="h-4 w-4 mr-2" />
            Análise instantânea com IA
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Sua{" "}
            <span className="gradient-text text-glow">
              pontuação
            </span>{" "}
            para passar no filtro dos{" "}
            <span className="gradient-text text-glow">
              recrutadores
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
            Descubra em segundos se o seu currículo está pronto para vencer o robô do recrutamento. 
            Receba sua nota ATS e saiba exatamente o que melhorar para chegar à entrevista.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button 
              variant="hero" 
              size="lg" 
              className="pulse-glow hover-scale text-lg px-8 py-4"
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
          <Card className="max-w-md mx-auto glass-effect border-0 hover-glow hover-scale">
            <CardContent className="p-8">
              <div className="text-sm text-muted-foreground mb-4">Exemplo de resultado:</div>
              <ScoreProgress score={73} />
              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-warning animate-pulse"></div>
                  <span>Adicionar palavras-chave específicas</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-danger animate-pulse"></div>
                  <span>Melhorar formatação para ATS</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 gradient-text">Por que usar o ATS Score?</h2>
            <p className="text-xl text-muted-foreground">
              Ferramenta profissional usada por milhares de candidatos
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border-0 glass-effect hover-glow hover-scale">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 hover-glow">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Análise Instantânea</h3>
              <p className="text-muted-foreground">
                Resultado em segundos com tecnologia de IA avançada
              </p>
            </Card>
            
            <Card className="p-8 border-0 glass-effect hover-glow hover-scale">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-6 hover-glow">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-3">100% Preciso</h3>
              <p className="text-muted-foreground">
                Simula sistemas reais de recrutamento das maiores empresas
              </p>
            </Card>
            
            <Card className="p-8 border-0 glass-effect hover-glow hover-scale">
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-6 hover-glow">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Seguro e Privado</h3>
              <p className="text-muted-foreground">
                Seus dados são protegidos e nunca compartilhados
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Form */}
      <section id="diagnostic-form" className="py-20 px-4">
        <div className="container mx-auto">
          <DiagnosticForm />
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <footer className="border-t glass-effect py-12 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2024 ATS Score. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
