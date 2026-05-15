import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Mail, Phone, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import useScrollLock from '../../hooks/useScrollLock';

export default function AddFarmerModal({ isOpen, onClose, onRefresh }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'farmer'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Lock background scroll when open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await api.auth.register(formData);
      if (result.success) {
        setIsSuccess(true);
        onRefresh();
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (err) {
      setError("Network issue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setFormData({ name: '', password: '', phone: '', role: 'farmer' });
    setError('');
    onClose();
  };

  // Render to document body to avoid stacking context issues with header
  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto scrollbar-hide">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        {/* Background click to close */}
        <div className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl" onClick={handleClose} />
        
        {/* Modal Container */}
        <div className="relative text-left bg-earth-card border border-earth-dark/10 w-full max-w-[400px] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-earth-card-alt/50 px-6 md:px-8 py-5 md:py-6 border-b border-earth-dark/10 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full opacity-5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-lg md:text-xl font-black text-earth-brown uppercase tracking-tight italic font-outfit">
              {isSuccess ? "Farmer Registered" : "Add New Farmer"}
            </h3>
            <p className="text-[9px] md:text-[10px] font-bold text-earth-mut uppercase tracking-[0.2em] mt-1">
              {isSuccess ? "Database Sync Complete" : "System Registry Enrollment"}
            </p>
          </div>
          <button onClick={handleClose} className="relative z-10 p-2 hover:bg-earth-card-alt/50 rounded-xl transition-colors text-earth-sub">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center shadow-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3 md:space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-mut group-focus-within:text-accent transition-colors" size={16} />
                    <Input 
                      required
                      placeholder="e.g. Samuel Adebayo" 
                      className="pl-12 bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-bold text-sm shadow-inner transition-colors"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1">Authorization Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-mut group-focus-within:text-accent transition-colors" size={16} />
                    <Input 
                      required
                      type="password"
                      placeholder="••••••••" 
                      className="pl-12 bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-bold text-sm shadow-inner transition-colors"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-mut group-focus-within:text-accent transition-colors" size={16} />
                    <Input 
                      required
                      placeholder="080XXXXXXXX" 
                      className="pl-12 bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-bold text-sm shadow-inner transition-colors"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 md:pt-4">
                <Button 
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  loadingText="Syncing Records..."
                  className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl bg-accent hover:opacity-90 text-white font-black uppercase tracking-widest text-xs shadow-[0_12px_24px_-8px_rgba(255,152,0,0.4)] border-none transition-all active:scale-[0.98]"
                >
                  {!isSubmitting && "Authorize & Enroll Farmer"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-6 md:py-10 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-earth-primary/20 rounded-2xl md:rounded-[2rem] flex items-center justify-center text-earth-green mx-auto mb-4 md:mb-6 border border-earth-primary/30 shadow-xl shadow-earth-primary/10">
                <CheckCircle2 size={32} />
              </div>
              
              <h4 className="text-earth-brown font-black text-lg md:text-xl mb-2 uppercase italic tracking-tight font-outfit">Access Granted</h4>
              <p className="text-earth-mut text-[9px] md:text-[10px] font-black leading-relaxed mb-4 uppercase tracking-[0.2em]">
                Farmer profile has been successfully<br/>integrated into the platform registry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>,
    document.body
  );
}
