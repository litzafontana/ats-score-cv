import { cn } from "@/lib/utils";
import logoImage from "@/assets/ats-logo.png";

interface ATSScoreLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ATSScoreLogo({ className, size = "md" }: ATSScoreLogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8 sm:h-10 sm:w-10",
    md: "h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14", 
    lg: "h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24"
  };

  return (
    <img 
      src={logoImage} 
      alt="ATS Score Logo" 
      className={cn("transition-all duration-200 hover:scale-105", sizeClasses[size], className)}
    />
  );
}