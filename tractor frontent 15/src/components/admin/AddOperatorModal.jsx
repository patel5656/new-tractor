import { createPortal } from 'react-dom';
import { X, Users, Phone, Key } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import useScrollLock from '../../hooks/useScrollLock';

export default function AddOperatorModal({ isOpen, onClose, formData, setFormData, formError, isSubmitting, onSubmit }) {
  // Lock background scroll when open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto scrollbar-hide">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        {/* Background click to close */}
        <div className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl" onClick={onClose} />

        {/* Modal Container */}
        <div className="relative text-left bg-earth-card border border-earth-dark/10 w-full max-w-[400px] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] animate-in zoom-in duration-200">

          {/* Header */}
          <div className="bg-earth-card-alt/50 px-6 md:px-8 py-5 md:py-6 border-b border-earth-dark/10 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full opacity-5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="text-lg md:text-xl font-black text-earth-brown uppercase tracking-tight italic font-outfit">
                Personnel Recruitment
              </h3>
              <p className="text-[9px] md:text-[10px] font-bold text-earth-mut uppercase tracking-[0.2em] mt-1">
                Issue New Operator Credentials
              </p>
            </div>
            <button onClick={onClose} className="relative z-10 p-2 hover:bg-earth-card-alt/50 rounded-xl transition-colors text-earth-sub">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 md:p-8">
            <form onSubmit={onSubmit} className="space-y-4 md:space-y-5">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center shadow-sm">
                  {formError}
                </div>
              )}

              <div className="space-y-3 md:space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-mut group-focus-within:text-accent transition-colors" size={16} />
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Samuel Adebayo"
                      className="pl-12 bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-bold text-sm shadow-inner transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1">Contact Phone</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-mut group-focus-within:text-accent transition-colors" size={16} />
                    <Input
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="08012345678"
                      className="pl-12 bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-bold text-sm shadow-inner transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1">Initial Authorization Password</label>
                  <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-mut group-focus-within:text-accent transition-colors" size={16} />
                    <Input
                      required
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="pl-12 bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-bold text-sm shadow-inner transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 md:pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl border-earth-dark/15 text-earth-sub font-black uppercase tracking-widest text-[10px] bg-earth-card-alt hover:text-earth-brown transition-all"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  loadingText="Finalizing..."
                  className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl bg-accent hover:opacity-90 text-white font-black uppercase tracking-widest text-xs shadow-[0_12px_24px_-8px_rgba(255,152,0,0.4)] border-none transition-all active:scale-[0.98]"
                >
                  {!isSubmitting && 'Finalize Recruit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
