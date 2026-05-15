import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Eye, Search, Filter, MoreVertical, FileText, Clock, Tractor as TractorIcon, CheckCircle2, ChevronDown, Trash2, CheckCircle, X, MapPin, Navigation, ArrowDown, Info, Calendar, ChevronLeft, ChevronRight, Phone, Zap } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useBookings } from '../../context/BookingContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import RequestLocationMap from '../../components/map/RequestLocationMap';

export default function Bookings() {
  const { bookings, pagination, totalCount, fetchBookings, updateBookingStatus } = useBookings();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  // USSD Simulation states removed
  const [availableServices, setAvailableServices] = useState([]);
  
  // States for fixing USSD location
  const [isFixLocationModalOpen, setIsFixLocationModalOpen] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [fixedPoint, setFixedPoint] = useState(null);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await api.admin.listServices();
        if (res.success) setAvailableServices(res.data || []);
      } catch (err) {
        console.error("Failed to load services:", err);
      }
    };
    loadServices();
  }, []);

  // Sync with server on filter/search/page change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Determine if we should reset to page 1 (if filter/search changed)
      // or use the current requested page
      fetchBookings({ 
        page: pagination.currentPage, 
        status: statusFilter, 
        search: searchTerm 
      });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [statusFilter, searchTerm, pagination.currentPage]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    if (pagination.currentPage !== 1) {
      // Small delay to ensure state consistency
      fetchBookings({ page: 1, status: statusFilter, search: searchTerm });
    }
  }, [statusFilter, searchTerm]);

  // Handle scroll lock when modal is open
  useEffect(() => {
    if (isViewModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isViewModalOpen]);

  const handleViewDetails = async (id) => {
    try {
      const basicInfo = bookings.find(b => b.id === id);
      if (basicInfo) setSelectedBooking(basicInfo);
      
      setIsViewModalOpen(true);
      setLoadingDetails(true);
      
      const res = await api.admin.getBooking(id);
      if (res.success) {
        setSelectedBooking(res.data);
      }
    } catch (err) {
      console.error("Failed to load booking details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // USSD Booking handler removed

  const handleExport = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(23, 23, 23);
      doc.text("TRACTORLINK", 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("OPERATIONS CONTROL | SERVICE REGISTRY", 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${statusFilter.toUpperCase()}`, 14, 34);

      const tableRows = bookings.map(b => [
        `#${String(b.id).toUpperCase()}`,
        b.farmer?.name || 'UNKNOWN',
        b.service?.name?.toUpperCase() || 'N/A',
        `${b.landSize} Ha`,
        b.status.toUpperCase(),
        formatCurrency(b.totalPrice)
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['ID', 'FARMER', 'SERVICE', 'AREA', 'STATUS', 'REVENUE']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255] }
      });

      doc.save(`tractorlink_ops_registry_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveFixedLocation = async () => {
    if (!fixedPoint) {
      alert("Please select a location on the map");
      return;
    }
    
    setIsSavingLocation(true);
    try {
      const res = await api.admin.fixUSSDBooking(selectedBooking.id, {
        latitude: fixedPoint.lat,
        longitude: fixedPoint.lng
      });
      
      if (res.success) {
        // Update selected booking details in UI
        setSelectedBooking(res.data);
        
        // Refresh the list to show updated price/status
        fetchBookings({ 
          page: pagination.currentPage, 
          status: statusFilter, 
          search: searchTerm 
        });
        
        setIsFixLocationModalOpen(false);
        setFixedPoint(null);
        alert("Location and price finalized successfully!");
      }
    } catch (err) {
      alert(err.message || "Failed to finalize location");
    } finally {
      setIsSavingLocation(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 text-left">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-earth-brown uppercase italic">Operations Control</h1>
          <p className="text-[9px] md:text-[10px] text-earth-mut mt-1 font-black uppercase tracking-[0.2em]">Active Service Node Registry</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-mut" size={16} />
            <input 
              type="text"
              placeholder="Search nodes or farmers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-11 bg-earth-card rounded-xl text-earth-brown font-bold text-xs focus:ring-2 focus:ring-earth-primary/50 outline-none w-full transition-all shadow-inner"
            />
          </div>
          
          <div className="flex gap-2 flex-1 sm:flex-none">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 bg-earth-card rounded-xl text-earth-brown font-bold text-[10px] uppercase tracking-widest px-4 focus:ring-2 focus:ring-earth-primary/50 outline-none cursor-pointer flex-1 sm:w-36 shadow-inner"
            >
              <option value="All">All Status</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Assigned">Assigned</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Pending">Pending</option>
            </select>

            <Button 
              onClick={handleExport}
              disabled={isExporting}
              className="h-11 gap-2 font-black uppercase tracking-widest bg-accent hover:opacity-90 text-white rounded-xl shadow-lg shadow-accent/20 px-5 flex-1 sm:flex-none"
            >
              {isExporting ? <Clock size={16} className="animate-spin" /> : <FileText size={16} />}
              <span className="hidden lg:inline text-[10px]">Export</span>
            </Button>

            {/* Simulate USSD button removed */}
          </div>
        </div>
      </header>

      {/* Table View - Desktop Only */}
      <div className="hidden md:block overflow-hidden bg-white shadow-[0_30px_90px_rgba(0,0,0,0.06)] border-none rounded-[2.5rem]">
        <div className="overflow-x-auto text-left custom-scrollbar">
          <table className="w-full text-sm whitespace-nowrap min-w-[1000px]">
            <thead className="bg-earth-dark text-earth-main uppercase font-black text-[9px] tracking-widest">
              <tr>
                <th className="px-8 py-6 w-24 text-earth-main">Node ID</th>
                <th className="px-8 py-6 text-earth-main">Farmer Context</th>
                <th className="px-8 py-6 text-earth-main">Service Params</th>
                <th className="px-8 py-6 text-earth-main">Status</th>
                <th className="px-8 py-6 text-earth-main">Financials</th>
                <th className="px-8 py-6 text-right text-earth-main">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {bookings.length > 0 ? bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-earth-primary/5 transition-all group">
                  <td className="px-8 py-5">
                    <span className="font-black text-[10px] text-earth-mut bg-earth-card px-3 py-1.5 rounded-xl border border-earth-dark/10 group-hover:border-earth-primary/30 group-hover:text-earth-primary transition-all uppercase">#{String(booking.id).toUpperCase()}</span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-earth-brown text-base tracking-tight">{booking.farmer?.name || 'UNKNOWN'}</p>
                    <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-0.5">{booking.farmer?.phone || 'N/A'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <TractorIcon size={16} className="text-earth-mut" />
                       <div>
                          <p className="font-black text-earth-brown uppercase text-xs">{booking.service?.name}</p>
                          <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-0.5">{booking.landSize} Hectares</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge className={cn(
                        "text-[9px] px-3 py-0.5 border uppercase font-black tracking-[0.1em]",
                        booking.status?.toLowerCase() === 'completed' ? 'bg-earth-primary/20 text-earth-green border-emerald-500/20' : 
                        'bg-earth-dark/10 text-earth-mut border-earth-dark/15'
                      )}>
                        {booking.status}
                      </Badge>
                      {booking.source === 'USSD' && (
                        <Badge className="text-[8px] px-2 py-0 bg-blue-500/10 text-blue-500 border border-blue-500/20 font-black uppercase tracking-widest">USSD Node</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {(() => {
                      const paidAmount = booking.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                      const pStatus = booking.paymentStatus || 'PENDING';
                      return (
                        <>
                          <p className="font-black text-earth-brown text-lg tracking-tighter">{formatCurrency(booking.totalPrice)}</p>
                          <Badge className={cn(
                             "text-[8px] px-2 py-0 border font-black uppercase tracking-widest mt-1",
                             pStatus === 'PAID' ? 'bg-earth-primary/20 text-earth-green border-emerald-500/40' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          )}>{pStatus}</Badge>
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Button 
                      size="sm" 
                      onClick={() => handleViewDetails(booking.id)}
                      className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-9 transition-all bg-accent text-white hover:scale-105 active:scale-95 shadow-md shadow-accent/10 border-none"
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan={6} className="px-8 py-20 text-center text-xs font-black text-earth-mut uppercase tracking-widest">No active nodes found in registry.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View - Mobile Only (Visible on MD and below effectively, but here we stack it) */}
      <div className="md:hidden grid grid-cols-1 gap-5">
        {bookings.length > 0 ? bookings.map((booking) => (
          <motion.div
            layout
            key={booking.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
          >
            <Card className="cursor-pointer bg-earth-card border border-earth-dark/10 shadow-sm hover:border-earth-primary/50 hover:bg-earth-card-alt transition-all group rounded-2xl relative overflow-hidden h-full flex flex-col">
              <CardContent className="p-5 md:p-6 flex flex-col flex-1 relative z-10 text-left">
                <div className="flex justify-between items-start mb-5 shrink-0">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl bg-earth-card-alt border border-earth-dark/15 text-earth-primary flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all">
                      <TractorIcon size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-earth-brown md:text-lg leading-tight group-hover:text-earth-primary transition-colors uppercase italic truncate">{booking.farmer?.name || 'UNKNOWN'}</h3>
                        <Badge className="bg-earth-card-alt text-[8px] font-black text-earth-mut border-none px-1.5 uppercase tracking-tighter shrink-0">#{booking.id}</Badge>
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
                        {booking.source === 'USSD' && (
                          <Badge className="bg-blue-500/10 text-[8px] font-black text-blue-500 border border-blue-500/20 px-1.5 uppercase tracking-tighter">USSD</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                   <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-earth-mut uppercase tracking-widest">Service Unit</span>
                      <span className="text-xs font-black text-earth-brown uppercase italic">{booking.service?.name}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-earth-mut uppercase tracking-widest">Registry Area</span>
                      <span className="text-xs font-bold text-earth-brown">{booking.landSize} Hectares</span>
                   </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-earth-dark/10 flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                    <Button 
                      size="sm" 
                      onClick={() => handleViewDetails(booking.id)}
                      className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-9 transition-all bg-accent text-white hover:scale-105 active:scale-95 shadow-md shadow-accent/10 border-none"
                    >
                      View Details
                    </Button>
                  </div>
                  <div className="text-right">
                    {(() => {
                       const paidAmount = booking.payments?.reduce((s, p) => s + p.amount, 0) || 0;
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
            <Search size={32} className="mx-auto text-earth-mut mb-4 opacity-20" />
            <p className="text-xs font-black text-earth-brown uppercase tracking-widest">No matching node registry found.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-6">
         <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest italic opacity-70">
           {totalCount} Synchronized | Page {pagination.currentPage} of {pagination.totalPages}
         </p>
         <div className="flex gap-2">
            <Button 
              variant="outline" size="icon" 
              disabled={pagination.currentPage <= 1}
              onClick={() => fetchBookings({ page: pagination.currentPage - 1, status: statusFilter, search: searchTerm })}
              className="h-10 w-10 bg-accent text-white hover:opacity-90 disabled:grayscale transition-all rounded-xl shadow-lg shadow-accent/20 border-none flex items-center justify-center p-0"
            >
              <ChevronLeft size={20} className="text-white" />
            </Button>
            <Button 
              variant="outline" size="icon" 
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => fetchBookings({ page: pagination.currentPage + 1, status: statusFilter, search: searchTerm })}
              className="h-10 w-10 bg-accent text-white hover:opacity-90 disabled:grayscale transition-all rounded-xl shadow-lg shadow-accent/20 border-none flex items-center justify-center p-0"
            >
              <ChevronRight size={20} className="text-white" />
            </Button>
         </div>
      </div>

      {/* Booking Details Modal - Compact & Scroll-Free */}
      {createPortal(
        <AnimatePresence>
          {isViewModalOpen && selectedBooking && (
            <div className="fixed inset-0 z-[9999] overflow-y-auto scrollbar-hide" key="admin-booking-modal-portal">
              <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
                {/* Backdrop Lock with separate dark overlay */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsViewModalOpen(false)}
                  className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl"
                />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative text-left w-full max-w-[500px] md:max-w-xl bg-white border border-earth-dark/15 rounded-2xl md:rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden z-10 my-auto"
              >
                {/* Modal Header - Operational Context */}
                <div className="p-5 md:p-6 border-b border-earth-dark/10 flex items-center justify-between bg-earth-main/10 shrink-0">
                  <div>
                    <h3 className="text-xl font-black text-earth-brown uppercase italic tracking-tight leading-none">Booking Context</h3>
                    <p className="text-[9px] font-black text-earth-mut uppercase tracking-[0.2em] mt-2">Registry Node: # {selectedBooking.id}</p>
                  </div>
                  <button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="h-10 w-10 rounded-xl bg-white border border-earth-dark/10 text-earth-mut flex items-center justify-center hover:text-earth-brown hover:bg-earth-card-alt transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-5 md:p-6 space-y-5 text-left overflow-y-auto max-h-[70vh] md:max-h-none custom-scrollbar">
                  {/* 1. Location Details */}
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-earth-mut uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                      <MapPin size={12} className="text-earth-primary" />
                      Location Details
                    </h4>
                    <div className="p-4 bg-earth-main/5 border border-earth-dark/10 rounded-[1.5rem] flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest leading-none mb-1">Destination Site</p>
                        <p className="text-sm font-black text-earth-brown truncate">{selectedBooking.location || "Farmer Site Location"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest leading-none mb-1">Road Distance</p>
                        <span className="text-sm font-black text-earth-primary italic">{selectedBooking.roadDistance || selectedBooking.distanceKm || 0} KM</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Grid for Status and Finance to save vertical space */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Deployment Status */}
                    <div className="p-4 bg-earth-main/5 border border-earth-dark/10 rounded-[1.5rem] space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-earth-primary" />
                          <h4 className="text-[9px] font-black text-earth-mut uppercase tracking-[0.2em]">Deployment</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white border border-earth-dark/10 flex items-center justify-center text-earth-primary">
                              <Clock size={16} />
                          </div>
                          <div>
                              <p className="text-[8px] font-black text-earth-mut uppercase tracking-[0.2em] mb-1">Scheduled</p>
                              <p className="text-xs font-black text-earth-brown uppercase">
                                {selectedBooking.scheduledAt 
                                  ? new Date(selectedBooking.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                  : "Pending"}
                              </p>
                          </div>
                        </div>
                    </div>

                    {/* Financial Ledger */}
                    <div className="p-4 bg-white border border-earth-dark/10 rounded-[1.5rem] shadow-inner space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-earth-mut">
                          <span>Work Rate</span>
                          <span className="text-earth-brown">{formatCurrency(selectedBooking.basePrice || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-earth-mut">
                          <span>Logistics</span>
                          <span className="text-earth-brown">{formatCurrency(selectedBooking.distanceCharge || 0)}</span>
                        </div>
                        <div className="h-px bg-earth-dark/5 my-1" />
                        <div className="flex justify-between items-baseline pt-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-earth-primary italic">Total</span>
                          <span className="text-lg font-black text-earth-brown tracking-tighter italic">{formatCurrency(selectedBooking.totalPrice || 0)}</span>
                        </div>
                        {(() => {
                           const paidAmount = selectedBooking.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                           const remainingAmount = Math.max((selectedBooking.totalPrice || 0) - paidAmount, 0);
                           const pStatus = selectedBooking.paymentStatus || 'PENDING';
                           return (
                             <>
                               <div className="h-px bg-earth-dark/5 my-1" />
                               <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest pt-1">
                                 <span className="text-earth-mut">Paid Amount</span>
                                 <span className="text-earth-green">{formatCurrency(paidAmount)}</span>
                               </div>
                               <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                 <span className="text-earth-mut">Remaining</span>
                                 <span className="text-orange-500">{formatCurrency(remainingAmount)}</span>
                               </div>
                               <div className="mt-2 flex justify-between items-center pt-2 border-t border-earth-dark/5">
                                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-earth-mut">Payment Status</span>
                                 <Badge className={cn(
                                   "text-[8px] px-2 py-0 border font-black uppercase tracking-widest",
                                   pStatus === 'PAID' || pStatus === 'full' ? 'bg-earth-primary/20 text-earth-green border-emerald-500/40' :
                                   pStatus === 'PARTIAL' || pStatus === 'partial' ? 'bg-blue-500/10 text-blue-400 border-blue-500/40' : 
                                   'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                 )}>{pStatus}</Badge>
                               </div>
                             </>
                           );
                        })()}
                    </div>
                  </div>

                  {/* 3. Service Particulars & Inclusions (Combined Compact) */}
                  <div className="p-4 bg-earth-primary/5 rounded-[1.5rem] border border-earth-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-earth-dark/10 flex items-center justify-center text-earth-primary">
                          <TractorIcon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-earth-brown uppercase italic leading-none">{selectedBooking.serviceNameSnapshot || selectedBooking.service?.name}</p>
                          <p className="text-[9px] font-bold text-earth-mut mt-1">{selectedBooking.landSize} Hectares Registry</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge className={cn(
                          "text-[8px] px-2 py-0 font-black uppercase tracking-widest border border-earth-dark/10",
                          selectedBooking.status === 'completed' || selectedBooking.status === 'paid' ? 'bg-earth-primary/20 text-earth-green border-emerald-500/20' : 'bg-earth-primary/10 text-earth-primary border-earth-primary/20'
                        )}>{selectedBooking.status}</Badge>
                    </div>
                  </div>

                  {/* USSD Location Fix Section */}
                  {selectedBooking.source === 'USSD' && (
                    <div className="p-4 bg-blue-500/5 rounded-[1.5rem] border border-blue-500/10 space-y-3">
                       <div className="flex justify-between items-center">
                          <div className="text-left">
                             <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 italic">
                               <Zap size={12} />
                               USSD Booking Source
                             </h4>
                             {selectedBooking.locationFixed ? (
                               <p className="text-[9px] font-bold text-earth-green mt-1 flex items-center gap-1">
                                 <CheckCircle size={10} /> Location fixed & Price visible
                               </p>
                             ) : (
                               <p className="text-[9px] font-bold text-orange-400 mt-1 flex items-center gap-1">
                                 <Info size={10} /> Location and price need to be finalized
                               </p>
                             )}
                          </div>
                          {!selectedBooking.locationFixed && (
                             <Button 
                               onClick={() => setIsFixLocationModalOpen(true)}
                               className="bg-accent text-white hover:opacity-90 font-black text-[9px] uppercase tracking-widest px-4 h-8 rounded-lg shadow-lg border-none"
                             >
                               Fix Location & Price
                             </Button>
                          )}
                       </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer - Registry Sync Action */}
                <div className="px-6 py-4 shadow-md bg-earth-main/10 flex justify-end shrink-0">
                  <Button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="bg-white hover:bg-earth-card-alt text-earth-sub hover:text-earth-brown font-black uppercase text-[10px] tracking-widest px-8 h-10 rounded-xl shadow-sm transition-all"
                  >
                    Sync Close
                  </Button>
                </div>
              </motion.div>
            </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* USSD Simulation modal removed */}

      {/* Fix USSD Location Modal */}
      {isFixLocationModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-earth-dark/70 backdrop-blur-md"
            onClick={() => setIsFixLocationModalOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl z-10"
          >
            <div className="p-6 border-b border-earth-dark/10 flex justify-between items-center bg-earth-main/5 text-left">
              <div className="flex items-center gap-3">
                <MapPin className="text-earth-primary" size={20} />
                <h3 className="font-black text-earth-brown uppercase tracking-tight text-base italic">Fix Booking Location</h3>
              </div>
              <button 
                onClick={() => setIsFixLocationModalOpen(false)}
                className="p-2 hover:bg-earth-dark/5 rounded-xl transition-colors"
              >
                <X size={20} className="text-earth-mut" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-start gap-3">
                <Info size={18} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-earth-brown leading-relaxed">
                  Select the exact location of the farmer on the map. This will automatically calculate the distance from the hub and update the booking price based on current rates.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden border border-earth-dark/10 shadow-inner">
                <RequestLocationMap 
                  selectedLocation={fixedPoint}
                  onPick={(point) => setFixedPoint(point)}
                  autoUseCurrentLocation={false}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => setIsFixLocationModalOpen(false)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest border-earth-dark/10 text-earth-mut hover:bg-earth-dark/5"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveFixedLocation}
                  disabled={isSavingLocation || !fixedPoint}
                  className="flex-[2] h-12 bg-accent hover:opacity-90 text-white font-black uppercase tracking-[0.2em] rounded-xl shadow-lg border-none"
                >
                  {isSavingLocation ? (
                    <Clock size={18} className="animate-spin" />
                  ) : (
                    <>Update & Recalculate Price</>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="space-y-1.5 text-left">
      <p className="text-[9px] font-black text-earth-mut uppercase tracking-[0.2em]">{label}</p>
      {value}
    </div>
  );
}
