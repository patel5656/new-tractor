import { useState, useEffect } from 'react';
import { MapPin, Navigation, ArrowRight, CheckCircle, ShieldCheck, Zap, X, Loader2, Mail, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

export default function Dispatch() {
  const [pendingJobs, setPendingJobs] = useState([]);
  const [operators, setOperators] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [schedulingJob, setSchedulingJob] = useState(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [dispatchError, setDispatchError] = useState(null);

  useEffect(() => {
    fetchActiveData();
  }, []);

  const fetchActiveData = async () => {
    try {
      const [jobsRes, opsRes, allOpsRes] = await Promise.all([
        api.admin.getPendingBookings(),
        api.admin.getAvailableOperators(),
        api.admin.listOperators()
      ]);

      if (jobsRes.success) setPendingJobs(jobsRes.data);

      const dispatchReadyById = new Map(
        (opsRes.success ? opsRes.data : []).map((op) => [op.id, op])
      );
      const allOperators = allOpsRes.success ? allOpsRes.data : [];
      const mergedOperators = allOperators.map((op) => {
        const readyData = dispatchReadyById.get(op.id);
        return {
          ...op,
          tractor: readyData?.tractor || op.tractor || null,
          isDispatchReady: Boolean(readyData),
        };
      });
      setOperators(mergedOperators);
    } catch (error) {
      console.error("Failed to load dispatch data:", error);
    }
  };

  // URL Auto-selection logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const jobId = params.get('jobId');
    if (jobId) {
      const job = pendingJobs.find(b => b.id === jobId);
      if (job) setSelectedJob(job);
    }
  }, []);

  const handleDispatch = async (operatorArg = null) => {
    const operatorToDispatch = operatorArg || selectedOperator;
    if (!selectedJob || !operatorToDispatch) return;
    if (selectedJob.status?.toUpperCase() === 'PENDING') {
      setDispatchError("Please schedule this job first!");
      return;
    }
    
    setIsDispatching(true);
    setDispatchError(null);
    try {
      await api.admin.dispatchBooking(selectedJob.id, operatorToDispatch.id);
      
      // Remove job locally to prevent jumping
      setPendingJobs(prev => prev.filter(j => j.id !== selectedJob.id));
      setOperators(prev =>
        prev.map((op) =>
          op.id === operatorToDispatch.id
            ? { ...op, availability: 'busy', isDispatchReady: false }
            : op
        )
      );
      
      setShowSuccess(true);
      setSelectedJob(null);
      setSelectedOperator(null);
      
      // Auto-hide success
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error) {
       setDispatchError("Please check your internet connection and try again.");
    } finally {
      setIsDispatching(false);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!schedulingJob || !scheduledDate) return;
    setIsScheduling(true);
    setScheduleError(null);
    try {
      const res = await api.admin.scheduleBooking(schedulingJob.id, scheduledDate);
      if (res.success) {
        // Update local state
        setPendingJobs(prev => prev.map(j => j.id === res.data.id ? res.data : j));
        setSchedulingJob(null);
        setScheduledDate("");
        // Select the newly scheduled job automatically
        setSelectedJob(res.data);
      }
    } catch (error) {
       setScheduleError("Please check your internet connection and try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  // Helper to handle split date/time inputs
  const onDateTimeChange = (e, type) => {
    const val = e.target.value;
    const current = scheduledDate || "";
    let [date, time] = current.split("T");
    if (!date) date = new Date().toISOString().split("T")[0];
    if (!time) time = "12:00";

    if (type === 'date') date = val;
    if (type === 'time') time = val;

    setScheduledDate(`${date}T${time}`);

    // Force native picker to close
    e.target.blur();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full lg:h-[calc(100vh-8rem)] relative">
      
      {/* Pending Jobs */}
      <Card className="flex flex-col h-full bg-earth-card-alt border-earth-dark/15/50 shadow-sm rounded-[1.5rem] overflow-hidden">
        <CardHeader className="bg-earth-card/50 border-b border-earth-dark/15/50 pb-4 sm:pb-5 pt-5 sm:pt-6 px-4 sm:px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20">
                <Zap size={16} />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base text-earth-brown font-black tracking-wide uppercase">Job Queue</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs text-earth-sub font-bold mt-1">Select a task to assign</CardDescription>
              </div>
            </div>
            <Badge className="bg-earth-main border border-earth-dark/10 text-earth-mut font-black text-[9px] sm:text-[10px] uppercase tracking-widest px-3 py-1.5">{pendingJobs.length} Ready</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-hide">
          {pendingJobs.map(job => {
            const isSelected = selectedJob?.id === job.id;
            return (
              <Card 
                key={job.id} 
                onClick={() => setSelectedJob(isSelected ? null : job)}
                className={cn(
                  "border p-5 rounded-2xl transition-all cursor-pointer group relative overflow-hidden mb-4",
                  isSelected 
                    ? "border-earth-primary bg-earth-primary/[0.03] shadow-[0_0_20px_rgba(234,179,8,0.1)]" 
                    : "border-earth-dark/15/80 bg-earth-card/30 hover:border-earth-primary hover:bg-earth-card-alt/80"
                )}
              >
                {isSelected && <div className="absolute top-4 right-4 text-earth-primary animate-in zoom-in"><CheckCircle size={20} fill="#eab308" className="text-earth-brown" /></div>}
                
                {job.source === 'USSD' && !job.locationFixed && (
                  <div className="absolute top-0 left-0 right-0 bg-orange-500/10 border-b border-orange-500/20 py-1.5 px-4 flex items-center gap-2">
                    <Info size={12} className="text-orange-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-orange-600">Pending location & price fix</span>
                  </div>
                )}

                <div className={cn("flex justify-between items-start mb-4", job.source === 'USSD' && !job.locationFixed && "mt-4")}>
                  <div>
                    <h4 className={cn("font-black text-base sm:text-lg transition-colors uppercase tracking-tight", isSelected ? "text-earth-primary" : "text-earth-brown group-hover:text-earth-primary")}>{job.farmer?.name || 'Unknown Farmer'}</h4>
                    <span className="text-[9px] sm:text-[10px] font-bold text-earth-mut uppercase tracking-[0.2em] flex items-center gap-1.5"><Mail size={10} /> Contact: {job.farmer?.phone || 'N/A'}</span>
                  </div>
                  <Badge variant="outline" className={cn("font-black text-[9px] uppercase tracking-widest", isSelected ? "border-earth-primary/50 text-earth-primary bg-earth-primary/10" : "bg-earth-card border-earth-dark/15 text-earth-mut")}>
                    {job.service?.name?.toUpperCase() || 'SERVICE'}
                  </Badge>
                </div>

                {job.source === 'USSD' && !job.locationFixed && (
                  <div className="mb-4 p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                    <p className="text-[9px] font-bold text-orange-700 uppercase leading-relaxed tracking-wide text-left">
                      ⚠️ Complete location and pricing in Bookings before assigning this job
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div className="flex items-center gap-2.5 p-3 bg-earth-main rounded-xl border border-earth-dark/10">
                    <MapPin size={14} className="text-earth-primary shrink-0" />
                    <span className="text-[10px] font-black text-earth-sub uppercase tracking-widest truncate">{job.location || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 bg-earth-main rounded-xl border border-earth-dark/10">
                    <span className="text-[10px] font-black text-earth-brown uppercase tracking-widest">{job.landSize} Hectares</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-earth-dark/10/50 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-earth-mut uppercase tracking-widest mb-1">{job.status?.toUpperCase() === 'PENDING' ? 'Request Date' : 'Scheduled Time'}</span>
                    <span className="text-xs font-black text-earth-brown">
                      {job.scheduledAt 
                        ? new Date(job.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        : new Date(job.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  {job.status?.toUpperCase() === 'PENDING' ? (
                    <Button 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setSchedulingJob(job); }}
                      disabled={job.source === 'USSD' && !job.locationFixed}
                      className={cn(
                        "rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-9 transition-all shadow-md border-none",
                        job.source === 'USSD' && !job.locationFixed 
                          ? "bg-earth-dark/20 text-earth-mut cursor-not-allowed opacity-50" 
                          : "bg-accent text-white hover:scale-105 active:scale-95 shadow-accent/10"
                      )}
                    >
                      {job.source === 'USSD' && !job.locationFixed ? "Requires Fixing" : "Review & Schedule"}
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant={isSelected ? "primary" : "outline"}
                      className={cn(
                        "rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-9 transition-all",
                        isSelected ? "bg-earth-primary text-earth-brown border-earth-primary" : "border-earth-dark/15 text-earth-sub group-hover:border-earth-primary group-hover:text-earth-primary"
                      )}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Available Resources */}
      <Card className="flex flex-col h-full bg-earth-card-alt border-earth-dark/15/50 shadow-sm rounded-[1.5rem] overflow-hidden">
        <CardHeader className="bg-earth-card/50 border-b border-earth-dark/15/50 pb-4 sm:pb-5 pt-5 sm:pt-6 px-4 sm:px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-earth-primary/10 rounded-lg flex items-center justify-center text-earth-green border border-emerald-500/20">
                <Navigation size={16} />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base text-earth-brown font-black tracking-wide uppercase">Active Fleet</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs text-earth-sub font-bold mt-1">Available for dispatch</CardDescription>
              </div>
            </div>
            <Badge className="bg-earth-primary/10 text-earth-green border border-emerald-500/20 font-black text-[9px] sm:text-[10px] uppercase tracking-widest px-3 py-1.5">{operators.filter(op => op.isDispatchReady).length} Online</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-hide relative bg-earth-card/20">
          
          <div className={cn("transition-all duration-300", !selectedJob && "opacity-40 blur-[2px] pointer-events-none")}>
            <div className="mb-6 h-32 rounded-2xl bg-earth-main border border-earth-dark/10 flex items-center justify-center relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #fbbf24 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
              <div className="bg-earth-card/80 backdrop-blur-sm border border-earth-dark/15/50 px-4 py-2 rounded-xl flex items-center gap-2 relative z-10">
                 <span className="w-2 h-2 rounded-full bg-earth-primary animate-pulse"></span>
                 <span className="text-[10px] font-black uppercase tracking-widest text-earth-green">Targetting: {selectedJob?.landSize || '0'}ha Job</span>
              </div>
            </div>

            <h4 className="text-[10px] font-black uppercase tracking-widest text-earth-mut mb-4 pl-1">Nearest Operators</h4>
            {dispatchError && (
              <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse mb-4">
                {dispatchError}
              </div>
            )}

            <div className="space-y-3">
              {operators.map(op => {
                const isOperatorSelected = selectedOperator?.id === op.id;
                const activeTractor = op.tractor || { name: 'No Tractor', model: 'N/A', status: 'UNASSIGNED' };
                const canAssign = op.isDispatchReady && selectedJob && selectedJob.status?.toUpperCase() !== 'PENDING';
                
                return (
                  <Card 
                    key={op.id} 
                    onClick={() => setSelectedOperator(isOperatorSelected ? null : op)}
                    className={cn(
                      "flex items-center justify-between border p-4 rounded-xl transition-all cursor-pointer group shadow-sm",
                      isOperatorSelected 
                        ? "border-earth-primary bg-earth-primary/[0.05] shadow-[0_0_15px_rgba(234,179,8,0.1)]" 
                        : "border-earth-dark/15/80 bg-earth-card/40 hover:border-earth-primary"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner transition-all",
                        isOperatorSelected ? "bg-earth-primary text-earth-brown border-earth-primary" : "bg-earth-card border-earth-dark/15 text-earth-primary"
                      )}>
                        <Navigation size={18} className={cn("transition-transform", isOperatorSelected && "rotate-45")} />
                      </div>
                      <div>
                        <h4 className="font-black text-earth-brown flex items-center gap-2 text-base">
                          {op.name}
                          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isOperatorSelected ? "bg-earth-card" : "bg-earth-primary shadow-[0_0_8px_rgba(16,185,129,0.8)]")}></div>
                        </h4>
                        <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-0.5">{activeTractor.name} <span className="mx-1">•</span> <span className="text-earth-primary">{activeTractor.model?.toUpperCase() || 'UNIT'}</span></p>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1", op.isDispatchReady ? "text-earth-green" : "text-earth-mut")}>
                          {op.isDispatchReady ? "Ready for dispatch" : "Unavailable / no ready tractor"}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      isLoading={isOperatorSelected && isDispatching}
                      disabled={!canAssign || isDispatching || (selectedJob?.source === 'USSD' && !selectedJob?.locationFixed)}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedOperator(op); 
                        handleDispatch(op);
                      }}
                      className={cn(
                        "gap-2 px-5 font-black uppercase tracking-wide transition-all h-9 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed",
                        isOperatorSelected 
                          ? "bg-accent text-white" 
                          : "bg-earth-card hover:bg-earth-card-alt text-earth-sub hover:text-accent"
                      )}
                    >
                      {!op.isDispatchReady ? "Unavailable" : (selectedJob?.source === 'USSD' && !selectedJob?.locationFixed) ? "Job Locked" : isOperatorSelected && isDispatching ? "" : isOperatorSelected ? "Confirm" : "Assign"} {!isDispatching && <ArrowRight size={14} />}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>

          {!selectedJob || selectedJob.status?.toUpperCase() === 'PENDING' ? (
            <div className="absolute inset-0 flex items-center justify-center p-8 bg-earth-card/10 backdrop-blur-[1px] z-20 text-center">
               <div className="bg-earth-main/80 border border-earth-dark/10 p-6 rounded-3xl shadow-2xl max-w-[280px]">
                  <div className="w-12 h-12 bg-earth-card rounded-full flex items-center justify-center mx-auto mb-4 border border-earth-dark/10">
                     <Zap size={20} className="text-earth-mut" />
                  </div>
                  <h5 className="text-xs font-black text-earth-brown uppercase tracking-widest mb-2">Fleet Locked</h5>
                  <p className="text-[10px] font-bold text-earth-mut leading-relaxed uppercase">
                    {selectedJob?.source === 'USSD' && !selectedJob?.locationFixed
                      ? "Complete location and pricing in Bookings before assigning this job."
                      : selectedJob?.status?.toUpperCase() === 'PENDING' 
                        ? "This job must be scheduled first before assigning resources." 
                        : "Select a scheduled job from the left queue to unlock the fleet for dispatching."
                    }
                  </p>
               </div>
            </div>
          ) : null}
        </CardContent>
      </Card>



      {/* Success Success Overlay */}
      {showSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-earth-brown px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 animate-in slide-in-from-bottom-10 duration-500 z-[101] border border-emerald-400">
           <div className="bg-earth-primary p-3 rounded-2xl shadow-inner"><ShieldCheck size={30} /></div>
           <div>
              <p className="text-base font-black uppercase tracking-tight">Mission Assigned</p>
              <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Operator Linked & Fleet Ready</p>
           </div>
           <button onClick={() => setShowSuccess(false)} className="ml-4 p-2 hover:bg-earth-dark/20 rounded-full"><X size={20} /></button>
        </div>
      )}

      {/* Scheduling Modal */}
      {schedulingJob && (
         <div className="fixed inset-0 bg-earth-dark/60 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-earth-card w-full max-w-md rounded-[2.5rem] border border-earth-dark/15 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden"
            >
               <div className="p-8 border-b border-earth-dark/10 flex justify-between items-center bg-earth-dark">
                  <div>
                    <h3 className="text-lg font-black text-earth-primary uppercase italic">Review & Schedule</h3>
                    <p className="text-[9px] font-black text-earth-main/60 uppercase tracking-widest mt-1">Ref: #B-{schedulingJob.id}</p>
                  </div>
                  <button onClick={() => setSchedulingJob(null)} className="text-earth-main/60 hover:text-earth-main transition-colors"><X size={24} /></button>
               </div>

               <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-earth-main rounded-2xl border border-earth-dark/10">
                       <p className="text-[9px] font-black text-earth-mut uppercase tracking-widest mb-1.5 leading-none">Target Farmer</p>
                       <p className="text-sm font-black text-earth-brown uppercase italic">{schedulingJob.farmer?.name}</p>
                    </div>

                    <div className="p-4 bg-earth-main rounded-2xl border border-earth-dark/10">
                       <p className="text-[9px] font-black text-earth-mut uppercase tracking-widest mb-1.5 leading-none">Select Deployment Date & Time</p>
                       <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="date" 
                          value={scheduledDate.split('T')[0] || ""}
                          onChange={(e) => onDateTimeChange(e, 'date')}
                          className="w-full bg-earth-card border border-earth-dark/15 px-4 h-12 rounded-xl text-earth-brown font-bold focus:ring-2 focus:ring-earth-primary/50 outline-none uppercase text-xs"
                        />
                        <input 
                          type="time" 
                          value={scheduledDate.split('T')[1] || ""}
                          onChange={(e) => onDateTimeChange(e, 'time')}
                          className="w-full bg-earth-card border border-earth-dark/15 px-4 h-12 rounded-xl text-earth-brown font-bold focus:ring-2 focus:ring-earth-primary/50 outline-none"
                        />
                       </div>
                    </div>
                  </div>

                  <div className="bg-earth-primary/5 p-4 rounded-2xl border border-earth-primary/10 flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-earth-primary/20 flex items-center justify-center shrink-0">
                       <Zap size={16} className="text-earth-primary" />
                    </div>
                    <p className="text-[9px] font-bold text-earth-mut uppercase leading-relaxed tracking-wide">
                      Confirming this will move the job to the <span className="text-earth-primary font-black">SCHEDULED</span> queue, allowing resource allocation.
                    </p>
                  </div>

                  <Button 
                    onClick={handleScheduleSubmit}
                    isLoading={isScheduling}
                    disabled={!scheduledDate || isScheduling}
                    className="w-full h-14 bg-accent hover:scale-[1.02] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-accent/20 disabled:grayscale transition-all active:scale-95 border-none"
                  >
                    Confirm Schedule
                  </Button>
                  {scheduleError && (
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center mt-2 animate-pulse">{scheduleError}</p>
                  )}
               </div>
            </motion.div>
         </div>
      )}

    </div>
  );
}
