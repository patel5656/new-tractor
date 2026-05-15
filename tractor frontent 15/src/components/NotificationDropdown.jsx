import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, MessageSquare, X, Calendar, Briefcase, Calculator, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../context/NotificationContext';
import { cn } from '../lib/utils';

// Helper to get relative time
const getTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Map notification types to icons and colors
const TYPE_CONFIG = {
  booking: { icon: Calendar, color: 'text-earth-primary', bg: 'bg-earth-primary/10' },
  assignment: { icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  tracking: { icon: Truck, color: 'text-earth-green', bg: 'bg-earth-green/10' },
  payment: { icon: CreditCardIcon, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  general: { icon: MessageSquare, color: 'text-earth-brown', bg: 'bg-earth-card-alt' },
};

// Fallback for icons not imported directly
function CreditCardIcon(props) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

export default function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2.5 transition-all duration-300 rounded-xl border group",
          isOpen 
            ? "bg-earth-card border-earth-primary text-earth-primary shadow-[0_0_20px_rgba(46,125,50,0.15)] shadow-inner" 
            : "bg-earth-card-alt border-earth-dark/15 text-earth-sub hover:text-earth-primary hover:border-earth-primary/50 hover:bg-earth-card"
        )}
      >
        <Bell size={20} className={cn("transition-transform duration-300", isOpen ? "scale-110" : "group-hover:rotate-12")} />
        
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-earth-card shadow-sm animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="absolute right-0 mt-4 w-[340px] sm:w-[380px] bg-earth-card border border-earth-dark/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[1003] overflow-hidden origin-top-right"
          >
            {/* Header */}
            <div className="p-4 border-b border-earth-dark/10 flex items-center justify-between bg-earth-card-alt/30">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[11px] uppercase tracking-widest text-earth-brown">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-earth-primary/10 text-earth-primary text-[9px] font-black rounded-lg">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                    className="text-[9px] uppercase font-black text-earth-primary hover:text-earth-brown transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-earth-mut hover:text-earth-brown">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[450px] overflow-y-auto scrollbar-hide">
              {notifications.length > 0 ? (
                <div className="divide-y divide-earth-dark/5">
                  {notifications.map((n) => {
                    const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
                    const Icon = config.icon;
                    
                    return (
                      <div 
                        key={n.id} 
                        onClick={() => handleItemClick(n)}
                        className={cn(
                          "p-4 hover:bg-earth-card-alt/50 transition-all duration-200 cursor-pointer group relative",
                          !n.isRead && "bg-earth-primary/[0.03]"
                        )}
                      >
                        {!n.isRead && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-earth-primary"></div>
                        )}
                        <div className="flex gap-4 items-start pr-8">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-transparent transition-all group-hover:scale-110",
                            config.bg, config.color
                          )}>
                            <Icon size={18} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <p className={cn(
                                "text-[13px] leading-tight transition-colors pr-2",
                                !n.isRead ? "font-black text-earth-brown" : "font-bold text-earth-sub"
                              )}>
                                {n.message}
                              </p>
                              <span className="text-[9px] font-bold text-earth-mut whitespace-nowrap">
                                {getTimeAgo(n.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-black text-earth-mut uppercase tracking-wider">
                                {n.type}
                              </p>
                              {!n.isRead && (
                                <div className="w-1.5 h-1.5 rounded-full bg-earth-primary"></div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Delete Button */}
                        <button 
                          onClick={(e) => handleDeleteClick(e, n.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-earth-mut hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                          title="Remove notification"
                        >
                          <X size={14} className="stroke-[3]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 bg-earth-card-alt rounded-3xl flex items-center justify-center mx-auto mb-4 text-earth-mut/30">
                    <Bell size={28} />
                  </div>
                  <p className="text-[11px] font-black text-earth-mut uppercase tracking-widest">Your inbox is clean</p>
                  <p className="text-[10px] text-earth-mut/60 font-bold mt-1">Check back later for updates</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-earth-card-alt/50 text-center border-t border-earth-dark/10">
              {notifications.length > 0 ? (
                <button 
                  className="w-full py-2 text-[10px] uppercase font-black text-red-500 hover:text-red-600 transition-colors tracking-widest flex items-center justify-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllNotifications();
                  }}
                >
                  <X size={12} className="stroke-[3]" /> Clear All Notifications
                </button>
              ) : (
                <button 
                  className="w-full py-2 text-[10px] uppercase font-black text-earth-mut hover:text-earth-brown transition-colors tracking-widest"
                  onClick={() => setIsOpen(false)}
                >
                  Close Panel
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
