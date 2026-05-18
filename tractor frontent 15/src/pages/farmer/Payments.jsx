import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CreditCard, ArrowUpRight, X, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useBookings } from '../../context/BookingContext';
import { useSettings } from '../../context/SettingsContext';
import { api } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/format';
import useScrollLock from '../../hooks/useScrollLock';

export default function Payments() {
  const { fetchBookings } = useBookings();
  const { loanSettings } = useSettings();
  const location = useLocation();
  const [pendingData, setPendingData] = useState({ bookings: [], totalOutstanding: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedTx, setSelectedTx] = useState(null);
  const [paymentPortal, setPaymentPortal] = useState({ open: false, type: '', amount: 0, targetId: null, bookingData: null });
  const [paymentStep, setPaymentStep] = useState('method'); // method | bvn-verification | success
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const [selectedMethod, setSelectedMethod] = useState('card'); // card | loan
  const [bvn, setBvn] = useState('');
  const [emiMonths, setEmiMonths] = useState(3);

  // Reset payment states when payment portal resets/opens
  useEffect(() => {
    if (paymentPortal.open) {
      setPaymentStep('method');
      setSelectedMethod('card');
      setBvn('');
      setEmiMonths(3);
      setPaymentError(null);
    }
  }, [paymentPortal.open]);

  const isLoanFeatureActive = loanSettings?.loanFeatureEnabled ?? false;
  const isMinQualified = paymentPortal.amount >= (loanSettings?.loanMinBookingValue ?? 50000);
  const isMaxQualified = paymentPortal.amount <= (loanSettings?.loanMaxAmount ?? 100000);
  const isLoanQualified = isLoanFeatureActive && isMinQualified && isMaxQualified;

  const startLoanPayment = async () => {
    try {
      setIsPaying(true);
      setPaymentError(null);

      // Validate BVN
      if (!/^\d{11}$/.test(bvn)) {
        setPaymentError("Invalid BVN. It must be exactly 11 digits.");
        setIsPaying(false);
        return;
      }

      let bookingId = paymentPortal.targetId;

      // 1. If it's a new booking, we must create the booking request first
      if (bookingId === 'NEW_BOOKING') {
        const res = await api.farmer.createBooking(paymentPortal.bookingData);
        if (res.success) {
          bookingId = res.data.id;
        } else {
          throw new Error(res.message || "Failed to create booking request.");
        }
      }

      // 2. Call the new apply loan API
      const loanRes = await api.loans.apply({
        bookingId,
        bvn,
        emiMonths
      });

      if (loanRes.success) {
        // Refresh states
        await fetchPending();
        await fetchBookings();
        setPaymentStep('success');
      } else {
        throw new Error(loanRes.message || "Failed to approve soft loan.");
      }
    } catch (error) {
      setPaymentError(error.message || "Something went wrong during loan application.");
    } finally {
      setIsPaying(false);
    }
  };

  // Lock background scroll when any modal is open
  useScrollLock(selectedTx || paymentPortal.open);

  const fetchPending = async () => {
    try {
      setIsLoading(true);
      const result = await api.payments.getPending();
      if (result.success) {
        setPendingData(result.data);
        localStorage.setItem('farmerPaymentData', JSON.stringify(result.data));
      }
    } catch (error) {
      const cached = localStorage.getItem('farmerPaymentData');
      if (cached) {
        try {
          setPendingData(JSON.parse(cached));
          return; // Exit successfully using cache
        } catch (e) {
          console.error('Failed to parse cached payment data');
        }
      }
      console.error('Failed to fetch pending bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();

    // Check for pre-fill query parameters
    const params = new URLSearchParams(location.search);
    const prefillId = params.get('prefillId');
    const prefillAmount = params.get('prefillAmount');
    const serviceType = params.get('serviceType');

    if (prefillId && prefillAmount) {
      setPaymentPortal({
        open: true,
        type: serviceType ? `Payment for ${serviceType}` : 'Initial Payment',
        amount: parseFloat(prefillAmount),
        targetId: parseInt(prefillId),
        bookingData: null
      });
      setPaymentStep('method');
    }

    // Handle NEW BOOKING checkout from state
    if (location.state?.paymentMode === 'CHECKOUT' && location.state?.bookingData) {
      setPaymentPortal({
        open: true,
        type: `Confirm ${location.state.displayService} Booking`,
        amount: parseFloat(location.state.displayAmount),
        targetId: 'NEW_BOOKING',
        bookingData: location.state.bookingData
      });
      setPaymentStep('method');
      
      // Clear location state after picking it up to avoid re-triggering on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.search, location.state]);

  const startPayment = async () => {
    try {
      setIsPaying(true);
      setPaymentError(null);
      
      if (paymentPortal.targetId === 'NEW_BOOKING') {
        // THIS IS THE NEW ATOMIC CHECKOUT FLOW
        await api.farmer.checkout(paymentPortal.bookingData);
      } else {
        await api.payments.payBooking({
          bookingId: paymentPortal.targetId,
          amount: paymentPortal.amount,
          method: 'card' // Default for now
        });
      }
      
      // Refresh both local and global booking state
      await fetchPending();
      await fetchBookings();
      
      setPaymentStep('success');
    } catch (error) {
       setPaymentError("Please check your internet connection and try again.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-7 max-w-4xl mx-auto relative pb-24 md:pb-8">
      {/* Header */}
      <header className="border-b border-earth-dark/10 pb-5">
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-earth-brown uppercase italic">Finance & Ledger</h1>
        <p className="text-[9px] text-earth-mut font-black uppercase tracking-widest mt-1">Real-time payment tracking & settlements</p>
      </header>

      {/* Pending Bookings List */}
      <div className="space-y-4">
        <h3 className="font-black text-[9px] text-earth-mut uppercase tracking-widest px-1">Pending & Recent Actions</h3>
        
        {isLoading ? (
          <div className="py-20 text-center">
            <Clock className="animate-spin mx-auto text-earth-primary mb-4" size={32} />
            <p className="text-[10px] font-black uppercase text-earth-mut">Syncing with Ledger...</p>
          </div>
        ) : pendingData.bookings.length > 0 ? pendingData.bookings.map((booking, idx) => {
          return (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              key={booking.id} 
              className="bg-white rounded-[2rem] shadow-[0_10px_35px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row justify-between sm:items-center p-5 md:p-6 hover:shadow-[0_15px_45px_rgba(0,0,0,0.08)] transition-all group relative border-none"
            >
              <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setSelectedTx(booking)}>
                <div className="w-10 h-10 rounded-xl bg-earth-card border border-earth-dark/10 text-earth-mut flex items-center justify-center shrink-0 group-hover:text-earth-primary group-hover:border-earth-primary/20 transition-all">
                  <ArrowUpRight size={18} className="group-hover:rotate-45 transition-transform" />
                </div>
                <div>
                  <p className="font-black text-xs md:text-sm text-earth-brown group-hover:text-earth-brown transition-colors uppercase italic">{booking.serviceType}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                     <p className="text-[8px] uppercase font-black tracking-widest text-earth-mut">{new Date(booking.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'})}</p>
                     <span className="w-1 h-1 bg-earth-card-alt rounded-full"></span>
                     <p className="text-[8px] uppercase font-black text-earth-mut tracking-widest">#{booking.id}</p>
                  </div>
                </div>
              </div>
              <div className="sm:text-right flex items-center sm:items-end justify-between sm:justify-center mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-earth-dark/10 gap-5">
                <div className="hidden sm:block">
                  <p className="font-black text-base md:text-lg text-earth-brown block tabular-nums tracking-tighter">{formatCurrency(booking.remainingAmount)}</p>
                  <Badge className={cn(
                    "mt-1 text-[8px] px-2 py-0 border-none font-black uppercase tracking-widest",
                    booking.paymentStatus === 'full' ? 'bg-earth-primary/10 text-earth-green' : 
                    booking.paymentStatus === 'partial' ? 'bg-blue-500/10 text-blue-400' : 
                    'bg-orange-500/10 text-orange-400'
                  )}>
                    {booking.paymentStatus}
                  </Badge>
                </div>

                {booking.paymentStatus !== 'full' && (
                  <Button 
                    onClick={() => {
                      setPaymentPortal({ open: true, type: `Payment for ${booking.serviceType}`, amount: booking.remainingAmount, targetId: booking.id, bookingData: null });
                      setPaymentStep('method');
                    }}
                    className="bg-accent text-white hover:opacity-90 px-5 h-9 font-black uppercase tracking-widest text-[8px] rounded-lg shadow-lg shadow-accent/10 transition-all"
                  >
                    Pay Now
                  </Button>
                )}
                
                {/* Mobile Only Amount Display */}
                <div className="sm:hidden text-right">
                   <p className="font-black text-lg text-earth-brown tabular-nums tracking-tighter">{formatCurrency(booking.remainingAmount)}</p>
                   <p className={cn(
                     "text-[7px] font-black uppercase tracking-widest",
                     booking.paymentStatus === 'full' ? 'text-earth-green' : 
                     booking.paymentStatus === 'partial' ? 'text-blue-400' : 'text-orange-400'
                   )}>{booking.paymentStatus}</p>
                </div>
              </div>
            </motion.div>
          );
        }) : (
          <div className="py-20 text-center bg-white rounded-[2.5rem] shadow-[0_15px_35px_rgba(0,0,0,0.05)]">
            <CheckCircle className="mx-auto mb-4 text-earth-green/20" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-earth-brown italic">Zero Dues Recorded</p>
            <p className="text-[8px] font-bold text-earth-mut uppercase tracking-widest mt-2">You are all caught up with your payments!</p>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto scrollbar-hide">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTx(null)} className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative text-left z-10 bg-earth-card border border-earth-dark/10 w-full max-w-[400px] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-earth-dark/10 bg-earth-card/30 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-earth-primary rounded-xl flex items-center justify-center text-earth-brown">
                       <ArrowUpRight size={20} />
                    </div>
                    <div>
                       <h3 className="font-black text-lg text-earth-brown uppercase italic leading-none">Receipt</h3>
                       <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mt-1">ID #{selectedTx.id}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedTx(null)} className="text-earth-mut hover:text-earth-brown transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-3 bg-earth-card/50 border border-earth-dark/10 p-5 rounded-2xl">
                    <div className="flex justify-between items-center text-[10px] font-black text-earth-mut uppercase tracking-widest">
                       <span>Service Unit</span>
                       <span className="text-earth-brown">{selectedTx.serviceType}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black text-earth-mut uppercase tracking-widest border-t border-earth-dark/10/50 pt-3">
                       <span className="text-earth-primary">Total Dues</span>
                       <span className="text-xl text-earth-brown font-black tabular-nums tracking-tighter">{formatCurrency(selectedTx.totalAmount)}</span>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => alert('Receipt downloaded')} variant="outline" className="h-12 rounded-xl border-earth-dark/10 text-earth-mut font-black uppercase tracking-widest text-[8px] hover:text-earth-brown">PDF Receipt</Button>
                    <Button className="h-12 rounded-xl bg-accent text-white font-black uppercase tracking-widest text-[8px]">Print</Button>
                 </div>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Portal Modal */}
      <AnimatePresence>
        {paymentPortal.open && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto scrollbar-hide">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl" />
              
              <motion.div 
                 initial={{ y: 10, opacity: 0 }} 
                 animate={{ y: 0, opacity: 1 }} 
                 exit={{ y: 10, opacity: 0 }}
                 className="relative text-left z-10 bg-earth-card border border-earth-dark/10 w-full max-w-[420px] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl border-t-2 border-t-accent"
              >
              {paymentStep === 'method' && (
                <div className="p-7 space-y-5">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                       <h3 className="text-2xl font-black text-earth-brown italic leading-none">Checkout</h3>
                       <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mt-2">Review your payment details</p>
                    </div>
                    <button onClick={() => setPaymentPortal({ ...paymentPortal, open: false })} className="text-earth-mut hover:text-earth-brown transition-colors"><X size={20} /></button>
                  </div>
                  {paymentError && (
                    <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                      {paymentError}
                    </div>
                  )}

                  {/* Payment Details Card */}
                  <div className="bg-earth-card/60 border border-earth-dark/10 rounded-2xl overflow-hidden">
                    {/* Service Name */}
                    <div className="px-5 pt-5 pb-3 border-b border-earth-dark/10">
                      <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-1">Service</p>
                      <p className="font-black text-sm text-earth-brown uppercase italic">{paymentPortal.type}</p>
                    </div>

                    {/* Payment Type Badge */}
                    <div className="px-5 py-3 border-b border-earth-dark/10 flex items-center justify-between">
                      <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest">Payment Type</p>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                        paymentPortal.targetId === 'NEW_BOOKING' 
                          ? 'bg-earth-primary/15 text-earth-green'
                          : 'bg-blue-500/10 text-blue-400'
                      )}>
                        {paymentPortal.targetId === 'NEW_BOOKING' ? 'Full Payment' : 'Partial / Due'}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="px-5 py-5 text-center">
                      <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-2">Amount Payable</p>
                      <p className="text-4xl font-black text-earth-brown italic tracking-tighter">{formatCurrency(paymentPortal.amount)}</p>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  {isLoanFeatureActive && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest pl-1">Select Payment Method</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedMethod('card')}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 focus:outline-none",
                            selectedMethod === 'card'
                              ? "bg-accent/5 border-accent text-accent"
                              : "bg-earth-card border-earth-dark/10 text-earth-mut hover:border-earth-dark/20 hover:text-earth-brown"
                          )}
                        >
                          <CreditCard size={18} />
                          <span className="text-[9px] font-black uppercase tracking-wider">Paystack</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isLoanQualified) {
                              setSelectedMethod('loan');
                            }
                          }}
                          disabled={!isLoanQualified}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 relative focus:outline-none",
                            selectedMethod === 'loan'
                              ? "bg-earth-primary/5 border-earth-primary text-earth-primary"
                              : "bg-earth-card border-earth-dark/10 text-earth-mut hover:border-earth-dark/20 hover:text-earth-brown",
                            !isLoanQualified && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <ShieldCheck size={18} />
                          <span className="text-[9px] font-black uppercase tracking-wider">Soft Loan</span>
                          {!isLoanQualified && (
                            <span className="absolute -top-1.5 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 text-[6px] font-black uppercase tracking-widest scale-90">
                              N/A
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isLoanQualified && isLoanFeatureActive && (
                    <p className="text-[7.5px] font-black text-red-400 uppercase tracking-widest text-center leading-relaxed">
                      Loan facility only applies for payments between {formatCurrency(loanSettings?.loanMinBookingValue ?? 50000)} and {formatCurrency(loanSettings?.loanMaxAmount ?? 100000)}.
                    </p>
                  )}

                  {/* Trust Section */}
                  {selectedMethod === 'card' && (
                    <div className="bg-earth-card/40 border border-earth-dark/10 rounded-xl px-4 py-3.5 flex items-start gap-3 animate-in fade-in duration-200">
                      <ShieldCheck size={16} className="text-earth-green/70 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-earth-brown uppercase tracking-wide">Secure Payment via Paystack</p>
                        <p className="text-[8px] font-bold text-earth-mut uppercase tracking-widest mt-0.5">Supports Card / Bank Transfer / USSD</p>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'loan' && (
                    <div className="bg-earth-primary/5 border border-earth-primary/10 rounded-xl px-4 py-3.5 flex items-start gap-3 animate-in fade-in duration-200">
                      <ShieldCheck size={16} className="text-earth-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-earth-brown uppercase tracking-wide">Agricultural Soft Loan Facility</p>
                        <p className="text-[8px] font-bold text-earth-mut uppercase tracking-widest mt-0.5">Select a 3 or 6-month flexible payment installment plan</p>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {selectedMethod === 'card' ? (
                    <Button
                      onClick={startPayment}
                      isLoading={isPaying}
                      loadingText="Processing..."
                      className="w-full h-14 bg-accent text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-accent/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {!isPaying && <CreditCard size={18} />}
                      Pay Now
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setPaymentStep('bvn-verification')}
                      className="w-full h-14 bg-earth-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-earth-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      Continue to Loan Approval
                    </Button>
                  )}
                </div>
              )}

              {paymentStep === 'bvn-verification' && (
                <div className="p-7 space-y-5 animate-in fade-in duration-300">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                       <h3 className="text-2xl font-black text-earth-brown italic leading-none">Loan Verification</h3>
                       <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mt-2">Enter credentials and verify EMI schedules</p>
                    </div>
                    <button onClick={() => setPaymentStep('method')} className="text-earth-mut hover:text-earth-brown transition-colors"><X size={20} /></button>
                  </div>

                  {paymentError && (
                    <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                      {paymentError}
                    </div>
                  )}

                  {/* BVN Input */}
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black text-earth-sub pl-1">11-Digit Bank Verification Number (BVN)</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={bvn}
                      onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 22233344455"
                      className="w-full bg-earth-card border border-earth-dark/15 font-black text-lg text-earth-brown h-14 px-4 rounded-2xl focus:border-earth-primary shadow-inner tracking-widest text-center focus:outline-none"
                    />
                  </div>

                  {/* EMI Schedule Calculator */}
                  <div className="bg-earth-card/60 border border-earth-dark/10 rounded-2xl overflow-hidden p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-earth-mut uppercase tracking-widest">Financing Tenure</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEmiMonths(3)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all focus:outline-none",
                            emiMonths === 3
                              ? "bg-earth-primary text-white shadow-md shadow-earth-primary/10"
                              : "bg-earth-card border border-earth-dark/10 text-earth-mut"
                          )}
                        >
                          3 Months
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmiMonths(6)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all focus:outline-none",
                            emiMonths === 6
                              ? "bg-earth-primary text-white shadow-md shadow-earth-primary/10"
                              : "bg-earth-card border border-earth-dark/10 text-earth-mut"
                          )}
                        >
                          6 Months
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-earth-dark/5 space-y-2.5 pt-2.5">
                      <div className="flex justify-between items-center text-[10px] font-black text-earth-mut uppercase tracking-widest pt-1.5">
                        <span>Principal Amount</span>
                        <span className="text-earth-brown font-black">{formatCurrency(paymentPortal.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black text-earth-mut uppercase tracking-widest pt-2.5">
                        <span>Interest (5% flat)</span>
                        <span className="text-earth-brown font-black">{formatCurrency(paymentPortal.amount * 0.05)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black text-earth-mut uppercase tracking-widest pt-2.5">
                        <span>Total Payable</span>
                        <span className="text-earth-brown font-black">{formatCurrency(paymentPortal.amount * 1.05)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black text-earth-mut uppercase tracking-widest border-t border-earth-dark/10 pt-3">
                        <span className="text-earth-primary">Monthly Installment</span>
                        <span className="text-lg text-earth-primary font-black tabular-nums">{formatCurrency((paymentPortal.amount * 1.05) / emiMonths)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={startLoanPayment}
                    isLoading={isPaying}
                    loadingText="Approving Loan..."
                    className="w-full h-14 bg-earth-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-earth-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Confirm Soft Loan & Book
                  </Button>
                </div>
              )}

               {paymentStep === 'success' && (
                <div className="p-10 text-center space-y-6">
                   <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-orange-500/20">
                      <CheckCircle size={32} strokeWidth={2.5} />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-earth-brown italic">
                       {paymentPortal.targetId === 'NEW_BOOKING' ? 'Booking Confirmed' : 'Payment Done'}
                     </h3>
                     <p className="text-[10px] text-earth-mut font-bold mt-1 uppercase tracking-widest">Transfer Verified</p>
                   </div>
                   <Button onClick={() => {
                     setPaymentPortal({ ...paymentPortal, open: false });
                     window.scrollTo(0, 0);
                   }} className="w-full h-12 bg-earth-card-alt text-earth-brown font-black uppercase tracking-widest rounded-xl text-[10px] hover:bg-earth-card">Done</Button>
                </div>
              )}
            </motion.div>
           </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
