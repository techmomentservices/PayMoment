
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface QRCodeProps {
  user: User;
}

const QRCode: React.FC<QRCodeProps> = ({ user }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'mine' | 'scan'>('mine');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-xl mx-auto pb-10">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Scan & Pay</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Instant Peer-to-Peer Payments</p>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm max-w-xs mx-auto transition-all">
        <button 
          onClick={() => setTab('mine')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'mine' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600'}`}
        >
          My QR
        </button>
        <button 
          onClick={() => setTab('scan')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'scan' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600'}`}
        >
          Scanner
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 md:p-12 border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm mx-auto flex flex-col items-center gap-8 transition-colors">
        {tab === 'mine' ? (
          <div className="animate-in zoom-in-95 duration-500 w-full flex flex-col items-center gap-8">
            <div className="relative p-6 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 ring-8 ring-slate-50 dark:ring-slate-800/50">
               <div className="w-52 h-52 bg-white flex items-center justify-center relative">
                  {/* Standard High-Contrast QR Pattern (Black on White) */}
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(16)].map((_, i) => (
                      <div key={i} className={`w-8 h-8 ${i % 3 === 0 ? 'bg-slate-900' : 'bg-slate-100'} border border-slate-200 rounded-lg`}></div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl border-4 border-white">
                        <span className="text-xs font-black italic tracking-tighter text-white">PM</span>
                     </div>
                  </div>
               </div>
            </div>
            <div className="text-center space-y-1">
               <p className="font-black text-xl text-slate-900 dark:text-white leading-none">{user.name || 'Agua Ebubechukwu Samuel'}</p>
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] pt-1">ID: @{user.payMomentId || 'agua_pay'}</p>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-square relative rounded-[3rem] overflow-hidden bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center group transition-all animate-in fade-in">
             <div className="absolute inset-10 border-4 border-blue-600/40 rounded-[2rem]"></div>
             <div className="absolute inset-10 border-2 border-blue-600 rounded-[2rem] animate-pulse"></div>
             <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.8)] animate-scan-line z-10"></div>
             
             <div className="z-20 flex flex-col items-center gap-4">
               <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-3xl">🤳</div>
               <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em]">Align QR in frame</p>
             </div>

             <div className="absolute bottom-8 left-0 right-0 text-center px-6 z-20">
                <button className="w-full bg-white/10 dark:bg-black/20 backdrop-blur-xl text-white text-[10px] font-black px-6 py-4 rounded-2xl uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-all tap-scale">
                  Select from Gallery
                </button>
             </div>
          </div>
        )}
      </div>

      <div className="max-w-xs mx-auto grid grid-cols-2 gap-4">
         <button className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 tap-scale">
           Save to Phone
         </button>
         <button className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 tap-scale">
           Share Code
         </button>
      </div>

      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[2.5rem] border border-blue-100 dark:border-blue-800/30 flex gap-4 items-center max-w-sm mx-auto transition-colors">
        <span className="text-2xl">⚡</span>
        <p className="text-[9px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest leading-relaxed">
          QR transfers are secured with <span className="font-black">Dynamic Encryption</span> and settle in under 2 seconds.
        </p>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(0); }
          50% { transform: translateY(280px); }
          100% { transform: translateY(0); }
        }
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default QRCode;
