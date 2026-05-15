import { useState, useEffect } from 'react';
import { Search, Download, Calendar, Tractor as TractorIcon, X, MapPin, CheckCircle, Clock, Mail, ChevronLeft, ChevronRight, FileText, Navigation, ArrowDown, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useBookings } from '../../context/BookingContext';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/format';
import useScrollLock from '../../hooks/useScrollLock';

export default function History() {
  const { bookings, loading, pagination, fetchBookings } = useBookings();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [ticketStatus, setTicketStatus] = useState(null);

  // Lock background scroll when modal is open
  useScrollLock(selectedBooking);

  // Server-side Sync Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBookings({
        page: 1, 
        search: searchTerm, 
        status: 'completed'
      });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handlePageChange = (newPage) => {
    fetchBookings({
      page: newPage,
      search: searchTerm,
      status: 'completed'
    });
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(23, 23, 23);
      doc.text("TRACTORLINK", 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("FARMER SERVICE HISTORY REPORT", 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()} | Filter: COMPLETED`, 14, 34);

      const tableRows = bookings.map(b => [
        String(b.id).toUpperCase(),
        b.service?.name?.toUpperCase() || 'N/A',
        new Date(b.createdAt).toLocaleDateString(),
        `${b.landSize} Ha`,
        b.status.toUpperCase(),
        formatCurrency(b.totalPrice)
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['ID', 'SERVICE', 'DATE', 'LAND SIZE', 'STATUS', 'AMOUNT']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255] }
      });

      doc.save(`tractorlink_history_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadInvoice = (booking) => {
    if (!booking) return;
    setIsDownloading(true);
    try {
      const doc = new jsPDF();
      
      // 1. Branding Header
      doc.setFontSize(22);
      doc.setTextColor(23, 23, 23);
      doc.text("TRACTORLINK", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("FARMER SERVICE INVOICE", 14, 28);
      doc.text(`Transaction ID: #B-${booking.id}`, 14, 34);
      doc.text(`Date of Issue: ${new Date(booking.createdAt).toLocaleString()}`, 14, 40);

      // 2. Financial Particulars Table
      const financialParticulars = [
        ["Service Unit", (booking.serviceNameSnapshot || booking.service?.name || "N/A").toUpperCase()],
        ["Area Coverage", `${booking.landSize} Hectares`],
        ["Origin (Hub)", booking.hubName || "Main Hub"],
        ["Route Distance", `${booking.roadDistance || booking.distanceKm || 0} KM`],
        ["Base Work Rate", formatCurrency(booking.basePrice)],
        ["Distance Surcharge", booking.distanceCharge > 0 ? formatCurrency(booking.distanceCharge) : "Included"],
        ["TOTAL VALUATION", formatCurrency(booking.totalPrice)]
      ];

      autoTable(doc, {
        startY: 50,
        head: [['PARTICULAR / DESCRIPTION', 'VALUATION / CONTEXT']],
        body: financialParticulars,
        theme: 'striped',
        headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
      });

      // 3. Footer / Signature
      const finalY = doc.lastAutoTable.finalY || 100;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("This is a computer-generated invoice and requires no physical signature.", 14, finalY + 20);
      doc.text("TractorLink Logistics - Powering Green Growth.", 14, finalY + 25);

      doc.save(`tractorlink_invoice_B-${booking.id}.pdf`);
    } catch (err) {
      console.error("Invoice generation failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRequestSupport = () => {
    // Hidden as per user request to remove support button
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto relative pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-earth-dark/15 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-earth-brown uppercase italic">Booking Archive</h1>
          <p className="text-[10px] md:text-sm text-earth-mut mt-1 font-black uppercase tracking-widest">Central Repository of Services</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-mut" size={16} />
            <input 
              type="text"
              placeholder="Search ID / Service..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-11 bg-earth-card border border-earth-dark/15 rounded-xl text-earth-brown font-bold text-xs focus:ring-2 focus:ring-earth-primary/50 outline-none w-full transition-all"
            />
          </div>
          
          <div className="flex gap-2 flex-1 sm:flex-none">
            <Button 
              onClick={handleExport}
              disabled={isExporting}
              className="h-11 gap-2 font-black uppercase tracking-widest bg-accent hover:opacity-90 text-white rounded-xl shadow-lg shadow-accent/20 px-5 flex-1 sm:flex-none"
            >
              {isExporting ? <Clock className="animate-spin" size={16} /> : <Download size={16} />}
              <span className="hidden lg:inline text-[10px]">Export</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Table View - Desktop Only */}
      <div className="hidden md:block overflow-hidden bg-earth-card border border-earth-dark/10 rounded-2xl shadow-sm">
        <div className="overflow-x-auto text-left">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-earth-dark text-earth-main uppercase font-black text-[10px] tracking-widest border-b border-earth-dark/10">
              <tr>
                <th className="px-6 py-5">Node ID</th>
                <th className="px-6 py-5">Service Params</th>
                <th className="px-6 py-5">Schedule</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-dark/5 bg-earth-card-alt">
              {bookings.length > 0 ? bookings.map((booking) => (
                <tr 
                  key={booking.id} 
                  onClick={() => setSelectedBooking(booking)}
                  className="hover:bg-earth-card transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-5">
                    <span className="font-black text-[10px] text-earth-mut bg-white px-2.5 py-1 rounded-lg border border-earth-dark/10 group-hover:border-earth-primary transition-all">#{booking.id}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <TractorIcon size={16} className="text-earth-primary" />
                      <div>
                        <p className="font-black text-earth-brown uppercase italic">{booking.service?.name}</p>
                        <p className="text-[9px] font-bold text-earth-mut uppercase tracking-widest">{booking.landSize} Hectares</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-earth-mut" />
                      <span className="text-[10px] font-bold text-earth-brown uppercase tabular-nums">
                        {booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Not Scheduled'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <Badge className={cn(
                      "text-[8px] px-2 py-0 border font-black uppercase tracking-widest",
                      booking.status?.toUpperCase() === 'COMPLETED' ? 'bg-earth-primary/20 text-earth-green border-earth-green/20' : 
                      'bg-earth-dark/10 text-earth-mut border-earth-dark/20'
                    )}>
                      {booking.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-earth-brown tabular-nums">
                    {formatCurrency(booking.totalPrice)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-xs font-black text-earth-mut uppercase tracking-widest">Repository Empty</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View - Mobile Only */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <Clock className="animate-spin mx-auto text-earth-primary mb-4" size={32} />
            <p className="text-xs font-black text-earth-brown uppercase tracking-widest">Syncing Archive...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {bookings.length > 0 ? bookings.map((booking) => (
              <motion.div
                layout
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedBooking(booking)}
                className="h-full"
              >
                <Card className="cursor-pointer bg-earth-card border border-earth-dark/10 shadow-sm hover:border-earth-primary/50 hover:bg-earth-card-alt transition-all group rounded-2xl relative overflow-hidden h-full flex flex-col">
                  <CardContent className="p-5 md:p-6 flex flex-col flex-1 relative z-10 text-left">
                    <div className="flex justify-between items-start mb-5 shrink-0">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-earth-card-alt border border-earth-dark/15 text-earth-primary flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all">
                          <TractorIcon size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-earth-brown md:text-lg leading-tight group-hover:text-earth-primary transition-colors uppercase italic">{booking.service?.name}</h3>
                            <Badge className="bg-earth-card-alt text-[8px] font-black text-earth-mut border-none px-1.5 uppercase tracking-tighter">#{booking.id}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-earth-mut uppercase tracking-widest mt-1">
                            <Badge className={cn(
                              "text-[8px] px-2 py-0 border font-black uppercase tracking-widest",
                              booking.status?.toUpperCase() === 'COMPLETED' ? 'bg-earth-primary/20 text-earth-green border-earth-green/20' : 
                              booking.status?.toUpperCase() === 'PENDING' ? 'bg-earth-dark/10 text-earth-mut border-earth-dark/20' :
                              booking.status?.toUpperCase() === 'SCHEDULED' ? 'bg-earth-primary/10 text-earth-primary border-earth-primary/20' : 
                              booking.status?.toUpperCase() === 'ASSIGNED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              booking.status?.toUpperCase() === 'IN_PROGRESS' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              'bg-earth-dark/10 text-earth-mut border-earth-dark/20'
                            )}>
                              {booking.status}
                            </Badge>
                            {booking.scheduledAt ? (
                              <span className="text-[10px] font-black text-earth-primary lowercase">
                                @ {new Date(booking.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-earth-mut/60 lowercase italic">
                                {booking.status === 'scheduled' ? 'pending scheduling' : 'not scheduled'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-earth-dark/10 flex justify-between items-end">
                      <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-earth-mut mb-1">Total Unit</p>
                        <p className="font-bold text-earth-brown text-sm">{booking.landSize} Hectares</p>
                      </div>
                      <div className="text-right">
                        {(() => {
                           const paidAmount = booking.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                           const balance = booking.totalPrice - paidAmount;
                           const pStatus = booking.paymentStatus || 'PENDING';
                           
                           return (
                             <>
                               <Badge 
                                 className={cn(
                                   "mb-1.5 text-[8px] px-2 py-0 border font-black uppercase tracking-widest",
                                   pStatus === 'PAID' ? 'bg-earth-primary/20 text-earth-green border-emerald-500/40' :
                                   pStatus === 'PARTIAL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                   'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                 )}
                               >
                                 {pStatus}
                               </Badge>
                               <p className="font-black text-earth-brown text-lg leading-none tracking-tighter">{formatCurrency(booking.totalPrice)}</p>
                               {balance > 0 && paidAmount > 0 && (
                                 <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Balance: {formatCurrency(balance)}</p>
                               )}
                             </>
                           );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )) : (
              <div className="col-span-full py-16 text-center">
                 <div className="w-16 h-16 bg-earth-card mx-auto rounded-full flex items-center justify-center text-earth-mut mb-4 shadow-inner border border-earth-dark/10">
                    <Search size={24} />
                 </div>
                 <h3 className="text-lg font-black text-earth-brown uppercase tracking-widest">No Records Found</h3>
                 <p className="text-[10px] font-bold text-earth-mut max-w-sm mx-auto mt-2">No service history matches your current filters.</p>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-earth-dark/10 pt-6">
           <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Page {pagination.currentPage} of {pagination.totalPages}</p>
           <div className="flex gap-2">
              <Button 
                variant="ghost" size="icon" 
                disabled={pagination.currentPage === 1 || loading}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                className="h-10 w-10 bg-accent text-white hover:opacity-90 disabled:grayscale transition-all rounded-xl shadow-lg shadow-accent/20 border-none flex items-center justify-center p-0"
              >
                <ChevronLeft size={20} className="text-white" />
              </Button>
              <Button 
                variant="ghost" size="icon" 
                disabled={pagination.currentPage === pagination.totalPages || loading}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                className="h-10 w-10 bg-accent text-white hover:opacity-90 disabled:grayscale transition-all rounded-xl shadow-lg shadow-accent/20 border-none flex items-center justify-center p-0"
              >
                <ChevronRight size={20} className="text-white" />
              </Button>
           </div>
        </div>
      )}

      {/* Detailed Modal - Compact & Premium */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto scrollbar-hide">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedBooking(null)}
                className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl"
              />
              
              <motion.div
                layoutId={selectedBooking.id}
                className="text-left bg-white border border-earth-dark/10 w-full max-w-[400px] rounded-2xl md:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] my-auto"
              >
              {/* Modal Header - Fully synchronized with Admin */}
              <div className="p-5 md:p-6 border-b border-earth-dark/10 flex items-center justify-between bg-earth-main/20 relative shrink-0">
                <div>
                  <h3 className="text-xl font-black text-earth-brown uppercase italic tracking-tight">Booking Context</h3>
                  <p className="text-[9px] font-black text-earth-mut uppercase tracking-[0.2em] mt-1">Registry Node: # {selectedBooking.id} • {selectedBooking.landSize} Ha</p>
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="h-10 w-10 rounded-xl bg-white border border-earth-dark/10 text-earth-mut flex items-center justify-center hover:text-earth-brown hover:bg-earth-card-alt transition-all"
                  title="Close Detail View"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content - Compact & Responsive Scroll */}
              <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar space-y-5 md:space-y-6 text-left">
                {/* 1. Location Details */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-earth-mut uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <MapPin size={12} className="text-earth-primary" />
                    Location Details
                  </h4>
                  <div className="p-4 bg-earth-main/5 border border-earth-dark/10 rounded-[1.5rem] flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest leading-none mb-1">Destination Site</p>
                      <p className="text-sm font-black text-earth-brown truncate">{selectedBooking.location || "Your Site Location"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest leading-none mb-1">Road Distance</p>
                      <span className="text-sm font-black text-earth-primary italic">{selectedBooking.roadDistance || selectedBooking.distanceKm || 0} KM</span>
                    </div>
                  </div>
                </div>

                {/* 2. Schedule Box */}
                <div className="bg-earth-primary/10 border border-earth-primary/20 p-4 rounded-[1.5rem] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-earth-primary text-earth-brown flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-earth-primary uppercase tracking-widest leading-none mb-1">Scheduled Deployment</p>
                      <p className="text-[11px] font-black text-earth-brown uppercase">
                        {selectedBooking.scheduledAt 
                          ? new Date(selectedBooking.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                          : "Deployment Pending"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Financial Ledger - Tightened with Payment Status */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-[9px] font-black text-earth-mut uppercase tracking-[0.2em]">Financial Settlement</h4>
                    {(() => {
                        const paidAmount = selectedBooking.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                        const pStatus = selectedBooking.paymentStatus || 'PENDING';
                        return (
                          <Badge 
                            className={cn(
                              "text-[8px] px-2 py-0 border font-black uppercase tracking-widest",
                              pStatus === 'PAID' ? 'bg-earth-primary/20 text-earth-green border-earth-green/20' :
                              pStatus === 'PARTIAL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                              'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            )}
                          >
                            {pStatus}
                          </Badge>
                        );
                    })()}
                  </div>
                  <div className="bg-white border border-earth-dark/10 rounded-[1.5rem] p-4 space-y-2 shadow-inner">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-earth-mut">
                      <span>Base Service Fee</span>
                      <span className="text-earth-brown">{formatCurrency(selectedBooking.basePrice)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-earth-mut">
                      <span>Logistics Surcharge</span>
                      <span className="text-earth-brown">{formatCurrency(selectedBooking.distanceCharge)}</span>
                    </div>
                    
                    <div className="h-px bg-earth-dark/5 my-1" />
                    
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-earth-primary italic">Total Valuation</span>
                      <span className="text-xl font-black text-earth-brown tracking-tighter italic">{formatCurrency(selectedBooking.totalPrice)}</span>
                    </div>

                    {(() => {
                        const paidAmount = selectedBooking.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                        const balance = selectedBooking.totalPrice - paidAmount;
                        if (paidAmount <= 0) return null;
                        
                        return (
                          <div className="pt-2 mt-2 border-t border-earth-dark/5 space-y-1">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-earth-green">
                               <span>Amount Cleared</span>
                               <span>{formatCurrency(paidAmount)}</span>
                            </div>
                            {balance > 0 && (
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-red-500">
                                 <span>Outstanding Balance</span>
                                 <span>{formatCurrency(balance)}</span>
                              </div>
                            )}
                          </div>
                        );
                    })()}
                  </div>
                </div>

                <p className="text-center text-[8px] font-bold text-earth-mut uppercase tracking-widest opacity-60">
                  Quote includes full fuel allocation & professional mobilization.
                </p>
              </div>

              {/* Modal Footer - Matched to Admin Footer */}
              <div className="px-5 md:px-6 py-4 border-t border-earth-dark/10 bg-earth-main/40 flex justify-end gap-3 shrink-0">
                <Button 
                   onClick={() => handleDownloadInvoice(selectedBooking)}
                   disabled={isDownloading}
                   className="bg-accent hover:opacity-90 text-white font-black uppercase tracking-widest text-[10px] px-6 h-10 rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2"
                >
                  {isDownloading ? <Clock className="animate-spin" size={14} /> : <FileText size={14} />}
                  <span>{isDownloading ? "Processing..." : "Download Invoice"}</span>
                </Button>
                <Button 
                   onClick={() => setSelectedBooking(null)}
                   className="bg-white hover:bg-earth-card-alt text-earth-mut hover:text-earth-brown font-black uppercase text-[10px] tracking-widest px-6 h-10 rounded-xl border border-earth-dark/15 transition-all"
                >
                  Sync Close
                </Button>
              </div>
            </motion.div>
          </div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d5c4a1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #bdae93; }
      `}} />
    </div>
  );
}
