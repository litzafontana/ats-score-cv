import { cn } from "@/lib/utils";

interface ScoreProgressProps {
  score: number;
  className?: string;
}

export function ScoreProgress({ score, className }: ScoreProgressProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 60) return "bg-warning";
    return "bg-danger";
  };

  const getScoreText = (score: number) => {
    if (score >= 80) return "Excelente";
    if (score >= 60) return "Bom";
    return "Precisa melhorar";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Pontuação ATS
        </span>
        <span className="text-2xl font-bold text-foreground">{score}</span>
      </div>
      
      <div className="relative">
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-1000 ease-out rounded-full",
              getScoreColor(score)
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="mt-2 text-center">
          <span className={cn(
            "text-sm font-medium",
            score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-danger"
          )}>
            {getScoreText(score)}
          </span>
        </div>
      </div>
    </div>
  );
}