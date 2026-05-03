
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType, parseFirestoreError } from '../src/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { User, Transaction, Investment } from '../types';

interface InvestmentsProps {
  user: User;
  setUser: (user: User) => void;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  processTransaction: (tx: Transaction, currency: string, pin?: string) => Promise<void>;
}

const MARKET_ASSETS = [
  { id: '1', name: 'Apple Inc.', symbol: 'AAPL', price: 185.40, change: 1.2, icon: '🍎' },
  { id: '2', name: 'Tesla', symbol: 'TSLA', price: 210.15, change: -0.5, icon: '⚡' },
  { id: '3', name: 'Nvidia', symbol: 'NVDA', price: 720.50, change: 3.4, icon: '🎮' },
  { id: '4', name: 'S&P 500 ETF', symbol: 'VOO', price: 450.20, change: 0.8, icon: '📊' },
];

const Investments: React.FC<InvestmentsProps> = ({ user, setUser, notify, processTransaction }) => {
  const navigate = useNavigate();
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');

  // Accounting-Style Formatter
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

  const handleInvest = async () => {
    const val = getRawAmount();
    if (!val || val < 1000) {
      notify("Minimum investment is ₦1,000.00", "error");
      return;
    }
    if (val > user.balances['NGN']) {
      notify("Insufficient Naira balance", "error");
      return;
    }

    if (!auth.currentUser) return;
    setShowPinModal(true);
  };

  const finalizeInvest = async () => {
    const val = getRawAmount();
    setIsInvesting(true);
    try {
      const tx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'debit',
        amount: val,
        title: `Invested in ${selectedAsset.name}`,
        category: 'Investment',
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
      
      const newInv: Investment = {
        id: Math.random().toString(36).substr(2, 9),
        assetName: selectedAsset.name,
        assetIcon: selectedAsset.icon,
        amountInvested: val,
        currentValue: val,
        returns: 0,
        type: 'stock'
      };

      const userRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(userRef, {
        investments: arrayUnion(newInv)
      });

      await processTransaction(tx, 'NGN', pin);
      
      setIsInvesting(false);
      setSelectedAsset(null);
      setAmount('');
      setShowPinModal(false);
      setPin('');
      notify(`Successfully invested ₦${val.toLocaleString(undefined, {minimumFractionDigits: 2})} in ${selectedAsset.name}!`, 'success');
    } catch (error) {
      console.error("Investment failed", error);
      const errorMsg = parseFirestoreError(error);
      notify(errorMsg, "error");
      setIsInvesting(false);
      setPin('');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 rounded-[3rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter">Moment Capital</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200 mt-2">Build your global portfolio</p>
           </div>
           <div className="text-center md:text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1">Portfolio Value</p>
              <h3 className="text-4xl font-black tabular-nums">₦{(user.investments?.reduce((acc, curr) => acc + curr.currentValue, 0) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
           </div>
        </div>
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
           <h3 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white">Assets Marketplace</h3>
           <div className="grid gap-4">
              {MARKET_ASSETS.map(asset => (
                <div key={asset.id} onClick={() => setSelectedAsset(asset)} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-emerald-500 transition-all group">
                   <div className="flex items-center gap-4">
                      <span className="text-3xl group-hover:scale-110 transition-transform">{asset.icon}</span>
                      <div>
                         <p className="font-black text-slate-900 dark:text-white leading-none mb-1">{asset.name}</p>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{asset.symbol}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="font-black text-slate-900 dark:text-white tabular-nums">${asset.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      <p className={`text-[10px] font-black uppercase ${asset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{asset.change >= 0 ? '+' : ''}{asset.change}%</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
           <h3 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white">Holdings</h3>
           {(!user.investments || user.investments.length === 0) ? (
             <div className="p-10 text-center text-slate-400 font-bold italic">No investments yet.</div>
           ) : (
             <div className="grid gap-4">
                {user.investments.map(inv => (
                  <div key={inv.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        <span className="text-3xl">{inv.assetIcon}</span>
                        <div>
                           <p className="font-black text-slate-900 dark:text-white leading-none mb-1">{inv.assetName}</p>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">₦{inv.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                     </div>
                     <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-xl">+12.4%</span>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[3.5rem] w-full max-w-md p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-4">
                    <span className="text-4xl">{selectedAsset.icon}</span>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tighter italic">Invest in {selectedAsset.symbol}</h3>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{selectedAsset.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedAsset(null)} className="text-3xl font-light">×</button>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Amount to Invest (NGN)</label>
                    <div className="relative">
                       <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">₦</span>
                       <input type="text" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0.00" className="w-full p-5 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-600 font-black text-2xl dark:text-white tabular-nums" />
                    </div>
                 </div>
                 <button onClick={handleInvest} disabled={isInvesting || !amount} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">{isInvesting ? 'Processing Order...' : 'Buy Fractional Shares'}</button>
              </div>
           </div>
        </div>
      )}
      {/* PIN AUTHORIZATION MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm space-y-10 text-center">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white italic tracking-tighter">Authorize Investment</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enter your 4-digit PIN to invest ₦{getRawAmount().toLocaleString()}</p>
            </div>

            <div className="flex justify-center gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${pin.length > i ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-700'}`}>
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    if (key === '⌫') setPin(pin.slice(0, -1));
                    else if (key && pin.length < 4) setPin(pin + key);
                  }}
                  className={`h-16 rounded-2xl flex items-center justify-center text-2xl font-black transition-all ${key ? 'bg-white/5 border border-white/10 text-white active:bg-blue-600 active:scale-95' : 'opacity-0 pointer-events-none'}`}
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <button 
                onClick={finalizeInvest}
                disabled={pin.length < 4 || isInvesting}
                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
              >
                {isInvesting ? 'Authorizing...' : 'Confirm Investment'}
              </button>
              <button onClick={() => { setShowPinModal(false); setPin(''); }} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
