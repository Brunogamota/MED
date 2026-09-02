import * as React from "react"

import { cn } from "@/lib/cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8.5 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-base shadow-xs transition-[box-shadow,border-color] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/72 focus-visible:border-ring focus-visible:shadow-none focus-visible:ring-3 focus-visible:ring-ring/24 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-64 disabled:shadow-none aria-invalid:border-destructive/60 aria-invalid:shadow-none aria-invalid:ring-3 aria-invalid:ring-destructive/16 md:text-sm dark:bg-input/32 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/24",
        // Fio de luz no topo (claro) e na base (escuro): e o que da relevo ao
        // campo sem sombra pesada. Some no foco, no invalido e no desabilitado.
        "not-disabled:not-focus-visible:not-aria-invalid:inset-shadow-[0_1px_rgb(0_0_0/0.04)] dark:not-disabled:not-focus-visible:not-aria-invalid:inset-shadow-[0_-1px_rgb(255_255_255/0.06)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
