import { useState, useEffect } from 'react';
import { Play, Navigation, CheckCircle2, Mail, AlertTriangle, User, MapPin, Clock, ShieldCheck, ArrowRight, MessageSquare, Info } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import useScrollLock from '../../hooks/useScrollLock';

export default function Status() {
  const [activeJob, setActiveJob] = useState(null);
  const [currentStatusId, setCurrentStatusId] = useState('idle');
  const [activeDialog, setActiveDialog] = useState(null); // 'summary'
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [targetStatusId, setTargetStatusId] = useState(null);
  const [updateError, setUpdateError] = useState(null);

  // Lock background scroll when mission dialog is active
  useScrollLock(activeDialog);

  // Status mapping backend <-> frontend button labels.
  // Note: We removed the artificial 'Arrived' step to strictly match FLOW.md
  const statuses = [
    { id: 'in_progress', label: 'Start Tractor Work', icon: Play, color: 'accent', action: 'Operating' },
    { id: 'completed', label: 'Mark Complete', icon: CheckCircle2, color: 'accent', action: 'Finished' },
  ];

  useEffect(() => {
    const fetchJobForStatus = async () => {
      try {
        const res = await api.operator.getJobs();
        if (res.success) {
          const job = res.data.current_job;
          setActiveJob(job);
          if (job) {
            const normalized = job.status?.toLowerCase();
            if (normalized === 'assigned') setCurrentStatusId('idle');
            else setCurrentStatusId(normalized);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobForStatus();
  }, []);



  const currentIdx = statuses.findIndex(s => s.id === currentStatusId);

  const handleNextStep = async (statusId) => {
    if (!activeJob) return;
    setIsUpdating(true);
    setTargetStatusId(statusId);
    setUpdateError(null);
    try {
      // Actually trigger backend status transition
      const res = await api.operator.updateStatus(activeJob.id, statusId);
      if (res.success) {
        setCurrentStatusId(statusId);
        if (statusId === 'completed') {
          setTimeout(() => setActiveDialog('summary'), 1000);
        }
      }
    } catch (error) {
       setUpdateError("Please check your internet connection and try again.");
    } finally {
      setIsUpdating(false);
      setTargetStatusId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-earth-brown">Establishing Satellite Link...</div>;
  if (!activeJob) return <div className="p-8 text-center text-earth-brown">No active mission found. Please check Jobs queue.</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">
      
      {/* Scaled Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-earth-dark/10 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-earth-brown uppercase italic tracking-tight">Mission Control</h1>
          <p className="text-[9px] font-black text-earth-mut uppercase tracking-widest mt-1 flex items-center gap-2">
            <ShieldCheck size={12} className="text-earth-primary" /> Secure Satellite Link Active • Unit #T-42
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* Left Column: Mission Details */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="bg-earth-card border border-earth-dark/10 rounded-[2rem] overflow-hidden shadow-xl">
             {/* Gradient Accent Bar */}
            <div className="h-1 bg-gradient-to-r from-earth-primary via-earth-green to-earth-primary opacity-30"></div>
            
            <div className="p-5 border-b border-earth-dark/10 flex items-center justify-between bg-earth-main/20">
               <div className="flex items-center gap-2.5">
                  <User size={14} className="text-earth-primary" />
                  <span className="font-black tracking-widest uppercase text-[8px] text-earth-mut">Client Identification</span>
               </div>
            </div>

            <CardContent className="p-6 md:p-7 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-earth-brown italic tracking-tight">{activeJob?.farmer?.name || 'Unknown Client'}</h2>
                  <div className="flex items-center gap-2 text-earth-mut text-[10px] font-bold uppercase tracking-widest mt-1">
                    <MapPin size={12} className="text-earth-primary" /> {activeJob?.location || 'SECTOR TARGET UNKNOWN'}
                  </div>
                </div>
                <div className="w-12 h-12 bg-earth-card-alt rounded-xl flex items-center justify-center border border-earth-dark/15 shadow-inner">
                   <span className="text-xl font-black text-earth-mut">{activeJob?.farmer?.name?.charAt(0) || '?'}</span>
                </div>
              </div>

              <div className="bg-earth-main border border-earth-dark/10/50 rounded-2xl p-4 md:p-5 space-y-3.5 shadow-inner">
                <div className="flex justify-between items-center text-[9px] uppercase font-black text-earth-mut tracking-widest">
                  <span>Objective</span>
                  <span className="text-earth-brown italic">{activeJob?.service?.name || 'STANDBY'}</span>
                </div>
                <div className="h-px bg-earth-card"></div>
                <div className="flex justify-between items-center text-[9px] uppercase font-black text-earth-mut tracking-widest">
                  <span>Sector Area</span>
                  <span className="text-earth-primary italic">{activeJob.landSize} Hectares</span>
                </div>
              </div>

              {/* Support buttons removed as per user request */}
            </CardContent>
          </Card>


        </div>

        {/* Right Column: Sequence Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="px-1 flex justify-between items-center mb-1">
             <h3 className="font-black text-earth-mut uppercase tracking-widest text-[9px]">Operational Sequence</h3>
          </div>
          {updateError && (
             <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse mb-2">
               {updateError}
             </div>
          )}
          
          <div className="grid grid-cols-1 gap-3 md:gap-3.5">            {statuses.map((status, idx) => {
              const isActive = currentStatusId === 'idle' ? idx === 0 : (statuses[currentIdx + 1]?.id === status.id);
              const isPast = statuses.findIndex(s => s.id === currentStatusId) >= idx;
              const isCurrent = currentStatusId === status.id;
              
              const accentColorMap = {
                accent: 'border-earth-primary bg-earth-primary/5',
              };

              return (
                <Button
                  key={status.id}
                  onClick={() => handleNextStep(status.id)}
                  disabled={(!isActive || isCurrent) && !(isUpdating && targetStatusId === status.id)}
                  isLoading={isUpdating && targetStatusId === status.id}
                  loadingText="Syncing..."
                  className={cn(
                    "w-full flex items-center p-4 md:p-5 rounded-2xl transition-all text-left border relative overflow-hidden group h-auto",
                    isActive 
                      ? `${accentColorMap[status.color]} shadow-lg shadow-black/20 border-opacity-100 scale-[1.01] z-10 hover:opacity-100`
                      : isCurrent || isPast
                        ? "border-earth-dark/10 bg-earth-card opacity-60 cursor-default hover:bg-earth-card" 
                        : "border-earth-dark/30 bg-earth-main opacity-20 cursor-not-allowed hover:bg-earth-main"
                  )}
                >
                  <div className="w-full flex items-center">
                    {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-accent"></div>}
                    
                    {!(isUpdating && targetStatusId === status.id) && (
                      <div className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mr-4 md:mr-6 shrink-0 transition-all border shadow-inner",
                        isActive ? "bg-earth-card border-earth-dark/15 text-earth-brown" 
                        : isCurrent || isPast ? "bg-earth-card-alt text-earth-mut border-earth-dark/15" 
                        : "bg-earth-main text-earth-sub border-earth-dark/30"
                      )}>
                        <status.icon size={20} className={cn(isActive && "animate-pulse")} />
                      </div>
                    )}
                    
                    <div className="flex-1 text-left">
                      <h4 className={cn("font-black text-sm md:text-base tracking-tight uppercase italic", isActive ? "text-earth-brown" : isCurrent || isPast ? "text-earth-mut" : "text-earth-sub")}>
                        {status.label}
                      </h4>
                      {isActive && <p className="text-[7px] md:text-[8px] text-earth-primary font-black uppercase tracking-[0.2em] mt-0.5">Awaiting Activation &bull; Click to Execute</p>}
                      {(isCurrent || isPast) && !isActive && <p className="text-[7px] md:text-[8px] text-earth-green font-black uppercase tracking-[0.2em] mt-0.5 flex items-center gap-1.5"><ShieldCheck size={10}/> Telemetry Verified</p>}
                    </div>

                    {isActive && !(isUpdating && targetStatusId === status.id) && <ArrowRight size={16} className="text-earth-sub group-hover:text-earth-brown transition-all transform group-hover:translate-x-1" />}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Simplified Modal System */}
      {activeDialog && createPortal(
        <div className="fixed inset-0 z-[1000] overflow-y-auto scrollbar-hide">
             <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveDialog(null)} className="fixed inset-0 bg-earth-main/90 backdrop-blur-md" />
                
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="text-left bg-earth-main border border-earth-dark/10 w-full max-w-[400px] rounded-2xl md:rounded-[2.5rem] shadow-2xl relative z-10">
                <div className="p-6 border-b border-earth-dark/10 flex justify-between items-center bg-earth-card/10">
                   <h3 className="font-black text-base text-earth-brown uppercase italic tracking-tight">System Notification</h3>
                   <button onClick={() => setActiveDialog(null)} className="text-earth-mut hover:text-earth-brown transition-colors">
                      <ArrowRight size={20} className="rotate-45" />
                   </button>
                </div>

                <div className="p-7 text-center">
                   {activeDialog === 'comm' && (
                     <div className="space-y-6">
                        <div className="w-16 h-16 bg-earth-primary/10 rounded-2xl flex items-center justify-center text-earth-primary mx-auto border border-earth-primary/20">
                           <MessageSquare size={32} />
                        </div>
                        <div className="space-y-2">
                           <p className="text-xs text-earth-sub font-bold uppercase tracking-wide">Connecting to Farmer Portal via ARC-UNIT-7</p>
                           <p className="text-sm font-black text-earth-brown uppercase italic">Initializing Voice/Chat Link...</p>
                        </div>
                        <Button onClick={() => setActiveDialog(null)} className="w-full h-12 bg-accent text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:opacity-90">Enter Channel</Button>
                     </div>
                   )}

                   {activeDialog === 'sos' && (
                     <div className="space-y-6">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto border border-red-500/20 animate-pulse">
                           <AlertTriangle size={32} />
                        </div>
                        <div className="space-y-2">
                           <p className="text-xs text-earth-sub font-bold uppercase tracking-wide">Emergency Protocol Engaged</p>
                           <p className="text-sm font-black text-earth-brown uppercase italic">Send SOS to Mission Control?</p>
                        </div>
                        <div className="flex gap-3">
                           <Button onClick={() => setActiveDialog(null)} variant="outline" className="flex-1 rounded-xl h-11 border-earth-dark/10 text-[9px] font-black uppercase tracking-widest text-earth-mut">Cancel</Button>
                           <Button onClick={() => { alert('Emergency Broadcast Sent!'); setActiveDialog(null); }} className="flex-1 bg-red-500 text-earth-brown font-black uppercase tracking-widest text-[9px] rounded-xl border-none">Execute SOS</Button>
                        </div>
                     </div>
                   )}

                   {activeDialog === 'summary' && (
                     <div className="space-y-6">
                        <div className="w-16 h-16 bg-earth-primary/10 rounded-2xl flex items-center justify-center text-earth-green mx-auto border border-emerald-500/20">
                           <ShieldCheck size={32} />
                        </div>
                        <div className="space-y-2">
                           <p className="text-xs text-earth-sub font-bold uppercase tracking-wide">Mission Summary Report</p>
                           <h4 className="text-lg font-black text-earth-green uppercase italic">Task Accomplished</h4>
                           <div className="bg-earth-card p-4 rounded-2xl border border-earth-dark/10 mt-4 flex items-center justify-center gap-3">
                              <ShieldCheck size={20} className="text-earth-green" />
                              <span className="text-xs font-black text-earth-brown uppercase tracking-widest">System Record Sync Complete</span>
                           </div>
                        </div>
                        <Button onClick={() => setActiveDialog(null)} className="w-full h-12 bg-earth-primary text-earth-brown font-black uppercase tracking-widest text-[9px] rounded-xl hover:opacity-90">Archive & Finish</Button>
                     </div>
                   )}
                </div>
             </motion.div>
           </div>
         </div>, document.body)}

    </div>
  );
}

function Badge({children, className}) {
    return (
        <span className={cn("font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-lg border border-earth-dark/10/50 shadow-inner", className)}>
            {children}
        </span>
    );
}
