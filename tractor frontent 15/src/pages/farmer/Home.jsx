import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, History, Wallet, Zap, Calendar, Tractor, Clock, Loader2, Navigation } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../lib/format';

export default function Home() {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState({ name: '', location: '', active_jobs: 0, total_bookings: 0, total_paid: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingJobs, setUpcomingJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const hasInitialData = dashboardData.name !== '';
      
      try {
        if (!hasInitialData) setIsLoading(true);
        
        const [dashRes, activityRes, jobsRes] = await Promise.all([
          api.farmer.getDashboard(),
          api.farmer.getRecentActivity(),
          api.farmer.getUpcomingJobs(),
        ]);
        
        if (dashRes?.success) setDashboardData(dashRes.data);
        if (activityRes?.success) setRecentActivity(activityRes.data);
        if (jobsRes?.success) setUpcomingJobs(jobsRes.data);
      } catch (error) {
        console.error('Failed to fetch farmer dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []); // Only on mount, api.js handles caching/dedup internally now

  const activeJob = upcomingJobs.find(job => ['ASSIGNED', 'IN_PROGRESS'].includes(job.status));
  const filteredUpcomingJobs = upcomingJobs.filter(job => job.id !== activeJob?.id);

  const stats = useMemo(() => [
    { label: t('revenueInvoiced', 'Revenue Invoiced'), value: formatCurrency(dashboardData.total_paid), icon: Wallet, color: 'text-earth-green', bg: 'bg-earth-primary/5' },
    { label: t('activeMissions', 'Active Missions'), value: dashboardData.active_jobs.toString(), icon: Zap, color: 'text-earth-primary', bg: 'bg-earth-primary/5' },
    { label: t('totalOperations', 'Total Operations'), value: dashboardData.total_bookings.toString(), icon: History, color: 'text-blue-500', bg: 'bg-blue-500/5' },
  ], [dashboardData, t]);

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6 max-w-7xl mx-auto pb-24 md:pb-6">
      
      {/* Dark Theme Header */}
      <header className="relative bg-white border-none shadow-[0_15px_35px_rgba(0,0,0,0.05)] text-earth-brown p-4 md:p-6 rounded-[1.2rem] overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-earth-primary text-xs md:text-sm font-bold mb-0.5 tracking-wider uppercase">{t('welcomeBack', 'Welcome back,')}</p>
            {isLoading && !dashboardData.name ? (
              <Skeleton className="h-8 w-48 mt-1" />
            ) : (
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-earth-brown">{dashboardData.name}</h1>
            )}
          </div>
        </div>
      </header>


        
          {/* Top Row KPIs: Paid, Bookings, Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
            {/* Total Paid */}
            <Card className="bg-white border-none shadow-[0_15px_35px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-shadow rounded-[1.2rem] h-full relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-earth-green"></div>
              <CardContent className="p-4 flex items-center justify-between h-full">
                <div>
                  <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest mb-1">{stats[0].label}</p>
                  {isLoading && !dashboardData.name ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <h3 className="text-xl font-black text-earth-brown">{stats[0].value}</h3>
                  )}
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-earth-dark/15 shadow-inner", stats[0].bg, stats[0].color)}>
                  {(() => { const Icon = stats[0].icon; return <Icon size={20} />; })()}
                </div>
              </CardContent>
            </Card>

            {/* Total Bookings */}
            <Card className="bg-white border-none shadow-[0_15px_35px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-shadow rounded-[1.2rem] h-full relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>
              <CardContent className="p-4 flex items-center justify-between h-full">
                <div>
                  <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest mb-1">{stats[2].label}</p>
                  {isLoading && !dashboardData.name ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <h3 className="text-xl font-black text-earth-brown">{stats[2].value}</h3>
                  )}
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-earth-dark/15 shadow-inner", stats[2].bg, stats[2].color)}>
                  {(() => { const Icon = stats[2].icon; return <Icon size={20} />; })()}
                </div>
              </CardContent>
            </Card>

            {/* Primary Farm Location */}
            <Card className="bg-white border-none shadow-[0_15px_35px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-shadow rounded-[1.2rem] h-full relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-earth-primary"></div>
              <CardContent className="p-4 flex items-center justify-between h-full">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest mb-1 text-nowrap">{t('primaryFarm', 'Primary Farm')}</p>
                  {isLoading && !dashboardData.name ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    <h3 className="text-sm font-black text-earth-brown truncate uppercase tracking-tight">
                      {dashboardData.location || 'Main Site'}
                    </h3>
                  )}
                </div>
                <div className="w-10 h-10 bg-earth-primary/10 text-earth-primary rounded-xl flex items-center justify-center border border-earth-dark/15 shadow-inner shrink-0">
                  <MapPin size={20} />
                </div>
              </CardContent>
            </Card>
          </div>


        {/* --- MAIN GRID (Balanced 2 Columns) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN: ACTIVE JOB + UPCOMING */}
          <div className="space-y-6">
            {/* Active Jobs Count Small Metric */}
            <div className="flex items-center justify-between px-1">
               <h3 className="font-bold text-earth-brown tracking-tight text-xs uppercase tracking-widest">{t('ongoingOperations', 'Ongoing Operations')}</h3>
               <div className="flex items-center gap-2 bg-earth-primary/10 px-3 py-1 rounded-full border border-earth-primary/20">
                 <span className={`flex h-1.5 w-1.5 rounded-full ${dashboardData.active_jobs > 0 ? 'bg-earth-primary animate-ping' : 'bg-earth-mut'}`}></span>
                 <span className="text-[10px] font-black text-earth-primary uppercase">
                   {dashboardData.active_jobs > 0 ? `${dashboardData.active_jobs} Active` : t('idle', 'Idle')}
                 </span>
               </div>
            </div>

            {/* Active Job (Premium Card) */}
            {activeJob ? (
              <Card className="relative overflow-hidden bg-white border border-earth-primary/20 shadow-[0_20px_40px_rgba(0,0,0,0.06)] rounded-[1.5rem] group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-earth-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                <div className="absolute top-0 left-0 w-1.5 h-full bg-earth-primary"></div>
                <CardContent className="p-6 space-y-6 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex h-2 w-2 rounded-full bg-earth-primary animate-ping"></span>
                        <span className="text-[10px] font-black text-earth-primary uppercase tracking-[0.2em]">Live Mission</span>
                      </div>
                      <h4 className="font-black text-earth-brown text-2xl uppercase tracking-tighter leading-tight">{activeJob.service_type}</h4>
                    </div>
                    <div className="bg-earth-card-alt px-3 py-2 rounded-xl border border-earth-dark/5 text-right">
                      <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-0.5">Deployment</p>
                      <p className="text-xs font-black text-earth-brown">
                        {new Date(activeJob.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-earth-dark/5">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 bg-earth-primary/10 rounded-lg text-earth-primary">
                          <Zap size={14} />
                        </div>
                        <p className="text-[10px] text-earth-mut font-black uppercase tracking-widest">Coverage</p>
                      </div>
                      <p className="text-base font-black text-earth-brown pl-8">{activeJob.land_size} <span className="text-[10px] text-earth-sub">HA</span></p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500">
                          <MapPin size={14} />
                        </div>
                        <p className="text-[10px] text-earth-mut font-black uppercase tracking-widest">Station</p>
                      </div>
                      <p className="text-base font-black text-earth-brown pl-8 truncate">{activeJob.location || 'Primary Site'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    {activeJob.operator_name && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-earth-card flex items-center justify-center border border-earth-dark/10 font-black text-[10px] text-earth-brown">
                          {activeJob.operator_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[8px] text-earth-mut font-black uppercase tracking-widest leading-none mb-1">Operator</p>
                          <p className="text-xs font-black text-earth-brown leading-none">{activeJob.operator_name}</p>
                        </div>
                      </div>
                    )}
                    <Link to="/farmer/track" className="px-6 py-3 bg-earth-brown text-white hover:bg-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2">
                      Control Center <ChevronRight size={14} />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
                <Card className="bg-earth-card-alt/30 border border-dashed border-earth-dark/15 rounded-[1.5rem] h-[220px] flex flex-col items-center justify-center group hover:bg-earth-card-alt/50 transition-colors">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-earth-mut/20 mb-3 border border-earth-dark/5 group-hover:scale-110 transition-transform">
                      <Navigation size={28} />
                    </div>
                    <p className="text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">Fleet Idle</p>
                    <p className="text-[9px] text-earth-mut/50 font-bold mt-1">No active operations in progress</p>
                </Card>
            )}

            {/* Upcoming Schedule */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-earth-brown tracking-tight text-xs uppercase tracking-widest px-1 text-nowrap">Upcoming Schedule</h3>
              <div className="space-y-2.5">
                {isLoading && filteredUpcomingJobs.length === 0 ? (
                  Array(2).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-4 items-center bg-white/50 p-4 rounded-[1.2rem] border border-earth-dark/5">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2 w-1/3" />
                      </div>
                    </div>
                  ))
                ) : filteredUpcomingJobs.length > 0 ? (
                  filteredUpcomingJobs.map((job, idx) => {
                    const jobDate = new Date(job.date);
                    return (
                      <div key={idx} className="flex gap-4 items-center bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.06)] transition-shadow p-4 rounded-[1.2rem]">
                        <div className="w-12 h-12 bg-earth-card rounded-xl flex flex-col items-center justify-center border border-earth-dark/10 shrink-0 shadow-inner">
                          <span className="text-[9px] font-black text-earth-primary uppercase leading-none mb-0.5">{jobDate.toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-base font-black text-earth-brown leading-none">{jobDate.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-earth-brown truncate uppercase tracking-wide">{job.service_type}</p>
                          <p className="text-[9px] text-earth-mut font-bold uppercase tracking-widest mt-1">
                            {job.status === 'PENDING' ? 'Awaiting Dispatch' : job.status.replace('_', ' ')}
                          </p>
                        </div>
                        <Calendar size={14} className="text-earth-mut" />
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-earth-card-alt/30 p-4 rounded-xl border border-earth-dark/10/50 text-center flex items-center justify-center h-[74px]">
                    <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Empty schedule</p>
                  </div>
                )}
                
                <Link to="/farmer/history" className="block text-center p-2 text-[10px] font-black text-earth-mut hover:text-earth-primary border border-dashed border-earth-dark/15 rounded-lg transition-colors uppercase tracking-widest">
                  View Full Calendar
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: BOOK CTA + RECENT HISTORY */}
          <div className="space-y-6">
            
            {/* Quick Service CTA */}
            <div className="space-y-3">
              <h3 className="font-bold text-earth-brown tracking-tight text-xs uppercase tracking-widest px-1">{t('rapidBooking', 'Rapid Booking')}</h3>
              <Card className="bg-earth-primary text-earth-brown border-none shadow-[0_10px_30px_rgba(234,179,8,0.1)] relative overflow-hidden rounded-[1.2rem]">
                <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none transform translate-x-2 -translate-y-2">
                  <Tractor size={100} />
                </div>
                <CardContent className="p-6 md:p-8 space-y-4 relative z-10 flex flex-col items-center text-center">
                  <div className="space-y-2">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase italic leading-none">{t('needTractor', 'Need a Tractor?')}</h2>
                    <p className="text-earth-brown/80 font-bold text-xs md:text-sm max-w-[240px] mx-auto">{t('instantDispatch', 'Instant dispatch and precision scheduling for your farm needs.')}</p>
                  </div>
                  <Link to="/farmer/book" className="w-full max-w-[200px] bg-accent text-white hover:opacity-95 py-3.5 text-xs font-black uppercase tracking-[0.15em] rounded-xl shadow-xl shadow-accent/30 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2">
                    {t('bookServiceNow', 'Book Service Now')} <ChevronRight className="inline ml-1" size={14} strokeWidth={3} />
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Recent Completed Jobs (Full width of right column) */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-earth-brown tracking-tight text-xs uppercase tracking-widest">Recent Activity</h3>
                <Link to="/farmer/history" className="text-[10px] font-black text-earth-primary hover:text-earth-primary-hover uppercase tracking-widest">History</Link>
              </div>
              
              <div className="space-y-3">
                {isLoading && recentActivity.length === 0 ? (
                  Array(3).fill(0).map((_, i) => (
                    <Card key={i} className="bg-white/50 border-none shadow-sm rounded-[1.2rem] h-20 flex items-center px-4 gap-4">
                       <Skeleton className="w-1.5 h-full absolute left-0" />
                       <div className="flex-1 space-y-2">
                          <Skeleton className="h-2 w-1/4" />
                          <Skeleton className="h-3 w-1/2" />
                       </div>
                    </Card>
                  ))
                ) : recentActivity.length > 0 ? (
                  recentActivity.slice(0, 3).map((activity, idx) => (
                    <Card key={idx} className="bg-white border-none shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all rounded-[1.2rem] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-earth-primary"></div>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1.5 text-earth-primary">
                            {new Date(activity.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <h4 className="font-black text-earth-brown text-xs uppercase tracking-tight truncate">{activity.service_type}</h4>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-[10px] text-earth-sub font-black uppercase tracking-[0.1em] leading-none mb-1">Fee</p>
                           <p className="text-sm font-black text-earth-brown">{activity.amount ? formatCurrency(activity.amount) : 'N/A'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-none rounded-[1.2rem] h-[100px] flex items-center justify-center">
                      <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">No recent records</p>
                  </Card>
                )}
              </div>
            </div>

          </div>
      </div>
    </div>
  );
}
