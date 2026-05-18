import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, lazy, Suspense, useEffect } from 'react';
import { Tractor, UserCircle, Shield, Briefcase, Lock, Smartphone, Mail, ArrowLeft } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { BookingProvider } from './context/BookingContext';
import { NotificationProvider } from './context/NotificationContext';
import { UIProvider, useUI } from './context/UIContext';
import { Button } from './components/ui/Button';
import { TopLoader } from './components/ui/TopLoader';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { lazyWithRetry } from './lib/lazyWithRetry';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';

import FarmerLayout from './layouts/FarmerLayout';
import AdminLayout from './layouts/AdminLayout';
import OperatorLayout from './layouts/OperatorLayout';

// Farmer Pages
const FarmerHome = lazyWithRetry(() => import('./pages/farmer/Home'));
const BookTractor = lazyWithRetry(() => import('./pages/farmer/BookTractor'));
const TrackJob = lazyWithRetry(() => import('./pages/farmer/TrackJob'));
const History = lazyWithRetry(() => import('./pages/farmer/History'));
const Loans = lazyWithRetry(() => import('./pages/farmer/Loans'));
const Payments = lazyWithRetry(() => import('./pages/farmer/Payments'));
const Profile = lazyWithRetry(() => import('./pages/farmer/Profile'));

// Admin Pages
const Dashboard = lazyWithRetry(() => import('./pages/admin/Dashboard'));
const Assignments = lazyWithRetry(() => import('./pages/admin/Assignment'));
const LiveTracking = lazyWithRetry(() => import('./pages/admin/LiveTracking'));
const Bookings = lazyWithRetry(() => import('./pages/admin/Bookings'));
const Farmers = lazyWithRetry(() => import('./pages/admin/Farmers'));
const AdminPayments = lazyWithRetry(() => import('./pages/admin/Payments'));
const Reports = lazyWithRetry(() => import('./pages/admin/Reports'));
const Operators = lazyWithRetry(() => import('./pages/admin/Operators'));
const Tractors = lazyWithRetry(() => import('./pages/admin/Tractors'));
const FuelLogs = lazyWithRetry(() => import('./pages/admin/FuelLogs'));
const Settings = lazyWithRetry(() => import('./pages/admin/Settings'));

// Operator Pages
const Jobs = lazyWithRetry(() => import('./pages/operator/Jobs'));
const Navigation = lazyWithRetry(() => import('./pages/operator/Navigation'));
const Status = lazyWithRetry(() => import('./pages/operator/Status'));
const Fuel = lazyWithRetry(() => import('./pages/operator/Fuel'));
const OperatorProfile = lazyWithRetry(() => import('./pages/operator/Profile'));
import { cn } from './lib/utils';

// --- Auth Protection Components ---
function ProtectedRoute({ children, allowedRole }) {
  const auth = useAuth();
  const { isAuthenticated, role, user } = auth || {};
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (role !== allowedRole) {
    // Redirect wrong roles to their correct dashboard
    if (role === 'farmer') return <Navigate to="/farmer" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'operator') return <Navigate to="/operator" replace />;
  }
  
  return children;
}

// --- Modern Dark Theme Login Page ---
function Login() {
  const auth = useAuth();
  const { login, isAuthenticated, user } = auth || {};
  
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fillDemoCredentials = (role) => {
    const roles = {
      admin: { phone: '08000000001', password: 'admin123' },
      farmer: { phone: '08000000002', password: 'farmer123' },
      operator: { phone: '08000000003', password: 'operator123' }
    };
    setPhone(roles[role].phone);
    setPassword(roles[role].password);
    // Explicitly focus a field or trigger a visual cue if needed
  };

  // If already logged in, redirect them out of the login page
  if (isAuthenticated && user?.role) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    if (typeof login !== 'function') {
      console.error('[Login] login function missing from context!', auth);
      setError('Authentication system error. Please refresh the page.');
      setIsSubmitting(false);
      return;
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    const result = await login(cleanPhone, password);
    
    if (result.success) {
      // AuthContext will update, leading to re-render and Navigate (if added in useEffect or similar)
      // but here we can just wait for re-render or navigate manually if needed.
      // Since user is set, the above Navigate will catch it on next render.
    } else {
      setError(result.message || 'Login failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-earth-main flex font-sans overflow-hidden">
      
      {/* Left Branding Panel (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-1 bg-earth-green border-r border-earth-dark/10 relative overflow-hidden items-center justify-center p-12 h-full">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute top-0 right-0 p-24 opacity-[0.07] transform translate-x-20 -translate-y-10">
          <Tractor size={400} className="text-white" />
        </div>
        
        <div className="relative z-10 max-w-lg text-white">
          <h1 className="text-5xl font-black mb-6 flex items-center gap-4 text-white uppercase">
            <img src="/tractorlink-logo.png" alt="TractorLink Logo" className="w-24 h-24 object-contain drop-shadow-xl" />
            Tractor<span className="text-accent">Link</span>
          </h1>
          <p className="text-xl text-white/90 font-bold leading-relaxed">
            The leading smart agriculture network connecting farm owners with machinery and professional operators seamlessly.
          </p>
          
          <div className="mt-12 space-y-4">
               <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/20 shadow-inner backdrop-blur-sm">
                 <div className="w-10 h-10 bg-earth-primary rounded-xl flex items-center justify-center text-white font-black shrink-0">1</div>
                 <p className="font-bold text-white">Secure Phone-Based Authentication</p>
               </div>
             <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/20 shadow-inner backdrop-blur-sm">
               <div className="w-10 h-10 bg-earth-primary rounded-xl flex items-center justify-center text-white font-black shrink-0">2</div>
               <p className="font-bold text-white">Select your primary organization role</p>
             </div>
             <div className="flex items-center gap-4 bg-white/20 p-4 rounded-2xl border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-sm">
               <div className="w-10 h-10 bg-earth-primary rounded-xl flex items-center justify-center text-white font-black shrink-0">3</div>
               <p className="font-bold text-white">Access tailored operational dashboards</p>
             </div>
          </div>
        </div>
      </div>
      
      {/* Right Login Panel */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-12 relative bg-earth-main h-full">
        {/* Back to Home Button */}
        <Link to="/" className="absolute top-4 right-4 md:top-8 md:right-8 p-2.5 md:p-3 bg-white border border-earth-primary/20 rounded-2xl shadow-sm text-earth-primary hover:bg-earth-primary hover:text-white transition-all hover:scale-105 active:scale-95 group flex items-center gap-2 font-black text-[10px] md:text-xs uppercase tracking-widest z-50">
           <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform md:w-[18px] md:h-[18px]" />
           Home
        </Link>
        <div className="w-full max-w-md m-auto">
          
          <div className="lg:hidden flex items-center gap-3 mb-12 text-earth-brown font-black text-2xl sm:text-3xl mt-4">
            <img src="/tractorlink-logo.png" alt="TractorLink Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" /> Tractor<span className="text-accent">Link</span>
          </div>
          
          <div className="mb-8">
            <h2 className="text-3xl font-black text-earth-brown tracking-tight">Welcome back</h2>
            <p className="text-earth-sub font-bold mt-2">Sign in to your secure portal to continue.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mb-1.5 block pl-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-earth-mut"><Smartphone size={18} /></div>
                  <input 
                    type="tel" 
                    required 
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3.5 bg-earth-card border border-earth-dark/10 rounded-2xl text-earth-brown font-bold focus:border-earth-primary focus:bg-earth-card-alt outline-none transition-all shadow-inner" 
                    placeholder="08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mb-1.5 block pl-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-earth-mut"><Lock size={18} /></div>
                  <input 
                    type="password" 
                    required 
                    autoComplete="current-password"
                    className="w-full pl-11 pr-4 py-3.5 bg-earth-card border border-earth-dark/10 rounded-2xl text-earth-brown font-bold focus:border-earth-primary focus:bg-earth-card-alt outline-none transition-all shadow-inner" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <p className="text-xs text-earth-primary font-bold mt-2 text-right cursor-pointer hover:underline uppercase tracking-wide">Forgot Password?</p>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={cn(
                "w-full h-14 text-base md:text-lg font-black uppercase tracking-widest rounded-2xl bg-accent hover:opacity-90 text-white shadow-lg shadow-accent/30 transition-all mt-8 border-none",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? 'Authenticating...' : 'Authenticate & Login'}
            </Button>
            
            <div className="pt-8 border-t border-earth-dark/10 mt-8">
              <label className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mb-4 block text-center">Quick Demo Access</label>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  type="button"
                  onClick={() => fillDemoCredentials('admin')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-earth-card border border-earth-dark/10 hover:border-earth-primary/50 hover:bg-earth-card-alt transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-earth-primary/10 flex items-center justify-center text-earth-primary mb-2 group-hover:scale-110 transition-transform">
                    <Shield size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-earth-sub group-hover:text-earth-brown">Admin</span>
                </button>
                
                <button 
                  type="button"
                  onClick={() => fillDemoCredentials('farmer')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-earth-card border border-earth-dark/10 hover:border-emerald-500/50 hover:bg-earth-card-alt transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-earth-primary/10 flex items-center justify-center text-earth-green mb-2 group-hover:scale-110 transition-transform">
                    <UserCircle size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-earth-sub group-hover:text-earth-brown">Farmer</span>
                </button>
                
                <button 
                  type="button"
                  onClick={() => fillDemoCredentials('operator')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-earth-card border border-earth-dark/10 hover:border-blue-500/50 hover:bg-earth-card-alt transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2 group-hover:scale-110 transition-transform">
                    <Briefcase size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-earth-sub group-hover:text-earth-brown">Operator</span>
                </button>
              </div>
            </div>
            
          </form>
          
          <div className="text-center mt-6">
            <Link to="/register" className="text-xs font-black uppercase tracking-wide text-earth-sub hover:text-earth-brown transition-colors">
              Don't have an account? <span className="text-earth-primary">Register now &rarr;</span>
            </Link>
          </div>

        </div>
      </div>
      
    </div>
  );
}

/**
 * NavigationHandler - Listens for global clicks to provide INSTANT pre-navigation feedback.
 * Stops the loader once the location actually changes.
 */
function NavigationHandler({ children }) {
  const { startLoading, stopLoading } = useUI();
  const location = useLocation();

  // Stop loader when location changes (Sync with destination)
  useEffect(() => {
    stopLoading();
  }, [location.pathname, stopLoading]);

  // Global click interceptor for PRE-navigation feedback
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Find the closest anchor tag if any
      const link = e.target.closest('a');
      
      // If it's an internal link, start progress immediately
      if (link && 
          link.href && 
          link.href.startsWith(window.location.origin) && 
          link.target !== '_blank' &&
          !e.defaultPrevented &&
          e.button === 0 // Left click only
      ) {
        startLoading();
      }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
  }, [startLoading]);

  return children;
}

// --- End of Components ---

function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <NotificationProvider>
          <BookingProvider>
            <SettingsProvider>
              <BrowserRouter>
                <NavigationHandler>
                  <TopLoader />
                  <ErrorBoundary>
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center bg-earth-main">
                    <div className="flex flex-col items-center gap-4">
                      <Tractor className="w-12 h-12 text-earth-primary animate-bounce" />
                      <p className="text-xs font-black uppercase tracking-widest text-earth-mut animate-pulse">Initializing Interface...</p>
                    </div>
                  </div>
                }>
                  <Routes>
                  <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Farmer App Routes */}
                <Route path="/farmer" element={<ProtectedRoute allowedRole="farmer"><FarmerLayout /></ProtectedRoute>}>
                  <Route index element={<FarmerHome />} />
                  <Route path="book" element={<BookTractor />} />
                  <Route path="track" element={<TrackJob />} />
                  <Route path="history" element={<History />} />
                  <Route path="loans" element={<Loans />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="profile" element={<Profile />} />
                </Route>

                {/* Admin Dashboard Routes */}
                <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="assignments" element={<Assignments />} />
                  <Route path="tracking" element={<LiveTracking />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="farmers" element={<Farmers />} />
                  <Route path="operators" element={<Operators />} />
                  <Route path="fleet" element={<Tractors />} />
                  <Route path="fuel-logs" element={<FuelLogs />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />}>
                    <Route path=":tab" element={<Settings />} />
                  </Route>
                </Route>

                {/* Operator Panel Routes */}
                <Route path="/operator" element={<ProtectedRoute allowedRole="operator"><OperatorLayout /></ProtectedRoute>}>
                  <Route index element={<Jobs />} />
                  <Route path="navigation" element={<Navigation />} />
                  <Route path="status" element={<Status />} />
                  <Route path="fuel" element={<Fuel />} />
                  <Route path="profile" element={<OperatorProfile />} />
                </Route>
                
                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
                </Suspense>
              </ErrorBoundary>
                </NavigationHandler>
              </BrowserRouter>
            </SettingsProvider>
          </BookingProvider>
        </NotificationProvider>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;
