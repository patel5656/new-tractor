import React, { useState, useEffect } from 'react';
import { BrainCircuit, TrendingUp, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { api } from '../../../lib/api';

export default function AIForecastWidget() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const resData = await api.admin.getDemandForecast();
        if (resData.success) {
          setData(resData.data);
        }
      } catch (error) {
        console.error("AI Forecast fetch failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchForecast();
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 shadow-sm mb-6">
        <CardContent className="p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
             <Skeleton className="h-4 w-48" />
             <Skeleton className="h-3 w-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="bg-gradient-to-r from-earth-dark to-earth-brown border-none shadow-[0_10px_30px_rgba(0,0,0,0.15)] mb-6 overflow-hidden relative group">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
      
      <CardContent className="p-5 md:p-6 relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-earth-primary shadow-inner shrink-0 group-hover:scale-110 transition-transform">
            <BrainCircuit size={24} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-earth-primary/80 mb-1 flex items-center gap-2">
               Smart AI Insights <TrendingUp size={12} />
            </h3>
            <p className="text-sm md:text-base font-bold text-white leading-tight truncate md:whitespace-normal">
              {data.insight}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 w-full lg:w-auto shrink-0 flex-wrap sm:flex-nowrap">
           <div className="bg-white/10 backdrop-blur border border-white/10 px-4 py-2 rounded-xl flex-1 sm:flex-none min-w-[140px]">
              <p className="text-[9px] uppercase tracking-widest text-earth-primary/70 font-black mb-0.5 whitespace-nowrap">Predicted Peak Zone</p>
              <p className="text-white font-bold flex items-center gap-1.5"><MapPin size={12} className="text-earth-primary" /> {data.topZone}</p>
           </div>
           <div className="bg-white/10 backdrop-blur border border-white/10 px-4 py-2 rounded-xl flex-1 sm:flex-none min-w-[140px]">
              <p className="text-[9px] uppercase tracking-widest text-earth-primary/70 font-black mb-0.5 whitespace-nowrap">Top Service</p>
              <p className="text-white font-bold flex items-center gap-1.5"><AlertCircle size={12} className="text-earth-primary" /> {data.topService}</p>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
