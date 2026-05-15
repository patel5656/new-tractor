import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tractor, User, Smartphone, Mail, Shield, Briefcase, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [role, setRole] = useState('farmer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (typeof register !== 'function') {
      setError('Registration system not ready. Please refresh.');
      setIsSubmitting(false);
      return;
    }

    const result = await register({ name, phone, password, role });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } else {
      setError(result.message || 'Registration failed');
      setIsSubmitting(false);
    }
  };

  const roles = [
    { id: 'farmer', icon: User, label: 'Farmer' }
  ];

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
               <p className="font-bold text-white">Create your farmer account</p>
             </div>
             <div className="flex items-center gap-4 bg-white/20 p-4 rounded-2xl border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-sm">
               <div className="w-10 h-10 bg-earth-primary rounded-xl flex items-center justify-center text-white font-black shrink-0">3</div>
               <p className="font-bold text-white">Access tailored operational dashboards</p>
             </div>
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-12 relative bg-earth-main h-full">
        <div className="w-full max-w-md m-auto">
          
          <div className="lg:hidden flex items-center gap-3 mb-12 text-earth-brown font-black text-2xl sm:text-3xl mt-4">
            <img src="/tractorlink-logo.png" alt="TractorLink Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" /> Tractor<span className="text-accent">Link</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-earth-brown tracking-tight">Create Account</h1>
            <p className="text-earth-sub font-bold mt-2">Fill in the details below to register your portal.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            
            {success ? (
              <div className="bg-earth-green/10 border border-emerald-500/20 p-8 rounded-3xl text-center space-y-4">
                <div className="w-16 h-16 bg-earth-green rounded-full flex items-center justify-center text-white mx-auto shadow-[0_0_20px_rgba(46,125,50,0.4)]">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-black text-earth-brown">Registration Successful!</h3>
                <p className="text-earth-sub font-bold italic">Redirecting you to the login portal...</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mb-1.5 block pl-1">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-earth-mut">
                        <User size={18} />
                      </div>
                      <input 
                        required 
                        type="text" 
                        placeholder="John Doe" 
                        className="w-full pl-11 pr-4 py-3.5 bg-earth-card border border-earth-dark/10 rounded-2xl text-earth-brown font-bold focus:outline-none focus:border-earth-primary focus:bg-earth-card-alt transition-all shadow-inner" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mb-1.5 block pl-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-earth-mut">
                        <Smartphone size={18} />
                      </div>
                      <input 
                        required 
                        type="tel" 
                        placeholder="08012345678" 
                        className="w-full pl-11 pr-4 py-3.5 bg-earth-card border border-earth-dark/10 rounded-2xl text-earth-brown font-bold focus:outline-none focus:border-earth-primary focus:bg-earth-card-alt transition-all shadow-inner" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mb-1.5 block pl-1">Secure Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-earth-mut">
                        <Lock size={18} />
                      </div>
                      <input 
                        required 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full pl-11 pr-4 py-3.5 bg-earth-card border border-earth-dark/10 rounded-2xl text-earth-brown font-bold focus:outline-none focus:border-earth-primary focus:bg-earth-card-alt transition-all shadow-inner" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={cn(
                    "w-full h-14 text-base md:text-lg font-black uppercase tracking-widest rounded-2xl bg-accent hover:opacity-90 text-white shadow-lg shadow-accent/30 transition-all mt-8 border-none",
                    isSubmitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? 'Processing...' : 'Complete Registration'}
                </button>

                <div className="text-center mt-6">
                  <Link to="/login" className="text-xs font-black uppercase tracking-wide text-earth-sub hover:text-earth-brown transition-colors">
                    &larr; <span className="text-earth-primary">Back to Login</span>
                  </Link>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
