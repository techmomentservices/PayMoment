
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface SplitBillProps {
  user: User;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const SplitBill: React.FC<SplitBillProps> = ({ user, notify }) => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState<string[]>(['']);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAmountChange = (val: string) => {
    let clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    const formattedInt = integerPart ? parseInt(integerPart, 10).toLocaleString() : '';
    let result = formattedInt;
    if (clean.includes('.')) {
      result += '.' + (decimalPart !== undefined ? decimalPart.slice(0, 2) : '');
    }
    setAmount(result);
  };

  const getRawAmount = () => parseFloat(amount.replace(/,/g, '')) || 0;

  const addParticipant = () => setParticipants([...participants, '']);
  const updateParticipant = (index: number, val: string) => {
    const newPs = [...participants];
    newPs[index] = val;
    setParticipants(newPs);
  };

  const handleSplit = () => {
    const val = getRawAmount();
    if (!val || participants.some(p => !p)) {
      notify("Please fill in all details.", "error");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      notify(`Split requests sent to ${participants.length} friends!`, "success");
      navigate('/');
    }, 1500);
  };

  const perPerson = getRawAmount() / (participants.length + 1);

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>
      <div className="text-center space-y-2">
         <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Split the Moment</h2>
         <p className="text-sm text-slate-500 font-medium">Fair and square payments with your circle.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-10 transition-colors">
         <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Total Amount to Split</label>
            <div className="relative">
               <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">₦</span>
               <input type="text" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0.00" className="w-full p-6 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] outline-none focus:border-indigo-600 font-black text-3xl dark:text-white tabular-nums" />
            </div>
         </div>
         <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Friends to Split With</label>
               <button onClick={addParticipant} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">+ Add Friend</button>
            </div>
            <div className="space-y-3">
               {participants.map((p, i) => (
                 <div key={i} className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black">@</span>
                    <input type="text" value={p} onChange={(e) => updateParticipant(i, e.target.value)} placeholder="PayMoment ID" className="w-full p-4 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-600 font-bold dark:text-white transition-all" />
                 </div>
               ))}
            </div>
         </div>
         <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-transparent flex justify-between items-center">
            <div>
               <p className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Each person pays</p>
               <h4 className="text-2xl font-black text-indigo-900 dark:text-white">₦{perPerson.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
            </div>
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-xl shadow-sm">🤝</div>
         </div>
         <button onClick={handleSplit} disabled={isProcessing || !amount} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">{isProcessing ? 'Routing Requests...' : 'Initiate Moment Split'}</button>
      </div>
    </div>
  );
};

export default SplitBill;
