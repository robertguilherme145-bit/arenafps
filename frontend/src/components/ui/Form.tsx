import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-arena border border-arena-line bg-black/25 px-3 text-sm text-arena-text placeholder:text-arena-muted transition focus:border-arena-cyan",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-arena border border-arena-line bg-black/25 px-3 text-sm text-arena-text transition focus:border-arena-cyan",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-semibold uppercase tracking-[.14em] text-arena-muted", className)} {...props} />;
}
