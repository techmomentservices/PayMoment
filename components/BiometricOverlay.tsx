
import React, { useState, useMemo, useRef } from 'react';
import { User } from '../types';
import { UserAvatar } from '../App';

interface BiometricOverlayProps {
  onAuthenticated: () => void;
  isDarkMode?: boolean;
  userName: string;
  user: User;
}

const BiometricOverlay: React.FC<BiometricOverlayProps> = ({ onAuthenticated, isDarkMode, userName, user }) => {
  const [mode, setMode] = useState<'biometric' | 'pin'>('biometric');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success'>('idle');
  const [pin, setPin] = useState<string>('');
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Dynamic greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const startVerification = () => {
    if (status !== 'idle') return;
    setStatus('verifying');
    // Simulate high-speed security check
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        onAuthenticated();
      }, 800);
    }, 1500);
  };

  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setStatus('success');
        setTimeout(onAuthenticated, 800);
      }
    }
  };

  const deletePinInput = () => {
    setPin(pin.slice(0, -1));
  };

  const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    if (val.length === 4) {
      setStatus('success');
      setTimeout(onAuthenticated, 800);
    }
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('paymoment_user_data');
    localStorage.removeItem('paymoment_is_logged_in');
    window.location.reload();
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-900'}`}>
      <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[100%] h-[100%] bg-purple-600/20 rounded-full blur-[120px]"></div>

      <div className="relative z-10 text-center space-y-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="relative">
             <UserAvatar user={user} className={`w-28 h-28 border-4 border-white/20 transition-all duration-500 ${status === 'verifying' ? 'scale-110 rotate-3' : ''}`} />
             <div className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full border-4 border-slate-900 flex items-center justify-center text-xs transition-all duration-300 ${status === 'success' ? 'bg-green-500 scale-110' : 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'}`}>
               {status === 'success' ? '✅' : '🔒'}
             </div>
          </div>

          <div className="space-y-1">
            <p className="text-blue-400 text-xs font-black uppercase tracking-[0.2em]">{greeting}, Welcome back</p>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">{userName}</h1>
          </div>
        </div>

        {mode === 'biometric' ? (
          <div className="space-y-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative flex justify-center items-center h-32">
              <div className={`absolute w-32 h-32 border-2 border-white/10 rounded-full ${status === 'verifying' ? 'animate-ping' : ''}`}></div>
              <button 
                onClick={startVerification}
                disabled={status !== 'idle'}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 tap-scale ${
                  status === 'success' ? 'bg-green-500 scale-110 shadow-[0_0_40px_rgba(34,197,94,0.5)]' : 'bg-white/5 active:bg-white/10'
                }`}
              >
                {status === 'success' ? (
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className={`w-12 h-12 ${status === 'verifying' ? 'text-blue-400 animate-pulse' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 18a10.003 10.003 0 01-8.212-4.33l-.054-.09m9.158-11.154l-.054-.09A10.003 10.003 0 0012 20M3 12h18" />
                  </svg>
                )}
              </button>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {status === 'verifying' ? 'Scanning Security Key...' : status === 'idle' ? 'Tap icon to Verify' : 'Authorized'}
            </p>

            <div className="pt-4 flex flex-col gap-6">
              <button 
                onClick={() => setMode('pin')}
                className="text-[10px] font-black text-white/60 uppercase tracking-widest hover:text-white"
              >
                Use Secure PIN
              </button>
              <button 
                onClick={handleSwitchAccount}
                className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest hover:text-blue-400"
              >
                Log in as different User
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* NEW BOX-STYLE PIN DISPLAY FOR LOGIN */}
            <div className="flex justify-center gap-4" onClick={() => hiddenInputRef.current?.focus()}>
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                    pin.length === i ? 'border-blue-500 bg-blue-500/10 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 
                    pin.length > i ? 'border-white bg-white/10' : 'border-white/20 bg-white/5'
                  }`}
                >
                  {pin.length > i ? (
                     <span className="text-white text-3xl font-black">{pin[i]}</span>
                  ) : pin.length === i ? (
                     <div className="w-1 h-8 bg-blue-500 animate-pulse rounded-full"></div>
                  ) : null}
                </div>
              ))}
            </div>

            <input 
              ref={hiddenInputRef}
              type="tel" pattern="[0-9]*" inputMode="numeric"
              value={pin} onChange={handleHiddenInputChange}
              className="absolute opacity-0 pointer-events-none"
            />

            <div className="grid grid-cols-3 gap-6 mx-auto w-fit">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button 
                  key={num} onClick={() => handlePinInput(num)}
                  className="w-16 h-16 rounded-2xl bg-white/5 text-xl font-bold text-white hover:bg-white/10 active:scale-90 transition-all border border-white/5"
                >
                  {num}
                </button>
              ))}
              <button onClick={handleSwitchAccount} className="text-[10px] text-slate-500 font-bold uppercase leading-none">Switch</button>
              <button 
                onClick={() => handlePinInput('0')}
                className="w-16 h-16 rounded-2xl bg-white/5 text-xl font-bold text-white hover:bg-white/10 active:scale-90 transition-all border border-white/5"
              >
                0
              </button>
              <button 
                onClick={deletePinInput}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5"
              >
                ←
              </button>
            </div>

            <button 
              onClick={() => { setMode('biometric'); setPin(''); }}
              className="text-[10px] font-black text-blue-400 uppercase tracking-widest underline underline-offset-8"
            >
              Back to Security Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometricOverlay;
