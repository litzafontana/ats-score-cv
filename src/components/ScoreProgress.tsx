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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    return "text-yellow-600";
  };

  return (
    <div className={cn("space-y-6 py-8", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-muted-foreground">
            Pontuação ATS
          </h2>
        </div>
        <div className={cn("px-3 py-1 rounded-full text-sm font-medium", 
          score >= 80 ? "bg-green-100 text-green-700" :
          score >= 60 ? "bg-blue-100 text-blue-700" :
          "bg-yellow-100 text-yellow-700"
        )}>
          ✅ {getScoreText(score)}
        </div>
      </div>

      {/* Score and Progress */}
      <div className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-foreground">
            {score}
          </span>
          <span className="text-xl text-muted-foreground font-medium">
            /100
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <Progress 
            value={score} 
            className="h-2"
          />
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