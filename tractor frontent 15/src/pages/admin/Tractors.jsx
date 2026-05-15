import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Truck, Search, Plus, UserPlus, Settings2, ShieldCheck, AlertTriangle, Loader2, RefreshCw, Calendar, Clock, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import useScrollLock from '../../hooks/useScrollLock';
import AddTractorModal from '../../components/admin/AddTractorModal';

export default function Tractors() {
  const [tractors, setTractors] = useState([]);
  const [operators, setOperators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newTractor, setNewTractor] = useState({ 
    name: '', 
    model: '',
    engineHours: 0,
    nextServiceDueHours: 250,
    lastServiceDate: ''
  });
  const [updatingId, setUpdatingId] = useState(null);

  const fetchData = async () => {
    const hasInitialData = tractors.length > 0;
    
    try {
      if (!hasInitialData) setIsLoading(true);
      const [tractorRes, operatorRes] = await Promise.all([
        api.admin.getTractors(),
        api.admin.getOperators()
      ]);
      setTractors(tractorRes.data || []);
      setOperators(operatorRes.data || []);
    } catch (error) {
      console.error("Failed to fetch fleet data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lock background scroll when open
  useScrollLock(showAddModal);

  const handleCreateTractor = async (e) => {
    e.preventDefault();
    if (!newTractor.name) return;
    setIsSubmitting(true);
    try {
      const result = isEditing 
        ? await api.admin.updateTractor(editingId, newTractor)
        : await api.admin.createTractor(newTractor);
        
      if (result.success) {
        if (isEditing) {
          setTractors(prev => prev.map(t => t.id === editingId ? result.data : t));
        } else {
          setTractors(prev => [result.data, ...prev]);
        }
        closeModal();
      }
    } catch (error) {
      alert(error.message || `Failed to ${isEditing ? 'update' : 'create'} tractor`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setNewTractor({ name: '', model: '', engineHours: 0, nextServiceDueHours: 250, lastServiceDate: '' });
    setShowAddModal(true);
  };

  const openEditModal = (tractor) => {
    setIsEditing(true);
    setEditingId(tractor.id);
    setNewTractor({
      name: tractor.name,
      model: tractor.model || '',
      engineHours: tractor.engineHours || 0,
      nextServiceDueHours: tractor.nextServiceDueHours || 250,
      lastServiceDate: tractor.lastServiceDate ? new Date(tractor.lastServiceDate).toISOString().split('T')[0] : ''
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleUpdateTractor = async (id, data) => {
    setUpdatingId(id);
    try {
      const result = await api.admin.updateTractor(id, data);
      if (result.success) {
        setTractors(prev => prev.map(t => t.id === id ? { ...t, ...result.data } : t));
      }
    } catch (error) {
      alert(error.message || "Failed to update tractor");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTractors = tractors.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-earth-brown mb-1 uppercase italic font-outfit">Fleet Management</h2>
          <p className="text-[9px] md:text-[10px] tracking-[0.2em] font-black uppercase text-earth-mut flex items-center gap-2">
            <Truck size={12} className="text-earth-primary" /> Centralized Resource Control Registry
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative group w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-mut group-focus-within:text-earth-primary transition-colors" size={16} />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Fleet Units..." 
              className="pl-12 bg-earth-card border-earth-dark/10 rounded-2xl h-12 focus:ring-1 focus:ring-earth-primary/30 font-bold"
            />
          </div>
          <Button 
            onClick={openAddModal}
            className="h-12 px-6 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-accent/20 hover:scale-[1.02] transform transition-all active:scale-95 border-none"
          >
            <Plus size={16} className="mr-2 stroke-[3]" /> Add New Tractor
          </Button>
        </div>
      </div>

      {/* Fleet Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
         {[
           { label: 'Total Fleet', value: tractors.length, icon: Truck, color: 'text-earth-brown', bg: 'bg-earth-dark/5' },
           { label: 'Active Service', value: tractors.filter(t => t.status === 'AVAILABLE' || t.status === 'IN_USE').length, icon: ShieldCheck, color: 'text-earth-green', bg: 'bg-earth-primary/10' },
           { label: 'Maintenance', value: tractors.filter(t => t.status === 'MAINTENANCE').length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
         ].map((stat, i) => (
           <Card key={i} className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-none rounded-[2rem] overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all">
              <CardContent className="p-6 flex items-center justify-between">
                 <div>
                   <p className="text-[9px] font-black text-earth-mut uppercase tracking-[0.15em] mb-1.5 font-outfit">{stat.label}</p>
                   <h3 className="text-3xl font-black text-earth-brown tracking-tighter italic">{stat.value.toString().padStart(2, '0')}</h3>
                 </div>
                 <div className={cn("p-4 rounded-2xl shrink-0 shadow-inner", stat.bg)}>
                    <stat.icon size={20} className={stat.color} />
                 </div>
              </CardContent>
           </Card>
         ))}
      </div>

      <Card className="bg-white shadow-[0_30px_90px_rgba(0,0,0,0.06)] border-none rounded-[2.5rem] w-full max-w-full overflow-hidden">
        <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between bg-white/50">
          <div>
            <CardTitle className="text-base font-black text-earth-brown uppercase tracking-wider italic font-outfit">Fleet Asset Registry</CardTitle>
            <CardDescription className="text-[10px] font-bold text-earth-mut uppercase mt-1 tracking-[0.1em]">Verified heavy machinery assets</CardDescription>
          </div>
          <button onClick={fetchData} className="p-3 hover:bg-earth-card-alt rounded-2xl transition-all text-earth-mut hover:text-earth-brown border border-earth-dark/5 shadow-sm">
            <RefreshCw size={18} className={isLoading ? "animate-spin text-earth-primary" : ""} />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[800px]">
              <thead className="bg-earth-dark text-earth-main uppercase font-black tracking-widest text-[9px]">
                <tr>
                  <th className="px-8 py-6 text-left">Unit Details</th>
                  <th className="px-8 py-6 text-left">Health & Service</th>
                  <th className="px-8 py-6 text-left">Assigned Operator</th>
                  <th className="px-8 py-6 text-left">Status</th>
                  <th className="px-8 py-6 text-right">Management</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <Loader2 className="animate-spin text-earth-primary" size={40} />
                          <Truck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-earth-brown/30" size={16} />
                        </div>
                        <p className="text-xs font-black text-earth-mut uppercase tracking-[0.3em] animate-pulse italic">Scanning Fleet Frequency...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTractors.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-24 text-center">
                      <div className="p-12 rounded-[2.5rem] bg-earth-dark/5 inline-block border-2 border-dashed border-earth-dark/10">
                         <Truck size={40} className="mx-auto text-earth-mut opacity-30 mb-4" />
                         <p className="text-xs font-black text-earth-mut uppercase tracking-widest">Zero machinery records detected</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTractors.map((tractor) => (
                  <tr key={tractor.id} className="group hover:bg-earth-primary/5 transition-all duration-300">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-earth-card-alt flex items-center justify-center text-earth-brown border border-earth-dark/10 shadow-inner group-hover:border-earth-primary/30 group-hover:scale-110 transition-all duration-300">
                             <Truck size={20} className="group-hover:text-earth-primary transition-colors" />
                          </div>
                          <div>
                             <p className="text-sm font-black text-earth-brown group-hover:tracking-tight transition-all font-outfit">{tractor.name}</p>
                             <p className="text-[10px] font-bold text-earth-mut uppercase flex items-center gap-1 mt-0.5 tracking-tighter">
                                SN: TL-TR-{tractor.id.toString().padStart(4, '0')}
                             </p>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="space-y-3 min-w-[200px]">
                          <div className="flex justify-between items-end mb-1">
                             <div>
                                <p className="text-[10px] font-black text-earth-brown uppercase italic mb-0.5">{tractor.model || 'Standard'}</p>
                                <p className="text-[9px] font-bold text-earth-mut flex items-center gap-1.5 uppercase tracking-tighter">
                                   <Clock size={10} className="text-earth-primary" /> {tractor.engineHours?.toFixed(1) || '0.0'} Engine Hrs
                                </p>
                             </div>
                             <p className={cn(
                               "text-[9px] font-black uppercase text-right",
                               (tractor.nextServiceDueHours - tractor.engineHours) <= 50 ? "text-red-500 animate-pulse" : "text-earth-green"
                             )}>
                                Service In {(tractor.nextServiceDueHours - tractor.engineHours)?.toFixed(1)}h
                             </p>
                          </div>
                          
                          <div className="w-full h-1.5 bg-earth-dark/5 rounded-full overflow-hidden shadow-inner border border-earth-dark/5">
                             <div 
                                className={cn(
                                   "h-full transition-all duration-500",
                                   (tractor.nextServiceDueHours - tractor.engineHours) <= 50 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-earth-green shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                )}
                                style={{ width: `${Math.min(100, (tractor.engineHours / tractor.nextServiceDueHours) * 100)}%` }}
                             />
                          </div>

                          <p className="text-[8px] font-bold text-earth-mut uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                             <Calendar size={10} /> Last: {tractor.lastServiceDate ? new Date(tractor.lastServiceDate).toLocaleDateString() : 'No Record'}
                          </p>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="relative group/op">
                          <select 
                            className={cn(
                              "text-xs font-black uppercase tracking-wider bg-earth-card-alt border-2 border-earth-dark/10 rounded-xl px-4 py-2 pr-10 appearance-none cursor-pointer focus:ring-2 focus:ring-earth-primary/30 transition-all w-full md:w-56",
                              !tractor.operatorId ? "text-earth-mut italic border-dashed" : "text-earth-brown border-solid"
                            )}
                            value={tractor.operatorId || ''}
                            onChange={(e) => handleUpdateTractor(tractor.id, { operatorId: e.target.value === '' ? null : e.target.value })}
                            disabled={updatingId === tractor.id || tractor.status === 'MAINTENANCE'}
                          >
                             <option value="" className="font-bold text-earth-mut">Unassigned Unit</option>
                             {operators.map(op => (
                               <option key={op.id} value={op.id} className="font-black text-earth-brown uppercase">
                                 {op.name} {op.availability === 'busy' ? '(Busy)' : ''}
                               </option>
                             ))}
                          </select>
                          <UserPlus size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-earth-mut pointer-events-none group-hover/op:text-earth-primary transition-colors" />
                       </div>
                       {tractor.status === 'MAINTENANCE' && (
                         <p className="text-[8px] font-black text-red-500 uppercase mt-1.5 ml-1 tracking-widest flex items-center gap-1">
                           <AlertTriangle size={8} /> Assignment disabled in maintenance
                         </p>
                       )}
                    </td>
                    <td className="px-8 py-6">
                      <Badge className={cn(
                        "text-[9px] px-3 py-1 border uppercase font-black tracking-[0.2em] h-7 rounded-lg shadow-sm border-b-2",
                        tractor.status === 'AVAILABLE' && 'bg-earth-primary/10 text-earth-green border-earth-primary/20',
                        tractor.status === 'IN_USE' && 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                        tractor.status === 'MAINTENANCE' && 'bg-red-500/10 text-red-500 border-red-500/20'
                      )}>
                        {tractor.status === 'AVAILABLE' ? 'Ready' : tractor.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <Button 
                          size="sm"
                          variant="outline"
                          disabled={updatingId === tractor.id || tractor.status === 'IN_USE'}
                          onClick={() => handleUpdateTractor(tractor.id, { 
                            status: tractor.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE',
                            operatorId: tractor.status === 'MAINTENANCE' ? tractor.operatorId : null 
                          })}
                          className={cn(
                            "text-[9px] px-4 font-black uppercase tracking-widest h-10 rounded-xl transition-all border-b-2 active:translate-y-0.5",
                            tractor.status === 'MAINTENANCE' 
                              ? 'bg-earth-primary/10 border-earth-primary/30 text-earth-green hover:bg-earth-primary hover:text-earth-brown' 
                              : 'bg-earth-card-alt border-earth-dark/15 text-earth-sub hover:text-red-500 hover:border-red-500/30'
                          )}
                        >
                          {updatingId === tractor.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            tractor.status === 'MAINTENANCE' ? (
                              <><ShieldCheck size={14} className="mr-1.5" /> Return to Service</>
                            ) : (
                              <><Settings2 size={14} className="mr-1.5" /> Maintenance</>
                            )
                          )}
                        </Button>

                        <button 
                          onClick={() => openEditModal(tractor)}
                          className="p-2.5 hover:bg-earth-primary/10 rounded-xl transition-all text-earth-mut hover:text-earth-primary border border-transparent hover:border-earth-primary/20"
                        >
                           <Wrench size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Tractor Modal */}
      <AddTractorModal
        isOpen={showAddModal}
        onClose={closeModal}
        isEditing={isEditing}
        editingId={editingId}
        formData={newTractor}
        setFormData={setNewTractor}
        isSubmitting={isSubmitting}
        onSubmit={handleCreateTractor}
      />

    </div>
  );
}
