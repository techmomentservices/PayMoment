
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../src/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { User, Transaction, SavingGoal } from '../types';

interface SavingsProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  processTransaction: (tx: Transaction, currency: string, pin?: string) => Promise<void>;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const Savings: React.FC<SavingsProps> = ({ user, setUser, processTransaction, notify }) => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', icon: '💰' });

  const handleCreateGoal = async () => {
    if (!newGoal.title || !newGoal.target || !auth.currentUser) return;

    const goal: SavingGoal = {
      id: Math.random().toString(36).substr(2, 9),
      title: newGoal.title,
      target: parseFloat(newGoal.target),
      saved: 0,
      icon: newGoal.icon,
      color: ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-rose-500', 'bg-amber-500'][Math.floor(Math.random() * 5)],
      yield: 15
    };

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        savings: arrayUnion(goal)
      });
      setIsCreating(false);
      setNewGoal({ title: '', target: '', icon: '💰' });
      notify("Savings goal created!", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      notify("Failed to create goal", "error");
    }
  };

  const displaySavings = user.savings || [];

  return (
    <div className="space-y-10 pb-20">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tight">Savings Vaults</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Earn high-yield interest on your stable assets.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="w-full md:w-auto bg-blue-600 dark:bg-blue-500 text-white px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-none transition-all tap-scale">+ Create Goal</button>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {displaySavings.map(goal => (
          <GoalCard 
            key={goal.id}
            title={goal.title} 
            saved={goal.saved} 
            target={goal.target} 
            icon={goal.icon} 
            color={goal.color}
          />
        ))}
        
        {displaySavings.length === 0 && (
           <div className="col-span-full py-20 text-center space-y-4 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="text-5xl">🏦</div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No savings goals yet. Start building your future today.</p>
              <button onClick={() => setIsCreating(true)} className="text-blue-600 font-black uppercase tracking-widest text-[10px] underline underline-offset-8">Create your first goal</button>
           </div>
        )}

        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-black rounded-[2.5rem] p-10 text-white flex flex-col justify-center items-center text-center space-y-6 overflow-hidden transition-all hover:scale-[1.02] shadow-2xl group">
          <div className="relative z-10 w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner border border-white/10 group-hover:rotate-12 transition-transform">💎</div>
          <div className="relative z-10 space-y-2">
            <h4 className="font-black text-2xl italic tracking-tighter uppercase">Moment Vault</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">Lock assets for 6-12 months and earn up to 18.5% APY.</p>
          </div>
          <button className="relative z-10 w-full bg-white text-slate-900 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-slate-100 tap-scale">Lock Funds Now</button>
          
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px]"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px]"></div>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[3.5rem] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-12">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-2xl font-black italic tracking-tighter">New Savings Goal</h3>
              <button onClick={() => setIsCreating(false)} className="text-2xl">×</button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Goal Title</label>
                <input 
                  type="text" 
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                  placeholder="e.g. New Laptop, Vacation" 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Amount (₦)</label>
                <input 
                  type="number" 
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({...newGoal, target: e.target.value})}
                  placeholder="0.00" 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <button onClick={handleCreateGoal} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl">Create Goal</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-100 dark:border-transparent flex gap-6 items-center">
         <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-sm">📈</div>
         <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest leading-relaxed">
           Your interest is calculated daily and compounded monthly. Start saving for your future, one Moment at a time.
         </p>
      </div>
    </div>
  );
};

const GoalCard = ({ title, saved, target, icon, color }: { title: string, saved: number, target: number, icon: string, color: string }) => {
  const percentage = Math.min(100, (saved / target) * 100);
  
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl group space-y-8">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm transition-transform group-hover:scale-110">{icon}</div>
        <div className="flex-1">
          <h4 className="font-black text-lg text-slate-900 dark:text-white transition-colors leading-none mb-2">{title}</h4>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-xl border border-emerald-100 dark:border-transparent">15% P.A Yield</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest tabular-nums">
           <div className="space-y-1">
             <p className="text-slate-400">Current Saved</p>
             <p className="text-slate-900 dark:text-white text-base">₦{saved.toLocaleString()}</p>
           </div>
           <div className="text-right space-y-1">
             <p className="text-slate-400">Target Goal</p>
             <p className="text-slate-900 dark:text-white text-base">₦{target.toLocaleString()}</p>
           </div>
        </div>
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
          <div 
            className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-[9px] text-center font-black text-slate-500 uppercase tracking-[0.3em]">{percentage.toFixed(0)}% Synchronized</p>
      </div>

      <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-700 tap-scale">Withdraw</button>
        <button className="flex-1 py-4 bg-blue-600 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none tap-scale">Top Up</button>
      </div>
    </div>
  );
};

export default Savings;
