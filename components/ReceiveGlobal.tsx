
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, PaymentLink } from '../types';

interface ReceiveGlobalProps {
  user: User;
  setUser: (user: User) => void;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const ACCOUNTS = [
  { 
    currency: 'USD', 
    name: 'United States Dollar', 
    icon: '🇺🇸',
    theme: 'blue',
    details: [
      { label: 'Bank Name', value: 'Evolve Bank & Trust' },
      { label: 'Account Holder', value: 'Agua Ebubechukwu Samuel' },
      { label: 'Account Number', value: '9876543210' },
      { label: 'Routing Number', value: '123456789' },
      { label: 'Swift Code', value: 'EVOLUS33XXX' },
      { label: 'Bank Address', value: '6070 Poplar Ave, Memphis, TN' }
    ]
  },
  { 
    currency: 'GBP', 
    name: 'British Pound', 
    icon: '🇬🇧',
    theme: 'purple',
    details: [
      { label: 'Bank Name', value: 'ClearBank Ltd' },
      { label: 'Account Holder', value: 'Agua Ebubechukwu Samuel' },
      { label: 'Account Number', value: '00112233' },
      { label: 'Sort Code', value: '11-22-33' },
      { label: 'IBAN', value: 'GB00CLR112233445566' }
    ]
  }
];

const ReceiveGlobal: React.FC<ReceiveGlobalProps> = ({ user, setUser, notify }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ID' | 'PAYLINK' | 'DOM'>('ID');
  const [isGenerating, setIsGenerating] = useState(false);

  // PayLink Creator State
  const [linkTitle, setLinkTitle] = useState('');
  const [linkAmount, setLinkAmount] = useState('');

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    notify("Link copied! Share it anywhere.", 'success');
  };

  const createPayLink = () => {
    if (!linkTitle.trim()) {
      notify("Please give your link a title.", "error");
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const slug = linkTitle.toLowerCase().replace(/\s+/g, '-');
      const newLink: PaymentLink = {
        id: Math.random().toString(36).substr(2, 9),
        slug,
        title: linkTitle,
        amount: linkAmount ? parseFloat(linkAmount.replace(/,/g, '')) : null,
        visits: 0,
        completions: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setUser({
        ...user,
        paymentLinks: [newLink, ...(user.paymentLinks || [])]
      });
      
      setIsGenerating(false);
      setLinkTitle('');
      setLinkAmount('');
      notify("Professional PayLink created!", "success");
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-2">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-all shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="text-center space-y-2">
         <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Receiving Hub</h2>
         <p className="text-sm text-slate-600 dark:text-slate-400 font-medium font-inter">Accept global payments instantly with zero fuss.</p>
      </div>

      {/* PRIMARY FUNDING LINK SECTION */}
      <div className="bg-gradient-to-br from-teal-600 via-blue-700 to-purple-800 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden group border-b-4 border-black/10">
        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                 <span className="px-3 py-1 bg-white/20 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20">Global Ready</span>
                 <span className="px-3 py-1 bg-emerald-400/30 text-white rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-400/20">PCI Secured</span>
              </div>
              <h3 className="text-3xl font-black italic tracking-tighter leading-tight">Your PayMoment.Me</h3>
              <p className="text-xs text-white opacity-90 max-w-xs leading-relaxed font-bold">Share this link to receive money from anyone via Card or Bank Transfer.</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-[2rem] flex items-center justify-center text-4xl border border-white/20 backdrop-blur-md shadow-inner">💳</div>
          </div>

          <div className="p-6 md:p-8 bg-white/10 rounded-[2.5rem] border border-white/20 backdrop-blur-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <span className="font-mono text-lg font-bold tracking-tight text-white break-all">paymoment.me/@{user.payMomentId}</span>
              <button 
                onClick={() => handleCopy(`https://paymoment.me/#/pay/${user.payMomentId}/fund`)}
                className="bg-white text-blue-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 active:scale-95 transition-all w-full md:w-auto"
              >
                Copy My Link
              </button>
            </div>
          </div>
        </div>
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/5 rounded-full blur-[80px]"></div>
      </div>

      {/* TABS */}
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-lg transition-colors overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('ID')} className={`flex-1 py-3 px-6 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'ID' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>Local ID</button>
        <button onClick={() => setActiveTab('PAYLINK')} className={`flex-1 py-3 px-6 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'PAYLINK' ? 'bg-purple-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>PayLink Hub</button>
        <button onClick={() => setActiveTab('DOM')} className={`flex-1 py-3 px-6 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'DOM' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>Intl Bank</button>
      </div>

      {activeTab === 'ID' && (
        <div className="animate-in slide-in-from-bottom-4 space-y-8">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 md:p-14 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center gap-10">
              <div className="text-center space-y-2">
                 <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">PayMoment P2P</h3>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Instant Internal Transfer</p>
              </div>

              <div className="relative p-8 bg-slate-50 dark:bg-slate-800 rounded-[3rem] border-2 border-slate-100 dark:border-slate-700 shadow-inner group">
                 <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center p-4">
                    <div className="w-full h-full border-4 border-slate-900 flex items-center justify-center relative">
                       <div className="grid grid-cols-4 gap-2">
                          {[...Array(16)].map((_, i) => (
                            <div key={i} className={`w-6 h-6 ${i % 3 === 0 ? 'bg-slate-900' : 'bg-slate-200'}`}></div>
                          ))}
                       </div>
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black italic text-xs border-2 border-white">PM</div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="w-full space-y-4">
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group cursor-pointer" onClick={() => handleCopy(user.payMomentId)}>
                    <div>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">User Pay ID</p>
                       <p className="text-lg font-black text-slate-900 dark:text-white">@{user.payMomentId}</p>
                    </div>
                    <span className="text-xl group-hover:scale-110 transition-transform">📋</span>
                 </div>
                 <button 
                  onClick={() => handleCopy(`@${user.payMomentId}`)}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-none tap-scale"
                 >
                   Share Pay ID
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'DOM' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="grid gap-8">
            {ACCOUNTS.map(account => (
              <div key={account.currency} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-10 transition-colors group relative overflow-hidden">
                <div className="flex items-center gap-6 relative z-10">
                    <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-xl border-4 border-white dark:border-slate-800 transition-transform group-hover:rotate-6 ${
                      account.theme === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {account.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{account.currency} Account</h4>
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[8px] font-black rounded-lg uppercase tracking-widest">Active</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest leading-none">{account.name}</p>
                    </div>
                </div>

                <div className="grid gap-5 relative z-10">
                    {account.details.map((detail, idx) => (
                      <div key={idx} className="group/item cursor-pointer" onClick={() => handleCopy(detail.value)}>
                          <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{detail.label}</label>
                          </div>
                          <div className="text-sm font-black text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-all group-hover/item:border-blue-500 group-hover/item:bg-white dark:group-hover/item:bg-slate-800 shadow-sm">
                            <span className="truncate pr-4 leading-none tabular-nums">{detail.value}</span>
                            <span className="text-slate-400 group-hover/item:text-blue-500 transition-colors">📋</span>
                          </div>
                      </div>
                    ))}
                </div>
                <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none ${
                  account.theme === 'blue' ? 'bg-blue-600' : 'bg-purple-600'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'PAYLINK' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
            <div>
               <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">PayLink Hub</h3>
               <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mt-2">Professional Universal Invoicing</p>
            </div>

            <div className="grid gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Purpose of Payment</label>
                  <input 
                    type="text" 
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="e.g. Logo Design, Event Tickets"
                    className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-purple-500 outline-none font-bold text-slate-900 dark:text-white transition-all placeholder:text-slate-300"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Fixed Amount (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">₦</span>
                    <input 
                      type="text" 
                      value={linkAmount}
                      onChange={(e) => setLinkAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0.00"
                      className="w-full p-5 pl-10 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-purple-500 outline-none font-black text-2xl text-slate-900 dark:text-white transition-all placeholder:text-slate-300"
                    />
                  </div>
               </div>
            </div>

            <button 
              onClick={createPayLink}
              disabled={isGenerating || !linkTitle}
              className="w-full py-6 bg-purple-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isGenerating ? 'Deploying Engine...' : 'Generate PayLink'}
            </button>
          </div>

          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2">Manage PayLinks</h4>
             {(!user.paymentLinks || user.paymentLinks.length === 0) ? (
               <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 italic font-bold">No active links found.</div>
             ) : (
               user.paymentLinks.map(link => (
                 <div key={link.id} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-md space-y-6 group transition-all hover:shadow-xl">
                    <div className="flex justify-between items-start">
                       <div>
                          <h5 className="font-black text-lg text-slate-900 dark:text-white leading-none">{link.title}</h5>
                          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-2 truncate max-w-[200px] md:max-w-none">paymoment.me/pay/{user.payMomentId}/{link.slug}</p>
                       </div>
                       <button 
                        onClick={() => handleCopy(`https://paymoment.me/#/pay/${user.payMomentId}/${link.slug}`)}
                        className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-4 rounded-2xl border border-blue-100 dark:border-transparent tap-scale"
                       >
                         📋
                       </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                       <Metric label="Visits" value={link.visits} />
                       <Metric label="Sales" value={link.completions} />
                       <Metric label="Rev." value={`₦${((link.completions * (link.amount || 0))).toLocaleString()}`} />
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>
      )}
    </div>
  );
};

const Metric = ({ label, value }: { label: string, value: string | number }) => (
  <div className="text-center">
     <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{label}</p>
     <p className="text-sm md:text-lg font-black text-slate-900 dark:text-white tabular-nums leading-none tracking-tight">{value}</p>
  </div>
);

export default ReceiveGlobal;
