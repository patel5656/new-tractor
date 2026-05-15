import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("bg-earth-card-alt rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden group transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("px-6 py-5 flex flex-col gap-1.5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("font-black text-earth-brown tracking-tight uppercase text-sm", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-[10px] uppercase font-bold text-earth-mut tracking-widest", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn("px-6 py-5 bg-earth-card/50 flex items-center", className)} {...props}>
      {children}
    </div>
  );
}
