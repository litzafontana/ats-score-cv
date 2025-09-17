import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";
import { downloadPDF } from "@/lib/report";

interface ScoreProgressProps {
  score: number;
  className?: string;
  diagnosticoId?: string;
  showPdfDownload?: boolean;
  isPaid?: boolean;
}

export function ScoreProgress({ 
  score, 
  className, 
  diagnosticoId, 
  showPdfDownload = false,
  isPaid = false 
}: ScoreProgressProps) {
  const getScoreText = (score: number) => {
    if (score >= 80) return "Excelente";
    if (score >= 60) return "Bom";
    return "Precisa melhorar";
  };

  const handleDownloadPDF = () => {
    if (diagnosticoId) {
      downloadPDF(diagnosticoId);
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
      {showPdfDownload && isPaid && diagnosticoId && (
        <div className="pt-4">
          <Button 
            onClick={handleDownloadPDF}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Relatório (PDF)
          </Button>
        </div>
      )}
    </div>
  );
}