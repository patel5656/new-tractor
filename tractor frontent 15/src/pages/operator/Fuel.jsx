import { useState, useRef, useEffect } from 'react';
import { Fuel as FuelIcon, PlusCircle, Calendar, ArrowRight, Zap, Upload, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api, clearApiCache } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import API_BASE_URL from '../../config/api';


export default function Fuel() {
  const [fuelLogs, setFuelLogs] = useState([]);
  const [summary, setSummary] = useState({ total_cost: 0, total_liters: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    cost: '',
    station: '',
  });
  const [receipt, setReceipt] = useState(null);
  const fileInputRef = useRef(null);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [historyRes, summaryRes] = await Promise.all([
        api.operator.getFuelHistory(),
        api.operator.getFuelSummary()
      ]);
      if (historyRes.success) setFuelLogs(historyRes.data);
      if (summaryRes.success) setSummary(summaryRes.data);
    } catch (err) {
      console.error("Failed to fetch fuel data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceipt(file);
    }
  };

  const handleCommit = async () => {
    if (!formData.amount || !formData.cost || !formData.station) {
      alert('Please fill all fields');
      return;
    }

    try {
      setSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append('liters', formData.amount);
      formDataObj.append('cost', formData.cost);
      formDataObj.append('station', formData.station);
      if (receipt) {
        formDataObj.append('receipt', receipt);
      }

      const res = await api.operator.addFuelLog(formDataObj);
      if (res.success) {
        clearApiCache();
        setFormData({ amount: '', cost: '', station: '' });
        setReceipt(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchData(true);
      }
    } catch (err) {
      console.error("Failed to add fuel log:", err);
      alert(err.message || "Failed to commit entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="py-2 md:border-b border-earth-dark/10 md:pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-earth-brown tracking-tight">Fuel Telemetry & Logistics</h1>
          <p className="text-[10px] uppercase font-bold text-earth-mut mt-0.5 tracking-widest font-mono">Consumables management for assigned unit fleet.</p>
        </div>
        <div className="text-right bg-white px-5 py-2.5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.04)] group transition-all">
           <p className="text-[9px] text-earth-mut font-black uppercase tracking-widest mb-1 leading-none">Total Resource Cost</p>
           <p className="text-xl font-black text-earth-primary tracking-tighter">{formatCurrency(summary.total_cost)}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        
        {/* Left Column: Add Entry */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-black text-earth-mut uppercase tracking-widest text-[9px] ml-2 mb-2">Manual Input Sequence</h3>
          
          <Card className="bg-white border-none shadow-[0_20px_50px_rgba(0,0,0,0.08)] relative overflow-hidden rounded-[2.5rem] group transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
              <FuelIcon size={200} />
            </div>
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-earth-primary to-transparent opacity-30"></div>
            
            <CardContent className="p-6 md:p-8 space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-black text-earth-brown flex items-center gap-3">
                  <div className="w-9 h-9 bg-earth-card rounded-xl flex items-center justify-center text-earth-primary shadow-inner">
                    <Zap size={16} />
                  </div> 
                  Update Reserve
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black tracking-widest text-earth-mut pl-1">Volume Liters</label>
                  <Input 
                    type="number" 
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="00.00" 
                    className="bg-earth-card/50 border-none text-earth-brown font-black h-12 rounded-xl focus:ring-2 focus:ring-earth-primary/20 px-5 text-base shadow-inner" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black tracking-widest text-earth-mut pl-1">Cost (NGN)</label>
                  <Input 
                    type="number" 
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    placeholder="000.00" 
                    className="bg-earth-card/50 border-none text-earth-brown font-black h-12 rounded-xl focus:ring-2 focus:ring-earth-primary/20 px-5 text-base shadow-inner" 
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[9px] uppercase font-black tracking-widest text-earth-mut pl-1">Station / Location</label>
                  <Input 
                    name="station"
                    value={formData.station}
                    onChange={handleInputChange}
                    placeholder="Enter station name..." 
                    className="bg-earth-card/50 border-none text-earth-brown font-black h-12 rounded-xl focus:ring-2 focus:ring-earth-primary/20 px-5 text-base shadow-inner" 
                  />
                </div>
              </div>

              {/* Receipt Upload Section */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-black tracking-widest text-earth-mut pl-1">Fuel Receipt (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all ${
                    receipt 
                    ? 'border-earth-primary bg-earth-primary/5 shadow-inner' 
                    : 'border-earth-dark/10 bg-earth-card/30 hover:bg-earth-card/50'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                  />
                  {receipt ? (
                    <>
                      <CheckCircle2 size={24} className="text-earth-green" />
                      <p className="text-[10px] font-black text-earth-green uppercase tracking-widest">{receipt.name}</p>
                    </>
                  ) : (
                    <>
                      <Upload size={24} className="text-earth-mut group-hover:text-earth-primary" />
                      <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">Upload Receipt Image</p>
                    </>
                  )}
                </div>
              </div>
              
              <Button 
                onClick={handleCommit}
                disabled={submitting}
                className="w-full bg-accent text-white hover:opacity-90 font-black px-6 py-4 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 text-sm uppercase tracking-widest border-none mt-2 disabled:opacity-50"
              >
                {submitting ? "Committing..." : "Commit Entry"} <ArrowRight size={18} className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-black text-earth-mut uppercase tracking-widest text-[9px] ml-2">Historical Telemetry</h3>
            <button className="text-[9px] font-black uppercase tracking-widest text-earth-primary hover:text-earth-brown transition-colors">Audit Full Log</button>
          </div>
          
          <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-earth-mut uppercase font-black text-[10px] tracking-widest italic animate-pulse">Synchronizing Logs...</div>
            ) : fuelLogs.length > 0 ? fuelLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-[1.5rem] p-5 flex justify-between items-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all group border-none">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-earth-card border border-earth-dark/15/30 flex items-center justify-center text-earth-mut group-hover:text-earth-primary group-hover:bg-earth-card-alt transition-all duration-300 shadow-inner">
                    <FuelIcon size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-earth-brown text-base tracking-tight leading-none mb-1.5">{log.liters} <span className="text-[10px] text-earth-mut uppercase tracking-widest ml-0.5">Liters</span></h4>
                    <div className="flex items-center gap-3">
                      <p className="text-[9px] uppercase font-black text-earth-mut flex items-center gap-1.5">
                        <Calendar size={10} className="text-earth-primary/50" /> {new Date(log.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                      </p>
                      {log.receiptUrl && (
                        <span className="flex items-center gap-1 text-blue-500 text-[8px] font-black uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 shadow-sm cursor-pointer hover:bg-blue-500 hover:text-white transition-colors" onClick={() => {
                            if (log.receiptUrl.endsWith('.pdf')) {
                              window.open(log.receiptUrl.startsWith('http') ? log.receiptUrl : `${API_BASE_URL}${log.receiptUrl}`, '_blank');
                            } else {
                              // Could open preview modal, but opening in new tab is safe fallback
                              window.open(log.receiptUrl.startsWith('http') ? log.receiptUrl : `${API_BASE_URL}${log.receiptUrl}`, '_blank');
                            }
                          }}>
                          <FileText size={8} /> View Receipt
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-earth-brown text-lg tracking-tighter uppercase leading-none">{formatCurrency(log.cost)}</p>
                  <p className="text-[8px] uppercase font-black tracking-widest text-earth-mut mt-2 max-w-[150px] truncate bg-earth-card/50 px-2 py-1 rounded inline-block mb-1">{log.station}</p>
                  <div>
                    {log.status === 'APPROVED' ? (
                      <span className="text-[8px] font-black text-earth-green uppercase tracking-widest flex items-center justify-end gap-1"><CheckCircle2 size={10} /> Approved</span>
                    ) : log.status === 'REJECTED' ? (
                      <span className="text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center justify-end gap-1"><XCircle size={10} /> Rejected</span>
                    ) : (
                      <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest flex items-center justify-end gap-1"><Clock size={10} /> Pending</span>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-12 bg-white rounded-[2rem] text-center shadow-[0_10px_35px_rgba(0,0,0,0.03)] border-none">
                <FuelIcon className="mx-auto text-earth-mut mb-3 opacity-20" size={32} />
                <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">No Telemetry Recorded</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
