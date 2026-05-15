import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Compass, Radio, Calendar, Users, Briefcase, ListCollapse, TrendingUp, SettingsIcon, LogOut, ChevronRight, Bell, Tractor, CheckCircle2, AlertCircle, MessageSquare, Truck, Droplet, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';

export default function AdminLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const notificationRef = useRef(null);
  const sidebarRef = useRef(null);

  // Only close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle window resize - keep it simple, true for desktop
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

  const notifications = [
    { id: 1, title: 'New Booking', message: 'Farmer Ramesh booked a Mahindra 575 DI', time: '2 min ago', icon: CheckCircle2, color: 'text-earth-green', unread: true },
    { id: 2, title: 'Low Fuel Alert', message: 'Unit #T24 is below 15% fuel threshold', time: '15 min ago', icon: AlertCircle, color: 'text-red-400', unread: true },
    { id: 3, title: 'Payment Received', message: '₦4,500 received from Sanjay Kumar', time: '1 hour ago', icon: MessageSquare, color: 'text-earth-primary', unread: false },
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const primaryNav = [
    { icon: LayoutDashboard, label: t('dashboard', 'Dashboard'), path: '/admin' },
    { icon: Compass, label: t('assignments', 'Assignments'), path: '/admin/assignments' },
    { icon: Radio, label: t('liveTracking', 'Live Tracking'), path: '/admin/tracking' },
  ];

  const managementNav = [
    { icon: Calendar, label: t('bookings', 'Bookings'), path: '/admin/bookings' },
    { icon: Users, label: t('farmers', 'Farmers'), path: '/admin/farmers' },
    { icon: Briefcase, label: t('operators', 'Operators'), path: '/admin/operators' },
    { icon: Truck, label: t('fleetTractors', 'Fleet (Tractors)'), path: '/admin/fleet' },
    { icon: Droplet, label: t('fuelLogs', 'Fuel Logs'), path: '/admin/fuel-logs' },
    { icon: ListCollapse, label: t('payments', 'Payments'), path: '/admin/payments' },
    { icon: TrendingUp, label: t('reports', 'Reports'), path: '/admin/reports' },
  ];

  const renderNavSection = (title, items) => (
    <div className="mb-6">
      <p className={cn("px-4 text-[10px] font-bold text-earth-mut uppercase tracking-widest transition-all duration-300", isSidebarOpen ? "mb-3 opacity-100" : "opacity-0 h-0 overflow-hidden mb-0")}>{t(title.toLowerCase(), title)}</p>
      <div className="space-y-1.5 px-2">
        {items.map(item => {
          const isActive = location.pathname === item.path || (item.path.includes('settings') && location.pathname.includes('settings'));
          return (
            <Link key={item.path} to={item.path} title={!isSidebarOpen ? item.label : undefined} className={cn(
              "flex items-center rounded-xl text-[13px] transition-all group font-black uppercase tracking-wide",
              isSidebarOpen ? "px-4 py-3 gap-3.5 mx-2" : "justify-center py-3",
              isActive
                ? "bg-accent text-white shadow-[0_8px_25px_rgba(255,152,0,0.4)] border border-accent/20 scale-[1.02] z-10" 
                : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
            )}>
              <item.icon size={isSidebarOpen ? 18 : 22} className={
                isActive ? "text-white shrink-0" : "text-white/50 group-hover:text-white shrink-0"
              } />
              {isSidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          )
        })}
      </div>
    </div>
  );

  return (
    <div className="flex bg-earth-main min-h-screen font-sans text-earth-brown selection:bg-earth-primary/30">
      
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Dark Sidebar Section */}
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
              <span className="text-[9px] flex items-center gap-1.5 text-white/70 font-bold uppercase tracking-widest mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                {t('adminHq', 'Admin HQ')}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-white/40 hover:text-white transition-colors shrink-0"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 overflow-x-hidden scrollbar-hide">
          {renderNavSection('Core', primaryNav)}
          {renderNavSection('Management', managementNav)}
          
          <div className="mb-6">
            <p className={cn("px-4 text-[10px] font-bold text-earth-mut uppercase tracking-widest transition-all duration-300", isSidebarOpen ? "mb-3 opacity-100" : "opacity-0 h-0 overflow-hidden mb-0")}>{t('configuration', 'Configuration')}</p>
            <div className="space-y-1.5 px-2">
               <Link to="/admin/settings/fuel" title={!isSidebarOpen ? "Settings" : undefined} className={cn(
                  "flex items-center rounded-xl text-[13px] transition-all group font-black uppercase tracking-wide",
                  isSidebarOpen ? "px-4 py-3 gap-3.5 mx-2" : "justify-center py-3",
                  location.pathname.includes('/settings')
                    ? "bg-accent text-white shadow-[0_8px_25px_rgba(255,152,0,0.4)] border border-accent/20 scale-[1.02] z-10 " 
                    : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
                )}>
                  <SettingsIcon size={isSidebarOpen ? 18 : 22} className={location.pathname.includes('/settings') ? "text-white shrink-0" : "text-white/50 group-hover:text-white shrink-0"} />
                  {isSidebarOpen && <span className="whitespace-nowrap">{t('settings', 'Settings')}</span>}
                </Link>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-earth-dark/10">
           <button onClick={logout} className={cn(
             "flex items-center text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all w-full group",
             isSidebarOpen ? "px-4 py-3 gap-3.5 font-black text-[13px] uppercase tracking-wide" : "justify-center py-3.5"
           )} title="Sign Out">
             <LogOut size={isSidebarOpen ? 18 : 22} className="shrink-0 text-white/40 group-hover:text-white" />
             {isSidebarOpen && <span>{t('signOut', 'Sign Out')}</span>}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Dynamic App Header */}
        <header className="h-16 bg-earth-card/80 backdrop-blur-md border-b border-earth-dark/10 flex items-center justify-between px-4 sm:px-6 z-[1002] shrink-0 shadow-sm sticky top-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              id="sidebar-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setIsSidebarOpen(!isSidebarOpen);
              }} 
              className="lg:hidden p-2.5 bg-earth-card-alt border border-earth-dark/15 rounded-xl text-earth-sub hover:text-earth-brown transition-all shadow-inner active:scale-95 flex items-center justify-center shrink-0"
            >
              {isSidebarOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
            </button>
            
            {/* Breadcrumbs removed for clean header */}
          </div>
          
          <div className="flex items-center gap-4 text-sm relative">
            <NotificationDropdown />

            <div className="h-6 w-px bg-earth-dark/10 hidden sm:block"></div>
            
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden lg:block">
                <p className="font-bold text-earth-brown leading-none group-hover:text-earth-primary transition-colors">{user?.name || 'Admin User'}</p>
                <p className="text-[10px] text-earth-mut font-semibold mt-1 tracking-widest uppercase">{user?.phone || 'Admin Portal'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-earth-card-alt flex items-center justify-center text-earth-primary font-black border border-earth-dark/15 shadow-sm group-hover:border-earth-primary/50 group-hover:shadow transition-all shrink-0">
                {(user?.name || 'A').charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden transition-all duration-300 relative scrollbar-hide overscroll-y-none">
          {/* Subtle noise/grid background overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full relative z-10">
            <Outlet />
          </div>
        </div>
      </main>

    </div>
  );
}
