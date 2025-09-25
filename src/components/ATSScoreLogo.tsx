import { cn } from "@/lib/utils";
import logoImage from "@/assets/ats-logo.png";

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

  return (
    <img 
      src={logoImage} 
      alt="ATS Score Logo" 
      className={cn(sizeClasses[size], className)}
    />
  );
}