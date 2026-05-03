
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface DomiciliaryAccountsProps {
  user: User;
  setUser: (user: User) => void;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const DOM_DETAILS = {
  USD: {
    bank: 'PayMoment Global (via Evolve Bank & Trust)',
    routing: '121000358',
    swift: 'PMUSNGLAXXX',
    address: '6070 Poplar Ave, Memphis, TN 38119, USA'
  },
  GBP: {
    bank: 'PayMoment Europe (via ClearBank Ltd)',
    sortCode: '04-00-04',
    swift: 'PMGBCLR1XXX',
    address: 'Vintners Place, 68 Upper Thames St, London, UK'
  }
};

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1680.00,
  GBP: 2150.00
};

const DomiciliaryAccounts: React.FC<DomiciliaryAccountsProps> = ({ user, setUser, notify }) => {
  const [activeTab, setActiveTab] = useState<'USD' | 'GBP'>('USD');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  
  const navigate = useNavigate();

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
    setDepositAmount(result);
  };

  const getRawAmount = () => parseFloat(depositAmount.replace(/,/g, '')) || 0;

  const currentBalance = user.balances[activeTab];
  const isAccountActive = currentBalance !== undefined;
  const ngnBalance = user.balances['NGN'] || 0;

  const handleOpenAccount = () => {
    if (user.tier < 3) {
      notify("Please upgrade to Tier 3 to open international accounts.", "error");
      navigate('/verification');
      return;
    }
    const updatedBalances = { ...user.balances };
    updatedBalances[activeTab] = 0.00;
    setUser({ ...user, balances: updatedBalances });
    notify(`${activeTab} Account opened successfully!`, 'success');
  };

  const handleDeposit = () => {
    const foreignAmount = getRawAmount();
    if (isNaN(foreignAmount) || foreignAmount <= 0) return;
    const ngnCost = foreignAmount * EXCHANGE_RATES[activeTab];
    if (ngnCost > ngnBalance) {
      notify(`Insufficient NGN balance. You need ₦${ngnCost.toLocaleString(undefined, {minimumFractionDigits: 2})} to get ${activeTab} ${depositAmount}.`, 'error');
      return;
    }
    setIsDepositing(true);
    setTimeout(() => {
      const updatedBalances = { ...user.balances };
      updatedBalances['NGN'] -= ngnCost;
      updatedBalances[activeTab] = (updatedBalances[activeTab] || 0) + foreignAmount;
      setUser({ ...user, balances: updatedBalances });
      const symbol = activeTab === 'USD' ? '$' : '£';
      notify(`Successfully deposited ${symbol}${depositAmount} into your ${activeTab} wallet!`, 'success');
      setDepositAmount('');
      setShowDepositModal(false);
      setIsDepositing(false);
    }, 2000);
  };

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    notify(`${label} copied!`, 'success');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale"><div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></div><span className="text-[10px] font-black uppercase tracking-widest">Back</span></button>
      <div className="text-center space-y-2"><h2 className="text-4xl font-black bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent italic tracking-tighter leading-none">Global Banking</h2></div>
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">{(['USD', 'GBP'] as const).map((curr) => (<button key={curr} onClick={() => setActiveTab(curr)} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === curr ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{curr} Account</button>))}</div>
      {!isAccountActive ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-14 border border-slate-200 dark:border-slate-800 text-center space-y-10 shadow-sm transition-colors"><div className="w-28 h-28 mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-6xl shadow-inner border dark:border-blue-800/50">🌎</div><div className="space-y-4"><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Open your {activeTab} Account</h3><p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">Receive unique bank credentials for global transfers.</p></div><button onClick={handleOpenAccount} className="w-full py-6 bg-gradient-to-r from-blue-700 to-purple-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Open {activeTab} Account</button></div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-8">
          <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group"><div className="relative z-10 flex justify-between items-start"><div className="space-y-2"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Available Funds</p><h2 className="text-7xl font-black tracking-tighter leading-none"><span className="text-4xl opacity-40 font-medium mr-1">{activeTab === 'USD' ? '$' : '£'}</span>{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2></div><div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-5xl backdrop-blur-md border border-white/10 shadow-xl">{activeTab === 'USD' ? '🇺🇸' : '🇬🇧'}</div></div><div className="mt-16 flex flex-wrap gap-4 relative z-10"><button onClick={() => setShowDepositModal(true)} className="flex-1 bg-white text-blue-900 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2"><span>📥</span> Add Money</button><button onClick={() => navigate('/global-transfer')} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border border-white/20 backdrop-blur-md flex items-center justify-center gap-2"><span>📤</span> Send Global</button><button onClick={() => navigate(`/withdraw-to-naira?from=${activeTab}`)} className="w-full bg-emerald-500 text-emerald-950 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2"><span>💸</span> Convert to Naira</button></div><div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[120px]"></div></div>
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-10 transition-colors"><div className="flex justify-between items-center px-2"><div><h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight leading-none">Receiving Details</h3><p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-1">Share these with your sender</p></div><button className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-2xl border border-blue-100 dark:border-transparent">📤</button></div><div className="space-y-8"><DetailRow label="Account Holder" value={user.name} onCopy={() => copyToClipboard('Name', user.name)} /><DetailRow label="Account Number" value={user.accountNumber + (activeTab === 'USD' ? '88' : '99')} onCopy={() => copyToClipboard('Account', user.accountNumber + (activeTab === 'USD' ? '88' : '99'))} /><DetailRow label="Bank Name" value={DOM_DETAILS[activeTab].bank} onCopy={() => copyToClipboard('Bank', DOM_DETAILS[activeTab].bank)} /><DetailRow label="SWIFT / BIC" value={DOM_DETAILS[activeTab].swift} onCopy={() => copyToClipboard('SWIFT', DOM_DETAILS[activeTab].swift)} />{activeTab === 'USD' ? (<DetailRow label="Routing Number (ABA)" value={DOM_DETAILS[activeTab].routing} onCopy={() => copyToClipboard('Routing', DOM_DETAILS[activeTab].routing)} />) : (<DetailRow label="Sort Code" value={DOM_DETAILS[activeTab].sortCode!} onCopy={() => copyToClipboard('Sort Code', DOM_DETAILS[activeTab].sortCode!)} />)}<DetailRow label="Bank Address" value={DOM_DETAILS[activeTab].address} onCopy={() => copyToClipboard('Address', DOM_DETAILS[activeTab].address)} /></div></div>
        </div>
      )}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in"><div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95"><div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">Deposit {activeTab}</h3><button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 text-2xl">×</button></div><div className="space-y-6"><div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700"><div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2"><span>From NGN Wallet</span><span className="text-blue-600 dark:text-blue-400 font-bold">Bal: ₦{ngnBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div><div className="flex items-center gap-3">🇳🇬 <span className="font-bold text-slate-900 dark:text-white">Naira Wallet</span></div></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest px-1">Amount to Receive ({activeTab})</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 dark:text-slate-500">{activeTab === 'USD' ? '$' : '£'}</span><input type="text" value={depositAmount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0.00" className="w-full p-4 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-xl dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 tabular-nums" /></div><div className="flex justify-between px-1"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Rate: 1 {activeTab} = ₦{EXCHANGE_RATES[activeTab].toLocaleString()}</p><p className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Total: ₦{(getRawAmount() * EXCHANGE_RATES[activeTab] || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p></div></div><button onClick={handleDeposit} disabled={!depositAmount || isDepositing} className={`w-full py-5 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isDepositing ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 dark:shadow-none'}`}>{isDepositing ? 'Processing...' : `Fund ${activeTab} Wallet`}</button></div></div></div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value, onCopy }: { label: string, value: string, onCopy: () => void }) => (
  <div className="group"><div className="flex justify-between items-center mb-2 px-1"><span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest">{label}</span><button onClick={onCopy} className="text-[10px] font-black text-blue-700 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">Copy Code</button></div><div className="text-base font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-all group-hover:border-blue-400 group-hover:bg-white dark:group-hover:bg-slate-800 shadow-sm group-hover:shadow-md"><span className="truncate pr-4 leading-none">{value}</span><button onClick={onCopy} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-xl">📋</button></div></div>
);

export default DomiciliaryAccounts;
