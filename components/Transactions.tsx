
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction, User } from '../types';
import { PayMomentLogo } from '../App';
import { auth, db } from '../src/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface TransactionsProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const Transactions: React.FC<TransactionsProps> = ({ user, setUser, notify }) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(txs);
    }, (error) => {
      console.error("Error fetching transactions:", error);
    });
    return () => unsubscribe();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = filter === 'all' || t.type === filter;
      let matchesDate = true;
      if (startDate || endDate) {
        const txDate = new Date(t.timestamp).getTime();
        const start = startDate ? new Date(startDate).setHours(0,0,0,0) : -Infinity;
        const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
        matchesDate = txDate >= start && txDate <= end;
      }
      return matchesType && matchesDate;
    });
  }, [transactions, filter, startDate, endDate]);

  const clearFilters = () => {
    setFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const getRecipientAccount = (tx: Transaction) => {
    if (tx.type === 'credit') return user.accountNumber;
    const match = tx.title.match(/\d{10}/);
    return match ? match[0] : 'PM-INT-SETTLE';
  };

  const getSenderName = (tx: Transaction) => {
    if (tx.type === 'debit') return user.name;
    if (tx.title.includes('from')) return tx.title.split('from ')[1];
    return tx.title || 'System Pay';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-2">
      <div className="flex flex-col gap-6 px-1">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
            </button>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">Account Feed</h2>
              <p className="text-slate-500 text-[10px] font-medium mt-1 uppercase tracking-widest">Real-time History</p>
            </div>
          </div>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm self-start overflow-x-auto no-scrollbar max-w-full">
             {['all', 'credit', 'debit'].map((f) => (
               <button key={f} onClick={() => setFilter(f as any)} className={`px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-600'}`}>{f}</button>
             ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest px-1">Starting Period</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all shadow-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest px-1">Ending Period</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all shadow-sm" />
            </div>
          </div>
          {(startDate || endDate || filter !== 'all') && (
            <button onClick={clearFilters} className="w-full text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest py-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/30 tap-scale">Reset Filters</button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredTransactions.length === 0 ? (
            <div className="p-20 text-center text-slate-400 font-black uppercase italic text-[10px]">No entries for this period</div>
          ) : (
            filteredTransactions.map((tx) => (
              <div key={tx.id} onClick={() => setSelectedTx(tx)} className="p-5 md:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all group-hover:scale-110 ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>{tx.type === 'credit' ? '↓' : '↑'}</div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 dark:text-white text-sm truncate max-w-[140px] xs:max-w-none">{tx.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[7px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-black uppercase tracking-widest">{tx.category}</span>
                      <span className="text-[9px] text-slate-400 font-medium">{tx.timestamp.split(',')[0]}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedTx && (
        <div className="fixed-overlay bg-slate-950/80 backdrop-blur-md flex items-end md:items-center justify-center">
           <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[4rem] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-12 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-8"><h3 className="text-xl md:text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">Transaction Receipt</h3><button onClick={() => setSelectedTx(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-2xl">×</button></div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-800"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Amount Settled</p><h5 className={`text-3xl md:text-4xl font-black tracking-tighter ${selectedTx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{selectedTx.type === 'credit' ? '+' : '-'}₦{selectedTx.amount.toLocaleString()}</h5></div>
              <div className="space-y-4 py-8 border-b border-dashed border-slate-200 dark:border-slate-800"><ReceiptRow label="Sender" value={getSenderName(selectedTx)} /><ReceiptRow label="Destination" value={getRecipientAccount(selectedTx)} /><ReceiptRow label="Narration" value={selectedTx.remark || 'Moment Transfer'} /><ReceiptRow label="Reference" value={`PM-${selectedTx.id.toUpperCase()}`} /><ReceiptRow label="Status" value="SUCCESSFUL" /></div>
              <button onClick={() => setSelectedTx(null)} className="w-full py-5 mt-8 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] tap-scale">Close Receipt</button>
           </div>
        </div>
      )}
    </div>
  );
};

const ReceiptRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-start gap-4"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0 w-24 leading-relaxed">{label}</span><span className="text-[10px] md:text-[11px] font-bold text-slate-900 dark:text-white text-right flex-1 break-words">{value}</span></div>
);

export default Transactions;
