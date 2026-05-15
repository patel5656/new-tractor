import { useEffect } from 'react';

/**
 * Hook to lock the body scroll when a modal or overlay is open.
 * @param {boolean} isLocked - Whether the scroll should be locked.
 */
export default function useScrollLock(isLocked) {
  useEffect(() => {
    if (isLocked) {
      // Get the original body overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow;
      
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      
      // Prevent focus shift issues on some browsers/OS
      document.body.style.overscrollBehaviorY = 'none';

      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.overscrollBehaviorY = 'unset';
      };
    }
  }, [isLocked]);
}
