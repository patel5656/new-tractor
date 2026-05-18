import { useState, useEffect } from 'react';
import { Search, Landmark, Calendar, Clock, ChevronLeft, ChevronRight, X, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/format';
import useScrollLock from '../../hooks/useScrollLock';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  
  // Lock background scroll when modal is open
  useScrollLock(selectedLoan);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await api.loans.getHistory();
      if (res.success) {
        setLoans(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch loan history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const filteredLoans = loans.filter(l => 
    String(l.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(l.bookingId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.bankName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute metrics
  const activeLoansCount = loans.filter(l => l.status === 'ACTIVE' || l.status === 'APPROVED').length;
  const totalFinanced = loans.reduce((acc, l) => acc + l.amount, 0);
  const totalPaid = loans.filter(l => l.status === 'PAID').reduce((acc, l) => acc + l.amount * 1.05, 0);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto relative pb-24 md:pb-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-earth-dark/15 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-earth-brown uppercase italic">Soft Loan Registry</h1>
          <p className="text-[10px] md:text-sm text-earth-mut mt-1 font-black uppercase tracking-widest">Track Agricultural Financing & EMI Schedules</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-mut" size={16} />
            <input 
              type="text"
              placeholder="Search Loan ID / Booking ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-11 bg-earth-card border border-earth-dark/15 rounded-xl text-earth-brown font-bold text-xs focus:ring-2 focus:ring-earth-primary/50 outline-none w-full transition-all"
            />
          </div>
        </div>
      </header>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-earth-card border border-earth-dark/10 shadow-sm rounded-2xl p-5 text-left">
          <CardContent className="p-0">
            <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-1">Active Loan Facilities</p>
            <p className="text-3xl font-black text-earth-brown italic">{activeLoansCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-earth-card border border-earth-dark/10 shadow-sm rounded-2xl p-5 text-left">
          <CardContent className="p-0">
            <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-1">Total Principal Financed</p>
            <p className="text-3xl font-black text-earth-primary italic">{formatCurrency(totalFinanced)}</p>
          </CardContent>
        </Card>
        <Card className="bg-earth-card border border-earth-dark/10 shadow-sm rounded-2xl p-5 text-left">
          <CardContent className="p-0">
            <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-1">Settled Principal</p>
            <p className="text-3xl font-black text-green-600 italic">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table View - Desktop */}
      <div className="hidden md:block overflow-hidden bg-earth-card border border-earth-dark/10 rounded-2xl shadow-sm">
        <div className="overflow-x-auto text-left">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-earth-dark text-earth-main uppercase font-black text-[10px] tracking-widest border-b border-earth-dark/10">
              <tr>
                <th className="px-6 py-5">Loan ID</th>
                <th className="px-6 py-5">Booking Source</th>
                <th className="px-6 py-5">Financing Details</th>
                <th className="px-6 py-5">Tenure & EMI</th>
                <th className="px-6 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-dark/5 bg-earth-card-alt">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-xs font-black text-earth-mut uppercase tracking-widest">
                    <Clock className="animate-spin mx-auto text-earth-primary mb-2" size={24} />
                    Syncing Loans...
                  </td>
                </tr>
              ) : filteredLoans.length > 0 ? filteredLoans.map((loan) => (
                <tr 
                  key={loan.id} 
                  onClick={() => setSelectedLoan(loan)}
                  className="hover:bg-earth-card transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-5">
                    <span className="font-black text-[10px] text-earth-mut bg-white px-2.5 py-1 rounded-lg border border-earth-dark/10 group-hover:border-earth-primary transition-all">#{loan.id}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Landmark size={16} className="text-earth-primary" />
                      <div>
                        <p className="font-black text-earth-brown uppercase italic">Booking #{loan.bookingId}</p>
                        <p className="text-[9px] font-bold text-earth-mut uppercase tracking-widest">{loan.bankName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-black text-earth-brown tabular-nums">{formatCurrency(loan.amount)}</p>
                      <p className="text-[8px] font-bold text-earth-mut uppercase tracking-widest">Total Repayable: {formatCurrency(loan.amount * 1.05)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-black text-earth-brown tabular-nums">{formatCurrency(loan.emiAmount)} / Month</p>
                      <p className="text-[8px] font-bold text-earth-primary uppercase tracking-widest">{loan.emiMonths} Months duration</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <Badge className={cn(
                      "text-[8px] px-2 py-0 border font-black uppercase tracking-widest",
                      loan.status === 'PAID' ? 'bg-earth-primary/20 text-earth-green border-earth-green/20' : 
                      'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse'
                    )}>
                      {loan.status}
                    </Badge>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-xs font-black text-earth-mut uppercase tracking-widest">No Loans Registered</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loans Card View - Mobile */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-16 text-center">
            <Clock className="animate-spin mx-auto text-earth-primary mb-4" size={32} />
            <p className="text-xs font-black text-earth-brown uppercase tracking-widest">Syncing Loans...</p>
          </div>
        ) : filteredLoans.length > 0 ? filteredLoans.map((loan) => (
          <motion.div
            layout
            key={loan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedLoan(loan)}
            className="cursor-pointer"
          >
            <Card className="bg-earth-card border border-earth-dark/10 shadow-sm hover:border-earth-primary/50 transition-all rounded-2xl p-5 text-left relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-earth-card-alt border border-earth-dark/15 text-earth-primary flex items-center justify-center">
                    <Landmark size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-earth-brown uppercase italic leading-none">Booking #{loan.bookingId}</h3>
                    <span className="text-[8px] font-black text-earth-mut uppercase tracking-widest">{loan.bankName}</span>
                  </div>
                </div>
                <Badge className={cn(
                  "text-[8px] px-2 py-0 border font-black uppercase tracking-widest",
                  loan.status === 'PAID' ? 'bg-earth-primary/20 text-earth-green border-earth-green/20' : 
                  'bg-orange-500/10 text-orange-500 border-orange-500/20'
                )}>
                  {loan.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-earth-dark/5">
                <div>
                  <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-1">Principal Financed</p>
                  <p className="text-sm font-black text-earth-brown">{formatCurrency(loan.amount)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-1">EMI / Months</p>
                  <p className="text-sm font-black text-earth-primary">{formatCurrency(loan.emiAmount)} <span className="text-[8px] text-earth-mut">x{loan.emiMonths}</span></p>
                </div>
              </div>
            </Card>
          </motion.div>
        )) : (
          <div className="py-16 text-center bg-earth-card border border-earth-dark/10 rounded-2xl">
             <div className="w-16 h-16 bg-earth-card mx-auto rounded-full flex items-center justify-center text-earth-mut mb-4 shadow-inner border border-earth-dark/10">
                <Landmark size={24} />
             </div>
             <h3 className="text-lg font-black text-earth-brown uppercase tracking-widest">No Loans Found</h3>
             <p className="text-[10px] font-bold text-earth-mut max-w-sm mx-auto mt-2">Apply for a soft loan directly at booking checkouts.</p>
          </div>
        )}
      </div>

      {/* Loan Detail Modal */}
      <AnimatePresence>
        {selectedLoan && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto scrollbar-hide">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedLoan(null)}
                className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl"
              />
              
              <motion.div
                layoutId={selectedLoan.id}
                className="text-left bg-white border border-earth-dark/10 w-full max-w-[400px] rounded-2xl md:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col my-auto"
              >
                <div className="p-5 md:p-6 border-b border-earth-dark/10 flex items-center justify-between bg-earth-main/20 shrink-0">
                  <div>
                    <h3 className="text-xl font-black text-earth-brown uppercase italic tracking-tight">Loan Schedule</h3>
                    <p className="text-[9px] font-black text-earth-mut uppercase tracking-[0.2em] mt-1">Registry: #{selectedLoan.id} • Booking #{selectedLoan.bookingId}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedLoan(null)}
                    className="h-10 w-10 rounded-xl bg-white border border-earth-dark/10 text-earth-mut flex items-center justify-center hover:text-earth-brown transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-5 md:p-6 space-y-5">
                  <div className="p-4 bg-earth-main/5 border border-earth-dark/10 rounded-[1.5rem] flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest leading-none mb-1">Financed Provider</p>
                      <p className="text-sm font-black text-earth-brown truncate">{selectedLoan.bankName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest leading-none mb-1">Principal Value</p>
                      <span className="text-sm font-black text-earth-primary italic">{formatCurrency(selectedLoan.amount)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-earth-mut uppercase tracking-[0.2em] px-1">Amortized EMI Installment Breakdown</h4>
                    <div className="bg-white border border-earth-dark/10 rounded-[1.5rem] p-4 space-y-3 shadow-inner">
                      {Array.from({ length: selectedLoan.emiMonths }).map((_, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-earth-mut pt-1">
                          <span>Month {idx + 1} payment</span>
                          <div className="flex items-center gap-2">
                            <span className="text-earth-brown">{formatCurrency(selectedLoan.emiAmount)}</span>
                            {selectedLoan.status === 'PAID' ? (
                              <CheckCircle2 size={12} className="text-green-500" />
                            ) : (
                              <Badge className="text-[6px] font-bold px-1 py-0 border bg-orange-500/10 text-orange-500 border-orange-500/20">Pending</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="h-px bg-earth-dark/5 my-1" />
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-earth-primary italic">Total Valuation</span>
                        <span className="text-lg font-black text-earth-brown tracking-tighter italic">{formatCurrency(selectedLoan.amount * 1.05)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-3 flex gap-2.5">
                    <AlertCircle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                    <p className="text-[8px] font-bold text-earth-sub uppercase tracking-wider leading-relaxed">
                      EMI collections are automatically processed on monthly cycles directly via linking mandates to BVN verified settlement accounts.
                    </p>
                  </div>
                </div>

                <div className="px-5 md:px-6 py-4 border-t border-earth-dark/10 bg-earth-main/40 flex justify-end gap-3 shrink-0">
                  <Button 
                     onClick={() => setSelectedLoan(null)}
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
    </div>
  );
}
