import { createPortal } from 'react-dom';
import { X, Truck, Wrench, Clock, Settings2, Calendar, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import useScrollLock from '../../hooks/useScrollLock';

export default function AddTractorModal({ isOpen, onClose, isEditing, editingId, formData, setFormData, isSubmitting, onSubmit }) {
  // Lock background scroll when open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto scrollbar-hide">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        {/* Background click to close */}
        <div className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl" onClick={onClose} />

        {/* Modal Container */}
        <div className="relative text-left bg-earth-card border border-earth-dark/10 w-full max-w-[440px] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] animate-in zoom-in duration-200">

          {/* Header */}
          <div className="bg-earth-card-alt/50 px-6 md:px-8 py-5 md:py-6 border-b border-earth-dark/10 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full opacity-5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="text-lg md:text-xl font-black text-earth-brown uppercase tracking-tight italic font-outfit">
                {isEditing ? 'Patch Asset Profile' : 'Enroll Machinery'}
              </h3>
              <p className="text-[9px] md:text-[10px] font-bold text-earth-mut uppercase tracking-[0.2em] mt-1">
                {isEditing ? `Registry ID: #TR-${editingId}` : 'New Fleet Asset Registration'}
              </p>
            </div>
            <button onClick={onClose} className="relative z-10 p-2 hover:bg-earth-card-alt/50 rounded-xl transition-colors text-earth-sub">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 md:p-8">
            <form onSubmit={onSubmit} className="space-y-4 md:space-y-5">
              <div className="space-y-3 md:space-y-4">
                {/* Asset Name & Model */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1">Asset Name</label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Asset ID"
                      className="bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-black uppercase text-sm shadow-inner transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1">Model</label>
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Make/Model"
                      className="bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-bold text-sm shadow-inner transition-colors"
                    />
                  </div>
                </div>

                {/* Engine Hours & Service Threshold */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Clock size={10} /> Engine Hrs
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.engineHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, engineHours: e.target.value }))}
                      className="bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-black text-sm shadow-inner transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Settings2 size={10} /> Svc Threshold
                    </label>
                    <Input
                      type="number"
                      value={formData.nextServiceDueHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, nextServiceDueHours: e.target.value }))}
                      className="bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-black text-sm shadow-inner transition-colors"
                    />
                  </div>
                </div>

                {/* Last Service Date */}
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Calendar size={10} /> Last Service Date
                  </label>
                  <Input
                    type="date"
                    value={formData.lastServiceDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastServiceDate: e.target.value }))}
                    className="bg-earth-main border-earth-dark/10 h-11 md:h-12 focus:border-accent rounded-xl md:rounded-2xl font-bold text-sm shadow-inner transition-colors"
                  />
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
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl bg-accent hover:opacity-90 text-white font-black uppercase tracking-widest text-xs shadow-[0_12px_24px_-8px_rgba(255,152,0,0.4)] border-none transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    isEditing ? 'Commit Changes' : 'Deploy Asset'
                  )}
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
