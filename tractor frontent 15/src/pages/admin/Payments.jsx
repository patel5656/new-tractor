import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Search, Filter, Download, MoreVertical, Eye, CreditCard, Clock, CheckCircle, X, ChevronLeft, ChevronRight, AlertTriangle, Banknote, Zap, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useBookings } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/format';

export default function Payments() {
  const [revenueData, setRevenueData] = useState({ totalRevenue: 0, payments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0 });
  const [confirmSettleId, setConfirmSettleId] = useState(null);
  
  // State for recording cash payments
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashBooking, setCashBooking] = useState(null);
  const [cashAmount, setCashAmount] = useState('');
  const [isSubmittingCash, setIsSubmittingCash] = useState(false);

  const fetchPayments = async (page = 1, silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const result = await api.admin.getPayments({ 
        page, 
        status: statusFilter, 
        search: searchTerm,
        skipCache: true 
      });
      if (result.success) {
        setRevenueData(result.data);
        setPagination({
          currentPage: result.data.currentPage,
          totalPages: result.data.totalPages,
          totalCount: result.data.totalCount
        });
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPayments(1);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, statusFilter]);

  const filteredPayments = useMemo(() => {
    return (revenueData.payments || []).filter(p => {
      const farmerName = p.booking?.farmer?.name || '';
      const farmerPhone = p.booking?.farmer?.phone || '';
      const matchesSearch = 
        p.id.toString().includes(searchTerm) || 
        farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmerPhone.includes(searchTerm);
      
      const pStatus = p.booking?.paymentStatus?.toLowerCase() || (p.type === 'payment' ? 'paid' : 'pending');
      const matchesStatus = statusFilter === 'all' || pStatus === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [revenueData.payments, searchTerm, statusFilter]);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // 1. Header
      doc.setFontSize(22);
      doc.setTextColor(23, 23, 23);
      doc.text("TRACTORLINK", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("TREASURY | FINANCIAL LEDGER REPORT", 14, 28);
      doc.text(`Exported: ${new Date().toLocaleString()} | Filter: ${statusFilter.toUpperCase()}`, 14, 34);

      // 2. Data
      const tableRows = revenueData.payments.map(p => [
        String(p.id).toUpperCase(),
        p.booking?.farmer?.name || 'Unknown',
        p.booking?.service?.name || 'N/A',
        new Date(p.createdAt).toLocaleDateString(),
        p.type.toUpperCase(),
        formatCurrency(p.amount)
      ]);

      // 3. Table
      autoTable(doc, {
        startY: 40,
        head: [['LEDGER ID', 'ENTITY', 'SERVICE', 'DATE', 'TYPE', 'AMOUNT']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      doc.save(`tractorlink_treasury_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRecordCashSubmit = async () => {
    const bookingId = cashBooking.bookingId || cashBooking.id;
    if (!bookingId || !cashAmount || isNaN(cashAmount)) return;
    
    setIsSubmittingCash(true);
    try {
      const parsedAmount = parseFloat(cashAmount);
      const res = await api.admin.recordCashPayment({
        bookingId: parseInt(String(bookingId).replace('DUE-', '')),
        amount: parsedAmount
      });
      
      if (res.success) {
        // Optimistic UI update instantly reflects changes
        setRevenueData(prev => {
          if (!prev || !prev.payments) return prev;
          
          let statAdjustment = 0;
          const updatedPayments = prev.payments.map(p => {
            const pId = String(p.bookingId || p.id).replace('DUE-', '');
            const targetId = String(bookingId).replace('DUE-', '');
            if (pId === targetId) {
              statAdjustment += parsedAmount;
              const newPaid = (p.paidAmount || 0) + parsedAmount;
              const newRemaining = Math.max(0, (p.totalAmount || 0) - newPaid);
              const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';
              return {
                ...p,
                paidAmount: newPaid,
                remainingAmount: newRemaining,
                paymentStatus: newStatus,
                booking: {
                  ...p.booking,
                  paymentStatus: newStatus
                }
              };
            }
            return p;
          });
          
          return { 
            ...prev, 
            payments: updatedPayments,
            totalRevenue: (prev.totalRevenue || 0) + statAdjustment,
            totalUnpaid: Math.max(0, (prev.totalUnpaid || 0) - statAdjustment)
          };
        });

        setIsCashModalOpen(false);
        setCashAmount('');
        setCashBooking(null);
        
        // Background sync with tiny delay to ensure server persistence reflects in next query
        setTimeout(() => {
          fetchPayments(pagination.currentPage, true);
        }, 300);
      }
    } catch (err) {
      alert(err.message || "Failed to record payment");
    } finally {
      setIsSubmittingCash(false);
    }
  };

  const [selectedBooking, setSelectedBooking] = useState(null);
  const isAnyModalOpen = !!selectedBooking;

  // Handle scroll lock when modal is open
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAnyModalOpen]);

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto pb-8">
      
      {/* Detail Modal Overlay */}
      {createPortal(
        <AnimatePresence>
          {selectedBooking && (
            <div className="fixed inset-0 z-[9999] overflow-y-auto scrollbar-hide" key="admin-payment-modal-portal">
              <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl" 
                  onClick={() => setSelectedBooking(null)}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative text-left z-10 w-full max-w-xl bg-earth-card border border-earth-dark/15 rounded-2xl md:rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden my-auto"
                >
              <div className="p-6 md:p-8 border-b border-earth-dark/10 flex justify-between items-center bg-white/50">
                <h3 className="text-xl md:text-2xl font-black text-earth-brown uppercase tracking-tight italic">Transaction Details</h3>
                <Button variant="ghost" size="icon" onClick={() => setSelectedBooking(null)} className="h-10 w-10 text-earth-mut hover:text-earth-brown hover:bg-earth-card-alt rounded-xl transition-all">
                  <X size={20} />
                </Button>
              </div>
              <CardContent className="p-8 space-y-6 overflow-y-auto max-h-[70vh] md:max-h-none custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Ledger ID</p>
                    <p className="font-black text-earth-primary uppercase tracking-wider">{String(selectedBooking.id).toUpperCase()}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Total Invoice</p>
                    <p className="text-xl md:text-2xl font-black text-earth-brown italic leading-none">{formatCurrency(selectedBooking.totalAmount || 0)}</p>
                    <p className="text-[10px] font-bold text-earth-green tracking-widest mt-1">Paid: {formatCurrency(selectedBooking.paidAmount || 0)}</p>
                    <p className="text-[10px] font-bold text-red-500 tracking-widest">Rem: {formatCurrency(selectedBooking.remainingAmount || 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Farmer</p>
                    <p className="font-black text-earth-brown text-lg leading-tight">{selectedBooking.booking?.farmer?.name || 'Unknown'}</p>
                    <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest">{selectedBooking.booking?.farmer?.phone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Date</p>
                    <p className="font-bold text-earth-brown">{new Date(selectedBooking.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="p-5 md:p-6 bg-earth-main/50 rounded-[2rem] border border-earth-dark/10 shadow-inner space-y-4">
                  <div className="flex justify-between items-center">
                     <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Service Provided</p>
                     <span className="text-sm font-black text-earth-brown uppercase italic">{selectedBooking.booking?.service?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Land size</p>
                     <span className="text-sm font-black text-earth-brown uppercase italic">{selectedBooking.booking?.landSize} Hectares</span>
                  </div>
                  <div className="h-px bg-earth-dark/5 my-2" />
                  <div className="flex justify-between items-center pt-2">
                     <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Payment Status</p>
                     <div className="text-right">
                       <Badge className={cn(
                        "text-[9px] px-3 py-1 border uppercase font-black",
                        selectedBooking.type === 'payment' ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : 
                        'bg-red-500/10 text-red-500 border-red-500/20'
                       )}>
                        {selectedBooking.type === 'payment' ? 'SETTLED' : 'UNPAID'}
                       </Badge>
                       <p className="text-[9px] font-bold text-earth-mut uppercase tracking-widest mt-1">
                         Method: {selectedBooking.method?.toUpperCase() || 'UNRECORDED'}
                       </p>
                     </div>
                  </div>
                </div>

                <div className="p-4 bg-earth-card-alt border border-earth-dark/10 rounded-xl">
                   <p className="text-[9px] font-bold text-earth-mut uppercase tracking-widest text-center">This transaction is managed via secure digital gateway.</p>
                </div>
              </CardContent>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-earth-brown mb-0.5 uppercase italic">Treasury</h2>
          <p className="text-[9px] tracking-[0.2em] font-black uppercase text-earth-mut">Global Financial Ledger Registry</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto">
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Entity Name/ID..." 
            className="bg-earth-card border-earth-dark/15 text-earth-brown font-bold h-10 rounded-lg text-xs md:w-64" 
          />
          
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-earth-card border-earth-dark/15 text-earth-mut font-black uppercase text-[9px] tracking-widest h-10 px-3 rounded-lg outline-none cursor-pointer"
            >
              <option value="all">ALL STATUS</option>
              <option value="paid">PAID</option>
              <option value="partial">PARTIAL</option>
              <option value="pending">PENDING</option>
            </select>
            
            <Button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 md:flex-none gap-2 font-black uppercase tracking-wider bg-earth-card hover:bg-earth-card-alt text-accent border border-earth-dark/10 h-10 px-4 text-[10px]"
            >
              <Download size={14} /> EXPORT
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid - Shrinked */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(() => {
          const totalRev = revenueData.totalRevenue || 0;
          const pendRev = revenueData.totalUnpaid || 0;
          const health = 99.8;

          return (
            <>
              <Card className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-none rounded-[2rem] overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-earth-green mb-2">Total Revenue Confirmed</p>
                    <h3 className="text-3xl font-black text-earth-brown italic">{formatCurrency(totalRev)}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-earth-green/10 text-earth-green flex items-center justify-center border border-earth-green/10">
                    <CheckCircle size={20} />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-none rounded-[2rem] overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-earth-primary mb-2">Pending Escrow</p>
                    <h3 className="text-3xl font-black text-earth-brown italic">{formatCurrency(pendRev)}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center border border-accent/10">
                    <Clock size={20} />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/40 shadow-inner border-none rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-earth-mut mb-2">System Health</p>
                    <h3 className="text-3xl font-black text-earth-brown italic">{health}%</h3>
                  </div>
                  <CheckCircle2 size={20} className="text-earth-green" />
                </CardContent>
              </Card>
            </>
          );
        })()}
      </div>

      {/* Main Ledger - Compact Table */}
      <div className="space-y-3">
        {/* Desktop Table */}
        <Card className="hidden lg:block shadow-[0_30px_90px_rgba(0,0,0,0.06)] border-none bg-white rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto text-left">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-earth-dark text-earth-main uppercase font-black tracking-widest text-[9px]">
                <tr>
                  <th className="px-8 py-6">Ledger ID</th>
                  <th className="px-8 py-6">Entity</th>
                  <th className="px-8 py-6">Financials</th>
                  <th className="px-8 py-6">Status & Method</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Clock className="animate-spin mx-auto text-earth-primary mb-4" size={24} />
                      <p className="text-[10px] font-black uppercase text-earth-mut animate-pulse italic">Syncing Ledger Frequency...</p>
                    </td>
                  </tr>
                ) : filteredPayments.length > 0 ? filteredPayments.map((p) => {
                  return (
                    <tr key={p.id} className={cn("hover:bg-earth-primary/5 transition-all group", p.type === 'due' ? "bg-red-500/5" : "")}>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-bold text-[10px] bg-earth-card border px-2 py-1 rounded uppercase tracking-widest transition-colors",
                            p.type === 'due' ? "text-red-400 border-red-500/20" : "text-earth-mut border-earth-dark/10 group-hover:text-earth-primary"
                          )}>
                            {String(p.id).toUpperCase()}
                          </span>
                          {p.booking?.source === 'USSD' && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px] px-1 py-0 font-black flex items-center gap-0.5">
                              <Zap size={8} /> USSD
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-black text-earth-brown text-sm">{p.booking?.farmer?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-earth-mut font-bold uppercase tracking-widest">{p.booking?.farmer?.phone || 'N/A'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-black text-earth-brown text-base tracking-tight leading-tight">{formatCurrency(p.totalAmount || 0)}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] text-earth-green/80 font-black tracking-widest uppercase">Paid: {formatCurrency(p.paidAmount || 0)}</span>
                          <span className="text-[10px] text-red-400 font-black tracking-widest uppercase border-l border-earth-dark/20 pl-2">Rem: {formatCurrency(p.remainingAmount || 0)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <Badge className={cn(
                          "text-[8px] px-2 py-0 border uppercase font-black",
                          p.type === 'payment' ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : 
                          p.paymentStatus === 'PARTIAL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        )}>
                          {p.paymentStatus || (p.type === 'payment' ? 'SETTLED' : 'PENDING')}
                        </Badge>
                        <p className="text-[8px] text-earth-mut font-black uppercase tracking-widest mt-1">
                          METHOD: {p.method?.toUpperCase() || 'UNRECORDED'}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-1.5 transition-all">
                          {p.booking?.source === 'USSD' && p.remainingAmount > 0 && (
                            <Button 
                              onClick={() => { setCashBooking(p); setCashAmount(String(p.remainingAmount)); setIsCashModalOpen(true); }}
                              className="w-8 h-8 rounded-lg bg-emerald-500 text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 border-none flex items-center justify-center p-0 transition-all active:scale-95"
                              title="Receive Cash"
                            >
                              <Banknote size={14} />
                            </Button>
                          )}
                          <Button 
                            onClick={() => setSelectedBooking(p)}
                            className="w-8 h-8 rounded-lg bg-accent text-white hover:opacity-90 shadow-lg shadow-accent/20 border-none flex items-center justify-center p-0 transition-all active:scale-95"
                          >
                            <Eye size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-earth-mut font-black uppercase text-[10px] tracking-widest italic">Node Activity Null</td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-6 bg-white flex items-center justify-between">
               <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest italic opacity-70">Showing page {pagination.currentPage} of {pagination.totalPages}</p>
               <div className="flex gap-2">
                  <Button 
                    disabled={pagination.currentPage === 1 || isLoading}
                    onClick={() => fetchPayments(pagination.currentPage - 1)}
                    className="h-9 w-9 bg-accent text-white hover:opacity-90 disabled:grayscale transition-all rounded-xl shadow-lg shadow-accent/20 border-none flex items-center justify-center p-0"
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <Button 
                    disabled={pagination.currentPage === pagination.totalPages || isLoading}
                    onClick={() => fetchPayments(pagination.currentPage + 1)}
                    className="h-9 w-9 bg-accent text-white hover:opacity-90 disabled:grayscale transition-all rounded-xl shadow-lg shadow-accent/20 border-none flex items-center justify-center p-0"
                  >
                    <ChevronRight size={18} />
                  </Button>
               </div>
            </div>
          )}
        </Card>

        {/* Mobile View remains functionally same but refined */}
        <div className="lg:hidden space-y-3">
          {filteredPayments.map((p) => {
            return (
              <Card key={p.id} className={cn("bg-earth-card-alt border-earth-dark/15/50 rounded-2xl overflow-hidden shadow-xl hover:scale-[1.02] transition-transform", p.type === 'due' ? "bg-red-500/5" : "")} onClick={() => setSelectedBooking(p)}>
                <div className="p-4 border-b border-earth-dark/10 bg-earth-card/40 flex justify-between items-center">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border transition-colors",
                    p.type === 'due' ? "text-red-400 border-red-500/20 bg-red-900/20" : "text-earth-mut bg-earth-card border-earth-dark/15/50"
                  )}>
                    {String(p.id).toUpperCase()}
                  </span>
                  <Badge className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-2 py-0 border",
                    p.type === 'payment' ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                  )}>
                    {p.type === 'payment' ? 'SETTLED' : 'UNPAID'}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h4 className="font-black text-earth-brown text-base leading-none tracking-tight">{p.booking?.farmer?.name || 'Unknown'}</h4>
                      <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-1.5 italic">#{p.bookingId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-earth-brown leading-none tracking-tighter">{formatCurrency(p.totalAmount || 0)}</p>
                      <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mt-1.5 leading-none">Rem: {formatCurrency(p.remainingAmount || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      {/* Record Cash Payment Modal */}
      {isCashModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-earth-dark/70 backdrop-blur-md"
            onClick={() => setIsCashModalOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl z-10"
          >
            <div className="p-6 border-b border-earth-dark/10 flex justify-between items-center bg-earth-main/5 text-left">
              <div className="flex items-center gap-3">
                <Banknote className="text-emerald-500" size={20} />
                <h3 className="font-black text-earth-brown uppercase tracking-tight text-base italic text-left">Record Cash Payment</h3>
              </div>
              <button 
                onClick={() => setIsCashModalOpen(false)}
                className="p-2 hover:bg-earth-dark/5 rounded-xl transition-colors"
                disabled={isSubmittingCash}
              >
                <X size={20} className="text-earth-mut" />
              </button>
            </div>

            <div className="p-8 space-y-6 text-left">
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                   <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest mb-1.5 leading-none">Target Entity</p>
                   <p className="text-sm font-black text-earth-brown uppercase italic leading-tight">
                     {cashBooking?.booking?.farmer?.name || 'Unknown Farmer'}
                   </p>
                   <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-1">Ref: {String(cashBooking?.id).toUpperCase()}</p>
                </div>

                <div className="p-4 bg-earth-main rounded-2xl border border-earth-dark/10">
                   <div className="flex justify-between items-center mb-3">
                     <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest leading-none">Amount to Receive</p>
                     <span className="text-[10px] font-black text-earth-brown uppercase tracking-widest italic opacity-60">Balance: {formatCurrency(cashBooking?.remainingAmount || 0)}</span>
                   </div>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-earth-brown opacity-40 italic">₦</span>
                     <Input 
                        autoFocus
                        type="number"
                        placeholder="0.00"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="pl-10 h-14 bg-white border-earth-dark/15 text-xl font-black rounded-xl text-earth-brown focus:ring-2 focus:ring-emerald-500/50"
                     />
                   </div>
                </div>
              </div>

              <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                   <ShieldCheck size={16} className="text-emerald-500" />
                </div>
                <p className="text-[9px] font-bold text-earth-mut uppercase leading-relaxed tracking-wide">
                  This action will manually record cash as a <span className="text-emerald-600 font-black">LEGALLY VALID</span> payment method for this USSD booking.
                </p>
              </div>

              <Button 
                onClick={handleRecordCashSubmit}
                isLoading={isSubmittingCash}
                disabled={!cashAmount || isSubmittingCash || parseFloat(cashAmount) <= 0}
                className="w-full h-14 bg-emerald-600 hover:scale-[1.02] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 disabled:grayscale transition-all active:scale-95 border-none"
              >
                Confirm Receipt
              </Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}

