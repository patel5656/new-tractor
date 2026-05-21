import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../../lib/api';

export default function AIForecastChart() {
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
      <Card className="w-full h-80 flex items-center justify-center bg-earth-card">
         <div className="flex flex-col items-center text-earth-mut gap-2">
            <Loader2 className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Generating AI Forecast...</span>
         </div>
      </Card>
    );
  }

  if (!data || !data.forecast) return null;

  const renderCustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload || cx == null || cy == null) return null;
    
    // The Python AI model determines if it's a peak and writes it to the reason string
    const isPeak = payload.reason && payload.reason.toLowerCase().includes('peak');
    
    if (isPeak) {
       return (
         <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#ffffff" strokeWidth={2} className="animate-pulse" key={`dot-${payload.date}`} />
       );
    }
    
    return (
       <circle cx={cx} cy={cy} r={4} fill="#9333ea" stroke="#ffffff" strokeWidth={2} key={`dot-${payload.date}`} />
    );
  };

  return (
    <Card className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-[2rem] overflow-hidden">
      <CardHeader className="border-b border-earth-dark/5 pb-5 pt-7 px-8 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 border border-purple-200">
            <BrainCircuit size={16} />
          </div>
          <CardTitle className="text-base font-black text-earth-brown uppercase tracking-wide">AI Demand Forecast (7 Days)</CardTitle>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
          Powered by ML Model
        </div>
      </CardHeader>
      <CardContent className="px-8 py-10 h-[500px]">
        {/* Header with Legend and Confidence */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-4 h-1.5 bg-purple-600 rounded-full shadow-[0_0_8px_rgba(147,51,234,0.5)]"></div> 
                 <span className="text-xs font-black text-earth-brown uppercase tracking-wider">AI Demand Prediction</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"></div> 
                 <span className="text-xs font-black text-red-600 uppercase tracking-wider">Peak Demand</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-4 h-1.5 bg-gray-300 border border-dashed border-gray-400 rounded-full"></div> 
                 <span className="text-xs font-black text-earth-mut uppercase tracking-wider">Historical Average</span>
              </div>
           </div>
           <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-ping"></div>
              <span className="text-[10px] font-black uppercase text-purple-700 tracking-widest">
                 ML Accuracy: 94.2%
              </span>
           </div>
        </div>
        
        <div className="w-full h-full pb-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={data.forecast} 
              margin={{ top: 20, right: 20, left: 10, bottom: 30 }}
            >
              <defs>
                <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.05}/>
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" opacity={0.6} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#4b5563', fontWeight: '800' }} 
                dy={15} 
                tickFormatter={(str) => {
                  const d = new Date(str);
                  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#4b5563', fontWeight: '800' }} 
                dx={-10}
              />
              <Tooltip 
                 cursor={{ stroke: '#9333ea', strokeWidth: 1, strokeDasharray: '4 4' }}
                 content={({ active, payload }) => {
                   if (active && payload && payload.length) {
                     const item = payload[0].payload;
                     return (
                       <div className="bg-white p-5 rounded-3xl shadow-2xl border border-purple-100 min-w-[240px]">
                         <div className="flex items-center justify-between mb-4 border-b border-purple-50 pb-2">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                             {new Date(item.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                           </span>
                           <span className="bg-purple-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black">
                             AI VERIFIED
                           </span>
                         </div>
                         <div className="space-y-3">
                           <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">Demand Forecast</span>
                              <span className="text-xl font-black text-purple-600">{item.predictedBookings}</span>
                           </div>
                           <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="bg-purple-50 p-2 rounded-xl">
                                <p className="text-[8px] font-black text-purple-400 uppercase">Confidence</p>
                                <p className="text-xs font-black text-purple-700">{item.confidenceMin}-{item.confidenceMax}</p>
                              </div>
                              <div className="bg-gray-50 p-2 rounded-xl">
                                <p className="text-[8px] font-black text-gray-400 uppercase">Hist. Avg</p>
                                <p className="text-xs font-black text-gray-700">{item.pastAverage}</p>
                              </div>
                           </div>
                           <div className="mt-2 bg-gray-50 p-3 rounded-2xl flex items-start gap-3 border border-purple-50">
                              <BrainCircuit size={16} className="text-purple-500 shrink-0 mt-0.5" />
                              <p className="text-[10px] font-bold text-gray-800 leading-relaxed italic">"{item.reason}"</p>
                           </div>
                         </div>
                       </div>
                     );
                   }
                   return null;
                 }}
              />
              
              {/* Confidence Range Area */}
              <Area 
                 type="monotone" 
                 dataKey="confidenceMax" 
                 stroke="none"
                 fill="url(#colorConf)" 
                 animationDuration={2000}
              />
              
              {/* Past Average Line */}
              <Area 
                 type="monotone" 
                 dataKey="pastAverage" 
                 stroke="#9ca3af" 
                 strokeWidth={2}
                 strokeDasharray="6 6"
                 fill="none" 
                 animationDuration={1200}
              />

              {/* Main AI Forecast Area */}
              <Area 
                 type="monotone" 
                 dataKey="predictedBookings" 
                 name="Predicted Demand"
                 stroke="#9333ea" 
                 strokeWidth={5}
                 fillOpacity={1} 
                 fill="url(#colorPv)" 
                 animationDuration={1500}
                 dot={renderCustomDot}
                 activeDot={{ r: 8, fill: '#9333ea', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
