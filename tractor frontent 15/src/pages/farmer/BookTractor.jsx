import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, MapPin, Navigation, Mail, Info, CheckCircle, Calculator, Map as MapIcon, Loader2, ArrowRight, X, Clock, LocateFixed, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import { useBookings } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../lib/format';
import RequestLocationMap from '../../components/map/RequestLocationMap';
import useScrollLock from '../../hooks/useScrollLock';

export default function BookTractor() {
  const navigate = useNavigate();
  const { serviceRates, systemServices, zones } = useSettings();
  const { addBooking } = useBookings();
  
  const [service, setService] = useState('Ploughing');
  
  useEffect(() => {
    if (systemServices.length > 0 && !systemServices.find(s => s.name.toLowerCase() === service.toLowerCase())) {
      const firstAvailable = systemServices[0].name;
      setService(firstAvailable.charAt(0).toUpperCase() + firstAvailable.slice(1));
    }
  }, [systemServices]);
  const [landSize, setLandSize] = useState('');
  const [location, setLocation] = useState('');
  const [farmerLatitude, setFarmerLatitude] = useState('');
  const [farmerLongitude, setFarmerLongitude] = useState('');
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1: Details, 2: Payment
  const [selectedPaymentOption, setSelectedPaymentOption] = useState('full');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [errors, setErrors] = useState({});
  const [priceDetails, setPriceDetails] = useState({
    basePrice: 0,
    distanceKm: 0,
    distanceCharge: 0,
    fuelSurcharge: 0,
    totalPrice: 0,
    roadDistance: 0,
    zoneName: ""
  });

  // Lock background scroll when modal/overlay is open
  useScrollLock(bookingStep === 2 || isBooking);

  // Price Preview logic
  useEffect(() => {
    const getPreview = async () => {
      if (!landSize || parseFloat(landSize) <= 0) return;
      
      setIsPreviewLoading(true);
      try {
        const result = await api.farmer.getPricePreview({
          serviceType: service.toLowerCase(),
          landSize: parseFloat(landSize),
          location: location || 'TBD',
          farmerLatitude: farmerLatitude ? parseFloat(farmerLatitude) : null,
          farmerLongitude: farmerLongitude ? parseFloat(farmerLongitude) : null
        });
        if (result.success) {
          setPriceDetails(result.data);
        }
      } catch (error) {
        setErrors((prev) => ({ ...prev, general: "Please check your internet connection and try again" }));
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const debounce = setTimeout(getPreview, 500);
    return () => clearTimeout(debounce);
  }, [service, landSize, location, farmerLatitude, farmerLongitude]);

  const baseRate = serviceRates[service] || 0;
  const baseTotal = priceDetails.basePrice;
  const distanceSurcharge = priceDetails.distanceCharge;
  const totalCost = priceDetails.totalPrice;

  const validate = () => {
    const newErrors = {};
    if (!landSize || parseFloat(landSize) <= 0) newErrors.landSize = "Size required";
    if (!selectedMapLocation) newErrors.location = "Pin required";
    if (!location || location.trim().length < 3) newErrors.locationText = "Village/Area required (min 3 chars)";
    if (!totalCost || totalCost <= 0) newErrors.general = "Price calculation pending or failed. Please check your connection.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, location: 'Geolocation unavailable' }));
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setSelectedMapLocation({ lat, lng });
        setFarmerLatitude(String(lat));
        setFarmerLongitude(String(lng));
        
        // Auto-fill location text if empty
        if (!location || location.trim().length < 3) {
          setLocation(`Near ${lat}, ${lng}`);
        }

        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.location;
          delete newErrors.locationText;
          return newErrors;
        });
        setIsLocating(false);
      },
      () => {
        setErrors((prev) => ({ ...prev, location: 'Location fetch failed' }));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 2000 }
    );
  };

  const handleBookNow = async () => {
    if (!validate()) {
      // Scroll to top or first error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (bookingStep === 1) {
      setBookingStep(2);
      return;
    }

    setIsBooking(true);
    try {
      const bookingData = {
        serviceType: service.toLowerCase(),
        landSize: parseFloat(landSize),
        location: location.trim(),
        farmerLatitude: farmerLatitude ? parseFloat(farmerLatitude) : null,
        farmerLongitude: farmerLongitude ? parseFloat(farmerLongitude) : null,
        paymentOption: selectedPaymentOption
      };
      
      const prefillAmt = selectedPaymentOption === 'full' ? totalCost : totalCost * 0.5;
      
      // Redirect to payments with the BOOKING DATA in state
      // This ensures nothing is created in the DB until "Pay Now" is clicked on the next page.
      navigate(`/farmer/payments`, { 
        state: { 
          bookingData,
          paymentMode: 'CHECKOUT',
          displayAmount: prefillAmt.toFixed(2),
          displayService: service
        } 
      });

    } catch (error) {
      setErrors({ general: "Please check your internet connection and try again" });
      setBookingStep(1);
    } finally {
      setIsBooking(false);
    }
  };

  // Memoize the price details display to avoid recalculation on unrelated state changes
  const MemoizedPriceDisplay = useMemo(() => (
    <div className="space-y-3">
      <div className="flex justify-between text-xs font-bold text-earth-sub">
        <span>Base Price ({landSize || 0} ha)</span>
        {isPreviewLoading ? <Skeleton className="h-4 w-16" /> : <span className="text-earth-brown">{formatCurrency(baseTotal)}</span>}
      </div>
      <div className="flex justify-between text-xs font-bold text-earth-sub">
        <div className="flex flex-col">
          <span>Distance Charge ({priceDetails.roadDistance || 0} km)</span>
          {priceDetails.zoneName && (
            <span className="text-[9px] text-earth-mut uppercase tracking-widest leading-none mt-1">Tier: {priceDetails.zoneName}</span>
          )}
        </div>
        {isPreviewLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="text-earth-brown">
            {priceDetails.distanceCharge === 0 
              ? "Included" 
              : formatCurrency(distanceSurcharge)
            }
          </span>
        )}
      </div>
      <div className="pt-3 border-t border-earth-dark/10 flex justify-between items-end">
        <span className="text-xs font-black text-earth-brown uppercase underline decoration-earth-primary underline-offset-4 decoration-2">Total Amount</span>
        {isPreviewLoading ? <Skeleton className="h-6 w-24" /> : <span className="text-2xl font-black text-earth-primary tracking-tighter">{formatCurrency(totalCost)}</span>}
      </div>
    </div>
  ), [landSize, isPreviewLoading, baseTotal, priceDetails, distanceSurcharge, totalCost]);



  if (isConfirmed) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[80vh]">
        <Card className="bg-earth-card border-earth-dark/10 w-full max-w-lg p-8 text-center space-y-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500">
            <CheckCircle size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-earth-brown tracking-tight uppercase">Booking Confirmed!</h2>
            <p className="text-earth-mut font-bold text-sm uppercase tracking-widest">Order ID: #B-59203</p>
          </div>
          
          <div className="bg-earth-card-alt rounded-2xl p-6 border border-earth-dark/10 text-left space-y-4">
             <div className="flex justify-between border-b border-earth-dark/10 pb-3">
               <span className="text-[10px] font-black text-earth-mut uppercase">Service</span>
               <span className="text-sm font-black text-earth-brown uppercase">{service}</span>
             </div>
             <div className="flex justify-between border-b border-earth-dark/10 pb-3">
               <span className="text-[10px] font-black text-earth-mut uppercase">Total Amount</span>
               <span className="text-sm font-black text-primary">{formatCurrency(totalCost)}</span>
             </div>
             <div className="flex justify-between border-b border-earth-dark/10 pb-3">
               <span className="text-[10px] font-black text-earth-mut uppercase">Payment Plan</span>
               <span className={cn(
                 "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                 selectedPaymentOption === 'full' ? "bg-earth-green/10 text-earth-green" :
                 selectedPaymentOption === 'partial' ? "bg-blue-500/10 text-blue-500" :
                 "bg-earth-mut/10 text-earth-mut"
               )}>
                 {selectedPaymentOption === 'full' ? 'Fully Paid' : selectedPaymentOption === 'partial' ? '50% Advance' : 'Pay Later (Cash)'}
               </span>
             </div>
             <div className="flex justify-between">
               <span className="text-[10px] font-black text-earth-mut uppercase">Scheduled For</span>
               <span className="text-sm font-black text-earth-primary uppercase italic">Scheduling Pending</span>
             </div>
             <p className="text-[9px] font-bold text-earth-mut/70 uppercase text-center tracking-widest mt-1">Admin will confirm exact timing shortly</p>
          </div>

          <div className="pt-4 space-y-3">
            <Button 
              onClick={() => navigate('/farmer/payments')} 
              className="w-full bg-accent hover:opacity-90 text-white h-14 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-accent/20 transition-all transform hover:-translate-y-1"
            >
              Go to Payments <ArrowRight size={20} />
            </Button>
            <Button 
              onClick={() => navigate('/farmer/track')} 
              variant="outline"
              className="w-full border-earth-dark/10 text-earth-brown h-12 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-2"
            >
              Track Live Map
            </Button>
            <button 
              onClick={() => {
                setIsConfirmed(false);
                setSelectedPaymentOption('later');
              }}
              className="text-[10px] font-black text-earth-mut uppercase tracking-widest hover:text-earth-brown transition-colors"
            >
              Make another booking
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto pb-24 md:pb-6 relative">
      
      <div className={cn("space-y-5", bookingStep === 2 && "opacity-0 pointer-events-none")}>
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-earth-card/50 p-4 rounded-2xl border border-earth-dark/10">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(46,125,50,0.3)]">
                <Tractor size={20} />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-black text-earth-brown uppercase tracking-tight">Book Tractor</h1>
                <p className="text-[10px] text-earth-mut font-bold uppercase tracking-widest">Instant Rental & Quotation</p>
              </div>
            </div>
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-red-400 text-[10px] font-black uppercase tracking-widest animate-shake">
                {errors.general}
              </div>
            )}
          </div>
        </div>

        <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-5 transition-all duration-300", isBooking && "opacity-50 pointer-events-none scale-[0.99]")}>
        
        {/* Main Booking Form */}
        <div className="lg:col-span-8 space-y-5">
          <Card className="bg-earth-card-alt border-earth-dark/15/50 rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-6">
              
              {/* Service Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-earth-mut uppercase tracking-widest ml-1">Select Service</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {systemServices && systemServices.map((s) => {
                    const label = s.name.charAt(0).toUpperCase() + s.name.slice(1);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setService(label)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all group",
                          service === label 
                            ? "border-earth-primary bg-earth-card" 
                            : "border-earth-dark/15 hover:border-earth-primary bg-earth-card/50"
                        )}
                      >
                        <Tractor size={18} className={cn("mb-2 transition-colors", service === label ? "text-earth-primary" : "text-earth-mut group-hover:text-earth-brown")} />
                        <span className={cn("font-black text-[11px] uppercase tracking-wide", service === label ? "text-earth-primary" : "text-earth-brown")}>{label}</span>
                        <span className={cn("text-[8px] font-bold mt-1 tracking-widest", service === label ? "text-earth-primary/80" : "text-earth-mut")}>{formatCurrency(s.baseRatePerHectare)}/ha</span>
                      </button>
                    );
                  })}
                </div>
                {systemServices && systemServices.find(s => s.name.toLowerCase() === service.toLowerCase()) ? (
                  systemServices.find(s => s.name.toLowerCase() === service.toLowerCase())?.description && (
                    <div className="mt-4 p-3.5 bg-earth-card border border-earth-dark/10 rounded-xl flex gap-3 items-start shadow-sm transition-all group hover:border-earth-primary/30">
                      <Info size={16} className="text-earth-primary mt-0.5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-earth-mut mb-1 block">Service Description</span>
                        <p className="text-xs font-bold text-earth-sub leading-relaxed">
                          {systemServices.find(s => s.name.toLowerCase() === service.toLowerCase()).description}
                        </p>
                      </div>
                    </div>
                  )
                ) : systemServices.length > 0 ? (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 items-center">
                    <AlertTriangle size={18} className="text-red-500" />
                    <p className="text-xs font-black text-red-500 uppercase tracking-widest">Service not available</p>
                  </div>
                ) : null}
              </div>

              {/* Input Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center px-1">
                     <label className={cn("text-[10px] font-black uppercase tracking-widest", errors.landSize ? "text-red-500" : "text-earth-mut")}>Land Size (Hectares)</label>
                     {errors.landSize && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><X size={10} /> Required</span>}
                  </div>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="e.g. 5" 
                      value={landSize} 
                      onChange={(e) => {
                        setLandSize(e.target.value);
                        if (errors.landSize) {
                          setErrors(prev => {
                            const newErr = { ...prev };
                            delete newErr.landSize;
                            return newErr;
                          });
                        }
                      }}
                      className={cn(
                        "h-12 bg-earth-card text-earth-brown font-bold rounded-xl transition-all",
                        errors.landSize ? "border-red-500 bg-red-500/5" : "border-earth-dark/15 focus:ring-earth-primary"
                      )}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-earth-mut uppercase">ha</div>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center px-1">
                     <label className={cn("text-[10px] font-black uppercase tracking-widest", (errors.location || errors.locationText) ? "text-red-500" : "text-earth-mut")}>Map / Village Location</label>
                     {errors.locationText && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><X size={10} /> {errors.locationText}</span>}
                     {errors.location && !errors.locationText && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><X size={10} /> Required</span>}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-earth-mut">
                      <MapPin size={16} />
                    </div>
                    <Input 
                      placeholder="Village name or area" 
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        if (errors.location || errors.locationText) {
                          setErrors(prev => {
                            const newErr = { ...prev };
                            delete newErr.location;
                            delete newErr.locationText;
                            return newErr;
                          });
                        }
                      }}
                      className={cn(
                        "pl-10 h-12 bg-earth-card text-earth-brown font-bold rounded-xl transition-all",
                        errors.location ? "border-red-500 bg-red-500/5" : "border-earth-dark/15 focus:ring-earth-primary"
                      )} 
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left md:col-span-2">
                  <div className="flex items-center justify-between px-1">
                    <label className={cn("text-[10px] font-black uppercase tracking-widest", errors.location ? "text-red-500" : "text-earth-mut")}>
                      Work Location Pin (Required)
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3 text-[9px] font-black uppercase tracking-widest"
                      onClick={useCurrentLocation}
                      disabled={isLocating}
                    >
                      {isLocating ? <Loader2 size={12} className="animate-spin mr-1" /> : <LocateFixed size={12} className="mr-1" />}
                      Use Current
                    </Button>
                  </div>
                  <p className="text-[10px] font-bold text-earth-sub px-1">Tap on map to select exact work location.</p>
                  <RequestLocationMap
                    selectedLocation={selectedMapLocation}
                    onPick={(point, source) => {
                      const lat = Number(point.lat.toFixed(6));
                      const lng = Number(point.lng.toFixed(6));
                      setSelectedMapLocation({ lat, lng });
                      setFarmerLatitude(String(lat));
                      setFarmerLongitude(String(lng));
                      
                      // Auto-fill location text if empty
                      if (!location || location.trim().length < 3) {
                        setLocation(`Pinned Location (${lat}, ${lng})`);
                      }

                      setErrors((prev) => {
                        const newErr = { ...prev };
                        delete newErr.location;
                        delete newErr.locationText;
                        return newErr;
                      });
                    }}
                  />
                  {selectedMapLocation ? (
                    <p className="text-[10px] font-black text-earth-green px-1 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle size={12} /> Work Location Successfully Pinned
                    </p>
                  ) : (
                    <p className="text-[10px] font-bold text-earth-mut px-1 uppercase tracking-widest">No pin selected yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>


        </div>

        {/* Quote Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="bg-earth-card border border-earth-dark/10 rounded-2xl overflow-hidden sticky top-5 shadow-xl">
            <div className="p-4 bg-earth-card-alt/50 border-b border-earth-dark/10 flex items-center gap-2">
              <Calculator size={16} className="text-earth-primary" />
              <h3 className="font-black text-[10px] uppercase tracking-widest text-earth-brown">Auto Quotation</h3>
            </div>
            <CardContent className="p-5 space-y-6">
              {MemoizedPriceDisplay}
              <p className="text-[9px] text-earth-mut font-bold uppercase text-right tracking-widest">Quote valid for 48 hours</p>

              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  onClick={handleBookNow}
                  isLoading={isBooking}
                  disabled={isPreviewLoading}
                  className={cn(
                    "w-full h-12 rounded-xl font-black uppercase tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all",
                    Object.keys(errors).length > 0 ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-accent hover:opacity-90 text-white shadow-accent/20"
                  )}
                >
                  {Object.keys(errors).length > 0 ? "Check Fields" : "Continue"}
                </Button>
              </div>
            </CardContent>
          </Card>


        </div>

        </div>
      </div>

      {bookingStep === 2 && (
        <div className="fixed inset-0 z-[3000] overflow-y-auto scrollbar-hide">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
            <div className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl" onClick={() => setBookingStep(1)} />
            <div className="relative text-left z-10 bg-earth-card border border-earth-dark/10 w-full max-w-[420px] p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-2xl space-y-6 md:space-y-8 animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setBookingStep(1)}
              className="absolute top-6 right-6 text-earth-mut hover:text-earth-brown transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center space-y-2">
              <h3 className="text-3xl font-black text-earth-brown italic uppercase tracking-tight">Payment Plan</h3>
              <p className="text-[10px] font-bold text-earth-mut uppercase tracking-[0.2em]">Select how you want to settle your dues</p>
            </div>

            <div className="space-y-3">
              {[
                { 
                  id: 'full', 
                  label: 'Pay Full Now', 
                  sub: formatCurrency(totalCost), 
                  desc: 'Instant settlement via Online Gateway',
                  icon: CheckCircle,
                  color: 'text-earth-green',
                  bg: 'bg-earth-green/10'
                },
                { 
                  id: 'partial', 
                  label: 'Pay 50% Advance', 
                  sub: formatCurrency(totalCost * 0.5), 
                  desc: 'Secure your booking now, pay rest later',
                  icon: Clock,
                  color: 'text-blue-500',
                  bg: 'bg-blue-500/10'
                }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedPaymentOption(opt.id)}
                  className={cn(
                    "w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-5 group",
                    selectedPaymentOption === opt.id 
                      ? "border-earth-primary bg-earth-card ring-4 ring-earth-primary/5" 
                      : "border-earth-dark/10 hover:border-earth-primary/30 bg-earth-card-alt/30"
                  )}
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all", opt.bg, opt.color, selectedPaymentOption === opt.id && "scale-110")}>
                    <opt.icon size={28} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn("font-black text-sm uppercase italic tracking-wide transition-colors", selectedPaymentOption === opt.id ? "text-earth-primary" : "text-earth-brown")}>{opt.label}</span>
                      <span className={cn("text-xs font-black tabular-nums", selectedPaymentOption === opt.id ? "text-earth-primary" : "text-earth-brown")}>{opt.sub}</span>
                    </div>
                    <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <Button 
              onClick={handleBookNow}
              isLoading={isBooking}
              className="w-full h-16 bg-earth-primary hover:bg-earth-primary-hover text-earth-brown rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-earth-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              Confirm Booking <ArrowRight size={20} />
            </Button>
          </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isBooking && (
        <div className="fixed inset-0 z-[4000] overflow-y-auto scrollbar-hide">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
            <div className="fixed inset-0 bg-earth-dark/40 backdrop-blur-xl" />
            <div className="relative z-10 bg-earth-card border border-earth-dark/10 p-8 md:p-10 rounded-[2.5rem] flex flex-col items-center gap-6 shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="relative">
                <Loader2 size={60} className="text-earth-primary animate-spin" />
                <Tractor size={24} className="absolute inset-0 m-auto text-earth-brown/40" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-black text-earth-brown uppercase tracking-[0.3em]">Processing...</p>
                <p className="text-[10px] font-bold text-earth-mut uppercase tracking-widest">Registering your schedule</p>
              </div>
           </div>
          </div>
        </div>
      )}


    </div>
  );
}
