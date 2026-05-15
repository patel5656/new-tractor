import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Tractor, MapPin, Clock, CreditCard, User, LogOut, Bell, ChevronRight, Menu, ListCollapse, CheckCircle2, AlertCircle, MessageSquare, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';

export default function FarmerLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const farmer = user || dummyFarmers[0];
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [showNotifications, setShowNotifications] = useState(false);
  const sidebarRef = useRef(null);
  const notificationRef = useRef(null);



  // Only close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle window resize - forced expanded for desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle click outside to close sidebar on mobile
  useEffect(() => {
    function handleClickOutside(event) {
      if (window.innerWidth < 1024 && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
    }
    if (isSidebarOpen && window.innerWidth < 1024) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen]);

  // Click outside to close notifications
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { icon: Home, label: t('home', 'Home'), path: '/farmer' },
    { icon: Tractor, label: t('book', 'Book'), path: '/farmer/book' },
    { icon: MapPin, label: t('track', 'Track'), path: '/farmer/track' },
    { icon: Clock, label: t('history', 'History'), path: '/farmer/history' },
    { icon: CreditCard, label: t('pay', 'Pay'), path: '/farmer/payments' },
    { icon: User, label: t('profile', 'Profile'), path: '/farmer/profile' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-earth-main font-sans text-earth-brown selection:bg-earth-primary/30">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- DESKTOP SIDEBAR --- */}
      <aside 
        ref={sidebarRef}
        className={cn(
          "bg-primary border-r border-primary/10 flex flex-col transition-all duration-300 ease-in-out h-screen fixed lg:sticky top-0 z-[1001] shadow-2xl overflow-hidden",
          isSidebarOpen ? "w-[240px] translate-x-0" : "w-[240px] -translate-x-[240px]"
        )}
      >
        <div className="h-20 flex items-center justify-between border-b border-white/10 shrink-0 px-4 overflow-hidden">
          <div className="flex items-center gap-2 opacity-100 transition-all min-w-0">
            <img src="/tractorlink-logo.png" alt="TractorLink Logo" className="w-10 h-10 object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-black text-base text-white tracking-tight whitespace-nowrap leading-none block uppercase">Tractor<span className="text-accent">Link</span></span>
              <span className="text-[9px] text-white/70 uppercase tracking-widest font-bold leading-none mt-1">{t('farmerPortal', 'Farmer Portal')}</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-white/40 hover:text-white transition-colors shrink-0"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 py-8 space-y-1.5 scrollbar-hide">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} title={!isSidebarOpen ? item.label : undefined} className={cn(
                "flex items-center rounded-xl text-[13px] font-black transition-all uppercase tracking-wide",
                isSidebarOpen ? "px-4 py-3.5 gap-3.5 mx-2" : "justify-center py-3.5",
                isActive
                  ? "bg-accent text-white shadow-[0_8px_25px_rgba(255,152,0,0.4)] border border-accent/20 scale-[1.02] z-10" 
                  : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
              )}>
                <item.icon size={isActive ? 20 : 18} className={isActive ? "text-white" : "text-white/50 group-hover:text-white"} />
                {isSidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            )
          })}
        </div>
        
        <div className="p-4 mt-auto border-t border-earth-dark/10 space-y-3">
          <button onClick={logout} className={cn(
             "flex items-center text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all w-full group",
             isSidebarOpen ? "px-4 py-3 gap-3.5 font-black text-[13px] uppercase tracking-wide" : "justify-center py-3.5"
           )} title="Sign Out">
            <LogOut size={isSidebarOpen ? 18 : 22} className="shrink-0 text-white/40 group-hover:text-white" />
            {isSidebarOpen && <span className="whitespace-nowrap">{t('signOut', 'Sign Out')}</span>}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        
        {/* --- DESKTOP TOP NAVBAR --- */}
        <header className="hidden md:flex h-16 bg-earth-card/80 backdrop-blur-md border-b border-earth-dark/10 items-center justify-between px-6 z-20 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsSidebarOpen(!isSidebarOpen);
              }} 
              className="lg:hidden p-2.5 bg-earth-card-alt hover:bg-earth-card border border-earth-dark/15 rounded-xl text-earth-sub hover:text-earth-brown transition-all shadow-inner active:scale-95 flex items-center justify-center shrink-0"
            >
              {isSidebarOpen ? <X size={18} strokeWidth={2.5} /> : <Menu size={18} strokeWidth={2.5} />}
            </button>
            {/* Header titles removed for clean design */}
          </div>
          
          <div className="flex items-center gap-5 text-sm">
            <NotificationDropdown />

            <div className="h-6 w-px bg-earth-card-alt"></div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="font-bold text-earth-brown leading-none group-hover:text-earth-primary transition-colors">{farmer.name}</p>
                <p className="text-[10px] text-earth-mut font-semibold mt-1 uppercase tracking-wide">{farmer.phone}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-earth-card-alt flex items-center justify-center text-earth-green font-black border border-earth-dark/15 shadow-sm group-hover:border-emerald-500/50 group-hover:shadow transition-all">
                {farmer.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-24 md:pt-0 md:pb-0 relative scrollbar-hide">
            <Outlet />
        </div>

        {/* --- MOBILE BOTTOM NAVIGATION --- */}
        <nav 
          className="md:hidden fixed bottom-0 w-full bg-earth-card bordr-t border-earth-dark/10 flex justify-around pt-3 pb-2 px-2 z-[1001] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[56px] px-1 py-1 rounded-xl transition-all",
                  isActive ? "text-earth-primary -translate-y-1" : "text-earth-mut hover:text-earth-brown"
                )}
              >
                <div className={cn("transition-transform", isActive ? "drop-shadow-[0_0_8px_rgba(46,125,50,0.5)]" : "")}>
                   <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn("text-[10px] tracking-widest uppercase mt-1", isActive ? "font-black" : "font-bold")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>

    </div>
  );
}
