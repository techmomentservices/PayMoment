
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../src/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { User } from '../types';
import { UserAvatar } from '../App';

interface ProfileProps {
  user: User;
  setUser: (user: User) => void;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onSignOut: () => void;
  onReset: () => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

const TIER_BENEFITS = [
  { level: 1, name: 'Basic', limit: '₦50,000' },
  { level: 2, name: 'Advanced', limit: '₦500,000' },
  { level: 3, name: 'Premium', limit: '₦10,000,000' },
];

const Profile: React.FC<ProfileProps> = ({ user, setUser, notify, onSignOut, onReset, isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [show2faReset, setShow2faReset] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [newPin, setNewPin] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    notify("Copied to clipboard!", "success");
  };

  const [showSandbox, setShowSandbox] = useState(false);
  const [sandboxAccount, setSandboxAccount] = useState('');
  const [sandboxName, setSandboxName] = useState('');
  const [isSavingSandbox, setIsSavingSandbox] = useState(false);

  const handleSaveSandbox = async () => {
    if (!sandboxAccount || !sandboxName || !auth.currentUser) return;
    setIsSavingSandbox(true);
    try {
      await setDoc(doc(db, 'sandbox_accounts', sandboxAccount), {
        accountNumber: sandboxAccount,
        accountName: sandboxName.toUpperCase(),
        createdBy: auth.currentUser.uid,
        timestamp: new Date().toISOString()
      });
      notify("Sandbox account mapped successfully!", "success");
      setSandboxAccount('');
      setSandboxName('');
      setShowSandbox(false);
    } catch (err) {
      console.error("Failed to save sandbox account", err);
      notify("Failed to save mapping", "error");
    } finally {
      setIsSavingSandbox(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editedName.trim() || !auth.currentUser) return;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        name: editedName.trim()
      });
      setUser({ ...user, name: editedName.trim() });
      setIsEditingName(false);
      notify("Legal name updated successfully!", "success");
    } catch (err) {
      console.error("Failed to update name", err);
      notify("Failed to update name", "error");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser({ ...user, profilePicture: reader.result as string });
        notify("Profile picture updated!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const startWipeProcess = () => {
    notify("Reset verification required.", "info");
    setShow2faReset(true);
  };

  const handlePinSetup = async () => {
    if (newPin.length !== 4) {
      notify("PIN must be 4 digits", "error");
      return;
    }
    
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        transactionPin: newPin
      });
      setUser({ ...user, transactionPin: newPin });
      setShowPinSetup(false);
      setNewPin('');
      notify("PIN updated successfully! Use it to authorize transactions.", "success");
    } catch (err) {
      console.error("Failed to update PIN", err);
      notify("Failed to update PIN", "error");
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-reset-${index + 1}`);
      nextInput?.focus();
    }

    if (newOtp.every(d => d !== '')) {
      setShow2faReset(false);
      onReset();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="flex flex-col items-center gap-6">
        <div className="relative group">
          <UserAvatar user={user} className="w-28 h-28 md:w-36 md:h-36 border-4 border-white dark:border-slate-800 ring-4 ring-blue-500/20" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 w-10 h-10 bg-blue-600 text-white rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center shadow-lg tap-scale"
          >
            📸
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePhotoUpload} 
            className="hidden" 
            accept="image/*" 
          />
        </div>
        <div className="text-center space-y-2">
           {isEditingName ? (
             <div className="flex flex-col items-center gap-3">
               <input 
                 type="text" 
                 value={editedName} 
                 onChange={(e) => setEditedName(e.target.value)}
                 className="text-2xl font-black text-center bg-slate-50 dark:bg-slate-800 border-2 border-blue-500 rounded-2xl px-4 py-2 outline-none text-slate-900 dark:text-white italic tracking-tighter"
                 autoFocus
               />
               <div className="flex gap-2">
                 <button 
                   onClick={handleUpdateName}
                   className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                 >
                   Save
                 </button>
                 <button 
                   onClick={() => { setIsEditingName(false); setEditedName(user.name); }}
                   className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           ) : (
             <div className="group flex items-center justify-center gap-2">
               <h2 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">{user.name}</h2>
               {user.verification.identityVerified && (
                 <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-[11px] shadow-sm animate-in zoom-in" title="Identity Verified">✓</span>
               )}
               <button 
                 onClick={() => setIsEditingName(true)}
                 className="p-2 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
               >
                 ✏️
               </button>
             </div>
           )}
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">@{user.payMomentId} • Tier {user.tier} Verified</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
            <h3 className="font-black text-lg text-slate-900 dark:text-white italic tracking-tight">Financial Identity</h3>
            <div className="space-y-4">
              <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Number</p>
                 <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-slate-900 dark:text-white tracking-widest tabular-nums">{user.accountNumber}</span>
                    <button 
                      onClick={() => handleCopy(user.accountNumber)}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl tap-scale"
                    >
                      Copy
                    </button>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
             <div className="flex justify-between items-center">
                <h3 className="font-black text-lg text-slate-900 dark:text-white italic tracking-tight">Trust Level</h3>
                <button onClick={() => navigate('/verification')} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Upgrade →</button>
             </div>
             <div className="space-y-4">
                {TIER_BENEFITS.map((tier, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border transition-all ${idx + 1 === user.tier ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60'}`}>
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Level {tier.level}</span>
                        {user.tier >= tier.level && <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full uppercase tracking-widest">Verified</span>}
                     </div>
                     <div className="flex justify-between items-end">
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">{tier.name}</p>
                        </div>
                        <p className="font-black text-blue-600 dark:text-blue-400 text-sm">{tier.limit}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
              <h3 className="font-black text-lg text-slate-900 dark:text-white italic tracking-tight">Settings</h3>
              <div className="space-y-2">
                 {toggleDarkMode && (
                   <SecurityItem 
                     icon={isDarkMode ? '🌞' : '🌙'} 
                     label="Dark Mode" 
                     checked={isDarkMode} 
                     onClick={toggleDarkMode}
                   />
                 )}
                 <SecurityItem 
                   icon="🔑" 
                   label="Transaction PIN" 
                   status={user.transactionPin ? "Active" : "Set PIN"} 
                   onClick={() => setShowPinSetup(true)}
                 />
                 <SecurityItem icon="🛡️" label="Fraud Protection" status="Active" />
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
              <h3 className="font-black text-lg text-slate-900 dark:text-white italic tracking-tight">Developer Tools</h3>
              <div className="space-y-2">
                 <SecurityItem 
                   icon="🛠️" 
                   label="Banking Switch Sandbox" 
                   status="Configure"
                   onClick={() => setShowSandbox(true)}
                 />
                 <p className="text-[9px] font-bold text-slate-400 px-1 italic">Use this to map account numbers to real names for testing.</p>
              </div>
           </div>

           <div className="space-y-4">
             <button onClick={onSignOut} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl tap-scale">LOGOUT</button>
             <button onClick={startWipeProcess} className="w-full py-5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-[2rem] font-black uppercase tracking-widest text-[9px] border border-rose-100 dark:border-rose-900/30 tap-scale">WIPE ALL DATA</button>
           </div>
        </div>
      </div>

      {showPinSetup && (
        <div className="fixed inset-0 z-[400] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-md text-center space-y-10">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white italic tracking-tighter">{user.transactionPin ? 'Update' : 'Set'} Transaction PIN</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Enter a 4-digit PIN for authorizing transactions.</p>
              </div>
              
              <div className="flex justify-center gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${newPin.length > i ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-700'}`}>
                    {newPin.length > i ? '●' : ''}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
                {['1','2','3','4','5','6','7','8','9','','0','del'].map((key, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      if (key === 'del') setNewPin(newPin.slice(0, -1));
                      else if (key && newPin.length < 4) setNewPin(newPin + key);
                    }}
                    className={`h-16 rounded-2xl flex items-center justify-center text-2xl font-black transition-all ${key ? 'bg-white/5 border border-white/10 text-white active:bg-blue-600 active:scale-95' : 'opacity-0 pointer-events-none'}`}
                  >
                    {key === 'del' ? '⌫' : key}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={handlePinSetup}
                  disabled={newPin.length < 4}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
                >
                  Save PIN
                </button>
                <button onClick={() => { setShowPinSetup(false); setNewPin(''); }} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {show2faReset && (
        <div className="fixed inset-0 z-[400] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-md text-center space-y-10">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white italic tracking-tighter">Confirm Identity</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">A security code was sent to wipe this session's data.</p>
              </div>
              <div className="flex justify-center gap-3">
                 {otp.map((digit, i) => (
                   <input 
                     key={i}
                     id={`otp-reset-${i}`}
                     type="text"
                     maxLength={1}
                     value={digit}
                     onChange={(e) => handleOtpChange(i, e.target.value)}
                     className="w-12 h-16 bg-white/5 border-2 border-white/10 rounded-2xl text-center text-2xl font-black text-white outline-none focus:border-blue-500 transition-all"
                   />
                 ))}
              </div>
              <button onClick={() => setShow2faReset(false)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cancel</button>
           </div>
        </div>
      )}

      {showSandbox && (
        <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] p-10 space-y-8 border-2 border-blue-500/30">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">Banking Sandbox</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Map account numbers to real names for testing.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Test Account Number</label>
                  <input 
                    type="text" 
                    value={sandboxAccount} 
                    onChange={(e) => setSandboxAccount(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 0123456789"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Expected Legal Name</label>
                  <input 
                    type="text" 
                    value={sandboxName} 
                    onChange={(e) => setSandboxName(e.target.value.toUpperCase())}
                    placeholder="e.g. JOHN DOE"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleSaveSandbox}
                  disabled={!sandboxAccount || !sandboxName || isSavingSandbox}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
                >
                  {isSavingSandbox ? 'Saving...' : 'Save Mapping'}
                </button>
                <button onClick={() => setShowSandbox(false)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Close Sandbox</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SecurityItem = ({ icon, label, checked, status, onClick }: { icon: string, label: string, checked?: boolean, status?: string, onClick?: () => void }) => (
  <div className="flex items-center justify-between py-3.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl transition-colors cursor-pointer group" onClick={onClick}>
    <div className="flex items-center gap-3">
       <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
       <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>
    </div>
    {checked !== undefined ? (
      <div className={`w-10 h-5 rounded-full p-1 transition-all ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
         <div className={`w-3 h-3 bg-white rounded-full transition-all ${checked ? 'translate-x-5' : ''}`}></div>
      </div>
    ) : (
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{status || '→'}</span>
    )}
  </div>
);

export default Profile;
