import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";
import { downloadPDF } from "@/lib/report";
import { toast } from "@/hooks/use-toast";

interface ScoreProgressProps {
  score: number;
  className?: string;
  diagnosticoId?: string;
  showPdfDownload?: boolean;
  isPaid?: boolean;
  analises_restantes?: number;
  onNavigate?: (path: string) => void;
}

export function ScoreProgress({ 
  score, 
  className, 
  diagnosticoId, 
  showPdfDownload = false,
  isPaid = false,
  analises_restantes,
  onNavigate
}: ScoreProgressProps) {
  const getScoreText = (score: number) => {
    if (score >= 80) return "Excelente";
    if (score >= 60) return "Bom";
    return "Precisa melhorar";
  };

  const handlePdfAction = () => {
    if (isPaid) {
      // Usuário premium -> baixa o relatório
      if (diagnosticoId) {
        downloadPDF(diagnosticoId);
      }
    } else if (analises_restantes === 0) {
      // Usuário gratuito sem análises -> redireciona assinatura
      if (onNavigate) {
        onNavigate("/assinatura");
      }
    } else {
      // Ainda tem análises grátis, mas PDF é Premium
      toast({
        title: "Disponível apenas no Premium",
        description: "O download do PDF está liberado apenas para assinantes Premium.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("text-center space-y-6 py-8", className)}>
      {/* Title */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Pontuação ATS
        </h2>
        <p className="text-muted-foreground">
          Compatibilidade com sistemas de recrutamento
        </p>
      </div>

      {/* Large Score Display */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-6xl font-bold text-warning">
            {score}
          </span>
          <span className="text-2xl text-muted-foreground font-medium">
            /100
          </span>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto">
          <Progress 
            value={score} 
            className="h-3"
          />
        </div>

        {/* Classification Text */}
        <div className="mt-4">
          <span className="text-lg font-semibold text-foreground">
            {getScoreText(score)}
          </span>
        </div>
      </div>

      {/* PDF Download Button */}
      {showPdfDownload && diagnosticoId && (
        <div className="pt-4">
          <Button 
            onClick={handlePdfAction}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {isPaid ? "Baixar Relatório (PDF)" : "Desbloquear no Premium"}
          </Button>
        </div>
      )}
    </div>
  );
}