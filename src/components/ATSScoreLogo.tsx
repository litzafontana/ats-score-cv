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
    sm: { w: "w-1", h1: "h-2", h2: "h-2.5", h3: "h-3" },
    md: { w: "w-1", h1: "h-2.5", h2: "h-3", h3: "h-4" },
    lg: { w: "w-1.5", h1: "h-4", h2: "h-5", h3: "h-6" }
  };

  const checkSizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5", 
    lg: "w-3 h-3"
  };

  const strokeWidths = {
    sm: 2,
    md: 2.5,
    lg: 2
  };

  return (
    <div className={cn(
      "rounded-full bg-gradient-to-br from-primary via-accent to-success p-0.5 shadow-sm",
      sizeClasses[size],
      className
    )}>
      {/* White circular background */}
      <div className="w-full h-full bg-white rounded-full flex items-center justify-center relative">
        {/* Content container */}
        <div className="flex items-center justify-center gap-1">
          {/* Bar chart with gradient colors */}
          <div className="flex items-end gap-0.5">
            <div className={cn("bg-gradient-to-t from-primary to-primary/80 rounded-sm", barSizes[size].w, barSizes[size].h1)}></div>
            <div className={cn("bg-gradient-to-t from-accent to-accent/80 rounded-sm", barSizes[size].w, barSizes[size].h2)}></div>
            <div className={cn("bg-gradient-to-t from-success to-success/80 rounded-sm", barSizes[size].w, barSizes[size].h3)}></div>
          </div>
          
          {/* Success checkmark */}
          <div className={cn(
            "flex items-center justify-center",
            checkSizes[size]
          )}>
            <svg
              className="text-success"
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
  );
}