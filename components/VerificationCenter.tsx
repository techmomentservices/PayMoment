
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { verifyBVN, verifyNIN, VerificationResult } from '../services/verificationService';
import { db, handleFirestoreError, OperationType } from '../src/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface VerificationCenterProps {
  user: User;
  setUser: (user: User) => void;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const GLOBAL_KYC_KEY = 'paymoment_global_kyc';

const VerificationCenter: React.FC<VerificationCenterProps> = ({ user, setUser, notify }) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'hub' | 'bvn' | 'nin' | 'address' | 'facial'>('hub');
  const [kycInputValue, setKycInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (activeView === 'facial') {
      startCamera();
    } else {
      stopCamera();
    }

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [activeView]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied or error:", err);
      setCameraError("Camera access denied. Please enable permissions in your browser settings.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Track stopped:", track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const validateAndLinkID = async () => {
    if (kycInputValue.length < 11) {
      notify("Please enter a valid 11-digit number", "error");
      return;
    }

    setLoading(true);
    try {
      const type = activeView as 'bvn' | 'nin';
      const result = type === 'bvn' ? await verifyBVN(kycInputValue) : await verifyNIN(kycInputValue);
      
      if (result.success) {
        setVerificationResult(result);
        setShowConfirmation(true);
      } else {
        notify(result.error || "Verification failed", "error");
      }
    } catch (err) {
      console.error("Verification error:", err);
      notify("System error during verification", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmAndSaveID = async () => {
    if (!verificationResult) return;
    
    setLoading(true);
    try {
      const type = activeView as 'bvn' | 'nin';
      let registry: { bvn: string[], nin: string[] } = { bvn: [], nin: [] };
      
      try {
        const registryStr = localStorage.getItem(GLOBAL_KYC_KEY);
        if (registryStr) {
          registry = JSON.parse(registryStr);
        }
      } catch (e) {
        console.error("KYC Registry parse error", e);
      }

      if (registry[type] && registry[type].includes(kycInputValue)) {
        notify(`This ${type.toUpperCase()} is already linked to another PayMoment account.`, "error");
        setLoading(false);
        return;
      }

      if (!registry[type]) registry[type] = [];
      registry[type].push(kycInputValue);
      localStorage.setItem(GLOBAL_KYC_KEY, JSON.stringify(registry));

      const updatedVerification: any = { 
        ...user.verification,
        [type]: true,
        fullName: verificationResult.fullName,
        dob: verificationResult.dob,
        gender: verificationResult.gender,
        stateOfOrigin: verificationResult.stateOfOrigin,
        identityVerified: true
      };

      if (type === 'bvn') {
        updatedVerification.bvnValue = kycInputValue;
      } else if (type === 'nin') {
        updatedVerification.ninValue = kycInputValue;
      }
      
      let newTier = user.tier;
      if (type === 'bvn' && !user.verification.nin) newTier = 1;
      if (type === 'nin') newTier = 2;

      // Use user.uid (the actual document ID from Auth)
      const docId = user.uid || user.payMomentId;
      const userRef = doc(db, 'users', docId); 
      
      await updateDoc(userRef, {
        verification: updatedVerification,
        tier: newTier,
        name: verificationResult.fullName || user.name,
        bankName: (verificationResult as any).bankName || user.bankName || 'PayMoment Bank'
      });

      setUser({ 
        ...user, 
        verification: updatedVerification, 
        tier: newTier,
        name: verificationResult.fullName || user.name,
        bankName: (verificationResult as any).bankName || user.bankName || 'PayMoment Bank'
      });

      setKycInputValue('');
      setVerificationResult(null);
      setShowConfirmation(false);
      setActiveView('hub');
      notify(`${type.toUpperCase()} verified and linked successfully!`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.payMomentId}`);
    } finally {
      setLoading(false);
    }
  };

  const completeFacialMatch = () => {
    setLoading(true);
    setTimeout(() => {
      const updatedUser = { ...user };
      updatedUser.verification.facialMatch = true;
      setUser(updatedUser);
      setLoading(false);
      setActiveView('hub');
      notify("Face ID verified successfully!", 'success');
    }, 3000);
  };

  if (activeView === 'facial') {
    return (
      <div className="max-w-md mx-auto space-y-8 py-10 animate-in zoom-in-95 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-none italic tracking-tighter">Identity Scan</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Position your face within the frame.</p>
        </div>
        
        <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-[4rem] overflow-hidden bg-slate-200 dark:bg-slate-900 border-4 border-white dark:border-slate-800 shadow-2xl">
          {cameraError ? (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-4">
              <span className="text-4xl opacity-40">⚠️</span>
              <p className="text-rose-500 text-xs font-black uppercase tracking-widest">{cameraError}</p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
              <div className="absolute inset-0 border-[20px] border-blue-600/10 pointer-events-none rounded-full scale-90 animate-pulse"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-72 border-2 border-dashed border-white/40 rounded-full"></div>
            </>
          )}
        </div>

        <div className="space-y-4 pt-6">
          <button 
            onClick={completeFacialMatch} 
            disabled={loading || !!cameraError} 
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? 'Analyzing...' : 'Verify My Face'}
          </button>
          <button 
            onClick={() => setActiveView('hub')} 
            className="w-full text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Cancel & Go Back
          </button>
        </div>
      </div>
    );
  }

  if (activeView === 'bvn' || activeView === 'nin') {
    return (
      <div className="max-w-md mx-auto space-y-8 py-10 animate-in slide-in-from-bottom-8">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{activeView} Linkage</h2>
          <p className="text-sm text-slate-500 font-medium">Enter your 11-digit {activeView.toUpperCase()} number to verify your identity.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
           {!showConfirmation ? (
             <>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{activeView.toUpperCase()} Number</label>
                  <input 
                    type="text" 
                    maxLength={11}
                    value={kycInputValue}
                    onChange={(e) => setKycInputValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="00000000000"
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-2xl tracking-widest text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
               </div>
               <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-transparent rounded-2xl flex gap-3">
                  <span className="text-xl">🛡️</span>
                  <p className="text-[9px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest leading-relaxed">
                    Your data is encrypted and cross-checked against federal registries.
                  </p>
               </div>
               <div className="space-y-4">
                  <button 
                    onClick={validateAndLinkID}
                    disabled={kycInputValue.length < 11 || loading}
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {loading ? 'Synchronizing...' : `Verify ${activeView.toUpperCase()}`}
                  </button>
                  <button onClick={() => setActiveView('hub')} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest">Go Back</button>
               </div>
             </>
           ) : (
             <div className="space-y-6">
                <div className="text-center space-y-2">
                   <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-3xl">👤</div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">{verificationResult?.fullName}</h3>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Identity Found</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Date of Birth</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{verificationResult?.dob}</p>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Gender</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{verificationResult?.gender}</p>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl col-span-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">State of Origin</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{verificationResult?.stateOfOrigin}</p>
                   </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-transparent rounded-2xl">
                   <p className="text-[9px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-widest leading-relaxed text-center">
                     Linking this {activeView.toUpperCase()} will update your legal name on PayMoment.
                   </p>
                </div>

                <div className="space-y-3">
                   <button 
                     onClick={confirmAndSaveID}
                     disabled={loading}
                     className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                   >
                     {loading ? 'Linking...' : 'Confirm & Link'}
                   </button>
                   <button onClick={() => setShowConfirmation(false)} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest">Not my details</button>
                </div>
             </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-all shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black bg-gradient-to-r from-blue-800 to-purple-700 bg-clip-text text-transparent italic tracking-tighter leading-none">Verification Hub</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Protecting your Moments with next-gen security.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <TierCard level={1} status={user.tier >= 1 ? 'completed' : 'pending'} limit="₦50k/day" features={["Local Transfers", "Bills", "Airtime"]} />
        <TierCard level={2} status={user.tier >= 2 ? 'completed' : 'pending'} limit="₦500k/day" features={["Unlimited Transfers", "Global Receives", "Naira Cards"]} />
        <TierCard level={3} status={user.tier >= 3 ? 'completed' : 'pending'} limit="₦10M/day" features={["Global SWIFT", "USD Virtual Cards", "Premium Vaults"]} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 transition-colors">
        <div className="px-2">
            <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight leading-none">KYC Checklist</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-1">Status of your Identity Documents</p>
        </div>
        <div className="space-y-4">
           <VerificationItem 
              label="Bank Verification Number (BVN)" 
              status={user.verification.bvn ? `Linked Account` : 'Action Required'} 
              icon="💳"
              onClick={() => setActiveView('bvn')}
              verified={user.verification.bvn}
           />
           <VerificationItem 
              label="National Identity Number (NIN)" 
              status={user.verification.nin ? `Linked Document` : 'Required for Tier 2'} 
              icon="🆔"
              onClick={() => setActiveView('nin')}
              verified={user.verification.nin}
           />
           <VerificationItem 
              label="Face ID Match" 
              status={user.verification.facialMatch ? 'Identity Verified' : 'Required for Security'} 
              icon="👤"
              onClick={() => setActiveView('facial')}
              verified={user.verification.facialMatch}
           />
           <VerificationItem 
              label="Proof of Residence" 
              status={user.verification.address ? 'Verified' : 'Required for Tier 3'} 
              icon="🏠"
              onClick={() => setActiveView('address')}
              verified={user.verification.address}
              disabled={!user.verification.nin || !user.verification.facialMatch}
           />
        </div>
      </div>
    </div>
  );
};

const TierCard = ({ level, status, limit, features }: { level: number, status: string, limit: string, features: string[] }) => (
  <div className={`p-8 rounded-[2.5rem] border transition-all ${status === 'completed' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
     <div className="flex justify-between items-start mb-6">
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${status === 'completed' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
           Tier {level}
        </div>
        {status === 'completed' && <span className="text-2xl">✅</span>}
     </div>
     <h4 className="text-2xl font-black mb-1 text-slate-900 dark:text-white tracking-tight">{limit}</h4>
     <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-6">Daily Outflow Limit</p>
     <div className="space-y-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
             {f}
          </div>
        ))}
     </div>
  </div>
);

const VerificationItem = ({ label, status, icon, onClick, verified, disabled }: { label: string, status: string, icon: string, onClick: () => void, verified: boolean, disabled?: boolean }) => (
  <div 
    className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
      verified 
        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 shadow-inner opacity-80' 
        : disabled 
          ? 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-40 cursor-not-allowed'
          : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800/50 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md'
    }`} 
    onClick={(!verified && !disabled) ? onClick : undefined}
  >
     <div className="flex items-center gap-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-colors ${verified ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-inner' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
          {verified ? '✓' : icon}
        </div>
        <div>
           <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{label}</p>
           <p className={`text-[10px] font-black uppercase tracking-widest mt-1.5 ${verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>{status}</p>
        </div>
     </div>
     {!verified && !disabled && (
       <div className="flex items-center gap-2">
         <span className="text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-100 dark:border-transparent">Verify</span>
       </div>
     )}
     {verified && (
       <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-200 dark:shadow-none">
         ✓
       </div>
     )}
  </div>
);

export default VerificationCenter;
