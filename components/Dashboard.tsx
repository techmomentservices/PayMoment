
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Transaction } from '../types';
import { UserAvatar, PayMomentLogo } from '../App';
import { auth, db } from '../src/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface DashboardProps {
  user: User;
  setUser: (user: User) => void;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  processTransaction: (tx: Transaction, currency: string) => void;
  onSignOut?: () => void;
  fundAccount: (amount: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, setUser, notify, processTransaction, onSignOut, fundAccount }) => {
  const [showBalance, setShowBalance] = useState(true);
  const [currency, setCurrency] = useState<'NGN' | 'USD' | 'GBP'>('NGN');
  const [showFundModal, setShowFundModal] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(txs);
    }, (error) => {
      console.error("Error fetching dashboard transactions:", error);
    });
    return () => unsubscribe();
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const displayedBalance = useMemo(() => {
    return user.balances[currency] || 0;
  }, [user.balances, currency]);

  const handleManualFunding = async () => {
    setIsFunding(true);
    try {
      const amount = 50000;
      await fundAccount(amount);
      setIsFunding(false);
      setShowFundModal(false);
      notify(`₦${amount.toLocaleString()} added to your wallet!`, 'success');
    } catch (err) {
      setIsFunding(false);
      notify("Funding failed", "error");
    }
  };

  const copyAccountNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(user.accountNumber);
    notify("Account number copied!", "success");
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-24 page-fade-in">
      {user.name === 'PayMoment User' && (
        <div className="bg-amber-500 rounded-3xl text-white shadow-lg p-6 flex items-center gap-4">
          <span className="text-3xl">👤</span>
          <div className="flex-1">
            <h4 className="font-black text-sm uppercase mb-1">Update Your Legal Name</h4>
            <p className="text-[10px] font-bold text-amber-100">Set your real name in your profile to enable inter-bank transfers.</p>
          </div>
          <button onClick={() => navigate('/profile')} className="bg-white/20 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border border-white/30 tap-scale">Update</button>
        </div>
      )}

      {user.debtInfo?.isBlacklisted && (
        <div className="bg-rose-600 p-6 rounded-3xl text-white shadow-lg border-b-4 border-rose-800 flex items-center gap-4">
          <span className="text-3xl">🚫</span>
          <div className="flex-1">
            <h4 className="font-black text-sm uppercase mb-1">Account Restricted</h4>
            <p className="text-[10px] font-bold text-rose-100">Debt: ₦{user.debtInfo.totalOwed.toLocaleString()} owed to {user.debtInfo.owedToName}.</p>
          </div>
          <button onClick={() => navigate('/transactions')} className="bg-white/20 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border border-white/30 tap-scale">Resolve</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <UserAvatar user={user} className="w-16 h-16 md:w-20 md:h-20 border-2 border-blue-500 shadow-xl" onClick={() => navigate('/profile')} />
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-lg p-1 shadow-md border border-slate-100 dark:border-slate-800">
              <PayMomentLogo className="w-5 h-5 md:w-6 md:h-6" idSuffix="dash-avatar-badge" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">{greeting}</p>
            <h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight italic truncate">{user.name}</h3>
            <button onClick={copyAccountNumber} className="mt-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
              {user.accountNumber} 📋
            </button>
          </div>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
            <button onClick={() => navigate('/rewards')} className="px-4 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl tap-scale tracking-widest flex items-center gap-2">
              <span className="text-lg">💎</span> {user.momentPoints.toLocaleString()}
            </button>
            <button onClick={onSignOut} className="px-4 py-3 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-2xl font-black text-[10px] uppercase tracking-widest tap-scale">OUT</button>
        </div>
      </div>

      <div className="relative overflow-hidden bg-slate-900 dark:bg-indigo-950 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <div className="flex bg-white/10 p-1 rounded-xl w-fit">
                {['NGN', 'USD'].map((curr) => (
                  <button key={curr} onClick={() => setCurrency(curr as any)} className={`px-4 py-1.5 text-[10px] font-black rounded-lg ${currency === curr ? 'bg-white text-slate-900 shadow-md' : 'text-white/60'}`}>{curr}</button>
                ))}
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter tabular-nums flex items-baseline gap-2 italic">
                {showBalance ? (
                  <>
                    <span className="text-xl md:text-3xl opacity-50 font-medium not-italic">{currency === 'NGN' ? '₦' : '$'}</span>
                    {displayedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </>
                ) : '••••••••'}
              </h2>
            </div>
            <button onClick={() => setShowBalance(!showBalance)} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all font-black text-xl">
              {showBalance ? '👁️' : '🕶️'}
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between pt-4">
            <div className="flex gap-2">
              <span className="px-5 py-2 bg-white/10 rounded-xl text-[10px] font-black tracking-widest uppercase opacity-60">ID: {user.payMomentId}</span>
              <span className="px-5 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20">Tier {user.tier}</span>
            </div>
            <button onClick={() => navigate('/cards')} className="flex items-center gap-3 bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl tap-scale">
               💳 Virtual Cards
            </button>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12 scale-150"><PayMomentLogo className="w-64 h-64" idSuffix="dash-bg" /></div>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-6">
        <QuickButton onClick={() => navigate('/transfer')} icon="💸" label="Send" color="bg-white dark:bg-slate-900" />
        <QuickButton onClick={() => navigate('/bills')} icon="📱" label="Bills" color="bg-white dark:bg-slate-900" />
        <QuickButton onClick={() => navigate('/investments')} icon="📈" label="Invest" color="bg-white dark:bg-slate-900" />
        <QuickButton onClick={() => navigate('/marketplace')} icon="🏪" label="Shop" color="bg-white dark:bg-slate-900" />
        <QuickButton onClick={() => navigate('/split-bill')} icon="🤝" label="Split" color="bg-white dark:bg-slate-900" />
        <QuickButton onClick={() => navigate('/swap')} icon="💱" label="Swap" color="bg-white dark:bg-slate-900" />
        <QuickButton onClick={() => navigate('/qr')} icon="🤳" label="Scan" color="bg-white dark:bg-slate-900" />
        <QuickButton onClick={() => setShowFundModal(true)} icon="➕" label="Fund" color="bg-blue-600 text-white" />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</p>
          <button onClick={() => navigate('/transactions')} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">See All →</button>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
           {transactions.length === 0 ? (
             <div className="p-10 text-center text-slate-400 font-bold italic text-sm">No recent transactions.</div>
           ) : transactions.map(tx => (
             <div key={tx.id} onClick={() => navigate('/transactions')} className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-blue-400'}`}>{tx.type === 'credit' ? '↓' : '↑'}</div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white transition-colors italic tracking-tight">{tx.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{tx.timestamp.split(',')[0]}</p>
                  </div>
                </div>
                <p className={`text-lg font-black italic tracking-tighter ${tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}</p>
             </div>
           ))}
        </div>
      </div>

      {showFundModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 sm:p-4">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl relative">
              <button onClick={() => setShowFundModal(false)} className="absolute right-6 top-6 text-2xl text-slate-400">×</button>
              <h3 className="text-2xl font-black italic mb-6">Funding Options</h3>
              <div className="space-y-4">
                 <button onClick={() => navigate(`/pay/${user.payMomentId}/fund`)} className="w-full p-6 bg-blue-600 text-white rounded-2xl flex items-center justify-between font-black uppercase tracking-widest text-[11px] shadow-lg">
                    <span>Card Checkout</span>
                    <span>💳</span>
                 </button>
                 <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Account Transfer</p>
                    <p className="text-2xl font-black tabular-nums tracking-tighter mb-4">{user.accountNumber}</p>
                    <button onClick={copyAccountNumber} className="text-[10px] font-black text-blue-600 dark:text-blue-400 underline">Copy Number</button>
                 </div>
                 <button onClick={handleManualFunding} disabled={isFunding} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    {isFunding ? 'Processing...' : 'Sandbox: Top up ₦50,000'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const QuickButton = ({ onClick, icon, label, color }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 p-4 sm:p-6 ${color} rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 tap-scale active:scale-90 transition-all hover:shadow-2xl`}>
    <div className="text-2xl sm:text-3xl">{icon}</div>
    <span className="text-[9px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest text-center leading-none truncate w-full">{label}</span>
  </button>
);

export default Dashboard;
