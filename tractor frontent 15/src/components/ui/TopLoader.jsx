import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TopLoader component - Implementation of a high-end, minimalist 
 * progress bar that triggers on page navigation to provide instant feedback.
 */
export function TopLoader() {
  const { isNavigating, loadingKey } = useUI();

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[2px] md:h-1">
      <AnimatePresence mode="wait">
        {isNavigating && (
          <motion.div
            key={loadingKey}
            initial={{ width: "0%", opacity: 1 }}
            animate={{ 
              width: ["0%", "30%", "70%", "95%"],
              transition: { 
                duration: 0.6, 
                ease: "easeOut",
                times: [0, 0.4, 0.7, 1]
              }
            }}
            exit={{ 
              width: "100%", 
              opacity: 0,
              transition: { duration: 0.3 }
            }}
            className="h-full bg-accent shadow-[0_0_10px_rgba(234,179,8,0.5)]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
