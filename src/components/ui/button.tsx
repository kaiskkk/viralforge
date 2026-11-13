import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

type StyleProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-black hover:brightness-110 active:scale-[0.98]",
  secondary: "hairline bg-white/[0.04] text-fg hover:bg-white/[0.08]",
  ghost: "text-muted hover:bg-white/[0.05] hover:text-fg",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

/** Classes d'un bouton, réutilisables sur un <Link> : `className={buttonClasses()}`. */
export function buttonClasses({ variant = "primary", size = "md", className }: StyleProps = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps;

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
