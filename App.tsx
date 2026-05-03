
// App Entry Point - Integrated with Firebase for Real-time Data
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, auth, db, signOut, FirebaseUser, handleFirestoreError, OperationType, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, parseAuthError } from './src/firebase';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, collection, query, orderBy, limit, runTransaction } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import AIAssistant from './components/AIAssistant';
import VirtualCards from './components/VirtualCards';
import Transactions from './components/Transactions';
import Savings from './components/Savings';
import Transfer from './components/Transfer';
import InternationalTransfer from './components/InternationalTransfer';
import DomiciliaryAccounts from './components/DomiciliaryAccounts';
import CurrencySwap from './components/CurrencySwap';
import WithdrawToNaira from './components/WithdrawToNaira';
import Referrals from './components/Referrals';
import Bills from './components/Bills';
import QRCode from './components/QRCode';
import Profile from './components/Profile';
import Settings from './components/Settings';
import VerificationCenter from './components/VerificationCenter';
import BiometricOverlay from './components/BiometricOverlay';
import AuthFlow from './components/AuthFlow';
import AccountDetails from './components/AccountDetails';
import ReceiveGlobal from './components/ReceiveGlobal';
import PaymentCheckout from './components/PaymentCheckout';
import Rewards from './components/Rewards';
import Investments from './components/Investments';
import SplitBill from './components/SplitBill';
import Marketplace from './components/Marketplace';
import { User, Transaction } from './types';

interface Notification {
  message: string;
  type: 'success' | 'info' | 'error';
}

const STORAGE_KEY = 'paymoment_user_data';
const LOGIN_KEY = 'paymoment_is_logged_in';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo);
        if (parsed.error && parsed.error.includes('insufficient permissions')) {
          displayMessage = "You don't have permission to perform this action. Please check your account status.";
        }
      } catch (e) {}

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-black italic tracking-tighter mb-4">Application Error</h2>
          <p className="text-slate-500 font-medium mb-8 max-w-md">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const PayMomentLogo = ({ className = "w-10 h-10", idSuffix = "main" }: { className?: string, idSuffix?: string }) => (
  <div className={`${className} flex-shrink-0`}>
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm overflow-visible">
      <defs>
        <linearGradient id={"pmLogoGradient-" + idSuffix} x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="28" fill={"url(#pmLogoGradient-" + idSuffix + ")"} />
      <text 
        x="51%" 
        y="52%" 
        dominantBaseline="middle" 
        textAnchor="middle" 
        fill="white" 
        style={{ 
          fontFamily: "'Inter', sans-serif", 
          fontWeight: 900, 
          fontSize: '40px',
          fontStyle: 'italic',
          letterSpacing: '-0.05em'
        }}
      >
        PM
      </text>
    </svg>
  </div>
);

export const UserAvatar = ({ user, className = "w-10 h-10", onClick }: { user: User, className?: string, onClick?: () => void }) => (
  <div onClick={onClick} className={`relative shrink-0 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-md transition-all tap-scale cursor-pointer ${className}`}>
    {user.profilePicture ? (
      <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-xs md:text-sm">
        {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'AS'}
      </div>
    )}
  </div>
);

const AppContent: React.FC<{ 
  user: User, 
  setUser: React.Dispatch<React.SetStateAction<User>>,
  isDarkMode: boolean,
  toggleDarkMode: () => void,
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void,
  processTransaction: (tx: Transaction, currency: string, pin?: string) => Promise<void>,
  onSignOut: () => void,
  onReset: () => void,
  loading: boolean,
  fundAccount: (amount: number) => Promise<void>
}> = ({ user, setUser, isDarkMode, toggleDarkMode, notify, processTransaction, onSignOut, onReset, loading, fundAccount }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isPublicPath = location.pathname.startsWith('/pay/');

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <PayMomentLogo className="w-16 h-16 animate-pulse mb-4" idSuffix="loading" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Securing your session...</p>
      </div>
    );
  }

  if (isPublicPath) {
    return (
      <Routes>
        <Route path="/pay/:payId/:slug" element={<PaymentCheckout user={user} processTransaction={processTransaction} notify={notify} />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <nav className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 z-50 transition-all overflow-y-auto no-scrollbar">
        <div className="p-8 flex items-center gap-3">
          <PayMomentLogo className="w-10 h-10" idSuffix="sidebar" />
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent italic tracking-tighter">
            PayMoment
          </h1>
        </div>
        
        <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
          <SidebarItem to="/" label="Dashboard" icon="🏠" />
          <SidebarItem to="/marketplace" label="Marketplace" icon="🏪" />
          <SidebarItem to="/transfer" label="Transfers" icon="💸" />
          <SidebarItem to="/cards" label="Cards" icon="💳" />
          <SidebarItem to="/transactions" label="History" icon="🧾" />
          <SidebarItem to="/dom-accounts" label="Global Hub" icon="🏦" />
          <SidebarItem to="/savings" label="Savings" icon="💰" />
          <SidebarItem to="/ai-assistant" label="PayAI" icon="✨" />
          <SidebarItem to="/settings" label="Settings" icon="⚙️" />
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <UserAvatar user={user} className="w-10 h-10" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{user.payMomentId}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleDarkMode} className="flex-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 tap-scale">
               {isDarkMode ? '🌞' : '🌙'}
            </button>
            <button onClick={onSignOut} className="px-4 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/20 font-black text-[9px] uppercase tracking-widest tap-scale">Logout</button>
          </div>
        </div>
      </nav>

      <main className="flex-1 min-h-screen flex flex-col">
        <header className="md:hidden fixed top-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-top))] flex items-end justify-between px-4 pb-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50 transition-colors pt-safe">
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 tap-scale"
              >
                ☰
              </button>
              <PayMomentLogo className="w-8 h-8" idSuffix="mobile-header" />
              <h1 className="text-xl font-black bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent italic tracking-tighter">PayMoment</h1>
           </div>
           <div className="flex items-center gap-2">
             <button 
                onClick={toggleDarkMode} 
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 tap-scale shadow-sm"
                aria-label="Toggle Theme"
             >
                {isDarkMode ? '🌞' : '🌙'}
             </button>
             <NavLink to="/profile" className="tap-scale">
               <UserAvatar user={user} className="w-9 h-9" />
             </NavLink>
           </div>
        </header>

        <div className="p-4 pt-[calc(5rem+env(safe-area-inset-top))] md:p-8 md:pt-10 lg:p-12 lg:pt-12 max-w-7xl 2xl:max-w-[1600px] mx-auto flex-1 w-full page-fade-in transition-all">
          <Routes>
            <Route path="/" element={<Dashboard user={user} setUser={setUser} notify={notify} processTransaction={processTransaction} onSignOut={onSignOut} fundAccount={fundAccount} />} />
            <Route path="/rewards" element={<Rewards user={user} setUser={setUser} notify={notify} />} />
            <Route path="/investments" element={<Investments user={user} setUser={setUser} notify={notify} processTransaction={processTransaction} />} />
            <Route path="/split-bill" element={<SplitBill user={user} notify={notify} />} />
            <Route path="/marketplace" element={<Marketplace user={user} setUser={setUser} notify={notify} processTransaction={processTransaction} />} />
            <Route path="/account-details" element={<AccountDetails user={user} notify={notify} />} />
            <Route path="/receive-global" element={<ReceiveGlobal user={user} setUser={setUser} notify={notify} />} />
            <Route path="/dom-accounts" element={<DomiciliaryAccounts user={user} setUser={setUser} notify={notify} />} />
            <Route path="/swap" element={<CurrencySwap user={user} setUser={setUser} notify={notify} />} />
            <Route path="/transfer" element={<Transfer notify={notify} user={user} setUser={setUser} processTransaction={processTransaction} />} />
            <Route path="/global-transfer" element={<InternationalTransfer notify={notify} user={user} setUser={setUser} />} />
            <Route path="/verification" element={<VerificationCenter user={user} setUser={setUser} notify={notify} />} />
            <Route path="/bills" element={<Bills notify={notify} processTransaction={processTransaction} user={user} />} />
            <Route path="/qr" element={<QRCode user={user} />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/cards" element={<VirtualCards user={user} setUser={setUser} processTransaction={processTransaction} notify={notify} />} />
            <Route path="/transactions" element={<Transactions user={user} setUser={setUser} notify={notify} />} />
            <Route path="/savings" element={<Savings user={user} setUser={setUser} processTransaction={processTransaction} notify={notify} />} />
            <Route path="/referrals" element={<Referrals user={user} />} />
            <Route path="/profile" element={<Profile user={user} setUser={setUser} notify={notify} onSignOut={onSignOut} onReset={onReset} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
            <Route path="/settings" element={<Settings user={user} setUser={setUser} notify={notify} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
          </Routes>
        </div>
        
        <div className="h-24 md:hidden" />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around py-3 z-50 safe-area-bottom">
        <BottomNavItem to="/" label="Home" icon="🏠" />
        <BottomNavItem to="/marketplace" label="Shop" icon="🏪" />
        <BottomNavItem to="/transfer" label="Send" icon="💸" />
        <BottomNavItem to="/cards" label="Cards" icon="💳" />
        <BottomNavItem to="/settings" label="Settings" icon="⚙️" />
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <PayMomentLogo className="w-8 h-8" idSuffix="mobile-drawer" />
                <h1 className="text-xl font-black bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent italic tracking-tighter">
                  PayMoment
                </h1>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                ×
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
              <SidebarItem to="/" label="Dashboard" icon="🏠" />
              <SidebarItem to="/marketplace" label="Marketplace" icon="🏪" />
              <SidebarItem to="/transfer" label="Transfers" icon="💸" />
              <SidebarItem to="/cards" label="Cards" icon="💳" />
              <SidebarItem to="/transactions" label="History" icon="🧾" />
              <SidebarItem to="/dom-accounts" label="Global Hub" icon="🏦" />
              <SidebarItem to="/savings" label="Savings" icon="💰" />
              <SidebarItem to="/ai-assistant" label="PayAI" icon="✨" />
              <SidebarItem to="/settings" label="Settings" icon="⚙️" />
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <UserAvatar user={user} className="w-10 h-10" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{user.payMomentId}</p>
                </div>
              </div>
              <button onClick={onSignOut} className="w-full py-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/20 font-black text-[10px] uppercase tracking-widest tap-scale">Logout Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingReg, setPendingReg] = useState<any>(null);

  const [user, setUser] = useState<User>({
    name: '',
    phoneNumber: '',
    payMomentId: '',
    balances: { 'NGN': 0, 'USD': 0, 'GBP': 0 },
    accountNumber: '',
    tier: 1,
    verification: { bvn: false, nin: false, address: false, facialMatch: false },
    transactions: [],
    beneficiaries: [],
    paymentLinks: [],
    momentPoints: 0,
    investments: [],
    badges: [],
    debtInfo: { isBlacklisted: false, totalOwed: 0, owedToId: '', owedToName: '' },
    transactionPin: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        try {
          // Fetch or create user profile
          const userRef = doc(db, 'users', fUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${fUser.uid}`);
            return;
          }
          
          if (userSnap.exists()) {
            setUser({ ...(userSnap.data() as User), uid: fUser.uid });
          } else {
            // New user initialization
            const regData = pendingReg || {
              name: fUser.displayName && fUser.displayName !== 'New User' ? fUser.displayName : '',
              payMomentId: `@${fUser.email?.split('@')[0] || Math.random().toString(36).substr(2, 5)}`,
              phoneNumber: '',
              transactionPin: '1234'
            };

            const newUser: User = {
              name: regData.name || 'PayMoment User',
              phoneNumber: regData.phoneNumber || '',
              payMomentId: regData.payMomentId.startsWith('@') ? regData.payMomentId : `@${regData.payMomentId}`,
              balances: { 'NGN': 1000000, 'USD': 0, 'GBP': 0 },
              accountNumber: Math.floor(Math.random() * 9000000000 + 1000000000).toString(),
              tier: 1,
              verification: { bvn: false, nin: false, address: false, facialMatch: false },
              transactions: [{
                id: 'bonus', type: 'credit', amount: 1000000, title: 'Welcome Bonus', category: 'Reward', timestamp: new Date().toLocaleString(), status: 'completed'
              }],
              beneficiaries: [],
              paymentLinks: [],
              momentPoints: 50,
              investments: [],
              badges: [],
              transactionPin: regData.transactionPin
            };
            try {
              await setDoc(userRef, newUser);
              setUser(newUser);
              setPendingReg(null);
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${fUser.uid}`);
            }
          }
          setIsLoggedIn(true);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${fUser.uid}`);
        }
      } else {
        setIsLoggedIn(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for user data
  useEffect(() => {
    if (firebaseUser) {
      const unsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
        if (doc.exists()) {
          setUser({ ...(doc.data() as User), uid: firebaseUser.uid });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
      });
      return () => unsubscribe();
    }
  }, [firebaseUser]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const notify = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const processTransaction = useCallback(async (tx: Transaction, currency: string = 'NGN', pin?: string) => {
    if (!firebaseUser) throw new Error("Authentication required");

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw "User does not exist!";

        const userData = userSnap.data() as User;
        
        // PIN Verification for debits
        if (tx.type === 'debit') {
          const storedPin = userData.transactionPin || '1234';
          if (!pin || pin !== storedPin) {
            throw "Incorrect Transaction PIN";
          }
        }

        const updatedBalances = { ...userData.balances };
        
        if (tx.type === 'debit') {
          if (updatedBalances[currency] < tx.amount) throw "Insufficient balance";
          updatedBalances[currency] -= tx.amount;
        } else {
          updatedBalances[currency] += tx.amount;
        }

        // Update User
        transaction.update(userRef, {
          balances: updatedBalances,
          momentPoints: userData.momentPoints + Math.floor(tx.amount / 1000)
        });

        // Record Transaction in separate collection
        const txRef = doc(collection(db, 'transactions'));
        
        // Clean undefined values
        const preparedTx = Object.entries({
          ...tx,
          id: txRef.id,
          userId: firebaseUser.uid,
          senderUid: firebaseUser.uid,
          timestamp: new Date().toISOString()
        }).reduce((acc, [key, value]) => {
          if (value !== undefined) acc[key] = value;
          return acc;
        }, {} as any);

        transaction.set(txRef, preparedTx);

        // Handle recipient if internal transfer
        if (tx.recipientUid && tx.type === 'debit') {
          const recipientRef = doc(db, 'users', tx.recipientUid);
          const recipientSnap = await transaction.get(recipientRef);
          
          if (recipientSnap.exists()) {
            const recipientData = recipientSnap.data() as User;
            const recipientBalances = { ...recipientData.balances };
            recipientBalances[currency] = (recipientBalances[currency] || 0) + tx.amount;
            
            const creditTxRef = doc(collection(db, 'transactions'));
            const creditTxRaw = {
              ...tx,
              id: creditTxRef.id,
              userId: tx.recipientUid,
              type: 'credit',
              senderUid: firebaseUser.uid,
              title: `Received from ${userData.name}`,
              timestamp: new Date().toISOString()
            };

            // Clean undefined values for credit record
            const preparedCreditTx = Object.entries(creditTxRaw).reduce((acc, [key, value]) => {
              if (value !== undefined) acc[key] = value;
              return acc;
            }, {} as any);

            transaction.update(recipientRef, {
              balances: recipientBalances
            });
            transaction.set(creditTxRef, preparedCreditTx);
          }
        }
      });
      notify("Transaction successful", "success");
    } catch (error) {
      console.error("Transaction failed:", error);
      if (typeof error === 'string') {
        notify(error, "error");
        throw error;
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        throw error;
      }
    }
  }, [firebaseUser, notify]);

  const fundAccount = useCallback(async (amount: number) => {
    if (!firebaseUser) return;
    const tx: Transaction = {
      id: `fund-${Date.now()}`,
      type: 'credit',
      amount: amount,
      title: 'Account Funding',
      category: 'Deposit',
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    await processTransaction(tx, 'NGN');
  }, [firebaseUser, processTransaction]);

  const handleSignOut = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    notify("Signed out successfully.", "info");
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <PayMomentLogo className="w-16 h-16 animate-pulse mb-4" idSuffix="app-loading" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Initializing PayMoment...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <AuthFlow 
        onRegister={async (name, id, phone, pin, email, password) => {
          setPendingReg({ name, payMomentId: id, phoneNumber: phone, transactionPin: pin });
          try {
            if (email && password) {
              await createUserWithEmailAndPassword(auth, email, password);
            } else {
              await signInAnonymously(auth);
            }
          } catch (err: any) {
            console.error("Registration failed", err);
            notify(parseAuthError(err), "error");
            throw err;
          }
        }} 
        onSignIn={async (email, password) => {
          try {
            if (password) {
              await signInWithEmailAndPassword(auth, email, password);
            } else {
              const msg = "Password is required for email login.";
              notify(msg, "error");
              throw new Error(msg);
            }
          } catch (err: any) {
            console.error("Login failed", err);
            notify(parseAuthError(err), "error");
            throw err;
          }
        }} 
        isDarkMode={isDarkMode} 
      />
    );
  }

  return (
    <HashRouter>
      <ErrorBoundary>
        <div className={isDarkMode ? 'dark' : ''}>
          {notification && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm animate-in slide-in-from-top-4">
              <div className={`px-6 py-4 rounded-3xl shadow-2xl border ${
                notification.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 
                notification.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-indigo-700 border-indigo-600 text-white'
              }`}>
                <p className="font-bold text-sm">{notification.message}</p>
              </div>
            </div>
          )}
          <AppContent 
            user={user} 
            setUser={setUser} 
            isDarkMode={isDarkMode} 
            toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
            notify={notify} 
            processTransaction={processTransaction}
            onSignOut={handleSignOut}
            onReset={handleReset}
            loading={loading}
            fundAccount={fundAccount}
          />
        </div>
      </ErrorBoundary>
    </HashRouter>
  );
};

const SidebarItem = ({ to, label, icon }: { to: string, label: string, icon: string }) => (
  <NavLink to={to} className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all tap-scale ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
    <span className="text-xl">{icon}</span>
    <span className="text-sm font-bold">{label}</span>
  </NavLink>
);

const BottomNavItem = ({ to, label, icon }: { to: string, label: string, icon: string }) => (
  <NavLink to={to} className={({ isActive }) => `flex flex-col items-center gap-1 transition-all tap-scale ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
    <span className="text-2xl">{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </NavLink>
);

export default App;
