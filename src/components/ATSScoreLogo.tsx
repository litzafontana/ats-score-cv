import { cn } from "@/lib/utils";

interface ATSScoreLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ATSScoreLogo({ className, size = "md" }: ATSScoreLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  const barSizes = {
    sm: { w: "w-0.5", h1: "h-1.5", h2: "h-2", h3: "h-2.5" },
    md: { w: "w-0.5", h1: "h-2", h2: "h-2.5", h3: "h-3" },
    lg: { w: "w-1", h1: "h-3", h2: "h-4", h3: "h-5" }
  };

  const checkSizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5", 
    lg: "w-4 h-4"
  };

  const strokeWidths = {
    sm: 2.5,
    md: 3,
    lg: 2.5
  };

  return (
    <div className={cn(
      "rounded-xl bg-gradient-to-br from-foreground/95 to-foreground shadow-sm flex items-center justify-center relative overflow-hidden",
      sizeClasses[size],
      className
    )}>
      {/* White document background */}
      <div className="absolute inset-1 bg-white rounded-lg overflow-hidden">
        {/* Document with folded corner effect */}
        <div className="relative w-full h-full bg-white">
          {/* Folded corner shadow effect */}
          <div className="absolute top-0 right-0 w-2 h-2 bg-muted/40"></div>
          <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-muted/60"></div>
          
          {/* Main content area */}
          <div className="absolute inset-1 flex items-center justify-center gap-0.5">
            {/* Bar chart with gradient colors */}
            <div className="flex items-end gap-px">
              <div className={cn("bg-accent/70 rounded-sm", barSizes[size].w, barSizes[size].h1)}></div>
              <div className={cn("bg-accent/85 rounded-sm", barSizes[size].w, barSizes[size].h2)}></div>
              <div className={cn("bg-success rounded-sm", barSizes[size].w, barSizes[size].h3)}></div>
            </div>
            
            {/* Success checkmark with proper circular background */}
            <div className={cn(
              "bg-success rounded-full flex items-center justify-center ml-0.5 shadow-sm",
              checkSizes[size]
            )}>
              <svg
                className="text-white"
                style={{ width: '60%', height: '60%' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={strokeWidths[size]}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}