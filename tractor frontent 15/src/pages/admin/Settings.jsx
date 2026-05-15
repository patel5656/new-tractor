import { useState, useEffect } from 'react';
import { Fuel, MapPin, Banknote, Wrench, Settings as SettingsIcon, Save, Info, CheckCircle2, AlertTriangle, ShieldCheck, Trash2, Edit, Search, Plus, X, Calculator, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/format';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { api } from '../../lib/api';

export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    generalInfo, fuelMetrics, zones, serviceRates, maintenanceSettings, systemServices,
    updateGeneral, updateFuelPrice, refreshZones, refreshServices, updateServiceRates, updateService, updateMaintenance, updatePricingMode 
  } = useSettings();

  const tabFromPath = location.pathname.split('/').pop();
  const validTabs = ['pricing', 'fuel', 'zones', 'rates', 'maintenance', 'ussd'];
  const activeTab = validTabs.includes(tabFromPath) ? tabFromPath : 'general';

  const [localGeneral, setLocalGeneral] = useState(generalInfo);
  const [localFuel, setLocalFuel] = useState({ 
    dieselPrice: fuelMetrics.dieselPrice, 
    avgMileage: fuelMetrics.avgMileage 
  });
  const [localPricingMode, setLocalPricingMode] = useState(fuelMetrics.pricingMode || 'ZONE');
  
  // Zones are managed independently from the main Save button to allow CRUD
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneMinDistance, setNewZoneMinDistance] = useState('');
  const [newZoneMaxDistance, setNewZoneMaxDistance] = useState('');
  const [newZoneSurcharge, setNewZoneSurcharge] = useState('');
  const [newZoneStatus, setNewZoneStatus] = useState('ACTIVE');
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [zoneError, setZoneError] = useState('');
  const [zoneSearchTerm, setZoneSearchTerm] = useState('');
  
  const [localRates, setLocalRates] = useState(serviceRates);
  const [localMaintenance, setLocalMaintenance] = useState(maintenanceSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const [fuelHistory, setFuelHistory] = useState([]);
  const [showFuelHistory, setShowFuelHistory] = useState(false);
  const [showFuelConfirm, setShowFuelConfirm] = useState(false);
  const [fuelError, setFuelError] = useState("");

  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editServiceRate, setEditServiceRate] = useState('');
  const [editServiceDate, setEditServiceDate] = useState('');

  // USSD Locations state
  const [ussdLocations, setUssdLocations] = useState([]);
  const [newUssdName, setNewUssdName] = useState('');
  const [newUssdCharge, setNewUssdCharge] = useState('');
  const [newUssdStatus, setNewUssdStatus] = useState(true);
  const [editingUssdId, setEditingUssdId] = useState(null);
  const [ussdError, setUssdError] = useState('');
  const [ussdSearchTerm, setUssdSearchTerm] = useState('');
  const [isUssdLoading, setIsUssdLoading] = useState(false);

  const fetchFuelHistory = async () => {
    try {
      const res = await api.admin.getFuelHistory();
      if (res.success) setFuelHistory(res.data);
    } catch(e) {
      console.error(e);
    }
  };

  const fetchUssdLocations = async () => {
    try {
      setIsUssdLoading(true);
      const res = await api.admin.listUssdLocations();
      if (res.success) setUssdLocations(res.data);
    } catch (e) {
      console.error('Failed to fetch USSD locations:', e);
    } finally {
      setIsUssdLoading(false);
    }
  };

  useEffect(() => {
    if (showFuelHistory) fetchFuelHistory();
  }, [showFuelHistory]);

  useEffect(() => {
    if (activeTab === 'ussd') fetchUssdLocations();
  }, [activeTab]);

  useEffect(() => {
    setLocalFuel({
      dieselPrice: fuelMetrics.dieselPrice,
      avgMileage: fuelMetrics.avgMileage
    });
    setLocalPricingMode(fuelMetrics.pricingMode || 'ZONE');
  }, [fuelMetrics]);

  useEffect(() => {
    if (saveStatus) {
      const timer = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const tabs = [
    { id: 'general', label: 'General Info', icon: SettingsIcon },
    { id: 'pricing', label: 'Pricing Settings', icon: Calculator },
    { id: 'fuel', label: 'Fuel Metrics', icon: Fuel },
    { id: 'zones', label: 'Distance Zones', icon: MapPin },
    { id: 'ussd', label: 'USSD Locations', icon: Zap },
    { id: 'rates', label: 'Service Rates', icon: Banknote },
    { id: 'maintenance', label: 'Maintenance Hub', icon: Wrench },
  ];

  const handleTabChange = (tabId) => {
    navigate(`/admin/settings${tabId === 'general' ? '' : `/${tabId}`}`);
  };

  const handleSave = async () => {
    if (activeTab === 'fuel') {
      const price = parseFloat(localFuel.dieselPrice);
      if (isNaN(price) || price <= 0 || price > 5000) {
        setFuelError(`Diesel price must be greater than 0 and ≤ ${formatCurrency(5000)}/L.`);
        return;
      }
      setFuelError("");
      if (!showFuelConfirm) {
        setShowFuelConfirm(true);
        return;
      }
      setShowFuelConfirm(false);
    }

    setIsSaving(true);
    try {
      if (activeTab === 'general') await updateGeneral(localGeneral);
      if (activeTab === 'pricing') await updatePricingMode(localPricingMode);
      if (activeTab === 'fuel') await updateFuelPrice(localFuel.dieselPrice, localFuel.avgMileage, localPricingMode);
      if (activeTab === 'rates') await updateServiceRates(localRates);
      if (activeTab === 'maintenance') await updateMaintenance(localMaintenance);
      
      setSaveStatus('success');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveZone = async () => {
    if (newZoneMinDistance === '' || newZoneSurcharge === '') return;
    try {
      const payload = {
        minDistance: parseFloat(newZoneMinDistance),
        maxDistance: newZoneMaxDistance === '' ? null : parseFloat(newZoneMaxDistance),
        surchargePerHectare: parseFloat(newZoneSurcharge),
        status: newZoneStatus
      };

      if (editingZoneId !== 'new' && editingZoneId !== null) {
        const res = await api.admin.updateZone(editingZoneId, payload);
        if (res.success) {
          await refreshZones();
          setNewZoneMinDistance('');
          setNewZoneMaxDistance('');
          setNewZoneSurcharge('');
          setNewZoneStatus('ACTIVE');
          setEditingZoneId(null);
          setZoneError('');
        } else {
          setZoneError(res.message || 'Failed to update zone');
        }
      } else {
        const res = await api.admin.createZone(payload);
        if (res.success) {
          await refreshZones();
          setNewZoneMinDistance('');
          setNewZoneMaxDistance('');
          setNewZoneSurcharge('');
          setNewZoneStatus('ACTIVE');
          setEditingZoneId(null);
          setZoneError('');
        } else {
          setZoneError(res.message || 'Failed to create zone');
        }
      }
    } catch(e) {
      setZoneError(e.message || 'Zone save error');
    }
  };

  const handleEditClick = (zone) => {
    setNewZoneMinDistance(zone.minDistance.toString());
    setNewZoneMaxDistance(zone.maxDistance === null ? '' : zone.maxDistance.toString());
    setNewZoneSurcharge(zone.surchargePerHectare.toString());
    setNewZoneStatus(zone.status || 'ACTIVE');
    setZoneError('');
    setEditingZoneId(zone.id);
  };

  const handleCancelEdit = () => {
    setNewZoneMinDistance('');
    setNewZoneMaxDistance('');
    setNewZoneSurcharge('');
    setNewZoneStatus('ACTIVE');
    setZoneError('');
    setEditingZoneId(null);
  };

  const handleDeleteZone = async (id) => {
    try {
      const res = await api.admin.deleteZone(id);
      if (res.success) {
        refreshZones();
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleSaveUssd = async () => {
    if (newUssdName.trim() === '' || newUssdCharge === '') return;
    try {
      const payload = {
        name: newUssdName.trim(),
        chargePerHectare: parseFloat(newUssdCharge),
        isActive: newUssdStatus
      };

      let res;
      if (editingUssdId !== 'new' && editingUssdId !== null) {
        res = await api.admin.updateUssdLocation(editingUssdId, payload);
      } else {
        res = await api.admin.createUssdLocation(payload);
      }

      if (res.success) {
        await fetchUssdLocations();
        setNewUssdName('');
        setNewUssdCharge('');
        setNewUssdStatus(true);
        setEditingUssdId(null);
        setUssdError('');
      } else {
        setUssdError(res.message || 'Failed to save USSD location');
      }
    } catch (e) {
      setUssdError(e.message || 'USSD Location error');
    }
  };

  const handleEditUssdClick = (loc) => {
    setNewUssdName(loc.name);
    setNewUssdCharge(loc.chargePerHectare.toString());
    setNewUssdStatus(loc.isActive);
    setUssdError('');
    setEditingUssdId(loc.id);
  };

  const handleCancelUssdEdit = () => {
    setNewUssdName('');
    setNewUssdCharge('');
    setNewUssdStatus(true);
    setUssdError('');
    setEditingUssdId(null);
  };

  const handleDeleteUssd = async (id) => {
    if (!window.confirm('Are you sure you want to delete this USSD location?')) return;
    try {
      const res = await api.admin.deleteUssdLocation(id);
      if (res.success) fetchUssdLocations();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredZones = zones.filter(z => 
    z.minDistance?.toString().includes(zoneSearchTerm) ||
    z.maxDistance?.toString().includes(zoneSearchTerm) ||
    z.surchargePerHectare?.toString().includes(zoneSearchTerm)
  );

  const filteredUssdLocations = ussdLocations.filter(loc => 
    loc.name.toLowerCase().includes(ussdSearchTerm.toLowerCase()) ||
    loc.chargePerHectare.toString().includes(ussdSearchTerm)
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-8rem)]">
      
      {/* Settings Navigation */}
      <div className="w-full lg:w-64 shrink-0 space-y-2">
        <div className="px-5 py-2 mb-2">
          <p className="text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">System Configuration</p>
        </div>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all text-left group",
              activeTab === tab.id 
                ? "bg-earth-card-alt text-earth-brown shadow-xl border border-earth-dark/15/50 pointer-events-none" 
                : "text-earth-mut hover:bg-earth-card-alt/40 hover:text-earth-brown border border-transparent"
            )}
          >
            <div className={cn("p-2 rounded-xl border shadow-inner transition-all duration-300", activeTab === tab.id ? "bg-earth-primary/10 text-earth-primary border-earth-primary/30 scale-110" : "bg-earth-card border-earth-dark/10 text-earth-mut group-hover:border-earth-dark/15 group-hover:text-earth-sub")}>
               <tab.icon size={16} />
            </div>
            {tab.label}
          </button>
        ))}
        
        <div className="mt-8 p-6 bg-earth-card/50 border border-dashed border-earth-dark/10 rounded-3xl">
           <div className="flex items-center gap-3 mb-3 text-primary-500/50">
             <ShieldCheck size={20} />
             <span className="text-[10px] font-black uppercase tracking-widest leading-none">Global Sync Active</span>
           </div>
           <p className="text-[9px] text-earth-mut font-bold uppercase tracking-widest leading-relaxed">All node updates are broadcasted to the farmer network in real-time.</p>
        </div>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 space-y-6">
        
        <Card className="shadow-2xl border-earth-dark/15/50 bg-earth-card-alt rounded-[2rem] overflow-hidden">
          <CardHeader className="border-b border-earth-dark/15/50 bg-earth-card/50 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl md:text-2xl font-black text-earth-brown uppercase tracking-tight italic flex items-center gap-3">
                   {tabs.find(t => t.id === activeTab)?.label}
                   <div className="w-2 h-2 rounded-full bg-earth-primary animate-pulse"></div>
                </CardTitle>
                <CardDescription className="text-[10px] md:text-xs uppercase font-bold tracking-widest text-earth-mut mt-2">
                  {activeTab === 'general' && "Manage base hub identity and administrative touchpoints."}
                  {activeTab === 'fuel' && "Real-time diesel cost injection for logistics overhead mapping."}
                  {activeTab === 'zones' && "Configure distance-based surcharges and operational radii."}
                  {activeTab === 'rates' && "Modify unit economics for standard tractor operations."}
                  {activeTab === 'maintenance' && "Threshold triggers for preventive fleet service protocols."}
                </CardDescription>
              </div>
              {activeTab !== 'zones' && (
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "gap-2 font-black uppercase tracking-widest h-12 px-8 rounded-xl border-none transition-all shadow-lg",
                  saveStatus === 'success' 
                    ? "bg-accent text-white scale-105" 
                    : "bg-accent hover:opacity-90 text-white"
                )}
              >
                {isSaving ? "Syncing..." : saveStatus === 'success' ? <><CheckCircle2 size={18} /> Synced</> : <><Save size={18} /> Update Node</>}
              </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-10">
            
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-earth-sub pl-1">Hub Name</label>
                      <Input 
                        value={localGeneral.hubName} 
                        onChange={(e) => setLocalGeneral({...localGeneral, hubName: e.target.value})}
                        className="bg-earth-card border-earth-dark/15 font-bold text-earth-brown h-14 rounded-2xl focus:border-earth-primary shadow-inner" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-earth-sub pl-1">Main Location</label>
                      <Input 
                        value={localGeneral.hubLocation} 
                        onChange={(e) => setLocalGeneral({...localGeneral, hubLocation: e.target.value})}
                        className="bg-earth-card border-earth-dark/15 font-bold text-earth-brown h-14 rounded-2xl focus:border-earth-primary shadow-inner" 
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                     <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-earth-sub pl-1">Support Email</label>
                      <Input 
                        type="email"
                        value={localGeneral.supportEmail} 
                        onChange={(e) => setLocalGeneral({...localGeneral, supportEmail: e.target.value})}
                        className="bg-earth-card border-earth-dark/15 font-bold text-earth-brown h-14 rounded-2xl focus:border-earth-primary shadow-inner" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-earth-sub pl-1">Ops Email Address</label>
                      <Input 
                        type="email"
                        value={localGeneral.contactEmail} 
                        onChange={(e) => setLocalGeneral({...localGeneral, contactEmail: e.target.value})}
                        className="bg-earth-card border-earth-dark/15 font-bold text-earth-brown h-14 rounded-2xl focus:border-earth-primary shadow-inner" 
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-earth-dark/10 pt-8" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-earth-sub pl-1 flex items-center gap-2"><MapPin size={12} className="text-earth-primary" /> Hub Base Latitude</label>
                    <Input 
                      type="number"
                      step="any"
                      value={localGeneral.baseLatitude} 
                      onChange={(e) => setLocalGeneral({...localGeneral, baseLatitude: parseFloat(e.target.value) || 0})}
                      className="bg-earth-card border-earth-dark/15 font-black text-earth-brown h-14 rounded-2xl focus:border-earth-primary shadow-inner" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-earth-sub pl-1 flex items-center gap-2"><MapPin size={12} className="text-earth-primary" /> Hub Base Longitude</label>
                    <Input 
                      type="number"
                      step="any"
                      value={localGeneral.baseLongitude} 
                      onChange={(e) => setLocalGeneral({...localGeneral, baseLongitude: parseFloat(e.target.value) || 0})}
                      className="bg-earth-card border-earth-dark/15 font-black text-earth-brown h-14 rounded-2xl focus:border-earth-primary shadow-inner" 
                    />
                  </div>
                </div>
                <div className="p-4 bg-earth-primary/5 border border-earth-primary/20 rounded-2xl flex gap-3">
                  <Info size={16} className="text-earth-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-earth-brown uppercase tracking-widest mb-1">How Distance Pricing Works</p>
                    <p className="text-[9px] font-bold text-earth-sub uppercase tracking-wider leading-relaxed">
                      These Hub coordinates are used to calculate Haversine distance to each farmer (× 1.3 terrain factor = Road Distance). The road distance is then matched against <strong>Distance Zones</strong> (Track A Tiered Pricing) to determine the surcharge per hectare.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Settings */}
            {activeTab === 'pricing' && (
              <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-lg font-black text-earth-brown uppercase tracking-tight italic flex items-center gap-2">
                     Global Pricing Rules
                     <div className="w-1.5 h-1.5 rounded-full bg-earth-primary"></div>
                  </h3>
                  <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-1">Configure how the system calculates logistical surcharges.</p>
                </div>

                <div className="p-6 bg-earth-card border-2 border-earth-primary/20 rounded-3xl shadow-xl">
                  <h4 className="text-[11px] font-black text-earth-brown uppercase tracking-[0.2em] mb-4">Active Pricing Mode</h4>
                  <div className="flex rounded-xl overflow-hidden border border-earth-dark/10">
                    <button
                      onClick={() => setLocalPricingMode('ZONE')}
                      className={cn(
                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        localPricingMode === 'ZONE'
                          ? "bg-earth-primary text-white shadow-inner"
                          : "bg-earth-main text-earth-mut hover:bg-earth-card"
                      )}
                    >
                      Zone Based
                    </button>
                    <button
                      onClick={() => setLocalPricingMode('FUEL')}
                      className={cn(
                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        localPricingMode === 'FUEL'
                          ? "bg-blue-500 text-white shadow-inner"
                          : "bg-earth-main text-earth-mut hover:bg-earth-card"
                      )}
                    >
                      Fuel Based
                    </button>
                  </div>
                  <p className="text-[8px] font-bold text-earth-mut uppercase tracking-wider mt-3 leading-relaxed">
                    {localPricingMode === 'ZONE' 
                      ? "Distance surcharges are calculated from predefined distance zones (zone tier × hectares)." 
                      : "Distance surcharges are calculated dynamically via the fuel multiplier formula (diesel ÷ 800 × 750 × distance)."}
                  </p>
                </div>
              </div>
            )}

            {/* Fuel Settings */}
            {activeTab === 'fuel' && (() => {
               const parsedPrice = parseFloat(localFuel.dieselPrice) || 0;
               const fuelMultiplier = parsedPrice / 800;
               const adjustedKmRate = 750 * fuelMultiplier;
               
               const exampleDistance = 22;
               const oldSimulatedCharge = (fuelMetrics.dieselPrice / 800) * 750 * exampleDistance;
               const newSimulatedCharge = adjustedKmRate * exampleDistance;

               return (
              <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-earth-brown uppercase tracking-tight italic flex items-center gap-2">
                       Dynamic Fuel Config
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    </h3>
                    <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-1">Controls directly affecting per-km operational surcharges.</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setShowFuelHistory(true)}
                    className="border-earth-dark/15 text-earth-brown uppercase tracking-widest text-[10px] h-9 px-4 rounded-xl font-black"
                  >
                    View History
                  </Button>
                </div>

                {fuelError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2">
                    <AlertTriangle size={16} /> {fuelError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-earth-sub pl-1">Current Diesel Price (₦/litre)</label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-earth-primary font-black">₦</div>
                         <Input 
                          type="number" 
                          value={localFuel.dieselPrice} 
                          onChange={(e) => setLocalFuel({...localFuel, dieselPrice: e.target.value})}
                          className="pl-10 bg-earth-card border-earth-dark/15 font-black text-2xl text-earth-brown h-16 rounded-2xl focus:border-earth-primary shadow-inner" 
                        />
                      </div>
                    </div>
                    
                    <div className="p-5 bg-earth-card/50 border border-earth-dark/15/50 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center bg-earth-main p-3 rounded-xl border border-earth-dark/5">
                         <span className="text-[10px] font-black text-earth-sub uppercase tracking-widest">Fixed Baseline Price</span>
                         <span className="text-xs font-black text-earth-mut">{formatCurrency(800)} /L</span>
                      </div>
                      <div className="flex justify-between items-center bg-earth-main p-3 rounded-xl border border-earth-dark/5">
                         <span className="text-[10px] font-black text-earth-sub uppercase tracking-widest">Fixed Base KM Rate</span>
                         <span className="text-xs font-black text-earth-mut">{formatCurrency(750)} /KM</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Info size={100} className="text-blue-500" />
                       </div>
                       <h4 className="text-[11px] font-black text-earth-brown uppercase tracking-widest mb-4">Live Multiplier Logic</h4>
                       <div className="space-y-5 relative z-10">
                          <div>
                            <p className="text-[9px] uppercase font-black tracking-widest text-earth-sub mb-1">Calculated Multiplier</p>
                            <p className="text-xl md:text-2xl font-black text-blue-500">{fuelMultiplier.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase font-black tracking-widest text-earth-sub mb-1">Adjusted Base Rate</p>
                            <p className="text-xl md:text-2xl font-black text-earth-primary flex flex-wrap items-baseline gap-1">
                              {formatCurrency(adjustedKmRate.toFixed(2))} 
                              <span className="text-[10px] md:text-sm font-bold text-earth-mut">/KM</span>
                            </p>
                          </div>
                       </div>
                     </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-earth-dark/10">
                   <h4 className="text-[11px] font-black text-earth-brown uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Search size={14} className="text-earth-primary" />
                     Sample Impact Preview (22 KM)
                   </h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-4 bg-earth-card border border-earth-dark/10 rounded-2xl flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center opacity-60">
                       <span className="text-[10px] font-black text-earth-sub uppercase tracking-widest">Baseline Charge</span>
                       <span className="text-sm font-black text-earth-mut">{formatCurrency(750 * 22)}</span>
                     </div>
                     <div className="p-4 bg-earth-main border border-earth-primary/30 rounded-2xl flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center shadow-lg shadow-earth-primary/10">
                       <span className="text-[10px] font-black text-earth-primary uppercase tracking-widest">Adjusted Charge</span>
                       <span className="text-sm font-black text-earth-brown">{formatCurrency(newSimulatedCharge.toFixed(2))}</span>
                     </div>
                   </div>
                </div>

                {/* Confirm Dialog Overlay */}
                {showFuelConfirm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-earth-brown/80 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-earth-card p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6">
                      <div className="flex justify-center text-earth-primary">
                        <ShieldCheck size={40} />
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-black text-earth-brown uppercase tracking-widest mb-2">Confirm Fuel Update</h3>
                        <p className="text-sm font-bold text-earth-sub">Changing the diesel price will automatically adjust all future per-KM rates to {formatCurrency(adjustedKmRate.toFixed(2))}. Are you sure?</p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setShowFuelConfirm(false)} className="flex-1 border-earth-dark/15 h-12 rounded-xl text-xs uppercase font-black text-earth-mut">Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-earth-primary hover:bg-earth-primary-hover text-white h-12 rounded-xl text-xs uppercase font-black">Deploy Config</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Modal */}
                {showFuelHistory && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-earth-brown/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-earth-card p-6 md:p-8 rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col relative">
                      <button onClick={() => setShowFuelHistory(false)} className="absolute top-6 right-6 text-earth-sub hover:text-earth-brown">
                        <X size={20} />
                      </button>
                      <h3 className="text-lg font-black text-earth-brown uppercase tracking-widest mb-6">Adjustment Audit Logs</h3>
                      <div className="overflow-y-auto flex-1 custom-scrollbar min-h-[300px]">
                        {fuelHistory.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-earth-mut py-10 opacity-50">
                            <Info size={32} className="mb-2" />
                            <p className="text-xs uppercase font-black tracking-widest">No history recorded yet</p>
                          </div>
                        ) : (
                           <div className="space-y-3">
                             {fuelHistory.map((log) => (
                               <div key={log.id} className="p-4 rounded-2xl bg-earth-main border border-earth-dark/5 flex items-center justify-between">
                                 <div>
                                   <p className="text-[10px] font-black text-earth-mut uppercase mb-1">
                                      Modifier ID: #{log.adminId} &bull; {new Date(log.timestamp).toLocaleString()}
                                   </p>
                                   <div className="flex items-center gap-2">
                                     <span className="text-xs font-black text-earth-sub line-through opacity-70">{formatCurrency(log.oldPrice)}</span>
                                     <span className="text-earth-primary">&rarr;</span>
                                     <span className="text-sm font-black text-earth-brown">{formatCurrency(log.newPrice)}</span>
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              );
            })()}

            {/* Distance Zones Settings */}
            {activeTab === 'zones' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-earth-brown uppercase tracking-tight italic flex items-center gap-2">
                       Active Fleet Radius
                       <div className="w-1.5 h-1.5 rounded-full bg-earth-primary"></div>
                    </h3>
                    <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-1">Configuring distance-based surcharges for logistical overhead.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-mut" size={14} />
                      <Input 
                        value={zoneSearchTerm}
                        onChange={(e) => setZoneSearchTerm(e.target.value)}
                        placeholder="Search zones..." 
                        className="pl-9 bg-earth-card border-earth-dark/10 rounded-xl h-11 w-full focus:ring-0 focus:border-earth-primary shadow-inner text-xs font-bold text-earth-brown"
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        handleCancelEdit();
                        setEditingZoneId('new'); 
                      }}
                      className="bg-earth-brown text-white hover:bg-earth-brown/90 px-5 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shrink-0 shadow-lg"
                    >
                      <Plus size={16} /> Add Zone
                    </Button>
                  </div>
                </div>

                {/* Global Add Form - Only shows for NEW entries */}
                {editingZoneId === 'new' && (
                  <div className="p-6 bg-earth-card border-2 border-earth-primary/20 rounded-3xl shadow-xl space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black text-earth-brown uppercase tracking-[0.2em]">{editingZoneId === 'new' ? 'Create New Distance Tier' : 'Modify Existing Tier'}</h4>
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-earth-mut hover:text-earth-brown">
                        <X size={18} />
                      </Button>
                    </div>

                    {zoneError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 animate-shake">
                        <AlertTriangle size={16} /> {zoneError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-earth-sub pl-1">Min Distance (KM)</label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={newZoneMinDistance} 
                            onChange={(e) => setNewZoneMinDistance(e.target.value)}
                            className="bg-earth-main border-earth-dark/10 font-black text-earth-brown h-12 rounded-xl focus:border-earth-primary shadow-inner" 
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-earth-mut uppercase">km</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-earth-sub pl-1">Max Distance (KM)</label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="Leave empty for unlimited +"
                            value={newZoneMaxDistance} 
                            onChange={(e) => setNewZoneMaxDistance(e.target.value)}
                            className="bg-earth-main border-earth-dark/10 font-black text-earth-brown h-12 rounded-xl focus:border-earth-primary shadow-inner" 
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-earth-mut uppercase">km</div>
                        </div>
                        <p className="text-[8px] text-earth-mut font-bold uppercase pl-1">* Leave empty for "41+" (Open-ended)</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-earth-sub pl-1">Surcharge Per Ha</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-earth-primary font-black">₦</div>
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={newZoneSurcharge} 
                            onChange={(e) => setNewZoneSurcharge(e.target.value)}
                            className="pl-8 bg-earth-main border-earth-dark/10 font-black text-earth-brown h-12 rounded-xl focus:border-earth-primary shadow-inner" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-earth-sub pl-1">Status</label>
                        <select 
                          value={newZoneStatus} 
                          onChange={(e) => setNewZoneStatus(e.target.value)}
                          className="w-full bg-earth-main border border-earth-dark/10 font-black text-earth-brown h-12 rounded-xl focus:border-earth-primary shadow-inner px-4 text-xs appearance-none cursor-pointer"
                        >
                          <option value="ACTIVE" className="bg-earth-card">ACTIVE</option>
                          <option value="INACTIVE" className="bg-earth-card">INACTIVE</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button 
                        variant="outline" 
                        onClick={handleCancelEdit}
                        className="bg-transparent border-earth-dark/15 text-earth-brown uppercase font-black tracking-widest rounded-xl h-11 px-6 text-[10px]"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveZone} 
                        className="bg-accent hover:opacity-90 text-white uppercase font-black tracking-widest rounded-xl h-11 px-8 text-[10px] shadow-lg shadow-accent/20"
                      >
                        {editingZoneId === 'new' ? 'Confirm Addition' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Desktop View Table */}
                <div className="hidden md:block overflow-hidden bg-earth-card/30 border border-earth-dark/10 rounded-[2rem] shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-earth-card/50 border-b border-earth-dark/10">
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">Distance Range</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">Surcharge Per Ha</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-earth-dark/5">
                      {filteredZones.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center">
                            <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">
                               {zones.length === 0 ? "No radius tiers configured." : "No matching tiers found."}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredZones.map((z) => (
                          editingZoneId === z.id ? (
                            <tr key={z.id} className="bg-earth-primary/5">
                              <td colSpan={5} className="p-6">
                                <div className="space-y-6 animate-in fade-in zoom-in duration-200">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[11px] font-black text-earth-brown uppercase tracking-widest">Editing Tier #{z.id}</h4>
                                    <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-earth-mut">
                                      <X size={18} />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                      <label className="text-[9px] font-black text-earth-sub uppercase">Min KM</label>
                                      <Input type="number" value={newZoneMinDistance} onChange={(e) => setNewZoneMinDistance(e.target.value)} className="h-10 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[9px] font-black text-earth-sub uppercase">Max KM</label>
                                      <Input type="number" value={newZoneMaxDistance} onChange={(e) => setNewZoneMaxDistance(e.target.value)} className="h-10 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[9px] font-black text-earth-sub uppercase">NGN Per Ha</label>
                                      <Input type="number" value={newZoneSurcharge} onChange={(e) => setNewZoneSurcharge(e.target.value)} className="h-10 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[9px] font-black text-earth-sub uppercase">Status</label>
                                      <select value={newZoneStatus} onChange={(e) => setNewZoneStatus(e.target.value)} className="w-full h-10 px-3 bg-earth-main border border-earth-dark/10 rounded-xl text-xs font-black appearance-none">
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-3 mt-4">
                                    <Button variant="outline" size="sm" onClick={handleCancelEdit} className="h-9 px-4 text-[10px] uppercase font-black">Cancel</Button>
                                    <Button size="sm" onClick={handleSaveZone} className="h-9 px-6 text-[10px] uppercase font-black bg-accent text-white">Save Changes</Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={z.id} className={cn(
                              "group hover:bg-earth-primary/5 transition-colors",
                              editingZoneId === z.id && "bg-earth-primary/10"
                            )}>
                              <td className="px-6 py-5 text-xs font-black text-earth-mut">#{z.id}</td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-earth-main flex items-center justify-center text-earth-primary shadow-sm border border-earth-dark/5">
                                    <MapPin size={14} />
                                  </div>
                                  <span className="text-sm font-black text-earth-brown">
                                    {z.minDistance} — {z.maxDistance === null ? `${z.minDistance}+` : z.maxDistance} KM
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className="text-sm font-black text-earth-primary">{formatCurrency(z.surchargePerHectare)}</span>
                              </td>
                              <td className="px-6 py-5">
                                <div className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                  z.status === 'ACTIVE' 
                                    ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                                    : "bg-red-500/10 text-red-600 border border-red-500/20 opacity-60"
                                )}>
                                  <div className={cn("w-1 h-1 rounded-full", z.status === 'ACTIVE' ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                  {z.status}
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => handleEditClick(z)} 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-earth-sub hover:bg-earth-primary/20 hover:text-earth-brown transition-all"
                                    title="Edit Tier"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if(z.status === 'ACTIVE') {
                                        handleDeleteZone(z.id);
                                      } else {
                                        try {
                                          const res = await api.admin.updateZone(z.id, { status: 'ACTIVE' });
                                          if (res.success) refreshZones();
                                        } catch(e) { console.error('Failed to reactivate zone'); }
                                      }
                                    }} 
                                    className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                      z.status === 'ACTIVE' 
                                        ? "text-red-400 hover:bg-red-400/10" 
                                        : "text-green-500 hover:bg-green-500/10"
                                    )}
                                    title={z.status === 'ACTIVE' ? "Deactivate Tier" : "Reactivate Tier"}
                                  >
                                    {z.status === 'ACTIVE' ? <Trash2 size={16} /> : <CheckCircle2 size={16} />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {filteredZones.length === 0 ? (
                    <div className="py-12 text-center bg-earth-card/30 rounded-3xl border border-dashed border-earth-dark/10">
                       <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest">No tiers found.</p>
                    </div>
                  ) : (
                    filteredZones.map((z) => (
                      editingZoneId === z.id ? (
                        <div key={z.id} className="p-6 rounded-[2rem] bg-earth-primary/5 border-2 border-earth-primary/20 shadow-xl space-y-6 animate-in fade-in zoom-in duration-200">
                           <div className="flex items-center justify-between">
                             <h4 className="text-[11px] font-black text-earth-brown uppercase tracking-widest">Editing Tier #{z.id}</h4>
                             <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-earth-mut"><X size={18} /></Button>
                           </div>
                           <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-earth-sub">Distance Range (Min - Max)</label>
                                <div className="grid grid-cols-2 gap-3">
                                  <Input type="number" placeholder="Min" value={newZoneMinDistance} onChange={(e) => setNewZoneMinDistance(e.target.value)} className="h-12 text-sm font-black" />
                                  <Input type="number" placeholder="Max" value={newZoneMaxDistance} onChange={(e) => setNewZoneMaxDistance(e.target.value)} className="h-12 text-sm font-black" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-earth-sub">Surcharge Per Ha</label>
                                <Input type="number" placeholder="0" value={newZoneSurcharge} onChange={(e) => setNewZoneSurcharge(e.target.value)} className="h-12 text-sm font-black" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-earth-sub">Status</label>
                                <select value={newZoneStatus} onChange={(e) => setNewZoneStatus(e.target.value)} className="w-full h-12 px-4 bg-earth-main border border-earth-dark/10 rounded-xl text-xs font-black appearance-none">
                                  <option value="ACTIVE">ACTIVE</option>
                                  <option value="INACTIVE">INACTIVE</option>
                                </select>
                              </div>
                           </div>
                           <div className="flex gap-3 pt-2">
                              <Button variant="outline" onClick={handleCancelEdit} className="flex-1 h-12 text-[10px] uppercase font-black rounded-xl">Cancel</Button>
                              <Button onClick={handleSaveZone} className="flex-1 h-12 text-[10px] uppercase font-black rounded-xl bg-accent text-white">Save Changes</Button>
                           </div>
                        </div>
                      ) : (
                        <div key={z.id} className={cn(
                          "p-5 rounded-[2rem] border transition-all space-y-4",
                          editingZoneId === z.id 
                            ? "bg-earth-primary/5 border-earth-primary/30 shadow-lg" 
                            : "bg-white border-earth-dark/15 shadow-sm"
                        )}>
                          <div className="flex justify-between items-start">
                             <div className="flex flex-col gap-1">
                               <span className="text-[9px] font-black text-earth-mut uppercase tracking-widest bg-earth-main/10 px-2 py-0.5 rounded-lg border border-earth-dark/10 w-fit">ID-#{z.id}</span>
                               <div className="flex items-center gap-2 mt-1">
                                  <div className="w-8 h-8 rounded-lg bg-earth-main flex items-center justify-center text-earth-primary border border-earth-dark/5">
                                    <MapPin size={14} />
                                  </div>
                                  <span className="text-sm font-black text-earth-brown">
                                    {z.minDistance} — {z.maxDistance === null ? `${z.minDistance}+` : z.maxDistance} KM
                                  </span>
                               </div>
                             </div>
                             <div className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                  z.status === 'ACTIVE' 
                                    ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                                    : "bg-red-500/10 text-red-600 border border-red-500/20 opacity-60"
                                )}>
                                  <div className={cn("w-1 h-1 rounded-full", z.status === 'ACTIVE' ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                  {z.status}
                             </div>
                          </div>
  
                          <div className="flex items-center justify-between pt-4 border-t border-earth-dark/10">
                             <div className="flex flex-col">
                               <span className="text-[8px] font-black text-earth-mut uppercase tracking-widest mb-1">Surcharge Tier</span>
                               <span className="text-lg font-black text-earth-primary">{formatCurrency(z.surchargePerHectare)} <span className="text-[10px] text-earth-mut">/HA</span></span>
                             </div>
                             <div className="flex items-center gap-2">
                               <Button 
                                 size="icon" 
                                 onClick={() => handleEditClick(z)}
                                 className="h-10 w-10 bg-earth-main text-earth-sub border border-earth-dark/15 rounded-xl hover:bg-earth-primary/10 hover:text-earth-primary transition-all"
                               >
                                  <Edit size={16} />
                               </Button>
                               <Button 
                                 size="icon"
                                 onClick={async () => {
                                   if(z.status === 'ACTIVE') handleDeleteZone(z.id);
                                   else {
                                     try {
                                       const res = await api.admin.updateZone(z.id, { status: 'ACTIVE' });
                                       if (res.success) refreshZones();
                                     } catch(e) {}
                                   }
                                 }}
                                 className={cn(
                                   "h-10 w-10 rounded-xl transition-all border",
                                   z.status === 'ACTIVE' 
                                     ? "bg-red-500/5 text-red-500 border-red-500/20" 
                                   : "bg-green-500/5 text-green-500 border-green-500/20"
                                 )}
                               >
                                  {z.status === 'ACTIVE' ? <Trash2 size={16} /> : <CheckCircle2 size={16} />}
                               </Button>
                             </div>
                          </div>
                        </div>
                      )
                    ))
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 p-5 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex items-start gap-4">
                    <Info size={18} className="text-blue-500 mt-1 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-earth-brown uppercase tracking-widest mb-1">Dynamic Mapping Logic</p>
                      <p className="text-[9px] font-bold text-earth-mut uppercase tracking-wider leading-relaxed">
                        The system automatically calculates road distance (Air × 1.3) and retrieves the corresponding surcharge. 
                        <strong>Inclusive lower bound:</strong> distance ≥ min. <strong>Exclusive upper bound:</strong> distance &lt; max.
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 p-5 bg-earth-primary/5 rounded-3xl border border-earth-primary/10 flex items-start gap-4">
                    <ShieldCheck size={18} className="text-earth-primary mt-1 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-earth-brown uppercase tracking-widest mb-1">Operational Integrity</p>
                      <p className="text-[9px] font-bold text-earth-mut uppercase tracking-wider leading-relaxed">
                        Validation prevents overlaps or gaps between distance tiers. At least one open-ended zone (max = NULL) 
                        should exist for out-of-boundary range coverage.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USSD Locations Settings */}
            {activeTab === 'ussd' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-earth-brown uppercase tracking-tight italic flex items-center gap-2">
                       USSD Village Radii
                       <Zap size={18} className="text-earth-primary" />
                    </h3>
                    <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-1">Manage static locations and fixed pricing for USSD bookings.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-mut" size={14} />
                      <Input 
                        value={ussdSearchTerm}
                        onChange={(e) => setUssdSearchTerm(e.target.value)}
                        placeholder="Search villages..." 
                        className="pl-9 bg-earth-card border-earth-dark/10 rounded-xl h-11 w-full focus:ring-0 focus:border-earth-primary shadow-inner text-xs font-bold text-earth-brown"
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        handleCancelUssdEdit();
                        setEditingUssdId('new'); 
                      }}
                      className="bg-earth-brown text-white hover:bg-earth-brown/90 px-5 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shrink-0 shadow-lg"
                    >
                      <Plus size={16} /> Add Location
                    </Button>
                  </div>
                </div>

                {editingUssdId === 'new' && (
                  <div className="p-6 bg-earth-card border-2 border-earth-primary/20 rounded-3xl shadow-xl space-y-6 animate-in fade-in zoom-in duration-300 text-left">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black text-earth-brown uppercase tracking-[0.2em]">Register New USSD Village</h4>
                      <Button variant="ghost" size="sm" onClick={handleCancelUssdEdit} className="text-earth-mut hover:text-earth-brown">
                        <X size={18} />
                      </Button>
                    </div>

                    {ussdError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2">
                        <AlertTriangle size={16} /> {ussdError}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-earth-sub pl-1">Village Name</label>
                        <Input 
                          placeholder="e.g. Igarra"
                          value={newUssdName} 
                          onChange={(e) => setNewUssdName(e.target.value)}
                          className="bg-earth-main border-earth-dark/10 font-black text-earth-brown h-12 rounded-xl focus:border-earth-primary shadow-inner" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-earth-sub pl-1">Charge Per Hectare</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-earth-primary font-black">₦</div>
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={newUssdCharge} 
                            onChange={(e) => setNewUssdCharge(e.target.value)}
                            className="pl-8 bg-earth-main border-earth-dark/10 font-black text-earth-brown h-12 rounded-xl focus:border-earth-primary shadow-inner" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-earth-sub pl-1">Initial Status</label>
                        <select 
                          value={newUssdStatus ? 'true' : 'false'} 
                          onChange={(e) => setNewUssdStatus(e.target.value === 'true')}
                          className="w-full bg-earth-main border border-earth-dark/10 font-black text-earth-brown h-12 rounded-xl focus:border-earth-primary shadow-inner px-4 text-xs appearance-none cursor-pointer"
                        >
                          <option value="true">ACTIVE</option>
                          <option value="false">INACTIVE</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button 
                        variant="outline" 
                        onClick={handleCancelUssdEdit}
                        className="bg-transparent border-earth-dark/15 text-earth-brown uppercase font-black tracking-widest rounded-xl h-11 px-6 text-[10px]"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveUssd} 
                        className="bg-accent hover:opacity-90 text-white uppercase font-black tracking-widest rounded-xl h-11 px-8 text-[10px] shadow-lg shadow-accent/20"
                      >
                        Confirm Entry
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-earth-card border border-earth-dark/10 rounded-3xl overflow-hidden shadow-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-earth-dark/10 bg-earth-main/50">
                        <th className="px-6 py-4 text-[10px] font-black text-earth-sub uppercase tracking-widest italic">ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-sub uppercase tracking-widest italic">Village Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-sub uppercase tracking-widest italic">Charge / Ha</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-sub uppercase tracking-widest italic">Status</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-earth-sub uppercase tracking-widest italic">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isUssdLoading ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-earth-mut font-black uppercase text-[10px] tracking-widest animate-pulse italic">
                            Synchronizing Village Ledger...
                          </td>
                        </tr>
                      ) : filteredUssdLocations.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-earth-mut font-black uppercase text-[10px] tracking-widest italic opacity-50 border-t border-earth-dark/10">
                            Node Activity Null &bull; No locations found.
                          </td>
                        </tr>
                      ) : (
                        filteredUssdLocations.map((loc) => (
                          <tr key={loc.id} className={cn(
                            "group hover:bg-earth-primary/5 transition-colors border-t border-earth-dark/10",
                            editingUssdId === loc.id && "bg-earth-primary/10"
                          )}>
                            <td className="px-6 py-5 text-xs font-black text-earth-mut">#{loc.id}</td>
                            <td className="px-6 py-5">
                              {editingUssdId === loc.id ? (
                                <Input 
                                  value={newUssdName} 
                                  onChange={(e) => setNewUssdName(e.target.value)} 
                                  className="h-9 text-xs font-bold bg-white" 
                                />
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-earth-main flex items-center justify-center text-earth-primary shadow-sm border border-earth-dark/5">
                                    <Zap size={14} />
                                  </div>
                                  <span className="text-sm font-black text-earth-brown">{loc.name}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              {editingUssdId === loc.id ? (
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-earth-primary font-black text-[10px]">₦</div>
                                  <Input 
                                    type="number" 
                                    value={newUssdCharge} 
                                    onChange={(e) => setNewUssdCharge(e.target.value)} 
                                    className="pl-6 h-9 text-xs font-bold bg-white" 
                                  />
                                </div>
                              ) : (
                                <span className="text-sm font-black text-earth-primary">{formatCurrency(loc.chargePerHectare)}</span>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              <button 
                                onClick={async () => {
                                  try {
                                    const res = await api.admin.updateUssdLocation(loc.id, { isActive: !loc.isActive });
                                    if (res.success) fetchUssdLocations();
                                    else {
                                      setUssdError(res.message);
                                      setTimeout(() => setUssdError(''), 3000);
                                    }
                                  } catch(e) { 
                                    setUssdError(e.message);
                                    setTimeout(() => setUssdError(''), 3000);
                                  }
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                  loc.isActive 
                                    ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                                    : "bg-red-500/10 text-red-600 border border-red-500/20 opacity-60"
                                )}
                              >
                                <div className={cn("w-1 h-1 rounded-full", loc.isActive ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                {loc.isActive ? 'Active' : 'Offline'}
                              </button>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {editingUssdId === loc.id ? (
                                  <>
                                    <button 
                                      onClick={handleSaveUssd} 
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all font-black"
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button 
                                      onClick={handleCancelUssdEdit} 
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                                    >
                                      <X size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleEditUssdClick(loc)} 
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-earth-sub hover:bg-earth-primary/20 hover:text-earth-brown transition-all"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteUssd(loc.id)} 
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-5 bg-blue-500/5 rounded-3xl border border-blue-500/20 flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                    <Info size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-earth-brown uppercase tracking-widest mb-1">Static Village Mapping (USSD Only)</p>
                    <p className="text-[9px] font-bold text-earth-mut uppercase tracking-wider leading-relaxed">
                      These locations are optimized for feature phones. The system enforces a strict <strong>6-8 active village limit</strong> to maintain interface usability. 
                      Charges here override global zone metrics for USSD-sourced bookings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Service Rates Settings */}
            {activeTab === 'rates' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-earth-brown uppercase tracking-tight italic flex items-center gap-2">
                       Service Rate Management
                       <div className="w-1.5 h-1.5 rounded-full bg-earth-primary"></div>
                    </h3>
                    <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest mt-1">Configure base operational rates per hectare for each service.</p>
                  </div>
                </div>

                {/* Global Add Form logic not needed for Rates as there's no ADD button for core services */}

                {/* Desktop View Table */}
                <div className="hidden md:block overflow-hidden bg-earth-card/30 border border-earth-dark/10 rounded-[2rem] shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-earth-card/50 border-b border-earth-dark/10">
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">Service Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">Rate Per Ha</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">Effective Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em]">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-earth-mut uppercase tracking-[0.2em] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-earth-dark/5">
                      {systemServices.map((s) => (
                        editingServiceId === s.id ? (
                          <tr key={s.id} className="bg-earth-primary/5">
                            <td colSpan={4} className="p-6">
                              <div className="space-y-6 animate-in fade-in zoom-in duration-200">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-[11px] font-black text-earth-brown uppercase tracking-widest text-center">Update {s.name} Rate</h4>
                                  <Button variant="ghost" size="sm" onClick={() => setEditingServiceId(null)} className="text-earth-mut"><X size={18} /></Button>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <label className="text-[9px] uppercase font-black text-earth-sub">Rate Per Ha</label>
                                    <Input type="number" value={editServiceRate} onChange={(e) => setEditServiceRate(e.target.value)} className="h-10 text-xs font-black" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[9px] uppercase font-black text-earth-sub">Effective Date</label>
                                    <Input type="date" value={editServiceDate} onChange={(e) => setEditServiceDate(e.target.value)} className="h-10 text-xs font-black" />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-4">
                                  <Button variant="outline" size="sm" onClick={() => setEditingServiceId(null)} className="h-9 px-4 text-[10px] uppercase font-black shadow-sm">Cancel</Button>
                                  <Button size="sm" onClick={async () => {
                                      const rate = parseFloat(editServiceRate);
                                      if (isNaN(rate) || rate <= 0) return alert('Invalid rate');
                                      if (!editServiceDate) return alert('Invalid date');
                                      try {
                                        const res = await api.admin.updateService(s.id, { baseRatePerHectare: rate, effectiveDate: editServiceDate });
                                        if (res.success) { await refreshServices(); setEditingServiceId(null); setSaveStatus('success'); }
                                      } catch (e) {}
                                  }} className="h-9 px-6 text-[10px] uppercase font-black bg-accent text-white shadow-lg">Confirm Sync</Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={s.id} className="group hover:bg-earth-primary/5 transition-colors">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-earth-main flex items-center justify-center text-earth-primary shadow-sm border border-earth-dark/5 text-[10px] font-black">
                                  {s.name.substring(0, 1).toUpperCase()}
                                </div>
                                <span className="text-sm font-black text-earth-brown capitalize">{s.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-sm font-black text-earth-primary">{formatCurrency(s.baseRatePerHectare)}</span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-xs font-black text-earth-mut uppercase">
                                {new Date(s.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <button 
                                onClick={async () => {
                                  try {
                                    await updateService(s.id, { isActive: !s.isActive });
                                    setSaveStatus('success');
                                  } catch (e) { console.error(e); }
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                  s.isActive 
                                    ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                                    : "bg-red-500/10 text-red-600 border border-red-500/20 opacity-60"
                                )}
                              >
                                <div className={cn("w-1 h-1 rounded-full", s.isActive ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                {s.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingServiceId(s.id);
                                    setEditServiceRate(s.baseRatePerHectare.toString());
                                    setEditServiceDate(new Date(s.effectiveDate).toISOString().split('T')[0]);
                                  }} 
                                  className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-earth-sub hover:bg-earth-primary/20 hover:text-earth-brown transition-all"
                                  title="Edit Rate"
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to delete ${s.name}? This will hide it from the system.`)) return;
                                    try {
                                      const res = await api.admin.deleteService(s.id);
                                      if (res.success) {
                                        await refreshServices();
                                        setSaveStatus('success');
                                      }
                                    } catch (e) { console.error(e); }
                                  }} 
                                  className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-all"
                                  title="Delete Service"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {systemServices.map((s) => (
                    editingServiceId === s.id ? (
                      <div key={s.id} className="p-6 rounded-[2rem] bg-earth-primary/5 border-2 border-earth-primary/20 shadow-xl space-y-6 animate-in fade-in zoom-in duration-200">
                         <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black text-earth-brown uppercase tracking-widest">Update {s.name}</h4>
                            <Button variant="ghost" size="sm" onClick={() => setEditingServiceId(null)} className="text-earth-mut"><X size={18} /></Button>
                         </div>
                         <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[9px] uppercase font-black text-earth-sub">Rate Per Ha</label>
                              <Input type="number" value={editServiceRate} onChange={(e) => setEditServiceRate(e.target.value)} className="h-12 text-sm font-black" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] uppercase font-black text-earth-sub">Effective Date</label>
                              <Input type="date" value={editServiceDate} onChange={(e) => setEditServiceDate(e.target.value)} className="h-12 text-sm font-black" />
                            </div>
                         </div>
                         <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setEditingServiceId(null)} className="flex-1 h-12 text-[10px] uppercase font-black rounded-xl">Cancel</Button>
                            <Button onClick={async () => {
                               const rate = parseFloat(editServiceRate);
                               if (isNaN(rate) || rate <= 0) return alert('Invalid rate');
                               if (!editServiceDate) return alert('Invalid date');
                               try {
                                 const res = await api.admin.updateService(s.id, { baseRatePerHectare: rate, effectiveDate: editServiceDate });
                                 if (res.success) { await refreshServices(); setEditingServiceId(null); setSaveStatus('success'); }
                               } catch(e) {}
                            }} className="flex-1 h-12 text-[10px] uppercase font-black rounded-xl bg-accent text-white">Save Changes</Button>
                         </div>
                      </div>
                    ) : (
                      <div key={s.id} className="p-5 rounded-[2rem] bg-white border border-earth-dark/15 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-earth-main flex items-center justify-center text-earth-primary border border-earth-dark/10 text-xs font-black">
                               {s.name.substring(0, 1).toUpperCase()}
                            </div>
                            <span className="text-base font-black text-earth-brown capitalize">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="icon"
                              onClick={() => {
                                setEditingServiceId(s.id);
                                setEditServiceRate(s.baseRatePerHectare.toString());
                                setEditServiceDate(new Date(s.effectiveDate).toISOString().split('T')[0]);
                              }}
                              className="h-10 w-10 bg-earth-main text-earth-sub border border-earth-dark/15 rounded-xl hover:bg-earth-primary/10 hover:text-earth-primary transition-colors"
                            >
                               <Edit size={16} />
                            </Button>
                            <Button 
                              size="icon"
                              onClick={async () => {
                                if (!window.confirm(`Are you sure you want to delete ${s.name}?`)) return;
                                try {
                                  const res = await api.admin.deleteService(s.id);
                                  if (res.success) await refreshServices();
                                } catch (e) { console.error(e); }
                              }}
                              className="h-10 w-10 bg-red-500/5 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors"
                            >
                               <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
  
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-earth-dark/5">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest">Base Rate</p>
                            <p className="text-sm font-black text-earth-primary">{formatCurrency(s.baseRatePerHectare)} <span className="text-[10px] text-earth-mut">/HA</span></p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest">Effective On</p>
                            <p className="text-xs font-black text-earth-brown">
                              {new Date(s.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-earth-mut uppercase tracking-widest">Status</p>
                            <button 
                              onClick={async () => {
                                try {
                                  await updateService(s.id, { isActive: !s.isActive });
                                } catch (e) { console.error(e); }
                              }}
                              className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                s.isActive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                              )}
                            >
                               {s.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>

                <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex gap-3">
                   <AlertTriangle size={18} className="text-yellow-500 mt-0.5" />
                   <p className="text-[9px] font-bold text-earth-sub uppercase tracking-widest leading-relaxed">Warning: Adjusting base rates will affect all future quotes instantly. Existing bookings will retain their original lock price.</p>
                </div>
              </div>
            )}

            {/* Maintenance Settings */}
            {activeTab === 'maintenance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-earth-sub pl-1">Standard Service Interval</label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={localMaintenance.serviceIntervalHours} 
                        onChange={(e) => setLocalMaintenance({...localMaintenance, serviceIntervalHours: parseInt(e.target.value)})}
                        className="bg-earth-card border-earth-dark/15 font-black text-xl text-earth-brown h-14 rounded-2xl focus:border-earth-primary shadow-inner" 
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-earth-mut uppercase">hours</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-earth-sub pl-1">Pre-Alert Threshold</label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={localMaintenance.preAlertHours} 
                        onChange={(e) => setLocalMaintenance({...localMaintenance, preAlertHours: parseInt(e.target.value)})}
                        className="bg-earth-card border-earth-dark/15 font-black text-xl text-earth-brown h-14 rounded-2xl focus:border-earth-primary shadow-inner" 
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-earth-mut uppercase">hours</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="p-6 bg-red-500/5 rounded-3xl border border-red-500/10 h-full flex flex-col justify-center gap-4">
                     <AlertTriangle size={32} className="text-red-500" />
                     <div className="space-y-1">
                        <p className="text-xs font-black text-earth-brown uppercase italic tracking-tight">Critical Monitoring</p>
                        <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest leading-relaxed">
                          The system will flag units for mandatory withdrawal from dispatch logic when the pre-alert threshold is reached.
                        </p>
                     </div>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
