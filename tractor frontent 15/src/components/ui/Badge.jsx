import { cn } from '../../lib/utils';

export function Badge({ children, variant = "default", className }) {
  const variants = {
    default: "bg-earth-card-alt text-earth-brown border border-earth-dark/10",
    primary: "bg-earth-primary/10 text-earth-green border border-emerald-500/20",
    success: "bg-earth-primary/10 text-earth-green border border-emerald-500/20",
    warning: "bg-earth-primary/10 text-earth-primary border border-earth-primary/20",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20",
    outline: "text-earth-sub border border-earth-dark/15"
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black tracking-[0.1em] uppercase shadow-sm",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
