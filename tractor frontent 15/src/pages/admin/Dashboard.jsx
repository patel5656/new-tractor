import { useState, useEffect, Fragment, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Tractor, Banknote, Navigation, ArrowUpRight, ArrowDownRight, 
  Activity, Clock, MapPin, CheckCircle, AlertCircle, Fuel, Battery,
  MoreVertical, ShieldCheck, Zap
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, Polyline } from '@react-google-maps/api';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/format';
import API_BASE_URL from '../../config/api';
import AIForecastWidget from '../../components/admin/ai/AIForecastWidget';
import AIHeatmapLayer from '../../components/admin/ai/AIHeatmapLayer';
import { Brain, Calendar, Globe, Sparkles, TrendingUp as TrendUp } from 'lucide-react';

const SOCKET_URL = API_BASE_URL;
const DEFAULT_CENTER = { lat: 30.900965, lng: 75.857277 };

const getRoute = async (start, end) => {
  if (!window.google) return [{ lat: start.lat, lng: start.lng }, { lat: end.lat, lng: end.lng }];
  return new Promise((resolve) => {
    const ds = new window.google.maps.DirectionsService();
    ds.route(
      {
        origin: { lat: start.lat, lng: start.lng },
        destination: { lat: end.lat, lng: end.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === 'OK') {
          const route = response.routes[0];
          const coordinates = route.overview_path.map((p) => ({
            lat: p.lat(),
            lng: p.lng(),
          }));
          resolve(coordinates);
        } else {
          resolve([{ lat: start.lat, lng: start.lng }, { lat: end.lat, lng: end.lng }]);
        }
      }
    );
  });
};

const LIBRARIES = ['places'];

export default function Dashboard() {
  const { t } = useTranslation();
  const [assignmentStatus, setAssignmentStatus] = useState(null);
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const [metrics, setMetrics] = useState({ active_jobs: 0, pending_assignment: 0, fleet_ready: 0, total_revenue: 0 });
  const [assignmentQueue, setAssignmentQueue] = useState([]);
  const [revenueChart, setRevenueChart] = useState({ labels: [], data: [] });
  const [fleetData, setFleetData] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [fleetLocations, setFleetLocations] = useState({}); // { operatorId: { lat, lng, heading } }
  const [jobRoutes, setJobRoutes] = useState({}); // { jobId: coordinates[] }
  const [timeframe, setTimeframe] = useState('daily');
  const [showAI, setShowAI] = useState(false);
  const [aiMetrics, setAiMetrics] = useState({
    peakSeason: 'Harvest Season (May)',
    highestMonth: 'May',
    topRevenuePeriod: 'May 2026',
    growthPercentage: 42.0,
    insights: [
      "Demand increased by 40% during harvest season.",
      "Ludhiana generated the highest tractor bookings this quarter.",
      "Morning bookings are 56% higher than evening bookings."
    ],
    isLoading: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [activePopup, setActivePopup] = useState(null); // { type, jobId, extra }

  useEffect(() => {
    const fetchAiMetrics = async () => {
      try {
        const [timeRes, seasonsRes, revRes] = await Promise.all([
          api.ai.getTimeAnalysis(),
          api.ai.getSeasons(),
          api.ai.getRevenue()
        ]);
        
        let peakSeason = 'Harvest Season';
        let highestMonth = 'May';
        let topRevenuePeriod = 'May 2026';
        let growthPercentage = 42.0;
        let insights = [
          "Demand increased by 40% during harvest season.",
          "Ludhiana generated the highest tractor bookings this quarter.",
          "Morning bookings are 35% higher than evening bookings."
        ];

        if (seasonsRes.success && seasonsRes.data && seasonsRes.data.length > 0) {
          const peak = seasonsRes.data[0];
          peakSeason = `${peak.month} (${peak.peakDemandScore}% score)`;
          highestMonth = peak.month;
        }

        if (revRes.success && revRes.data && revRes.data.length > 0) {
          const sorted = [...revRes.data].sort((a, b) => b.totalRevenue - a.totalRevenue);
          if (sorted[0]) {
            topRevenuePeriod = sorted[0].period;
          }
          const latest = revRes.data[revRes.data.length - 1];
          if (latest) {
            growthPercentage = latest.growthPercentage;
          }
        }

        if (timeRes.success && timeRes.data) {
          insights = timeRes.data.insights || insights;
        }

        setAiMetrics({
          peakSeason,
          highestMonth,
          topRevenuePeriod,
          growthPercentage,
          insights,
          isLoading: false
        });
      } catch (error) {
        console.error("Failed to fetch AI dashboard stats", error);
        setAiMetrics(prev => ({ ...prev, isLoading: false }));
      }
    };
    fetchAiMetrics();
  }, []);

  const mapRef = useRef(null);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const hasInitialData = metrics.active_jobs !== 0 || assignmentQueue.length > 0;
      
      try {
        if (!hasInitialData) setIsLoading(true);
        
        const [metricsRes, queueRes, fleetRes, jobsRes] = await Promise.all([
          api.admin.getDashboardMetrics(),
          api.admin.getAssignmentQueue(),
          api.admin.getDashboardFleet(),
          api.admin.getActiveJobs()
        ]);
        
        if (metricsRes?.success) setMetrics(metricsRes.data);
        if (queueRes?.success) setAssignmentQueue(queueRes.data);
        if (fleetRes?.success) setFleetData(fleetRes.data);
        if (jobsRes?.success) setActiveJobs(jobsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();

    const socket = io(SOCKET_URL, { 
      transports: ['websocket'],
      reconnection: true
    });
    
    socket.emit('tracking:join', { role: 'admin' });
    
    socket.on('location:update', (payload) => {
      if (!payload || !payload.operatorId) return;
      setFleetLocations(prev => {
        const old = prev[payload.operatorId];
        let heading = old?.heading || 0;
        if (old) {
          const dy = payload.lat - old.lat;
          const dx = Math.cos(old.lat * Math.PI / 180) * (payload.lng - old.lng);
          heading = Math.atan2(dx, dy) * 180 / Math.PI;
        }
        return {
          ...prev,
          [payload.operatorId]: { lat: payload.lat, lng: payload.lng, heading }
        };
      });
    });

    return () => {
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.once('connect', () => socket.disconnect());
      }
    };
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setDeviceLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
    const fetchRevenueData = async () => {
      try {
        setIsChartLoading(true);
        const revenueRes = await api.admin.getDashboardRevenue(timeframe);
        if (revenueRes?.success) setRevenueChart(revenueRes.data);
      } catch (error) {
        console.error('Failed to fetch revenue:', error);
      } finally {
        setIsChartLoading(false);
      }
    };
    fetchRevenueData();
  }, [timeframe]);

  useEffect(() => {
    let isCancelled = false;
    
    const fetchAllRoutes = async () => {
      const jobsToFetch = activeJobs.filter(job => {
        const hasOpLoc = !!fleetLocations[job.operatorId];
        const hasDest = Number.isFinite(job.farmerLatitude);
        const alreadyHasRoute = !!jobRoutes[job.id];
        return hasOpLoc && hasDest && !alreadyHasRoute;
      });

      if (jobsToFetch.length === 0) return;

      for (const job of jobsToFetch) {
        if (isCancelled) break;
        
        const opLoc = fleetLocations[job.operatorId];
        await new Promise(r => setTimeout(r, 1000));
        if (isCancelled) break;
        
        const route = await getRoute(opLoc, { lat: job.farmerLatitude, lng: job.farmerLongitude });
        if (route) {
          setJobRoutes(prev => ({ ...prev, [job.id]: route }));
        }
      }
    };

    fetchAllRoutes();
    return () => { isCancelled = true; };
  }, [activeJobs, fleetLocations, jobRoutes]);
  
  const stats = [
    { title: t('activeJobs', 'Active Jobs'), value: metrics.active_jobs, icon: Activity, trend: '+2', up: true },
    { title: t('pendingAssignment', 'Pending Assignment'), value: metrics.pending_assignment, icon: Clock, trend: `${metrics.pending_assignment} New`, up: true, highlight: metrics.pending_assignment > 0 },
    { title: t('fleetReady', 'Fleet Ready'), value: metrics.fleet_ready, icon: Tractor, trend: 'Optimal', up: true },
    { title: t('totalRevenue', 'Total Revenue'), value: formatCurrency(metrics.total_revenue), icon: Banknote, trend: '+18%', up: true },
  ];

  const handleAssign = (bookingId) => {
    window.location.hash = `#/admin/assignments?bookingId=${bookingId}`;
  };

  const chartMax = Math.max(...(revenueChart.data?.length ? revenueChart.data : [1000]));

  const mapMarkers = useMemo(() => {
    const points = [];
    if (deviceLocation) points.push(deviceLocation);
    Object.values(fleetLocations).forEach(loc => points.push(loc));
    activeJobs.forEach(job => {
      if (Number.isFinite(job.farmerLatitude)) {
        points.push({ lat: job.farmerLatitude, lng: job.farmerLongitude });
      }
    });
    return points;
  }, [deviceLocation, fleetLocations, activeJobs]);

  useEffect(() => {
    if (mapRef.current && mapMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      mapMarkers.forEach((m) => {
        if (m && Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
          bounds.extend(m);
        }
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [mapMarkers]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 relative">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-earth-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/2 -left-20 w-64 h-64 bg-earth-accent/5 blur-[120px] rounded-full pointer-events-none"></div>

      <AIForecastWidget />
      
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className={cn(
            "relative border-none overflow-hidden transition-all duration-300 hover:shadow-xl",
            stat.highlight ? "bg-white shadow-[0_10px_40px_rgba(234,179,8,0.12)] border-earth-accent/20 border" : "bg-white shadow-sm border border-earth-dark/5"
          )}>
            <div className={cn("absolute top-0 left-0 w-full h-1 md:h-1.5", 
              i === 0 ? "bg-blue-500" : i === 1 ? "bg-earth-accent" : i === 2 ? "bg-earth-green" : "bg-earth-green-dark"
            )}></div>
            
            <CardContent className="p-4 md:p-6 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4 md:mb-6">
                <div className="space-y-0.5 md:space-y-1">
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-earth-mut">{stat.title}</p>
                  {isLoading && metrics.active_jobs === 0 ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <h3 className="text-xl md:text-3xl font-black tracking-tighter text-earth-brown tabular-nums leading-none">{stat.value}</h3>
                  )}
                </div>
                <div className={cn(
                  "w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner shrink-0",
                  stat.highlight ? "bg-earth-accent/10 text-earth-accent" : "bg-earth-card border border-earth-dark/5 text-earth-primary"
                )}>
                  <stat.icon size={20} className={cn("md:w-[26px] md:h-[26px]", stat.highlight && 'animate-pulse')} />
                </div>
              </div>
              
              <div className="mt-auto flex items-center justify-between pt-3 md:pt-4 border-t border-earth-dark/[0.05]">
                <div className="flex items-center gap-1 md:gap-1.5">
                  <span className={cn(
                    "flex items-center text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-full",
                    stat.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  )}>
                    {stat.up && stat.trend.includes('%') ? <ArrowUpRight size={10} className="mr-0.5 md:mr-1" /> : null}
                    {stat.trend}
                  </span>
                </div>
                <Activity size={10} className="text-earth-mut/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Business Intelligence Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Peak Season, Growth, and Revenue Period cards */}
        <div className="lg:col-span-1 grid grid-cols-1 gap-4">
          
          {/* Peak Season Card */}
          <Card className="bg-white border-none shadow-sm border border-earth-dark/5 overflow-hidden relative group rounded-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-earth-mut">AI Peak Season</p>
                <h4 className="text-sm font-black text-earth-brown leading-tight">
                  {aiMetrics.isLoading ? "Analyzing..." : aiMetrics.peakSeason}
                </h4>
                <p className="text-[9px] font-bold text-purple-600 uppercase flex items-center gap-1 mt-1">
                  <Sparkles size={10} /> Active Prediction Core
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Calendar size={20} />
              </div>
            </CardContent>
          </Card>

          {/* Growth % Card */}
          <Card className="bg-white border-none shadow-sm border border-earth-dark/5 overflow-hidden relative group rounded-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-earth-mut">AI Projected Growth</p>
                <h4 className="text-2xl font-black text-earth-brown tabular-nums leading-none">
                  {aiMetrics.isLoading ? "..." : `+${aiMetrics.growthPercentage.toFixed(1)}%`}
                </h4>
                <p className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1 mt-1">
                  <TrendUp size={10} /> MoM Booking Growth
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendUp size={20} />
              </div>
            </CardContent>
          </Card>

          {/* Top Revenue Period Card */}
          <Card className="bg-white border-none shadow-sm border border-earth-dark/5 overflow-hidden relative group rounded-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-earth-mut">Top Revenue Period</p>
                <h4 className="text-sm font-black text-earth-brown leading-tight">
                  {aiMetrics.isLoading ? "Analyzing..." : aiMetrics.topRevenuePeriod}
                </h4>
                <p className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1 mt-1">
                  <Globe size={10} /> Peak Earnings
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Globe size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Insights Panel */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-white to-purple-50/20 border border-purple-100/50 shadow-md rounded-[1.5rem] overflow-hidden relative group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <CardHeader className="pb-4 pt-6 px-6 flex flex-row items-center justify-between bg-transparent border-none">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
                <Brain size={14} className="animate-pulse" />
              </div>
              <CardTitle className="text-xs font-black text-earth-brown uppercase tracking-widest">Seasonal Business Insights</CardTitle>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              Telemetry Aggregate
            </span>
          </CardHeader>
          <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-center space-y-3">
            {aiMetrics.isLoading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : (
              aiMetrics.insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-white/75 backdrop-blur p-3.5 rounded-xl border border-purple-50/50 shadow-sm hover:scale-[1.01] hover:shadow-md transition-all">
                  <div className="w-5 h-5 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    {idx + 1}
                  </div>
                  <p className="text-xs font-bold text-earth-brown leading-relaxed italic">
                    "{insight}"
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* DISPATCH QUEUE */}
        <div className="lg:col-span-8 space-y-5">
          <Card className="bg-white border-none shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-[2rem] overflow-hidden">
            <CardHeader className="border-b border-earth-dark/5 pb-5 pt-7 px-8 flex flex-row items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-earth-primary/10 rounded-lg flex items-center justify-center text-earth-primary border border-earth-primary/20">
                  <Zap size={16} />
                </div>
                <CardTitle className="text-base font-black text-earth-brown uppercase tracking-wide">{t('assignmentQueue', 'Assignment Queue')}</CardTitle>
              </div>
              <Badge className="bg-earth-card border-earth-dark/15 text-earth-sub text-[10px] uppercase font-black tracking-widest px-3 py-1">
                {metrics.pending_assignment} {t('awaitingAllocation', 'Awaiting Allocation')}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-earth-dark text-white">
                    <tr>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em]">{t('deploymentIdentity', 'Deployment Identity')}</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em]">{t('classification', 'Classification')}</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em]">{t('operationalZone', 'Operational Zone')}</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em]">{t('valuation', 'Valuation')}</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right">{t('commanderAction', 'Commander Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-earth-dark/5">
                    {isLoading && assignmentQueue.length === 0 ? (
                      Array(3).fill(0).map((_, i) => (
                        <tr key={i}>
                           <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                           <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                           <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                           <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                           <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-24 inline-block" /></td>
                        </tr>
                      ))
                    ) : assignmentQueue.length > 0 ? assignmentQueue.map((booking) => (
                      <tr key={booking.id} className="group hover:bg-earth-card transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="px-2 py-1 rounded-md bg-earth-card border border-earth-dark/10 flex items-center justify-center text-[9px] uppercase tracking-widest font-black text-earth-mut">
                              {booking.id}
                            </div>
                            <span className="font-bold text-earth-brown text-sm">{booking.farmer_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-earth-dark/15 bg-earth-card/50 text-earth-brown">
                            {booking.service_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-earth-sub">
                          <div>{booking.land_size} Hectares</div>
                          <div className="text-[10px] opacity-60 flex items-center gap-1"><MapPin size={10} /> {booking.location || 'Standard Zone'}</div>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-primary">
                          {formatCurrency(booking.total_price)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            onClick={() => handleAssign(booking.id)}
                            disabled={assignmentStatus === booking.id}
                            className="bg-earth-accent hover:bg-earth-accent/90 text-white h-9 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-[0_4px_15_rgba(255,152,0,0.3)] hover:scale-105 active:scale-95 transition-all border-none"
                          >
                            {assignmentStatus === booking.id ? t('syncing', 'SYNCING...') : t('assignUnit', 'ASSIGN UNIT')}
                          </Button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-earth-mut font-bold uppercase text-[10px] tracking-widest">{t('allJobsAssigned', 'All jobs assigned')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {isLoading ? (
                  <div className="py-10 text-center">
                    <Clock className="animate-spin mx-auto text-earth-primary mb-2" size={20} />
                    <p className="text-[10px] font-black uppercase text-earth-mut">{t('syncing', 'Syncing...')}</p>
                  </div>
                ) : assignmentQueue.length > 0 ? assignmentQueue.map((booking) => (
                  <div key={booking.id} className="p-4 rounded-2xl bg-earth-card/30 border border-earth-dark/5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="px-1.5 py-0.5 rounded-md bg-white border border-earth-dark/10 text-[8px] font-black text-earth-mut">{booking.id}</div>
                        <span className="font-bold text-earth-brown text-sm">{booking.farmer_name}</span>
                      </div>
                      <Badge className="text-[8px] font-black uppercase tracking-widest bg-earth-primary/20 text-earth-brown border-none">{booking.service_type}</Badge>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] font-bold text-earth-sub space-y-1">
                        <p>{booking.land_size} Hectares</p>
                        <p className="opacity-60 flex items-center gap-1"><MapPin size={10} /> {booking.location}</p>
                        <p className="text-earth-primary font-black">{formatCurrency(booking.total_price)}</p>
                      </div>
                      <Button 
                        onClick={() => handleAssign(booking.id)}
                        disabled={assignmentStatus === booking.id}
                        size="sm"
                        className="bg-earth-accent text-white font-black uppercase tracking-widest text-[9px] rounded-lg px-4"
                      >
                        {t('assign', 'Assign')}
                      </Button>
                    </div>
                  </div>
                )) : (
                  <p className="p-8 text-center text-earth-mut font-black uppercase text-[10px] tracking-widest opacity-50">{t('queueEmpty', 'Queue Empty')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="bg-earth-card-alt shadow-lg rounded-[1.5rem] overflow-hidden">
             <div className="p-6 flex justify-between items-center bg-earth-card/30">
                <h3 className="text-sm font-black text-earth-brown uppercase tracking-widest">{t('revenueAnalytics', 'Revenue Analytics')}</h3>
                <div className="flex gap-2">
                   {['Daily', 'Weekly', 'Monthly'].map(tStr => {
                      const isActive = tStr.toLowerCase() === timeframe;
                      return (
                         <button 
                           key={tStr} 
                           onClick={() => setTimeframe(tStr.toLowerCase())}
                           className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md transition-all shadow-sm", isActive ? "bg-earth-primary text-earth-brown shadow-[0_0_15px_rgba(234,179,8,0.2)] scale-105" : "bg-earth-card text-earth-mut hover:text-earth-brown hover:shadow-md")}
                         >
                          {t(tStr.toLowerCase(), tStr)}
                        </button>
                      );
                   })}
                </div>
             </div>
             <div className="p-6 h-64 relative bg-earth-card/20 flex items-end justify-around gap-2">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(to right, #404040 1px, transparent 1px), linear-gradient(to bottom, #404040 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                
                {revenueChart?.labels?.map((label, index) => {
                  const val = revenueChart.data[index] || 0;
                  const heightPercentage = Math.min(Math.max((val / chartMax) * 100, 8), 100);

                  return (
                    <div key={index} className="flex flex-col items-center justify-end h-full z-10 w-full max-w-[42px] group relative">
                      <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col items-center z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="bg-earth-dark text-white text-[10px] font-black px-3 py-2 rounded-xl shadow-2xl whitespace-nowrap">
                          {formatCurrency(val)}
                        </div>
                        <div className="w-2 h-2 bg-earth-dark rotate-45 -mt-1"></div>
                      </div>

                      <div 
                        className="w-full bg-gradient-to-t from-earth-primary via-earth-primary/70 to-earth-primary/30 hover:brightness-110 rounded-xl transition-all duration-500 cursor-pointer shadow-[0_4px_15px_rgba(46,125,50,0.2)] relative"
                        style={{ height: `${heightPercentage}%` }}
                      >
                         <div className="absolute bottom-0 left-0 w-full h-1.5 bg-earth-primary-dark/30 rounded-b-xl"></div>
                      </div>
                      <div className="text-[10px] font-black text-earth-brown/70 mt-4 tracking-widest group-hover:text-earth-primary transition-colors uppercase whitespace-nowrap">{label}</div>
                    </div>
                  );
                })}
                {isChartLoading ? (
                   <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-earth-mut gap-2">
                      <Clock className="animate-spin text-earth-primary" size={14} /> {t('loadingData', 'Loading Data...')}
                   </div>
                ) : revenueChart?.labels?.length === 0 ? (
                   <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-earth-mut">
                      {t('noRecentRevenueData', 'No recent revenue data')}
                   </div>
                ) : null}
             </div>
          </Card>
        </div>

        {/* FLEET MONITORING */}
        <div className="lg:col-span-4 space-y-5">
           <Card className="bg-white shadow-[0_30px_60px_rgba(0,0,0,0.06)] rounded-[2rem] overflow-hidden flex flex-col h-full">
            <CardHeader className="pb-5 pt-7 px-8 shrink-0 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-earth-primary shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse"></div>
                   <CardTitle className="text-base font-black text-earth-brown uppercase tracking-wide">{t('liveFleet', 'Live Fleet')}</CardTitle>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] border-emerald-500/20 text-earth-green bg-earth-primary/5 px-2">
                    {t('liveGps', 'Live GPS')}
                  </Badge>
                  <button
                    onClick={() => setShowAI(!showAI)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all shadow-sm",
                      showAI ? 'bg-purple-500/15 text-purple-700 border-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]' : 'bg-earth-card text-earth-mut border-earth-dark/10 hover:text-earth-brown'
                    )}
                  >
                    <Brain size={10} className={showAI ? "animate-pulse text-purple-600" : "text-earth-mut"} /> AI MAP
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="relative z-0 h-[300px] bg-earth-main border-b border-earth-dark/10 shrink-0 group overflow-hidden">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '300px' }}
                    center={DEFAULT_CENTER}
                    zoom={10}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                      zoomControl: false,
                    }}
                  >
                    <AIHeatmapLayer show={showAI} />
                    {deviceLocation && (
                      <MarkerF
                        position={deviceLocation}
                        icon={window.google ? {
                          url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8" fill="%232563eb" stroke="white" stroke-width="2"/></svg>',
                          scaledSize: new window.google.maps.Size(16, 16),
                          anchor: new window.google.maps.Point(8, 8),
                        } : undefined}
                        onClick={() => setActivePopup({ type: 'device', jobId: 'device' })}
                      />
                    )}

                    {activePopup && activePopup.type === 'device' && deviceLocation && (
                      <InfoWindowF
                        position={deviceLocation}
                        onCloseClick={() => setActivePopup(null)}
                      >
                        <div className="text-[10px] font-black uppercase">{t('youAreHere', 'You are here')}</div>
                      </InfoWindowF>
                    )}

                    {fleetData.map((tItem) => {
                      const loc = fleetLocations[tItem.operatorId];
                      if (!loc) return null;
                      
                      const job = activeJobs.find(j => j.operatorId === tItem.operatorId);
                      const route = job ? jobRoutes[job.id] : null;

                      return (
                        <Fragment key={tItem.id}>
                          <MarkerF
                            position={{ lat: loc.lat, lng: loc.lng }}
                            icon={window.google ? {
                              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                              scale: 4,
                              fillColor: tItem.status?.toLowerCase() === 'available' ? '#16a34a' : '#ea7b08',
                              fillOpacity: 1,
                              strokeColor: '#ffffff',
                              strokeWeight: 1.5,
                              rotation: loc.heading || 0,
                            } : undefined}
                            onClick={() => setActivePopup({ type: 'operator', jobId: tItem.id, extra: tItem })}
                          />

                          {activePopup && activePopup.type === 'operator' && activePopup.jobId === tItem.id && (
                            <InfoWindowF
                              position={{ lat: loc.lat, lng: loc.lng }}
                              onCloseClick={() => setActivePopup(null)}
                            >
                              <div className="text-[10px] space-y-1">
                                 <p className="font-black uppercase text-earth-mut">Unit #T-{tItem.id}</p>
                                 <p className="font-bold text-earth-brown">{tItem.operator_name}</p>
                                 {job && <p className="text-[9px] text-earth-primary font-bold">{t('headingTo', 'Heading to')}: {job.farmerName}</p>}
                              </div>
                            </InfoWindowF>
                          )}

                          {job && Number.isFinite(job.farmerLatitude) && (
                            <MarkerF
                              position={{ lat: job.farmerLatitude, lng: job.farmerLongitude }}
                              icon={window.google ? {
                                url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><text y="18" font-size="18">📍</text></svg>',
                                scaledSize: new window.google.maps.Size(24, 24),
                                anchor: new window.google.maps.Point(12, 22),
                              } : undefined}
                              onClick={() => setActivePopup({ type: 'farmer', jobId: job.id, extra: job })}
                            />
                          )}

                          {activePopup && activePopup.type === 'farmer' && activePopup.jobId === job?.id && (
                            <InfoWindowF
                              position={{ lat: job.farmerLatitude, lng: job.farmerLongitude }}
                              onCloseClick={() => setActivePopup(null)}
                            >
                              <div className="text-[10px] space-y-1">
                                 <p className="font-black uppercase text-earth-mut">{t('client', 'Client')}</p>
                                 <p className="font-bold text-earth-brown">{job.farmerName}</p>
                                 <p className="text-[9px] text-earth-sub">{t('task', 'Task')}: {job.serviceName}</p>
                              </div>
                            </InfoWindowF>
                          )}

                          {route && route.length > 0 && (
                            <Polyline
                              path={route}
                              options={{ strokeColor: '#16a34a', strokeWeight: 2, strokeOpacity: 0.7 }}
                            />
                          )}

                          {job && !route && (
                            <Polyline
                              path={[
                                { lat: loc.lat, lng: loc.lng },
                                { lat: job.farmerLatitude, lng: job.farmerLongitude }
                              ]}
                              options={{
                                strokeColor: '#dc2626',
                                strokeWeight: 1,
                                strokeOpacity: 0.5,
                                icons: [{
                                  icon: {
                                    path: 'M 0,-1 0,1',
                                    strokeOpacity: 1,
                                    scale: 2
                                  },
                                  offset: '0',
                                  repeat: '10px'
                                }]
                              }}
                            />
                          )}
                        </Fragment>
                      );
                    })}
                  </GoogleMap>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-earth-main/50 text-[10px] font-black uppercase text-earth-mut">
                    Loading Satellite View...
                  </div>
                )}
                
                {Object.keys(fleetLocations).length === 0 && !deviceLocation && (
                   <div className="absolute inset-0 bg-earth-main/50 backdrop-blur-[2px] z-[500] flex items-center justify-center pointer-events-none">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-earth-mut flex items-center gap-2">
                         <Activity size={12} className="text-earth-primary" /> {t('calibratingSatelliteView', 'Calibrating Satellite View...')}
                      </p>
                   </div>
                )}
              </div>

              <div className="p-5 space-y-3 flex-1 overflow-y-auto bg-earth-card/30 scrollbar-hide max-h-[400px]">
                <h4 className="text-[10px] font-black text-earth-mut uppercase tracking-[0.2em] mb-4 pl-1">{t('operationalFleetDeployment', 'Operational Fleet Deployment')}</h4>
                {isLoading ? (
                  <div className="py-20 text-center">
                    <Activity className="animate-spin mx-auto text-earth-primary/40 mb-3" size={20} />
                    <p className="text-[9px] font-black uppercase tracking-widest text-earth-mut">{t('scanningFleet', 'Scanning Fleet...')}</p>
                  </div>
                ) : fleetData.length === 0 ? (
                  <div className="py-20 text-center bg-earth-main/50 rounded-[2rem] border border-dashed border-earth-dark/10">
                    <Tractor className="mx-auto text-earth-mut/20 mb-3" size={32} />
                    <p className="text-[9px] font-black text-earth-mut uppercase tracking-widest">{t('noActiveUnitsFound', 'No Active Units Found')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {fleetData.map((tItem, index) => (
                      <div key={index} className="p-5 rounded-[1.5rem] bg-white border border-earth-dark/[0.03] shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
                        <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full -mr-16 -mt-16 pointer-events-none", 
                          tItem.status?.toLowerCase() === 'available' ? 'bg-earth-green' : 'bg-earth-accent'
                        )}></div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5 relative z-10">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn(
                              "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all transform group-hover:rotate-6 duration-500 shrink-0",
                              tItem.status?.toLowerCase() === 'available' ? 'bg-emerald-50 text-earth-green border border-emerald-100' : 
                              tItem.status?.toLowerCase() === 'in_use' ? 'bg-amber-50 text-earth-accent border border-amber-100' : 
                              'bg-red-50 text-red-500 border border-red-100'
                            )}>
                               <Tractor size={22} className="md:w-6 md:h-6" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <p className="font-black text-earth-brown text-base tracking-tight truncate">{tItem.operator_name}</p>
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="text-[10px] text-earth-mut font-black uppercase tracking-widest truncate">{tItem.tractor_model}</span>
                                <div className="w-1 h-1 bg-earth-dark/10 rounded-full shrink-0"></div>
                                <span className="text-[9px] text-earth-mut font-black uppercase tracking-[0.2em] shrink-0">#T-{tItem.id}</span>
                              </div>
                            </div>
                          </div>
                          <div className={cn(
                            "text-[8px] px-3 py-1 font-black uppercase tracking-[0.2em] rounded-full shadow-sm text-white shrink-0 sm:ml-auto",
                            tItem.status?.toLowerCase() === 'available' ? 'bg-earth-green shadow-emerald-500/20' : 
                            tItem.status?.toLowerCase() === 'in_use' ? 'bg-earth-accent shadow-amber-500/20' : 
                            'bg-red-500 shadow-red-500/20'
                          )}>
                            {tItem.status?.replace('_', ' ')}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-4 md:pt-5 border-t border-earth-dark/[0.05] relative z-10">
                          <div className="space-y-1.5 md:space-y-2">
                             <div className="flex justify-between items-center text-[8px] md:text-[9px] font-black uppercase tracking-widest text-earth-mut">
                                <span>{t('engineHoursLabel', 'Engine Hours')}</span>
                                <span className="text-earth-brown text-right">{tItem.engine_hours || 0} HRS</span>
                             </div>
                             <div className="h-1 md:h-1.5 bg-earth-dark/[0.03] rounded-full overflow-hidden">
                                <div className="h-full bg-earth-accent rounded-full shadow-[0_0_8px_rgba(255,152,0,0.4)]" style={{ width: `${Math.min(((tItem.engine_hours || 0) / 250) * 100, 100)}%` }}></div>
                             </div>
                          </div>
                          <div className="space-y-1.5 md:space-y-2">
                             <div className="flex justify-between items-center text-[8px] md:text-[9px] font-black uppercase tracking-widest text-earth-mut">
                                <span>{t('shiftStatus', 'Shift Status')}</span>
                                <span className={cn("text-right font-bold uppercase", tItem.operator_availability === 'available' ? "text-earth-green" : "text-earth-accent")}>{tItem.operator_availability}</span>
                             </div>
                             <div className="h-1 md:h-1.5 bg-earth-dark/[0.03] rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all duration-1000", tItem.operator_availability === 'available' ? "bg-earth-green w-full shadow-[0_0_8px_rgba(46,125,50,0.4)]" : "bg-earth-accent w-1/2 shadow-[0_0_8px_rgba(255,152,0,0.4)]")}></div>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin-slow { animation: spin 20s linear infinite; }
        @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
      `}} />

      {/* SUCCESS OVERLAY FOR ASSIGNMENT */}
      {assignmentStatus && (
        <div className="fixed bottom-10 right-10 bg-emerald-600 text-earth-brown px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-300 z-[100] border border-emerald-500">
           <div className="bg-earth-primary p-2 rounded-xl"><ShieldCheck size={24} /></div>
           <div>
              <p className="text-xs font-black uppercase tracking-widest">{t('operatorAssigned', 'Operator Assigned')}</p>
              <p className="text-[10px] font-bold opacity-80">{t('operatorLinkedToBooking', { bookingId: assignmentStatus }, `Operator linked to Booking ${assignmentStatus}`)}</p>
           </div>
        </div>
      )}
    </div>
  );
}
