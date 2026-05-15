import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, LogOut, CheckCircle, History, Phone } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const [farmer, setFarmer] = useState({
    name: 'Loading...',
    phone: '',
    location: 'Loading...',
    total_bookings: 0,
    language: 'en'
  });
  

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editForm, setEditForm] = useState({ name: '', location: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.farmer.getProfile();
      if (res.success) {
        setFarmer(res.data);
        setEditForm({ 
          name: res.data.name, 
          location: res.data.location, 
          phone: res.data.phone || ''
        });
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };



  const handleSaveProfile = async () => {
    if (!editForm.name || !editForm.location) {
      alert("Name and Location are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.farmer.updateProfile(editForm);
      if (res.success) {
        setFarmer(prev => ({ 
          ...prev, 
          name: res.data.name, 
          location: res.data.location, 
          phone: res.data.phone
        }));
      }
    } catch (error) {
      alert(error.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      alert("Both password fields are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.farmer.changePassword(passwordForm);
      if (res.success) {
        alert("Password updated successfully!");
        setPasswordForm({ oldPassword: '', newPassword: '' });
      }
    } catch (error) {
      alert(error.message || "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageChange = async (langCode) => {
    try {
      const res = await api.farmer.updateLanguage({ language: langCode });
      if (res.success) {
        setFarmer(prev => ({ ...prev, language: langCode }));
        localStorage.setItem('tractorlink_lang', langCode);
        i18n.changeLanguage(langCode);
      }
    } catch (error) {
      alert("Failed to update language");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pb-24 md:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 md:p-8 shadow-[0_15px_35px_rgba(0,0,0,0.05)] flex flex-col items-center text-center relative overflow-hidden rounded-[2rem] border-none group">
            <div className="absolute top-0 left-0 w-32 h-32 bg-earth-green/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:bg-earth-green/20 transition-all duration-700"></div>
            
            <div className="w-20 h-20 bg-earth-card-alt rounded-3xl flex items-center justify-center shadow-lg relative overflow-hidden mb-5 text-earth-brown">
               <span className="text-3xl font-black relative z-10 uppercase">{farmer.name.charAt(0)}</span>
               <div className="absolute bottom-0 w-full h-1 bg-earth-primary shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            </div>
            
            <h1 className="text-xl md:text-2xl font-black text-earth-brown z-10 tracking-tight leading-none mb-1">{farmer.name}</h1>
            <p className="text-[10px] text-earth-brown font-black uppercase tracking-[0.2em] mb-1">{farmer.phone}</p>
            
            <div className="mt-6 w-full flex flex-col gap-3">
               <div className="bg-earth-card-alt/50 p-3.5 rounded-2xl flex items-center justify-center gap-2">
                  <MapPin size={14} className="text-earth-primary" />
                  <span className="text-[9px] uppercase font-black tracking-widest text-earth-brown truncate">{farmer.location || 'No Location Set'}</span>
               </div>
               <div className="bg-earth-card-alt/50 p-3.5 rounded-2xl flex items-center justify-center gap-2">
                  <History size={14} className="text-blue-400" />
                  <span className="text-[9px] uppercase font-black tracking-widest text-earth-brown">{farmer.total_bookings} Bookings</span>
               </div>
            </div>
          </div>

          <Button onClick={logout} className="w-full text-red-500 hover:text-white hover:bg-red-500 font-black tracking-[0.2em] uppercase justify-center h-14 text-[10px] rounded-2xl border-2 border-red-500/10 bg-red-500/5 transition-all shadow-xl group">
            <LogOut size={16} className="mr-2 group-hover:animate-pulse" /> {t('signOut')}
          </Button>
        </div>

        {/* Right Column: Inline Forms */}
        <div className="lg:col-span-2 space-y-6">
           {/* Edit Profile */}
           <div className="bg-white p-6 md:p-8 shadow-[0_15px_35px_rgba(0,0,0,0.05)] rounded-[2rem] border-none">
               <h3 className="font-black text-earth-brown uppercase tracking-widest mb-6 border-b border-earth-dark/10 pb-4 text-[11px]">{t('editProfileDetails')}</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black tracking-widest text-earth-mut pl-1">{t('fullName')}</label>
                    <Input value={editForm.name} onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))} className="bg-earth-card border-none h-12 rounded-xl text-sm font-bold px-4 focus:ring-2 focus:ring-earth-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black tracking-widest text-earth-mut pl-1">Phone Number (Login ID)</label>
                    <Input readOnly value={editForm.phone} className="bg-earth-dark/5 border-none h-12 rounded-xl text-sm font-bold px-4 cursor-not-allowed text-earth-mut" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[9px] uppercase font-black tracking-widest text-earth-mut pl-1">Location / Region</label>
                    <Input value={editForm.location} onChange={e => setEditForm(prev => ({...prev, location: e.target.value}))} className="bg-earth-card border-none h-12 rounded-xl text-sm font-bold px-4 focus:ring-2 focus:ring-earth-primary/20" />
                  </div>
               </div>
               <Button onClick={handleSaveProfile} disabled={isSubmitting || !editForm.name || !editForm.location} className="w-full sm:w-auto px-8 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-accent text-white hover:opacity-90 border-none shadow-[0_8px_20px_rgba(255,152,0,0.25)]">
                  {isSubmitting ? "Saving..." : "Save Profile Changes"}
               </Button>
           </div>

           {/* Security */}
           <div className="bg-white p-6 md:p-8 shadow-[0_15px_35px_rgba(0,0,0,0.05)] rounded-[2rem] border-none">
               <h3 className="font-black text-earth-brown uppercase tracking-widest mb-6 border-b border-earth-dark/10 pb-4 text-[11px]">Password Update</h3>
               <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-black tracking-widest text-earth-mut pl-1">Current Password</label>
                      <Input 
                        type="password" 
                        autoComplete="current-password"
                        value={passwordForm.oldPassword} 
                        onChange={e => setPasswordForm(prev => ({...prev, oldPassword: e.target.value}))} 
                        className="bg-earth-card border-none h-12 rounded-xl text-sm font-bold px-4 focus:ring-2 focus:ring-earth-primary/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-black tracking-widest text-earth-mut pl-1">New Password</label>
                      <Input 
                        type="password" 
                        autoComplete="new-password"
                        value={passwordForm.newPassword} 
                        onChange={e => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))} 
                        className="bg-earth-card border-none h-12 rounded-xl text-sm font-bold px-4 focus:ring-2 focus:ring-earth-primary/20" 
                      />
                    </div>
                 </div>
                 <Button type="submit" disabled={isSubmitting || !passwordForm.oldPassword || !passwordForm.newPassword} className="w-full sm:w-auto px-8 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-accent text-white hover:opacity-90 border-none shadow-[0_8px_20px_rgba(255,152,0,0.25)] transition-all disabled:opacity-50">
                    {isSubmitting ? "Updating..." : "Update Password"}
                 </Button>
               </form>
           </div>

           {/* Language */}
           <div className="bg-white p-6 md:p-8 shadow-[0_15px_35px_rgba(0,0,0,0.05)] rounded-[2rem] border-none">
               <h3 className="font-black text-earth-brown uppercase tracking-widest mb-6 border-b border-earth-dark/10 pb-4 text-[11px]">{t('systemInterface')}</h3>
               <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'English', code: 'en' },
                    { label: 'Yorùbá', code: 'yo' },
                    { label: 'Pidgin', code: 'pcm' },
                    { label: 'Esan', code: 'es' }
                  ].map((lang) => (
                    <button 
                      key={lang.code} 
                      onClick={() => handleLanguageChange(lang.code)}
                      className={cn(
                      "flex-1 h-14 rounded-2xl border px-5 flex items-center justify-between transition-all group",
                      farmer.language === lang.code ? "bg-earth-primary/10 border-earth-primary/30 text-earth-primary shadow-inner" : "bg-earth-card border-transparent text-earth-sub hover:border-earth-dark/10 hover:text-earth-brown"
                    )}>
                       <span className="font-black text-[10px] uppercase tracking-widest">{lang.label}</span>
                       {farmer.language === lang.code && <CheckCircle size={16} className="text-earth-primary" />}
                    </button>
                  ))}
               </div>
           </div>
        </div>

      </div>
    </div>
  );
}
