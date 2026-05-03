
import React, { useState, useRef } from 'react';
import { PayMomentLogo } from '../App';
import { signInWithPopup, auth, googleProvider, githubProvider, parseAuthError } from '../src/firebase';

interface AuthFlowProps {
  onRegister: (name: string, id: string, phone: string, pin: string, email?: string, password?: string) => void;
  onSignIn: (email: string, password?: string) => void;
  isDarkMode: boolean;
}

const AuthFlow: React.FC<AuthFlowProps> = ({ onRegister, onSignIn, isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'landing' | 'register' | 'login'>('landing');
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login failed", err);
      const parsed = parseAuthError(err);
      if (parsed.includes('check your credentials') || parsed.includes('invalid-credential')) {
        setError(parsed + " Tip: If Google login fails, try opening this app in a new tab using the icon at the top right.");
      } else {
        setError(parsed);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, githubProvider);
    } catch (err: any) {
      console.error("GitHub Login failed", err);
      const parsed = parseAuthError(err);
      if (parsed.includes('Connectivity') || parsed.includes('operation-not-allowed')) {
        setError(parsed + " Note: GitHub login must be enabled in your Firebase console and this app must be opened in a new tab.");
      } else {
        setError(parsed);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const trimmedEmail = regEmail.trim();
    const trimmedName = regName.trim();
    const trimmedUsername = regUsername.trim().replace(/^@/, '');
    const trimmedPhone = regPhone.trim();
    const trimmedPin = regPin.trim();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }
    if (!trimmedUsername) {
      setError("Please choose a PayMoment ID.");
      return;
    }
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!regPassword) {
      setError("Please enter a password.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!trimmedPhone) {
      setError("Please enter your phone number.");
      return;
    }
    if (trimmedPin.length !== 4) {
      setError("Transaction PIN must be exactly 4 digits.");
      return;
    }
    if (!/^\d+$/.test(trimmedPin)) {
      setError("Transaction PIN must contain only numbers.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onRegister(trimmedName, trimmedUsername, trimmedPhone, trimmedPin, trimmedEmail, regPassword);
    } catch (err: any) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!loginPassword) {
      setError("Please enter your password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSignIn(trimmedEmail, loginPassword);
    } catch (err: any) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (view === 'login') {
    return (
      <div className={`fixed inset-0 z-[150] flex flex-col overflow-y-auto no-scrollbar transition-colors duration-500 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-900'}`}>
        <div className="relative flex-1 flex items-center justify-center p-6 min-h-full">
          <div className="w-full max-w-md space-y-8 py-10">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black italic tracking-tighter text-white">Welcome Back</h2>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-[9px]">Login to your account</p>
            </div>

            <div className="space-y-4">
              <AuthInput label="Email Address" value={loginEmail} onChange={setLoginEmail} placeholder="john@example.com" type="email" />
              <AuthInput label="Password" value={loginPassword} onChange={setLoginPassword} placeholder="••••••••" type="password" />
              
              {error && (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold leading-relaxed">
                    {error}
                  </div>
                  {error.includes('Connectivity') && (
                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-2">
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest text-left">Connectivity Help:</p>
                      <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc font-medium text-left">
                        <li>Use the <span className="text-white font-bold">"Open in New Tab"</span> icon.</li>
                        <li>Check if <span className="text-white font-bold">Third-Party Cookies</span> are blocked.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleEmailLogin}
                disabled={loading}
                className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Login'}
              </button>
              
              <button onClick={() => setView('landing')} className="w-full text-slate-500 font-black uppercase tracking-widest text-[10px]">Back</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div className={`fixed inset-0 z-[150] flex flex-col overflow-y-auto no-scrollbar transition-colors duration-500 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-900'}`}>
        <div className="relative flex-1 flex items-center justify-center p-6 min-h-full">
          <div className="w-full max-w-md space-y-8 py-10">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black italic tracking-tighter text-white">Create Account</h2>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-[9px]">Join the Moment</p>
            </div>

            <div className="space-y-4">
              <AuthInput label="Full Name" value={regName} onChange={setRegName} placeholder="John Doe" />
              <AuthInput label="PayMoment ID" value={regUsername} onChange={setRegUsername} placeholder="username" prefix="@" />
              <AuthInput label="Email Address" value={regEmail} onChange={setRegEmail} placeholder="john@example.com" type="email" />
              <AuthInput label="Password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" type="password" />
              <AuthInput label="Phone Number" value={regPhone} onChange={setRegPhone} placeholder="08012345678" type="tel" inputMode="tel" />
              <AuthInput label="Transaction PIN" value={regPin} onChange={setRegPin} placeholder="••••" type="password" maxLength={4} inputMode="numeric" />
              
              {error && (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold leading-relaxed">
                    {error}
                  </div>
                  {error.includes('Connectivity') && (
                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-2">
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest text-left">Connectivity Help:</p>
                      <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc font-medium text-left">
                        <li>Use the <span className="text-white font-bold">"Open in New Tab"</span> icon.</li>
                        <li>Check if <span className="text-white font-bold">Third-Party Cookies</span> are blocked.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Create My Account'}
              </button>
              
              <button onClick={() => setView('landing')} className="w-full text-slate-500 font-black uppercase tracking-widest text-[10px]">Back</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[150] flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar transition-colors duration-500 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-900'}`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-full h-full bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-full h-full bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative flex-1 flex items-center justify-center p-6 min-h-full">
        <div className="w-full max-w-6xl py-4 md:py-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          <div className="flex-1 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-10 duration-700">
            <div className="space-y-4">
              <div className="flex justify-center lg:justify-start">
                <PayMomentLogo className="w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32" />
              </div>
              <div className="space-y-2">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black italic tracking-tighter text-white">PayMoment</h1>
                <p className="text-blue-400 font-bold uppercase tracking-[0.4em] text-[10px] lg:text-[11px]">Premium Nigerian Wealth Hub</p>
              </div>
              <p className="text-slate-400 font-medium text-sm md:text-base max-w-lg mx-auto lg:mx-0 leading-relaxed">
                The next generation of banking for the modern Nigerian. Secure, lightning-fast, and globally connected.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-2 gap-4 text-left">
              <Feature icon="⚡" title="Real-time Banking" desc="Transfers settle in seconds." />
              <Feature icon="🌎" title="Global Wallet" desc="Instant USD & GBP accounts." />
              <Feature icon="🛡️" title="Secure" desc="Google Guard Protected." />
            </div>
          </div>

          <div className="w-full max-w-md space-y-6 bg-white/5 p-8 md:p-10 rounded-[3rem] border border-white/10 backdrop-blur-xl animate-in fade-in slide-in-from-right-10 duration-700 shadow-2xl relative overflow-hidden">
            {error && (
              <div className="space-y-4">
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold leading-relaxed">
                  {error}
                </div>
                {(error.includes('Connectivity') || error.includes('Tab')) && (
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-2">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Connectivity Help:</p>
                    <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc font-medium">
                      <li>Use the <span className="text-white font-bold">"Open in New Tab"</span> icon at the top right of this preview.</li>
                      <li>Check if <span className="text-white font-bold">Third-Party Cookies</span> are blocked in your browser.</li>
                      <li className="text-blue-300 font-bold">Tip: If you're trying to export/upload to GitHub, I've added a .gitignore to optimize your project.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-5 bg-white text-slate-950 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-xs flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </>
                )}
              </button>

              <button 
                onClick={handleGithubLogin}
                className="w-full py-5 bg-slate-800 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-xs flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </button>
              
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">OR</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <button 
                onClick={() => setView('register')}
                className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-xs"
              >
                Create Account
              </button>

              <button 
                onClick={() => setView('login')}
                className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-xs"
              >
                Login with Email
              </button>

              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">
                By continuing, you agree to our Terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
  <div className="flex gap-5 items-center p-4 bg-white/5 border border-white/10 rounded-3xl">
    <div className="w-10 h-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-xl shrink-0">{icon}</div>
    <div>
      <h4 className="font-bold text-white text-[13px]">{title}</h4>
      <p className="text-[10px] text-slate-500 font-medium">{desc}</p>
    </div>
  </div>
);

const AuthInput = ({ label, value, onChange, placeholder, prefix, type = "text", maxLength, inputMode }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-500">{prefix}</span>}
      <input 
        type={type}
        value={value}
        onChange={(e) => {
          if (maxLength && e.target.value.length > maxLength) return;
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`w-full p-6 bg-white/5 border border-white/10 rounded-3xl outline-none focus:border-blue-500 transition-all text-white font-bold placeholder:text-white/10 ${prefix ? 'pl-12' : ''}`}
      />
    </div>
  </div>
);

export default AuthFlow;
