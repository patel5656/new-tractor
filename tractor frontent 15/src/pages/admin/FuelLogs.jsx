import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Droplet, Search, Filter, CheckCircle2, XCircle, Clock, Truck, Users, Image as ImageIcon, Loader2, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api, clearApiCache } from '../../lib/api';
import { cn } from '../../lib/utils';
import useScrollLock from '../../hooks/useScrollLock';
import API_BASE_URL from '../../config/api';

export default function FuelLogs() {
  const [logs, setLogs] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [operators, setOperators] = useState([]);
  const [tractors, setTractors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    operatorId: '',
    tractorId: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Derived pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(logs.length / itemsPerPage);

  // Receipt Modal
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, url: null });
  useScrollLock(receiptModal.isOpen);

  const fetchInitialData = async () => {
    try {
      const [opsRes, tracsRes] = await Promise.all([
        api.admin.listOperators(),
        api.admin.getTractors()
      ]);
      setOperators(opsRes.data || []);
      setTractors(tracsRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFuelData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // Build clean filter object
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );

      const [logsRes, kpiRes] = await Promise.all([
        api.admin.getFuelLogs(activeFilters),
        api.admin.getFuelAnalytics(activeFilters)
      ]);
      
      setLogs(logsRes.data || []);
      setKpis(kpiRes.data || null);
    } catch (error) {
      console.error("Failed to fetch fuel data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchFuelData();
  }, [filters]);

  const handleStatusUpdate = async (id, status) => {
    setUpdatingId(id);
    try {
      const result = await api.admin.updateFuelLogStatus(id, status);
      if (result.success) {
        // Clear cache so the GET requests return fresh data
        clearApiCache();
        // Refresh the row optimistically
        setLogs(prev => prev.map(log => log.id === id ? { ...log, status: result.data.status, reviewer: result.data.reviewer } : log));
        // Soft refresh KPIs and table without loading spinner
        fetchFuelData(true);
      }
    } catch (error) {
      alert(error.message || "Failed to update fuel log status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-earth-primary/10 text-earth-green border border-earth-primary/20 text-[9px] uppercase font-black uppercase tracking-[0.2em] h-6 rounded-lg px-2 shadow-sm border-b-2">Approved</Badge>;
      case 'REJECTED': return <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] uppercase font-black uppercase tracking-[0.2em] h-6 rounded-lg px-2 shadow-sm border-b-2">Rejected</Badge>;
      default: return <Badge className="bg-earth-dark/5 text-earth-sub border border-earth-dark/10 text-[9px] uppercase font-black uppercase tracking-[0.2em] h-6 rounded-lg px-2 shadow-sm border-b-2">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-earth-dark/5">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-earth-brown mb-1 uppercase italic font-outfit">Fuel Management</h2>
          <p className="text-[9px] md:text-[10px] tracking-[0.2em] font-black uppercase text-earth-mut flex items-center gap-2">
            <Droplet size={12} className="text-earth-primary" /> Energy Consumption & Cost Auditing
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={fetchFuelData}
            variant="outline"
            className="h-10 px-4 rounded-xl border-earth-dark/10 hover:bg-earth-card-alt text-earth-mut hover:text-earth-brown"
          >
            <RefreshCw size={16} className={cn("mr-2", isLoading && "animate-spin text-earth-primary")} /> 
            <span className="text-[10px] font-black uppercase tracking-widest">Resync</span>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-none rounded-[2rem] overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all">
             <CardContent className="p-5 md:p-6 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-earth-mut uppercase tracking-[0.15em] mb-1.5 font-outfit">Total Fuel Used</p>
                  <h3 className="text-2xl md:text-3xl font-black text-earth-brown tracking-tighter italic">{kpis.totalFuel?.toFixed(1) || 0} L</h3>
                </div>
                <div className="p-3 md:p-4 rounded-2xl shrink-0 shadow-inner bg-earth-dark/5">
                   <Droplet size={20} className="text-earth-primary" />
                </div>
             </CardContent>
          </Card>
          <Card className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-none rounded-[2rem] overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all">
             <CardContent className="p-5 md:p-6 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-earth-mut uppercase tracking-[0.15em] mb-1.5 font-outfit">Total Cost</p>
                  <h3 className="text-xl md:text-2xl font-black text-earth-primary tracking-tight italic">₦ {(kpis.totalCost || 0).toLocaleString()}</h3>
                </div>
                <div className="p-3 md:p-4 rounded-2xl shrink-0 shadow-inner bg-earth-primary/10">
                   <span className="font-black text-earth-primary text-sm">₦</span>
                </div>
             </CardContent>
          </Card>
          <Card className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-none rounded-[2rem] overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all">
             <CardContent className="p-5 md:p-6 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-earth-mut uppercase tracking-[0.15em] mb-1.5 font-outfit">Total Entries</p>
                  <h3 className="text-2xl md:text-3xl font-black text-earth-brown tracking-tighter italic">{kpis.totalEntries}</h3>
                </div>
                <div className="p-3 md:p-4 rounded-2xl shrink-0 shadow-inner bg-earth-dark/5">
                   <CheckCircle2 size={20} className="text-earth-sub" />
                </div>
             </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white shadow-[0_20px_60px_rgba(0,0,0,0.03)] border-none rounded-[2rem] w-full">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-1.5 flex-1 w-full">
              <label className="text-[9px] font-black text-earth-mut uppercase tracking-widest ml-1"><Users size={10} className="inline mr-1"/> Operator</label>
              <select
                value={filters.operatorId}
                onChange={(e) => setFilters(f => ({...f, operatorId: e.target.value}))}
                className="w-full text-xs font-bold bg-earth-card-alt border border-earth-dark/10 rounded-xl px-4 py-2.5 outline-none focus:border-earth-primary transition-all text-earth-brown appearance-none"
              >
                <option value="">All Operators</option>
                {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5 flex-1 w-full">
              <label className="text-[9px] font-black text-earth-mut uppercase tracking-widest ml-1"><Truck size={10} className="inline mr-1"/> Tractor</label>
              <select
                value={filters.tractorId}
                onChange={(e) => setFilters(f => ({...f, tractorId: e.target.value}))}
                className="w-full text-xs font-bold bg-earth-card-alt border border-earth-dark/10 rounded-xl px-4 py-2.5 outline-none focus:border-earth-primary transition-all text-earth-brown appearance-none"
              >
                <option value="">All Tractors</option>
                {tractors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 flex-1 w-full">
              <label className="text-[9px] font-black text-earth-mut uppercase tracking-widest ml-1"><Filter size={10} className="inline mr-1"/> Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(f => ({...f, status: e.target.value}))}
                className="w-full text-xs font-black uppercase bg-earth-card-alt border border-earth-dark/10 rounded-xl px-4 py-2.5 outline-none focus:border-earth-primary transition-all text-earth-brown appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="space-y-1.5 flex-1 w-full">
              <label className="text-[9px] font-black text-earth-mut uppercase tracking-widest ml-1"><Clock size={10} className="inline mr-1"/> Range Start</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(f => ({...f, startDate: e.target.value}))}
                className="w-full text-xs font-bold bg-earth-card-alt border border-earth-dark/10 rounded-xl px-4 py-2.5 outline-none focus:border-earth-primary transition-all text-earth-brown"
              />
            </div>
            <div className="space-y-1.5 flex-1 w-full">
              <label className="text-[9px] font-black text-earth-mut uppercase tracking-widest ml-1"><Clock size={10} className="inline mr-1"/> Range End</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(f => ({...f, endDate: e.target.value}))}
                className="w-full text-xs font-bold bg-earth-card-alt border border-earth-dark/10 rounded-xl px-4 py-2.5 outline-none focus:border-earth-primary transition-all text-earth-brown"
              />
            </div>
            
            <Button 
              onClick={() => setFilters({operatorId: '', tractorId: '', status: '', startDate: '', endDate: ''})}
              variant="outline"
              className="h-10 px-4 rounded-xl border-earth-dark/15 hover:bg-earth-card/50 text-earth-sub border-b-2"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">Clear</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="bg-white shadow-[0_30px_90px_rgba(0,0,0,0.06)] border-none rounded-[2.5rem] w-full max-w-full overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between bg-white/50">
          <div>
            <CardTitle className="text-base font-black text-earth-brown uppercase tracking-wider italic font-outfit">Audit Registry</CardTitle>
            <CardDescription className="text-[10px] font-bold text-earth-mut uppercase mt-1 tracking-[0.1em]">Operator fuel submissions</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[900px]">
              <thead className="bg-earth-dark text-earth-main uppercase font-black tracking-widest text-[9px]">
                <tr>
                  <th className="px-8 py-6 text-left">Date & Entity</th>
                  <th className="px-8 py-6 text-left">Equipment</th>
                  <th className="px-8 py-6 text-left">Consumption</th>
                  <th className="px-8 py-6 text-left">Documentation</th>
                  <th className="px-8 py-6 text-left">Status</th>
                  <th className="px-8 py-6 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-earth-primary" size={32} />
                        <p className="text-xs font-black text-earth-mut uppercase tracking-[0.3em] animate-pulse italic">Auditing Logs...</p>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-24 text-center">
                      <div className="p-12 rounded-[2.5rem] bg-earth-dark/5 inline-block border-2 border-dashed border-earth-dark/10">
                         <Droplet size={40} className="mx-auto text-earth-mut opacity-30 mb-4" />
                         <p className="text-xs font-black text-earth-mut uppercase tracking-widest">No fuel logs matching criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : currentLogs.map((log) => (
                  <tr key={log.id} className="group hover:bg-earth-primary/5 transition-all duration-300">
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                         <p className="text-xs font-black text-earth-brown group-hover:tracking-tight transition-all uppercase">{log.operator?.name || 'Unknown'}</p>
                         <p className="text-[10px] font-bold text-earth-mut flex items-center gap-1.5 tracking-tighter">
                            <Clock size={10} className="text-earth-primary" /> {new Date(log.createdAt).toLocaleString()}
                         </p>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-earth-card-alt flex items-center justify-center text-earth-sub border border-earth-dark/5 group-hover:border-earth-primary/20 transition-colors">
                           <Truck size={14} />
                         </div>
                         <div>
                           <p className="text-xs font-bold text-earth-brown">{log.tractor?.name || 'Unassigned'}</p>
                           {log.tractor?.model && <p className="text-[9px] text-earth-mut uppercase italic tracking-widest font-black">{log.tractor.model}</p>}
                         </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-sm font-black text-earth-brown font-outfit">{log.liters.toFixed(1)} L</p>
                       <p className="text-[10px] font-bold text-earth-primary uppercase flex items-center gap-1 mt-0.5 tracking-tight">
                         ₦ {log.cost.toLocaleString()}
                       </p>
                    </td>
                    <td className="px-8 py-5">
                       {log.receiptUrl ? (
                         <button 
                           onClick={() => {
                             if (log.receiptUrl.endsWith('.pdf')) {
                               window.open(log.receiptUrl.startsWith('http') ? log.receiptUrl : `${API_BASE_URL}${log.receiptUrl}`, '_blank');
                             } else {
                               setReceiptModal({ isOpen: true, url: log.receiptUrl });
                             }
                           }}
                           className="flex items-center gap-2 group/btn"
                         >
                           <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover/btn:bg-blue-500 group-hover/btn:text-white transition-all">
                             <ImageIcon size={14} />
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 group-hover/btn:text-blue-600 underline underline-offset-2">View Receipt</span>
                         </button>
                       ) : (
                         <span className="text-[9px] font-black uppercase tracking-widest text-earth-mut/50 flex items-center gap-1"><AlertTriangle size={10}/> No receipt</span>
                       )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col items-start gap-1">
                        {getStatusBadge(log.status)}
                        {log.reviewedBy && (
                          <span className="text-[8px] font-bold text-earth-mut uppercase tracking-tight">by {log.reviewer?.name || 'Admin'}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       {log.status === 'PENDING' ? (
                         <div className="flex items-center justify-end gap-2">
                           {updatingId === log.id ? (
                             <div className="h-9 w-20 flex justify-center items-center"><Loader2 size={16} className="animate-spin text-earth-primary" /></div>
                           ) : (
                             <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleStatusUpdate(log.id, 'APPROVED')}
                                className="h-9 px-3 text-[9px] font-black uppercase tracking-widest border-earth-green/30 text-earth-green bg-earth-green/5 hover:bg-earth-green hover:text-white transition-all shadow-sm rounded-xl"
                              >
                                <CheckCircle2 size={14} className="mr-1" /> Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleStatusUpdate(log.id, 'REJECTED')}
                                className="h-9 px-3 text-[9px] font-black uppercase tracking-widest border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white transition-all shadow-sm rounded-xl"
                              >
                                <XCircle size={14} className="mr-1" /> Reject
                              </Button>
                            </>
                           )}
                         </div>
                       ) : (
                         <span className="text-[9px] font-black text-earth-sub uppercase tracking-widest flex items-center justify-end gap-1"><CheckCircle2 size={12}/> Processed</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {logs.length > 0 && (
        <div className="flex items-center justify-between pt-6 px-4">
           <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest italic opacity-70">
             {logs.length} Total Logs | Page {currentPage} of {totalPages || 1}
           </p>
           <div className="flex gap-2">
              <Button 
                variant="outline" size="icon" 
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="h-10 w-10 bg-accent text-white hover:opacity-90 disabled:grayscale transition-all rounded-xl shadow-lg shadow-accent/20 border-none flex items-center justify-center p-0"
              >
                <ChevronLeft size={20} className="text-white" />
              </Button>
              <Button 
                variant="outline" size="icon" 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="h-10 w-10 bg-accent text-white hover:opacity-90 disabled:grayscale transition-all rounded-xl shadow-lg shadow-accent/20 border-none flex items-center justify-center p-0"
              >
                <ChevronRight size={20} className="text-white" />
              </Button>
           </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-earth-dark/80 backdrop-blur-md" onClick={() => setReceiptModal({ isOpen: false, url: null })} />
          <div className="relative z-10 bg-white rounded-[2rem] p-4 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 px-2 pt-2">
              <h3 className="font-black text-earth-brown uppercase tracking-widest text-sm flex items-center gap-2"><ImageIcon size={16} className="text-earth-primary" /> Receipt Document</h3>
              <button onClick={() => setReceiptModal({ isOpen: false, url: null })} className="p-2 hover:bg-earth-card-alt rounded-xl transition-colors">
                <XCircle size={20} className="text-earth-sub" />
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-xl bg-earth-card-alt flex items-center justify-center p-4 border border-earth-dark/10">
              <img src={receiptModal.url?.startsWith('http') ? receiptModal.url : `${API_BASE_URL}${receiptModal.url}`} alt="Fuel Receipt" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
