import { cn } from '../../lib/utils';
import { forwardRef } from 'react';

const Input = forwardRef(({ className, type, icon: Icon, error, ...props }, ref) => {
  return (
    <div className="relative w-full">
      {Icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-mut">
          <Icon size={18} />
        </div>
      )}
      <input
        type={type}
        className={cn(
          "flex w-full rounded-2xl border border-earth-dark/10 bg-earth-card px-5 py-3.5 text-sm transition-all shadow-inner text-earth-brown font-bold",
          "placeholder:text-earth-mut focus:outline-none focus:border-earth-primary/50 focus:bg-earth-main focus:ring-4 focus:ring-accent-500/5",
          "disabled:cursor-not-allowed disabled:bg-earth-main disabled:text-earth-mut",
          Icon && "pl-12",
          error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/5",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="mt-2 text-[10px] text-red-400 font-black uppercase tracking-widest pl-2">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";

export { Input };
