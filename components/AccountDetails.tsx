
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface AccountDetailsProps {
  user: User;
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

const AccountDetails: React.FC<AccountDetailsProps> = ({ user, notify }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'NGN' | 'USD' | 'GBP'>('NGN');

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    notify(`${label} copied!`, 'success');
  };

  const isDomActive = (curr: 'USD' | 'GBP') => user.balances[curr] !== undefined;

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">Receive Money</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Your universal bank details for local and global transfers.</p>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        {(['NGN', 'USD', 'GBP'] as const).map((curr) => (
          <button 
            key={curr}
            onClick={() => setActiveTab(curr)}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === curr ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            {curr}
          </button>
        ))}
      </div>

      {/* NEW PROMINENT LINK TO PAYLINKS */}
      <div 
        onClick={() => navigate('/receive-global')}
        className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-[2.5rem] text-white flex items-center justify-between cursor-pointer group hover:shadow-xl transition-all active:scale-95"
      >
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-md">🔗</div>
           <div>
              <h4 className="font-black text-sm uppercase tracking-widest leading-none mb-1">Use PayLink™</h4>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Universal Invoicing Link</p>
           </div>
        </div>
        <span className="text-2xl group-hover:translate-x-2 transition-transform">→</span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-10 transition-colors">
        {activeTab === 'NGN' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center px-2">
              <div>
                <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight leading-none">Naira Account</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-1">Local NUBAN Transfer</p>
              </div>
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-3xl border border-blue-100 dark:border-transparent">🇳🇬</div>
            </div>

            <div className="space-y-6">
              <DetailRow label="Bank Name" value="PayMoment Bank (Wema Bank)" onCopy={() => copyToClipboard('Bank Name', 'PayMoment Bank')} />
              <DetailRow label="Account Number" value={user.accountNumber} onCopy={() => copyToClipboard('Account Number', user.accountNumber)} />
              <DetailRow label="Account Holder" value={user.name} onCopy={() => copyToClipboard('Account Holder', user.name)} />
            </div>
          </div>
        ) : !isDomActive(activeTab) ? (
          <div className="text-center py-10 space-y-6">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mx-auto">🔒</div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{activeTab} Account Inactive</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">Please activate your domiciliary wallet to view receiving credentials.</p>
            </div>
            <button 
              onClick={() => navigate('/dom-accounts')}
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg tap-scale"
            >
              Activate Now
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center px-2">
              <div>
                <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight leading-none">{activeTab} Account</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-1">International Wire Details</p>
              </div>
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-3xl border border-emerald-100 dark:border-transparent">
                {activeTab === 'USD' ? '🇺🇸' : '🇬🇧'}
              </div>
            </div>

            <div className="space-y-6">
              <DetailRow label="Account Holder" value={user.name} onCopy={() => copyToClipboard('Account Holder', user.name)} />
              <DetailRow label="Account Number" value={user.accountNumber + (activeTab === 'USD' ? '88' : '99')} onCopy={() => copyToClipboard('Account Number', user.accountNumber + (activeTab === 'USD' ? '88' : '99'))} />
              <DetailRow label="Bank Name" value={DOM_DETAILS[activeTab as 'USD' | 'GBP'].bank} onCopy={() => copyToClipboard('Bank Name', DOM_DETAILS[activeTab as 'USD' | 'GBP'].bank)} />
              <DetailRow label="SWIFT / BIC" value={DOM_DETAILS[activeTab as 'USD' | 'GBP'].swift} onCopy={() => copyToClipboard('SWIFT', DOM_DETAILS[activeTab as 'USD' | 'GBP'].swift)} />
              {activeTab === 'USD' ? (
                <DetailRow label="Routing Number (ABA)" value={DOM_DETAILS.USD.routing} onCopy={() => copyToClipboard('Routing Number', DOM_DETAILS.USD.routing)} />
              ) : (
                <DetailRow label="Sort Code" value={DOM_DETAILS.GBP.sortCode} onCopy={() => copyToClipboard('Sort Code', DOM_DETAILS.GBP.sortCode)} />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2.5rem] border border-blue-100 dark:border-transparent flex gap-6 items-center transition-colors">
         <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl shadow-sm">💡</div>
         <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest leading-relaxed">
           Incoming transfers are automatically credited to your {activeTab} wallet. Local transfers reflect in seconds.
         </p>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, onCopy }: { label: string, value: string, onCopy: () => void }) => (
  <div className="group">
     <div className="flex justify-between items-center mb-1.5 px-1">
        <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{label}</span>
     </div>
     <div 
       onClick={onCopy}
       className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all active:scale-98"
     >
        <span className="text-sm font-black text-slate-900 dark:text-white truncate pr-4">{value}</span>
        <span className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest">Copy</span>
     </div>
  </div>
);

export default AccountDetails;
