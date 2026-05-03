
import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Transaction } from '../types';

interface WithdrawToNairaProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1680.00,
  GBP: 2150.00
};

const WithdrawToNaira: React.FC<WithdrawToNairaProps> = ({ user, setUser, notify }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialCurrency = (queryParams.get('from') as 'USD' | 'GBP') || 'USD';

  const [fromCurrency, setFromCurrency] = useState<'USD' | 'GBP'>(initialCurrency);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const currentBalance = user.balances[fromCurrency] || 0;
  const currentRate = EXCHANGE_RATES[fromCurrency];
  
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

  const estimatedNaira = useMemo(() => {
    const val = getRawAmount();
    if (isNaN(val)) return 0;
    return val * currentRate;
  }, [amount, currentRate]);

  const handleWithdraw = () => {
    const val = getRawAmount();
    if (isNaN(val) || val <= 0) {
      notify("Please enter a valid amount to convert.", "error");
      return;
    }
    if (val > currentBalance) {
      notify(`Insufficient ${fromCurrency} balance.`, 'error');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const symbol = fromCurrency === 'USD' ? '$' : '£';
      const tx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'credit',
        amount: estimatedNaira,
        title: `Liquidation: ${symbol}${amount} to NGN`,
        category: 'Exchange',
        timestamp: new Date().toLocaleString(),
        status: 'completed'
      };

      setUser(prev => {
        const updatedBalances = { ...prev.balances };
        updatedBalances[fromCurrency] = (updatedBalances[fromCurrency] || 0) - val;
        updatedBalances['NGN'] = (updatedBalances['NGN'] || 0) + estimatedNaira;
        return { ...prev, balances: updatedBalances, transactions: [tx, ...prev.transactions] };
      });

      setIsProcessing(false);
      setStep('success');
      notify(`Successfully converted ${symbol}${amount} to ₦${estimatedNaira.toLocaleString()}`, 'success');
    }, 2000);
  };

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/20 rounded-full animate-ping"></div>
          <div className="relative flex items-center justify-center h-full bg-emerald-500 rounded-full text-white text-4xl shadow-xl">✓</div>
        </div>
        <div className="space-y-2 px-4">
          <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Settlement Complete</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed">₦{estimatedNaira.toLocaleString(undefined, { minimumFractionDigits: 2 })} added to Naira balance.</p>
        </div>
        <button onClick={() => navigate('/')} className="w-full py-5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] tap-scale shadow-xl">Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent italic tracking-tighter leading-none">Move to Naira</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Liquidation hub.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] space-y-6 border border-slate-100 dark:border-slate-700">
           <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Global Wallet</span>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">{fromCurrency}: {currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
           </div>
           <div className="flex items-center gap-6">
              <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value as any)} className="bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 font-black text-sm text-slate-900 dark:text-white appearance-none pr-10 focus:border-blue-600 outline-none">
                  <option value="USD">🇺🇸 USD</option>
                  <option value="GBP">🇬🇧 GBP</option>
              </select>
              <input type="text" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0.00" className="flex-1 bg-transparent text-4xl font-black text-right outline-none text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-800 tabular-nums" />
           </div>
        </div>
        <div className="flex justify-center -my-10 relative z-10"><div className="w-14 h-14 bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-950 rounded-full flex items-center justify-center text-2xl shadow-xl dark:text-white">↓</div></div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/10 dark:to-emerald-950/10 p-8 rounded-[2.5rem] border border-emerald-200 dark:border-emerald-800/30 space-y-4">
           <div className="flex justify-between items-center px-1"><span className="text-[10px] font-black text-emerald-700 dark:text-emerald-500 uppercase tracking-widest">Naira Value</span></div>
           <div className="flex items-center gap-4">
              <div className="bg-white dark:bg-slate-900 px-5 py-2.5 rounded-2xl border border-emerald-100 flex items-center gap-2">🇳🇬 <span className="font-black text-slate-900 dark:text-white">NGN</span></div>
              <div className="flex-1 text-4xl font-black text-right text-emerald-700 dark:text-emerald-400 tracking-tighter tabular-nums leading-none">₦{estimatedNaira.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
           </div>
        </div>
        <button onClick={handleWithdraw} disabled={!amount || isProcessing} className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 text-xs ${isProcessing ? 'bg-slate-400' : 'bg-gradient-to-r from-blue-700 to-purple-600'}`}>{isProcessing ? 'Processing...' : 'Convert Now'}</button>
      </div>
    </div>
  );
};

export default WithdrawToNaira;
