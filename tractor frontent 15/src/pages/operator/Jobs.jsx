import { MapPin, ArrowRight, Play, CheckCircle2, Navigation2, Clock, Map as MapIcon, Zap, Droplets, Thermometer, Wind, Activity, Timer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/Card';

export default function Jobs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [jobData, setJobData] = useState({ current_job: null, queue: [] });
  const [statsData, setStatsData] = useState({ hectares_done: 0, total_jobs: 0, engine_hours: 0, unit_health: 100 });
  const [loading, setLoading] = useState(true);
  const fetchData = async () => {
    const hasInitialData = jobData.current_job !== null || jobData.queue.length > 0;
    
    try {
      if (!hasInitialData) setLoading(true);
      const [jobsRes, statsRes] = await Promise.all([
        api.operator.getJobs(),
        api.operator.getStats()
      ]);
      
      if (jobsRes.success) {
        setJobData(jobsRes.data);
        localStorage.setItem('operatorJobs', JSON.stringify(jobsRes.data));
      }
      if (statsRes.success) {
        setStatsData(statsRes.data);
        localStorage.setItem('operatorStats', JSON.stringify(statsRes.data));
      }
    } catch (err) {
      console.error("Failed to fetch operator data, trying cache:", err);
      // Fallback to cache on error
      const cachedJobs = localStorage.getItem('operatorJobs');
      const cachedStats = localStorage.getItem('operatorStats');
      if (cachedJobs) {
        try { setJobData(JSON.parse(cachedJobs)); } catch (e) {}
      }
      if (cachedStats) {
        try { setStatsData(JSON.parse(cachedStats)); } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial cache load for instant UI
  useEffect(() => {
    const cachedJobs = localStorage.getItem('operatorJobs');
    const cachedStats = localStorage.getItem('operatorStats');
    if (cachedJobs) {
      try { setJobData(JSON.parse(cachedJobs)); } catch (e) {}
    }
    if (cachedStats) {
      try { setStatsData(JSON.parse(cachedStats)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 15000);

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const activeJob = jobData.current_job;
  const upcomingJobs = jobData.queue;

  const stats = [
    { label: t('hectaresDone', 'Hectares Done'), value: (statsData.hectares_done || 0).toFixed(1), unit: 'HA', icon: MapIcon, color: 'text-earth-green', bg: 'bg-earth-green' },
    { label: t('totalJobs', 'Total Jobs'), value: statsData.total_jobs || 0, unit: 'JOBS', icon: CheckCircle2, color: 'text-amber-400', bg: 'bg-amber-400' },
    { label: t('engineHours', 'Engine Hours'), value: (statsData.engine_hours || 0).toFixed(1), unit: 'HRS', icon: Timer, color: 'text-blue-400', bg: 'bg-blue-400' },
    { label: t('unitHealth', 'Unit Health'), value: statsData.unit_health || 100, unit: '%', icon: Activity, color: 'text-earth-primary', bg: 'bg-earth-primary' },
  ];

  const getStatusAction = (status) => {
    switch (status?.toLowerCase()) {
      case 'dispatched':
        return { label: t('startWork', 'Start Work'), next: 'in_progress', color: 'bg-accent/40 hover:bg-accent/50 text-white border border-accent/40' };
      case 'in_progress':
        return { label: t('markCompleted', 'Mark Completed'), next: 'completed', color: 'bg-accent hover:opacity-90 text-white' };
      default:
        return null;
    }
  };

  const currentAction = activeJob ? getStatusAction(activeJob.status) : null;

  const handleStartJourney = () => {
    if (!activeJob) return;

    navigate('/operator/navigation', {
      state: {
        destination: Number.isFinite(activeJob?.farmerLatitude) && Number.isFinite(activeJob?.farmerLongitude)
          ? {
              lat: Number(activeJob.farmerLatitude),
              lng: Number(activeJob.farmerLongitude),
            }
          : null,
        destinationQuery: activeJob.location || '',
        destinationLabel: activeJob.location || 'Assigned destination',
        bookingId: activeJob.id,
      },
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-earth-dark/10 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-earth-brown tracking-tight uppercase italic">{t('activeMissionControl', 'Active Mission Control')}</h1>
          <p className="text-[9px] uppercase font-black tracking-[0.2em] text-earth-mut mt-1.5">{t('deploymentDashboard', 'Deployment Dashboard')}</p>
        </div>
      </header>

      {/* Real-time Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {stats.map((s, i) => (
           <motion.div 
             key={i} 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className="bg-white border-none shadow-[0_15px_35px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-4 rounded-[1.2rem] relative overflow-hidden group transition-shadow"
           >
              <div className={cn("absolute top-0 left-0 w-full h-1.5", s.bg)}></div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-earth-primary/5 to-transparent rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                 <s.icon size={50} />
              </div>
              <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-1.5">{s.label}</p>
              <div className="flex items-baseline gap-1">
                 <span className="text-lg font-black text-earth-brown tabular-nums">{loading ? '---' : s.value}</span>
                 <span className={cn("text-[9px] font-black uppercase tracking-widest", s.color)}>{s.unit}</span>
              </div>
           </motion.div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Column: Active Job */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 text-earth-primary font-black uppercase tracking-widest text-[9px] mb-1 pl-1">
            <div className="w-1.5 h-1.5 bg-earth-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div> {t('primaryObjective', 'Primary Objective')}
          </div>
          
          <div className="bg-white border-none rounded-[2rem] p-6 md:p-8 shadow-[0_15px_35px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] relative overflow-hidden group transition-all duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 group-hover:opacity-10 transition-all duration-1000">
              <Play size={200} />
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl md:text-3xl font-black text-earth-brown tracking-tighter italic leading-none truncate">
                  {activeJob?.service?.name?.toUpperCase() || 'STANDBY'}
                </h2>
                <div className="flex items-center gap-2.5 mt-4">
                   <div className="bg-earth-primary/5 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-earth-green font-black text-[9px] uppercase tracking-widest shadow-inner">
                      {activeJob?.landSize || 0} Hectares
                   </div>
                    <div className="bg-earth-card-alt px-2.5 py-1 rounded-lg text-earth-mut font-black text-[9px] uppercase tracking-widest">
                       ID: #{activeJob?.id || '---'}
                    </div>
                    {activeJob?.scheduledAt && (
                      <div className="flex items-center gap-1.5 bg-earth-primary/5 px-2.5 py-1 rounded-lg text-earth-primary font-black text-[9px] uppercase tracking-widest">
                        <Clock size={10} />
                        {new Date(activeJob.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                 </div>
              </div>
              <div className="text-right shrink-0">
                <span className="bg-earth-primary text-earth-brown px-3 py-1.5 rounded-lg text-[9px] font-black tracking-[0.15em] shadow-[0_4px_15px_rgba(234,179,8,0.2)] uppercase italic">
                   {activeJob?.status?.replace('_', ' ').toUpperCase() || 'AWAITING'}
                </span>
              </div>
            </div>

            <div className="bg-earth-main border border-earth-dark/10/50 p-4 md:p-5 rounded-2xl mb-8 flex gap-4 items-center shadow-inner group-hover:bg-earth-card transition-colors">
               <div className="w-10 h-10 md:w-12 md:h-12 bg-earth-card rounded-xl flex items-center justify-center text-earth-primary border border-earth-dark/10 shadow-sm shrink-0">
                 <MapPin size={20} />
               </div>
               <div className="min-w-0">
                 <p className="text-[8px] text-earth-mut font-black uppercase tracking-widest mb-1 leading-none">Vector Coordinates</p>
                 <p className="text-sm md:text-base text-earth-brown font-black tracking-tight truncate">
                   {activeJob?.location?.toUpperCase() || 'TARGET SECTOR UNAVAILABLE'}
                 </p>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {currentAction ? (
                <Link 
                  to="/operator/status"
                  className={cn(
                    "flex-1 text-earth-brown font-black px-6 py-4 rounded-xl flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.98] text-sm uppercase tracking-widest border-none",
                    currentAction.color
                  )}
                >
                  {currentAction.label} <ArrowRight size={18} />
                </Link>
              ) : (
                <Link 
                  to="/operator/status"
                  className="flex-1 bg-earth-card-alt text-earth-brown hover:bg-earth-card font-black px-6 py-4 rounded-xl flex items-center justify-center gap-2.5 text-sm uppercase tracking-widest border border-earth-dark/15 transition-all"
                >
                  Change Status
                </Link>
              )}
              {activeJob ? (
                <button
                  type="button"
                  onClick={handleStartJourney}
                  className="sm:w-[40%] bg-earth-accent text-white font-black px-4 py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all border-none shadow-lg shadow-earth-accent/20 uppercase tracking-widest text-xs"
                >
                  <Navigation2 size={16} /> {t('startJourney', 'Start Journey')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="sm:w-[40%] bg-earth-card-alt text-earth-mut font-black px-4 py-4 rounded-xl flex items-center justify-center gap-2 border border-earth-dark/15 uppercase tracking-widest text-xs cursor-not-allowed opacity-70"
                >
                  <Navigation2 size={16} /> {t('awaitingJob', 'Awaiting Job')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Pending Queue & Unit Health */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-earth-dark/10 pb-4">
              <h3 className="text-[10px] font-black text-earth-mut uppercase tracking-widest">{t('awaitingDeployment', 'Awaiting Deployment')}</h3>
              <span className="bg-earth-card border border-earth-dark/10 text-earth-primary px-2 py-0.5 rounded-lg text-[9px] font-black shadow-inner tabular-nums">{loading ? '...' : upcomingJobs.length}</span>
            </div>
            
            <div className="space-y-3">
              {upcomingJobs.length > 0 ? upcomingJobs.map(job => (
                <motion.div 
                  whileHover={{ x: 4 }}
                  key={job.id} 
                  className="bg-white border-none shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-[1.2rem] p-4 flex gap-4 transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="bg-earth-main border border-earth-dark/30 text-earth-sub w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-[9px] shrink-0 shadow-inner group-hover:text-earth-primary group-hover:border-earth-primary/30 transition-colors">
                    <span className="text-[7px] text-earth-mut uppercase tracking-tighter mb-0.5 font-bold">UNIT</span>
                    #{job.id}
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h4 className="font-black text-earth-brown text-sm tracking-tight group-hover:text-earth-primary transition-colors italic truncate">
                      {job.farmer?.name || 'Unknown Client'}
                    </h4>
                     <p className="text-[9px] uppercase font-black text-earth-mut tracking-widest mt-1 truncate">
                       {job.service?.name} • {job.landSize} ha
                       {job.scheduledAt && (
                         <span className="text-earth-primary/80 ml-2 italic">
                           @ {new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       )}
                     </p>
                  </div>
                  <div className="flex items-center text-earth-sub group-hover:text-earth-primary transition-all pr-1">
                    <ArrowRight size={16} />
                  </div>
                </motion.div>
              )) : (
                <div className="bg-white border-none shadow-[0_10px_30px_rgba(0,0,0,0.03)] rounded-[1.2rem] p-10 text-center">
                  <MapIcon className="w-8 h-8 text-earth-mut mx-auto mb-3 opacity-20" />
                  <p className="font-black uppercase tracking-[0.2em] text-[8px] text-earth-mut">{t('queueTerminalClear', 'Queue Terminal Clear')}</p>
                </div>
              )}
            </div>
          </div>


          <div className="pt-2 text-center">
            <button className="text-[9px] font-black text-earth-mut hover:text-earth-brown underline uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
              <Activity size={12} /> {t('viewMissionLogs', 'View Mission Logs')}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

// Simple Badge component utility
function Badge({ children, className }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-lg font-black tracking-widest", className)}>
      {children}
    </span>
  );
}
