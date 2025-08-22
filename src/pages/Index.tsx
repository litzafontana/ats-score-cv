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
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ATS Score
            </span>
          </div>
          <Button variant="outline" size="sm">
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6 px-4 py-2">
            <Zap className="h-4 w-4 mr-2" />
            Análise instantânea com IA
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Sua{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              pontuação
            </span>{" "}
            para passar no filtro dos{" "}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              recrutadores
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            Descubra em segundos se o seu currículo está pronto para vencer o robô do recrutamento. 
            Receba sua nota ATS e saiba exatamente o que melhorar para chegar à entrevista.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              variant="hero" 
              size="lg" 
              className="shadow-2xl"
              onClick={() => {
                const formSection = document.getElementById('diagnostic-form');
                formSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Analisar meu CV grátis
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Link to="/analisador">
              <Button 
                variant="outline" 
                size="lg" 
                className="shadow-lg bg-white/80 backdrop-blur border-primary/20 hover:bg-primary/5"
              >
                <Brain className="h-5 w-5 mr-2" />
                Análise Avançada
              </Button>
            </Link>
            <ExampleAnalysisModal />
          </div>

          {/* Preview Score Card */}
          <Card className="max-w-md mx-auto shadow-xl border-0 bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-2">Exemplo de resultado:</div>
              <ScoreProgress score={73} />
              <div className="mt-4 space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-warning"></div>
                  <span>Adicionar palavras-chave específicas</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-danger"></div>
                  <span>Melhorar formatação para ATS</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Por que usar o ATS Score?</h2>
            <p className="text-lg text-muted-foreground">
              Ferramenta profissional usada por milhares de candidatos
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 border-0 shadow-lg bg-white/80 backdrop-blur">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Análise Instantânea</h3>
              <p className="text-muted-foreground">
                Resultado em segundos com tecnologia de IA avançada
              </p>
            </Card>
            
            <Card className="p-6 border-0 shadow-lg bg-white/80 backdrop-blur">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-2">100% Preciso</h3>
              <p className="text-muted-foreground">
                Simula sistemas reais de recrutamento das maiores empresas
              </p>
            </Card>
            
            <Card className="p-6 border-0 shadow-lg bg-white/80 backdrop-blur">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Seguro e Privado</h3>
              <p className="text-muted-foreground">
                Seus dados são protegidos e nunca compartilhados
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Form */}
      <section id="diagnostic-form" className="py-16 px-4">
        <div className="container mx-auto">
          <DiagnosticForm />
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2024 ATS Score. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
