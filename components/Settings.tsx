
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, parseAuthError } from '../src/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar } from '../App';

interface SettingsProps {
  user: User;
  setUser: (user: User) => void;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, setUser, notify, isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  
  // Security States
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // PIN States
  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinStep, setPinStep] = useState<'verify' | 'new' | 'confirm'>('verify');

  const [editedName, setEditedName] = useState(user.name);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleUpdateProfile = async () => {
    if (!editedName.trim() || !auth.currentUser) return;
    setIsSavingProfile(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { name: editedName.trim() });
      setUser({ ...user, name: editedName.trim() });
      notify("Profile updated successfully", "success");
    } catch (err) {
      notify("Failed to update profile", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      notify("Password changed successfully", "success");
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      notify(parseAuthError(err), "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handlePinUpdate = async () => {
    if (newPinInput !== confirmPinInput) {
      notify("PINs do not match", "error");
      setConfirmPinInput('');
      return;
    }
    if (newPinInput.length !== 4) {
      notify("PIN must be 4 digits", "error");
      return;
    }
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { transactionPin: newPinInput });
      setUser({ ...user, transactionPin: newPinInput });
      notify("PIN changed successfully! You can now use it for transfers.", "success");
      setShowPinChange(false);
      resetPinState();
    } catch (err) {
      console.error(err);
      notify("Failed to update PIN", "error");
    }
  };

  const resetPinState = () => {
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinStep('verify');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">Settings</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Manage your account and preferences</p>
        </div>
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm tap-scale text-slate-500 hover:text-blue-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] border border-slate-200 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
        <TabItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Profile" icon="👤" />
        <TabItem active={activeTab === 'security'} onClick={() => setActiveTab('security')} label="Security" icon="🛡️" />
        <TabItem active={activeTab === 'preferences'} onClick={() => setActiveTab('preferences')} label="Preferences" icon="⚙️" />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <UserAvatar user={user} className="w-32 h-32 border-4 border-slate-50 dark:border-slate-800 ring-4 ring-blue-500/10" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer">
                    <span className="text-white text-xs font-black uppercase tracking-widest">Update</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Legal Name</label>
                      <input 
                        type="text" 
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2 opacity-60">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">PayMoment ID (Immutable)</label>
                      <div className="w-full p-4 bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-500">
                        {user.payMomentId}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={isSavingProfile || editedName === user.name}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl tap-scale disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="font-black text-lg text-slate-900 dark:text-white italic tracking-tight">Personal Info</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard label="Email" value={auth.currentUser?.email || 'Not available'} icon="📧" />
                <InfoCard label="Phone" value={user.phoneNumber || 'Not set'} icon="📱" />
                <InfoCard label="Account Number" value={user.accountNumber} icon="🏦" />
                <InfoCard label="Trust Tier" value={`Level ${user.tier}`} icon="🎖️" />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div 
            key="security"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="font-black text-lg text-slate-900 dark:text-white italic tracking-tight">Account Access</h3>
              <div className="space-y-4">
                <SecurityRow 
                  title="Password" 
                  desc="Last updated recently" 
                  icon="🔑" 
                  onAction={() => setShowPasswordChange(true)} 
                  actionLabel="Change"
                />
                <SecurityRow 
                  title="Transaction PIN" 
                  desc="Required for all outgoing transfers" 
                  icon="🔢" 
                  onAction={() => setShowPinChange(true)} 
                  actionLabel="Reset"
                />
                <SecurityRow 
                  title="Biometric Login" 
                  desc="Enable FaceID or Fingerprint" 
                  icon="🧬" 
                  toggle 
                  checked={true}
                />
                <SecurityRow 
                  title="Two-Factor Authentication" 
                  desc="Secure your account with 2FA" 
                  icon="🛡️" 
                  status="Active"
                />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'preferences' && (
          <motion.div 
            key="preferences"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="font-black text-lg text-slate-900 dark:text-white italic tracking-tight">App Experience</h3>
              <div className="space-y-4">
                <SecurityRow 
                  title="Dark Mode" 
                  desc="Switch between light and dark themes" 
                  icon={isDarkMode ? '🌙' : '🌞'} 
                  toggle 
                  checked={isDarkMode}
                  onAction={toggleDarkMode}
                />
                <SecurityRow 
                  title="Notifications" 
                  desc="Payment alerts and updates" 
                  icon="🔔" 
                  toggle 
                  checked={true}
                />
                <SecurityRow 
                  title="Privacy Mode" 
                  desc="Hide balance on dashboard" 
                  icon="👁️" 
                  toggle 
                  checked={false}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showPasswordChange && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 sm:p-24 bg-slate-950/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-8"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter">Change Password</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Verify your identity to proceed</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Current Password</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-black"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handlePasswordChange}
                  disabled={isUpdatingPassword || !currentPassword || !newPassword}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
                <button onClick={() => setShowPasswordChange(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showPinChange && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-6"
             >
               <div className="text-center space-y-1">
                 <h3 className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter">
                   {pinStep === 'verify' ? 'Verify Current PIN' : 
                    pinStep === 'new' ? 'Choose New PIN' : 'Confirm New PIN'}
                 </h3>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                   {pinStep === 'verify' ? 'Enter your 4-digit PIN' : 
                    pinStep === 'new' ? 'Choose a secure 4-digit PIN' : 'Re-enter your new 4-digit PIN'}
                 </p>
               </div>
               
               <div className="flex justify-center gap-3">
                 {[...Array(4)].map((_, i) => {
                   const val = pinStep === 'verify' ? currentPinInput : 
                               pinStep === 'new' ? newPinInput : confirmPinInput;
                   const isActive = val.length === i;
                   const isFilled = val.length > i;
                   return (
                    <div 
                      key={i} 
                      className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${
                        isActive 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-[0_0_15px_rgba(37,99,235,0.2)] scale-110' 
                          : isFilled 
                            ? 'border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800' 
                            : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5'
                      }`}
                    >
                      {isFilled ? (
                        <div className="w-3 h-3 bg-slate-900 dark:bg-white rounded-full animate-in zoom-in duration-200" />
                      ) : isActive ? (
                        <div className="w-0.5 h-6 bg-blue-600 animate-pulse rounded-full" />
                      ) : null}
                    </div>
                   );
                 })}
               </div>

               <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
                 {['1','2','3','4','5','6','7','8','9','','0','del'].map((key, i) => (
                   <button 
                     key={i} 
                     type="button"
                     onClick={() => {
                        const val = pinStep === 'verify' ? currentPinInput : 
                                    pinStep === 'new' ? newPinInput : confirmPinInput;
                        const setter = pinStep === 'verify' ? setCurrentPinInput : 
                                       pinStep === 'new' ? setNewPinInput : setConfirmPinInput;
                                       
                        if (key === 'del') setter(val.slice(0, -1));
                        else if (key && val.length < 4) setter(val + key);
                     }}
                     className={`h-14 w-full rounded-xl flex items-center justify-center text-xl font-black transition-all ${key ? 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white active:bg-blue-600 active:text-white active:scale-90 tap-scale' : 'opacity-0 pointer-events-none'}`}
                   >
                     {key === 'del' ? '⌫' : key}
                   </button>
                 ))}
               </div>

               <div className="flex flex-col gap-2 mt-2">
                 {pinStep === 'verify' ? (
                   <button 
                    onClick={() => {
                      if (currentPinInput === (user.transactionPin || '1234')) {
                        setPinStep('new');
                      } else {
                        notify("Incorrect current PIN. Hint: Default is 1234", "error");
                        setCurrentPinInput('');
                      }
                    }}
                    disabled={currentPinInput.length < 4}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg disabled:opacity-30 transition-all active:scale-95"
                   >
                     Verify & Continue
                   </button>
                 ) : pinStep === 'new' ? (
                   <button 
                    onClick={() => setPinStep('confirm')}
                    disabled={newPinInput.length < 4}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg disabled:opacity-30 transition-all active:scale-95"
                   >
                     Next: Confirm PIN
                   </button>
                 ) : (
                    <button 
                      onClick={handlePinUpdate}
                      disabled={confirmPinInput.length < 4}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg disabled:opacity-30 transition-all active:scale-95"
                    >
                      Confirm & Save PIN
                    </button>
                 )}
                 <button 
                  onClick={() => { setShowPinChange(false); resetPinState(); }} 
                  className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TabItem = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: string }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all tap-scale whitespace-nowrap ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
  >
    <span>{icon}</span>
    {label}
  </button>
);

const SecurityRow = ({ title, desc, icon, toggle, checked, onAction, actionLabel, status }: { title: string, desc: string, icon: string, toggle?: boolean, checked?: boolean, onAction?: () => void, actionLabel?: string, status?: string }) => (
  <div className="flex items-center justify-between py-4 group">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-black text-slate-900 dark:text-white text-sm">{title}</h4>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">{desc}</p>
      </div>
    </div>
    {toggle ? (
      <button 
        onClick={onAction}
        className={`w-12 h-6 rounded-full p-1 transition-all ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : ''}`} />
      </button>
    ) : actionLabel ? (
      <button onClick={onAction} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 tap-scale">
        {actionLabel}
      </button>
    ) : (
      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full uppercase tracking-widest">
        {status}
      </span>
    )}
  </div>
);

const InfoCard = ({ label, value, icon }: { label: string, value: string, icon: string }) => (
  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
    <span className="text-xl">{icon}</span>
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export default Settings;
