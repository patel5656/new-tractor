import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRight, 
  Users, 
  Settings, 
  Bell, 
  PhoneCall, 
  Navigation,
  Hash,
  BadgeDollarSign,
  Star,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Phone,
  Tractor,
  MapPin,
  Clock,
  ShieldCheck,
  Search,
  DollarSign,
  CreditCard,
  WifiOff,
  BarChart3,
  Smartphone,
  CheckCircle2,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import useScrollLock from '../hooks/useScrollLock';
import { formatCurrency } from '../lib/format';

const LandingPage = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  // Unified scroll lock
  useScrollLock(isContactModalOpen);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: t('navHome', 'Home'), href: '#' },
    { name: t('navHowItWorks', 'How It Works'), href: '#how-it-works' },
    { name: t('navFeatures', 'Features'), href: '#features' },
    { name: t('navPricing', 'Pricing'), href: '#pricing' },
    { name: t('navContact', 'Contact'), href: '#contact' },
  ];

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    initial: {},
    whileInView: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const fadeInLeft = {
    initial: { opacity: 0, x: -30 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  const fadeInRight = {
    initial: { opacity: 0, x: 30 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  const handleBookClick = () => {
    if (isAuthenticated && role) {
      navigate(`/${role}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1F2937] font-sans selection:bg-[#2E7D32] selection:text-white overflow-x-hidden">
      {/* 1. NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center bg-white rounded-b-2xl shadow-sm md:shadow-none md:bg-transparent">
          <div className="flex items-center space-x-3 py-4">
            <img src="/tractorlink-logo.png" alt="TractorLink Logo" className="w-12 h-12 object-contain" />
            <span className="text-2xl font-black text-[#1A2218] tracking-tight uppercase">
              Tractor <span className="text-accent">Link</span>
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
                {navLinks.map((link) => (
                  <a 
                    key={link.name} 
                    href={link.href} 
                    className="text-sm font-medium hover:text-[#2E7D32] transition-colors"
                    onClick={(e) => {
                      if (link.name === 'Contact') {
                        e.preventDefault();
                        setIsContactModalOpen(true);
                      }
                    }}
                  >
                    {link.name}
                  </a>
                ))}
            <button 
              className="bg-[#FF9800] text-white px-6 py-3 rounded-xl font-semibold hover:bg-opacity-90 transition-all transform hover:scale-105 active:scale-95 shadow-md"
              onClick={handleBookClick}
            >
              {t('bookTractor', 'Book Tractor')}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-[#1F2937]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-[#F5F5F5] overflow-hidden px-6 pb-8 shadow-xl"
            >
              <div className="flex flex-col space-y-4 pt-6">
                {navLinks.map((link) => (
                  <a 
                    key={link.name} 
                    href={link.href} 
                    className="text-lg font-medium py-2 border-b border-[#F5F5F5]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                ))}
                <button 
                  className="bg-[#FF9800] text-white w-full py-4 rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition-transform"
                  onClick={handleBookClick}
                >
                  {t('bookTractor', 'Book Tractor')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6 relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-left"
          >
            <span className="inline-block py-2 px-4 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-6">
              {t('heroBadge', 'Empowering African Agriculture')}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-[#1A2218] leading-[1.1] mb-6">
              {t('heroHeadline1', 'Book Tractors in Minutes.')} <br />
              <span className="text-accent">{t('heroHeadline2', 'No Middlemen.')}</span>
            </h1>
            <p className="text-lg md:text-xl text-[#1A2218]/80 mb-10 max-w-lg leading-relaxed">
              {t('heroSubtext', 'Transparent pricing, real-time tracking, and reliable farm services powered by Freeway Agro.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                className="bg-accent text-white px-8 py-4 rounded-2xl font-bold text-lg hover:opacity-90 shadow-xl transition-all hover:translate-y-[-2px] flex items-center justify-center gap-2 group"
                onClick={handleBookClick}
              >
                {t('bookNow', 'Book Now')} <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-[#F5F5F5] flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/150?u=tractor${i}`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <p className="font-bold text-[#1A2218]">{t('trustText1', '5,000+ Farmers')}</p>
                <p className="text-[#1A2218]/60">{t('trustText2', 'Trust Freeway Agro daily')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="relative z-10"
            >
              <div className="bg-white p-4 rounded-[2rem] shadow-2xl relative overflow-hidden border border-[#F5F5F5]">
                <div className="bg-[#F5F5F5] rounded-3xl overflow-hidden aspect-square flex items-center justify-center p-0">
                  <img 
                    src="/hero-tractor.png" 
                    alt="TractorLink Illustration" 
                    className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700" 
                  />
                  
                  {/* Floating Map Pin Overlay */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                    className="absolute top-8 right-8 bg-white p-3 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-2 z-20"
                  >
                    <MapPin size={22} className="text-primary" />
                    <span className="text-xs font-extrabold tracking-tight">Active Tracking</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
            
            {/* Background elements */}
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-0"></div>
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-0"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white -z-10"></div>
          </motion.div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2218] mb-4">{t('howItWorks', 'How It Works')}</h2>
            <p className="text-[#1A2218]/60 max-w-2xl mx-auto">{t('howItWorksSubtext', 'Simplify your farm management with our 4-step seamless process.')}</p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {[
              { icon: <Search />, title: t('step1Title', "Book Service"), desc: t('step1Desc', "Select your desired farm operation and tractor type.") },
              { icon: <DollarSign />, title: t('step2Title', "Get Instant Price"), desc: t('step2Desc', "See transparent pricing based on size and location.") },
              { icon: <Settings />, title: t('step3Title', "Admin Dispatch"), desc: t('step3Desc', "We match the best available operator for your job.") },
              { icon: <CheckCircle2 />, title: t('step4Title', "Job Completed"), desc: t('step4Desc', "Track progress and pay once the job is certified.") }
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                variants={fadeIn}
                whileHover={{ y: -8 }}
                className="bg-white p-6 rounded-2xl group transition-all duration-300 hover:shadow-xl border border-gray-100 hover:border-primary/10"
              >
                <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  {React.cloneElement(step.icon, { size: 24 })}
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-[#1F2937]/70 leading-relaxed">{step.desc}</p>
                <div className="mt-4 flex items-center text-primary font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  Step {idx + 1} <ChevronRight size={14} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="py-24 px-6 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2218] mb-4">{t('powerfulFeatures', 'Powerful Features')}</h2>
            <p className="text-[#1A2218]/60 max-w-2xl mx-auto">{t('featuresSubtext', 'Designed to improve efficiency and yield for every farm.')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Navigation />, title: t('featTrackingTitle', "Real-time Tracking"), desc: t('featTrackingDesc', "Know exactly where your tractor is and when it will arrive at your farm.") },
              { icon: <CreditCard />, title: t('featPricingTitle', "Transparent Pricing"), desc: t('featPricingDesc', "No hidden costs. Pricing based on distance, hectares, and fuel consumption.") },
              { icon: <WifiOff />, title: t('featOfflineTitle', "Offline Booking"), desc: t('featOfflineDesc', "Book services via USSD even without internet connectivity in rural areas.") },
              { icon: <ShieldCheck />, title: t('featVerifiedTitle', "Operator Verified"), desc: t('featVerifiedDesc', "All operators are vetted and jobs are monitored for quality assurance.") },
              { icon: <ShieldCheck />, title: t('featPaymentsTitle', "Secure Payments"), desc: t('featPaymentsDesc', "Multiple payment options including Mobile Money and card payments.") },
              { icon: <BarChart3 />, title: t('featAnalyticsTitle', "Data-Driven Analytics"), desc: t('featAnalyticsDesc', "Access comprehensive analytics to optimize your farm's productivity.") }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                variants={fadeIn}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-10 rounded-2xl shadow-md flex flex-col items-start hover:shadow-2xl transition-all duration-500"
              >
                <div className="p-4 bg-primary/5 rounded-2xl text-primary mb-6">
                  {React.cloneElement(feature.icon, { size: 32 })}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-[#1F2937]/70 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION */}
      <section id="pricing" className="py-24 px-6 bg-[#1A2218] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeInLeft} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-bold mb-6">
                <BadgeDollarSign size={14} /> {t('simpleFairPricing', 'Simple, Fair Pricing')}
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-6">{t('noSurprises', 'No Surprises. Pay Only for What You Use.')}</h2>
              <p className="text-white/60 text-lg mb-8 leading-relaxed">
                {t('pricingSubtext', 'We use a transparent formula to ensure you get the best value.')}
              </p>
              
              <div className="space-y-4 mb-10">
                {[
                  t('pricingFeature1', "Dynamic GPS-based calculation"),
                  t('pricingFeature2', "Fuel efficiency adjustments included"),
                  t('pricingFeature3', "Verified hectare measurement"),
                  t('pricingFeature4', "Lower rates for community group bookings")
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <CheckCircle2 size={12} />
                    </div>
                    <span className="text-white/80">{item}</span>
                  </div>
                ))}
              </div>

              <Link to="/auth?role=farmer" className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20">
                {t('checkMyPrice', 'Check My Price')} <ArrowRight size={18} />
              </Link>
            </motion.div>

            <motion.div 
              variants={fadeInRight}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/40 transition-colors"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-sm font-bold text-white/40 uppercase tracking-widest">{t('liveGps', 'Live GPS')}</span>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                        <Navigation size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{t('trackInRealTime', 'Track Your Tractor in Real-Time')}</h4>
                        <p className="text-white/40 text-sm">{t('trackDesc', 'Experience total peace of mind. Our live GPS tracking shows you exactly where the operator is, their current speed, and estimated arrival time.')}</p>
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/40">{t('notifAt5km', 'Arrival notification at 5km mark')}</span>
                        <div className="w-10 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-primary animate-progress"></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/40">{t('routeOptimization', 'Real-time route optimization')}</span>
                        <CheckCircle2 size={16} className="text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. ADMIN POWER */}
      <section className="py-24 px-6 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeIn} initial="initial" whileInView="whileInView" viewport={{ once: true }} className="order-2 lg:order-1 grid grid-cols-2 gap-4">
              {[
                { title: t('smartDispatch', "Smart Dispatch"), icon: <Settings />, color: "bg-primary/5 text-primary" },
                { title: t('fuelLogic', "Fuel Logic"), icon: <DollarSign />, color: "bg-accent/10 text-accent" },
                { title: t('analytics', "Analytics"), icon: <BarChart3 />, color: "bg-primary/10 text-primary" },
                { title: t('alerts', "Alerts"), icon: <Bell />, color: "bg-accent/5 text-accent" }
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-lg transition-all border border-gray-100">
                  <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center mb-4`}>
                    {item.icon}
                  </div>
                  <h4 className="font-bold">{item.title}</h4>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeInRight} initial="initial" whileInView="whileInView" viewport={{ once: true }} className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2218] mb-6">{t('centralizedAdminPower', 'Centralized Admin Power')}</h2>
              <p className="text-[#1A2218]/60 mb-8">
                {t('adminPowerDesc', 'Our backend does the heavy lifting. From automated dispatch to real-time fuel price monitoring, everything is built to ensure a smooth logistics chain.')}
              </p>
              <div className="space-y-4">
                {[
                  t('adminLogic1', "AI-driven operator matching logic"),
                  t('adminLogic2', "Detailed maintenance and repair logs"),
                  t('adminLogic3', "Daily fuel rate adjustments for fair pricing")
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-primary shrink-0" />
                    <span className="font-medium text-[#1A2218]">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 7. AVAILABLE EVERYWHERE */}
      <section id="download" className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2218] mb-4">{t('availableEverywhere', 'Available Everywhere')}</h2>
            <p className="text-[#1A2218]/60">{t('accessEverywhereSubtext', 'Access TractorLink however you prefer.')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: t('mobileApp', "Mobile App"), desc: t('mobileAppDesc', "For modern smartphone users. Available on iOS & Android."), icon: <Smartphone /> },
              { title: t('ussdHub', "USSD Hub"), desc: t('ussdHubDesc', "No internet? Just dial *347*10# for quick booking."), icon: <Hash /> },
              { title: t('operatorApp', "Operator App"), desc: t('operatorAppDesc', "Dedicated tools for our fleet owners and tractor drivers."), icon: <Tractor /> }
            ].map((platform, idx) => (
              <motion.div 
                key={idx}
                variants={fadeIn}
                whileHover={{ y: -10 }}
                className="p-8 rounded-[2rem] bg-gray-50 border border-gray-100 hover:bg-primary/5 transition-all group"
              >
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  {React.cloneElement(platform.icon, { size: 28 })}
                </div>
                <h3 className="text-xl font-bold mb-3">{platform.title}</h3>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">{platform.desc}</p>
                <button className="text-primary font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                  {t('learnMore', 'Learn More')} <ArrowRight size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. TRUST / COMMUNITY SECTION */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeInLeft} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2218] mb-8">{t('builtForTrust', 'Built for Trust in Agriculture')}</h2>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary shrink-0">
                    <Users size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{t('noMiddlemen', 'No Middlemen')}</h4>
                    <p className="text-gray-500 text-sm">{t('noMiddlemenDesc', 'You connect directly with verified operators, no extra commissions.')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-accent shrink-0">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{t('fairPricing', 'Fair Pricing')}</h4>
                    <p className="text-gray-500 text-sm">{t('fairPricingDesc', 'Automated quotes mean you never get overcharged based on your profile.')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary shrink-0">
                    <Star size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{t('reliableOperators', 'Reliable Operators')}</h4>
                    <p className="text-gray-500 text-sm">{t('reliableOperatorsDesc', 'Our community rating system ensures only the best stay in the network.')}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              variants={fadeInRight}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
              className="bg-primary p-12 rounded-[3rem] text-white text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              </div>
              <div className="relative z-10">
                <Globe size={48} className="mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl md:text-3xl font-bold mb-4">{t('builtForRuralAfrica', 'Built for Rural Africa')}</h3>
                <p className="text-white/70 mb-8 leading-relaxed">
                  {t('builtForRuralAfricaDesc', 'Optimized for low-bandwidth environments and vernacular support.')}.
                </p>
                <div className="flex justify-center gap-4">
                  {['pcm', 'yo', 'en', 'es'].map(lang => (
                    <div key={lang} className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                      {lang}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 9. CTA SECTION */}
      <section className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto bg-[#1A2218] rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>
          
          <motion.div variants={fadeIn} initial="initial" whileInView="whileInView" viewport={{ once: true }} className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">{t('startBookingToday', 'Start Booking Tractors Today')}</h2>
            <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto">
              {t('joinThousands', 'Join thousands of farmers across the country who are increasing their yields with Freeway Agro technology.')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <button 
                className="bg-white text-accent px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/90 shadow-xl transition-all transform hover:scale-105 active:scale-95"
                onClick={handleBookClick}
              >
                {t('bookFirstTractor', 'Book My First Tractor')}
              </button>
              <button 
                className="border-2 border-white/30 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all"
                onClick={() => setIsContactModalOpen(true)}
              >
                {t('contactInfo', 'Contact Info')}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 11. CONTACT MODAL */}
      <AnimatePresence>
        {isContactModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsContactModalOpen(false)}
              className="absolute inset-0 bg-[#1A2218]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-[400px] rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 my-auto"
            >
              <div className="p-8 md:p-12">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-[#1A2218] mb-2 uppercase">{t('contactUs', 'Contact Us')}</h2>
                    <p className="text-sm text-[#1F2937]/60">{t('messageUs', "Send us a message and we'll get back to you shortly.")}</p>
                  </div>
                  <button 
                    onClick={() => setIsContactModalOpen(false)}
                    className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsContactModalOpen(false); alert('Message sent successfully!'); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#1A2218]">{t('fullName', 'Full Name')}</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-5 py-4 bg-[#F9FAFB] border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm font-medium"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#1A2218]">{t('emailAddress', 'Email Address')}</label>
                      <input 
                        type="email" 
                        required 
                        className="w-full px-5 py-4 bg-[#F9FAFB] border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm font-medium"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#1A2218]">{t('subject', 'Subject')}</label>
                    <select className="w-full px-5 py-4 bg-[#F9FAFB] border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm font-medium">
                      <option>{t('tractorBooking', 'Tractor Booking')}</option>
                      <option>{t('partnershipInquiry', 'Partnership Inquiry')}</option>
                      <option>{t('technicalInfo', 'Technical Info')}</option>
                      <option>{t('other', 'Other')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#1A2218]">{t('yourMessage', 'Your Message')}</label>
                    <textarea 
                      required 
                      rows="4"
                      className="w-full px-5 py-4 bg-[#F9FAFB] border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm font-medium resize-none"
                      placeholder={t('howCanWeHelp', 'How can we help you?')}
                    ></textarea>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:opacity-90 shadow-xl shadow-accent/20 transition-all active:scale-95"
                  >
                    {t('sendMessage', 'Send Message')}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. FOOTER */}
      <footer className="py-16 px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-12 border-b border-gray-100">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <img src="/tractorlink-logo.png" alt="TractorLink Logo" className="w-10 h-10 object-contain" />
                <span className="font-black text-xl tracking-tight uppercase text-[#1A2218]">
                  Tractor <span className="text-accent">Link</span>
                </span>
              </div>
              <p className="text-sm text-[#1F2937]/50 max-w-xs">
                {t('footerDesc', 'A Freeway Agro subsidiary powering the future of precision agriculture in Africa.')}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-x-12 gap-y-6">
              <div className="flex flex-col space-y-3">
                <h5 className="font-bold text-sm">{t('company', 'Company')}</h5>
                <a href="#" className="text-sm text-[#1F2937]/60 hover:text-primary">{t('aboutFreewayAgro', 'About Freeway Agro')}</a>
                <a href="#" className="text-sm text-[#1F2937]/60 hover:text-primary">{t('ourHistory', 'Our History')}</a>
              </div>
              <div className="flex flex-col space-y-3">
                <h5 className="font-bold text-sm">{t('legal', 'Legal')}</h5>
                <a href="#" className="text-sm text-[#1F2937]/60 hover:text-primary">{t('termsOfService', 'Terms of Service')}</a>
                <a href="#" className="text-sm text-[#1F2937]/60 hover:text-primary">{t('privacyPolicy', 'Privacy Policy')}</a>
              </div>
              <div className="flex flex-col space-y-3">
                <h5 className="font-bold text-sm">{t('contact', 'Contact')}</h5>
                <a href="mailto:info@freewayagro.com" className="text-sm text-[#1F2937]/60 hover:text-primary">Info@freewayagro.com</a>
                <a href="tel:+2340000000" className="text-sm text-[#1F2937]/60 hover:text-primary">+234 800 TRACTOR</a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#1A2218]/40">
              © 2026 Freeway Agro. {t('allRightsReserved', 'All rights reserved.')}
            </p>
            <div className="flex items-center gap-4">
               {/* Minimal icons placeholder */}
               <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[#1F2937]/40 hover:text-primary transition-colors cursor-pointer"><Settings size={14} /></div>
               <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[#1F2937]/40 hover:text-primary transition-colors cursor-pointer"><Users size={14} /></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
