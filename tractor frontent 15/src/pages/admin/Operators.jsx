import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Search, Phone, Shield, ShieldCheck, ShieldAlert, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import AddOperatorModal from '../../components/admin/AddOperatorModal';

export default function Operators() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New Operator Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: ''
  });
  const [formError, setFormError] = useState('');

  const fetchOperators = async () => {
    setIsLoading(true);
    try {
      const result = await api.admin.listOperators();
      setOperators(result.data || []);
    } catch (error) {
      console.error("Failed to fetch operators:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const handleCreateOperator = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const result = await api.admin.createOperator(formData);
      if (result.success) {
        setOperators([result.data, ...operators]);
        setIsModalOpen(false);
        setFormData({ name: '', phone: '', password: '' });
      }
    } catch (error) {
      setFormError("Network issue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOperator = async (id) => {
    if (!window.confirm("Are you sure you want to delete this operator? This will also remove their tractor assignments.")) return;
    
    try {
      await api.admin.deleteOperator(id);
      setOperators(prev => prev.filter(op => op.id !== id));
    } catch (error) {
      alert(error.message || "Failed to delete operator");
    }
  };

  const filteredOperators = operators.filter(op => 
    op.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (op.phone && op.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-earth-brown mb-1 uppercase italic text-shadow-sm">Fleet Command</h2>
          <p className="text-[9px] md:text-[10px] tracking-[0.2em] font-black uppercase text-earth-mut flex items-center gap-2">
            <Briefcase size={12} className="text-earth-primary" /> Active Operator Directory
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative group w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-mut group-focus-within:text-earth-primary transition-colors" size={16} />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Operators..." 
              className="pl-12 bg-earth-card border-none rounded-2xl h-12 focus:ring-0 focus:border-none shadow-sm font-bold"
            />
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="h-12 px-8 rounded-2xl bg-accent hover:opacity-90 text-white font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,152,0,0.2)] border-none"
          >
            <Plus size={18} className="mr-2" /> Recruit Operator
          </Button>
        </div>
      </div>

      {/* Operators Table */}
      <Card className="bg-white shadow-[0_30px_90px_rgba(0,0,0,0.06)] border-none rounded-[2.5rem] w-full max-w-full overflow-hidden">
        <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between bg-white/50">
          <div>
            <CardTitle className="text-base font-black text-earth-brown uppercase tracking-wider italic">Certified Operators Registry</CardTitle>
            <CardDescription className="text-[10px] font-bold text-earth-mut uppercase mt-1 tracking-[0.1em]">Authorized personnel managing agency equipment</CardDescription>
          </div>
          <button onClick={fetchOperators} className="p-3 bg-white hover:bg-earth-card-alt rounded-2xl transition-all text-earth-mut hover:text-earth-brown border-none shadow-sm">
            <RefreshCw size={18} className={isLoading ? "animate-spin text-earth-primary" : ""} />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[800px] text-shadow-sm">
              <thead className="bg-earth-dark text-earth-main uppercase font-black tracking-widest text-[9px]">
                <tr>
                  <th className="px-8 py-6 text-left">Personnel Entity</th>
                  <th className="px-8 py-6 text-left">Deployment State</th>
                  <th className="px-8 py-6 text-left">Reachability</th>
                  <th className="px-8 py-6 text-left">Commissioned</th>
                  <th className="px-8 py-6 text-right">Management</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-earth-primary" size={32} />
                        <p className="text-xs font-black text-earth-mut uppercase tracking-widest animate-pulse italic">Accessing Personnel Files...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredOperators.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center">
                      <p className="text-xs font-black text-earth-mut uppercase tracking-widest">No matching operator profiles found</p>
                    </td>
                  </tr>
                ) : filteredOperators.map((op) => (
                  <tr key={op.id} className="group hover:bg-earth-primary/5 transition-all duration-300">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-2xl bg-earth-card-alt flex items-center justify-center text-earth-brown shadow-sm border-none transition-all group-hover:scale-110">
                            <Briefcase size={18} className="group-hover:text-earth-primary" />
                         </div>
                         <div>
                            <p className="text-sm font-black text-earth-brown">{op.name}</p>
                            <p className="text-[10px] font-bold text-earth-mut uppercase flex items-center gap-1 mt-0.5">
                               ID: TL-OP-{op.id.toString().padStart(4, '0')}
                            </p>
                         </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                        <Badge className={cn(
                            "text-[9px] px-3 py-1 border uppercase font-black tracking-[0.2em] h-6 rounded-lg",
                            op.availability === 'available' 
                                ? 'bg-earth-primary/10 text-earth-green border-emerald-500/20' 
                                : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                        )}>
                            {op.availability}
                        </Badge>
                    </td>
                    <td className="px-8 py-5">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-earth-brown">
                             <Phone size={14} className="text-earth-primary" /> {op.phone}
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                        <p className="text-xs font-bold text-earth-brown">{new Date(op.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                       <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteOperator(op.id)}
                        className="text-[9px] px-4 font-black uppercase tracking-widest h-9 rounded-xl bg-red-500/5 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 size={12} className="mr-1" /> Decommission
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recruit Operator Modal */}
      <AddOperatorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        isSubmitting={isSubmitting}
        onSubmit={handleCreateOperator}
      />

    </div>
  );
}
