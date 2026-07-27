import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-arena-blue text-white shadow-glow hover:bg-[#3b9cff] active:bg-[#1675d8]",
  secondary: "border border-arena-line bg-white/[.06] text-arena-text hover:bg-white/[.1]",
  ghost: "text-arena-muted hover:bg-white/[.07] hover:text-arena-text",
  danger: "bg-arena-danger text-white hover:bg-red-500"
};

export function Button({ className, variant = "primary", loading, icon, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-arena px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
