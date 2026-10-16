import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

type ButtonVariant = "primary" | "urgent" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "chamfer bg-arena-blue text-arena-ink hover:bg-cyan-300 active:bg-cyan-500",
  urgent: "chamfer bg-arena-amber text-arena-ink hover:bg-[#ffc14d] active:bg-[#e69c12]",
  secondary: "border border-arena-line bg-arena-panel text-arena-text hover:border-arena-muted hover:bg-arena-panel2",
  ghost: "text-arena-muted hover:bg-white/[.06] hover:text-arena-text",
  danger: "bg-arena-danger text-white hover:bg-[#ff6574]"
};

export function Button({ className, variant = "primary", loading, icon, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-arena px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
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
