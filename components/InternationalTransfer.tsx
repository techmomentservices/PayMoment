
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Beneficiary } from '../types';

const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD', icon: '🇺🇸', label: 'ABA Routing' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', icon: '🇬🇧', label: 'Sort Code' },
  { code: 'EU', name: 'European Union', currency: 'EUR', icon: '🇪🇺', label: 'IBAN' },
  { code: 'CN', name: 'China (Alipay/Wire)', currency: 'CNY', icon: '🇨🇳', label: 'Alipay ID' },
  { code: 'CA', name: 'Canada', currency: 'CAD', icon: '🇨🇦', label: 'Transit No.' },
];

const WIRE_FEE = 15.00; 

interface InternationalTransferProps {
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  user: User;
  setUser: (user: User) => void;
}

const InternationalTransfer: React.FC<InternationalTransferProps> = ({ notify, user, setUser }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'selection' | 'details' | 'confirm' | 'otp' | 'success'>('selection');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAddress, setBankAddress] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  // Beneficiary States
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const [beneficiaryNickname, setBeneficiaryNickname] = useState('');

  const currentDomBalance = user.balances[selectedCountry.currency as 'USD' | 'GBP'] || 0;
  const numericAmount = parseFloat(amount) || 0;
  const totalCharge = numericAmount + WIRE_FEE;

  const copyToClipboard = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    notify(`${label} copied to clipboard`, 'success');
  };

  const selectBeneficiary = (b: Beneficiary) => {
    const country = COUNTRIES.find(c => c.name === b.details.countryName) || COUNTRIES[0];
    setSelectedCountry(country);
    setRecipientName(b.name);
    setBankName(b.details.bank || '');
    setIban(b.details.iban || '');
    setSwift(b.details.swift || '');
    setBankAddress(b.details.address || '');
    setStep('details');
  };

  const handleTransferInit = () => {
    if (totalCharge > currentDomBalance) {
      notify(`Insufficient ${selectedCountry.currency} balance.`, "error");
      return;
    }
    // Always require 2FA for Global Wires
    notify("2FA Required for secure Global Wire settlement.", "info");
    setStep('otp');
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-wire-${index + 1}`);
      nextInput?.focus();
    }

    if (newOtp.every(d => d !== '')) {
      handleFinalTransfer();
    }
  };

  const handleFinalTransfer = () => {
    const updatedBalances = { ...user.balances };
    updatedBalances[selectedCountry.currency as 'USD' | 'GBP'] -= totalCharge;
    
    let updatedBeneficiaries = [...user.beneficiaries];
    if (saveAsBeneficiary) {
      const existing = user.beneficiaries.find(b => b.details.iban === iban);
      if (!existing) {
        const newBen: Beneficiary = {
          id: Math.random().toString(36).substr(2, 5),
          name: beneficiaryNickname || recipientName,
          type: 'global',
          details: {
            bank: bankName,
            iban: iban,
            swift: swift,
            countryName: selectedCountry.name,
            address: bankAddress
          }
        };
        updatedBeneficiaries = [newBen, ...updatedBeneficiaries];
      }
    }

    setUser({ ...user, balances: updatedBalances, beneficiaries: updatedBeneficiaries });
    setStep('success');
    notify(`Global Wire initiated.`, "success");
  };

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-8 animate-in zoom-in-95">
        <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-4xl text-white shadow-2xl relative">🌍</div>
        <div className="space-y-3 px-4">
          <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Wire Processing</h2>
          <p className="text-slate-500 text-sm leading-relaxed">Transfer to {recipientName} routed. Arrival: <span className="font-bold text-blue-600">24-48 Business Hours</span>.</p>
        </div>
        <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl">Back to Home</button>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="fixed-overlay bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center animate-in fade-in duration-300">
        <div className="w-full max-w-md min-h-full flex flex-col justify-center items-center py-10 px-6 gap-10">
           <div className="text-center space-y-3">
             <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto border-2 border-blue-500/30 mb-2">
                <span className="text-4xl">🌍</span>
             </div>
             <h2 className="text-3xl font-black text-white italic tracking-tighter">Global Wire Security</h2>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-8">Confirm 2FA to authorize international disbursement.</p>
           </div>
           <div className="flex justify-center gap-2 md:gap-3">
              {otp.map((digit, i) => (
                <input 
                  key={i}
                  id={`otp-wire-${i}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  className="w-11 h-14 md:w-14 md:h-20 bg-white/5 border-2 border-white/10 rounded-2xl text-center text-2xl font-black text-white outline-none focus:border-blue-500 transition-all"
                />
              ))}
           </div>
           <div className="text-center space-y-6">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-10">Verification required for all cross-border SWIFT settlements.</p>
              <button onClick={() => setStep('details')} className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Abort Wire</button>
           </div>
        </div>
      </div>
    );
  }

  const globalBeneficiaries = user.beneficiaries.filter(b => b.type === 'global');

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-2">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      {globalBeneficiaries.length > 0 && step === 'selection' && (
        <div className="space-y-4">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Global Beneficiaries</p>
           <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
              {globalBeneficiaries.map(b => (
                <button 
                  key={b.id} 
                  onClick={() => selectBeneficiary(b)}
                  className="flex flex-col items-center gap-2 min-w-[100px] tap-scale group"
                >
                   <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white dark:border-slate-700">
                      🌍
                   </div>
                   <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate w-full text-center">{b.name}</span>
                </button>
              ))}
           </div>
        </div>
      )}

      <div className="text-center space-y-2 px-4">
        <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent italic tracking-tighter leading-none">Global Wire</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Send foreign currency to 100+ countries.</p>
      </div>

      {step === 'selection' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-2">
          {COUNTRIES.map(c => (
            <button key={c.code} onClick={() => { setSelectedCountry(c); setStep('details'); }} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 group flex flex-col items-center gap-3 tap-scale transition-all">
              <span className="text-5xl group-hover:scale-110 transition-transform">{c.icon}</span>
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{c.name}</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{c.currency}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6 px-2">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
            <div className="flex justify-between items-center pb-6 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl">{selectedCountry.icon}</div>
                <div><span className="font-black italic text-lg leading-none block text-slate-900 dark:text-white">Send {selectedCountry.currency}</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{selectedCountry.name}</span></div>
              </div>
              <button onClick={() => setStep('selection')} className="text-xs font-black text-blue-600 uppercase tracking-tighter">Change</button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Amount ({selectedCountry.currency})</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full p-6 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-blue-600 text-3xl font-black text-slate-900 dark:text-white" />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200">
                <TransferInput label="Beneficiary Name" value={recipientName} onChange={setRecipientName} placeholder="Legal Name" />
                <TransferInput label="Bank Name" value={bankName} onChange={setBankName} placeholder="e.g. Barclays" />
                <div className="grid grid-cols-2 gap-4">
                  <TransferInput label="SWIFT Code" value={swift} onChange={setSwift} placeholder="XXXXXXXX" />
                  <TransferInput label={selectedCountry.label} value={iban} onChange={setIban} placeholder="Details" />
                </div>
              </div>

              {recipientName && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
                   <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="saveWireBen" 
                        checked={saveAsBeneficiary} 
                        onChange={(e) => setSaveAsBeneficiary(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600"
                      />
                      <label htmlFor="saveWireBen" className="text-xs font-bold text-slate-700 dark:text-slate-300">Save as Beneficiary</label>
                   </div>
                   {saveAsBeneficiary && (
                     <input 
                       type="text" 
                       value={beneficiaryNickname}
                       onChange={(e) => setBeneficiaryNickname(e.target.value)}
                       placeholder="Beneficiary Nickname"
                       className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-xs font-bold"
                     />
                   )}
                </div>
              )}

              <button onClick={handleTransferInit} disabled={!amount || !recipientName || !iban || !swift} className="w-full py-5 bg-gradient-to-r from-blue-700 to-purple-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Initiate Global Wire</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TransferInput = ({ label, value, onChange, placeholder }: any) => (
  <div className="space-y-1.5 flex-1">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">{label}</label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold transition-all text-slate-900 dark:text-white" />
  </div>
);

export default InternationalTransfer;
