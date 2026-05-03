
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface RewardsProps {
  user: User;
  setUser: (user: User) => void;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const LEADERBOARD = [
  { name: 'Tobi A.', points: 12450, rank: 1, avatar: '👤' },
  { name: 'Chinedu O.', points: 10200, rank: 2, avatar: '👤' },
  { name: 'Fola W.', points: 9800, rank: 3, avatar: '👤' },
  { name: 'Amaka J.', points: 8500, rank: 4, avatar: '👤' },
  { name: 'Musa K.', points: 7200, rank: 5, avatar: '👤' },
];

const Rewards: React.FC<RewardsProps> = ({ user, setUser, notify }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-800 rounded-[3rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-6 text-center">
           <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter">Moments Rewards</h2>
           <div className="flex flex-col items-center gap-2">
              <span className="text-6xl font-black tabular-nums">{user.momentPoints.toLocaleString()}</span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-200">Current Reward Points</p>
           </div>
           <button className="px-10 py-5 bg-white text-purple-900 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Redeem for Cash</button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Badges */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
           <h3 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white">Achievements</h3>
           <div className="grid grid-cols-3 gap-4">
              {user.badges.map(badge => (
                <div key={badge.id} className={`flex flex-col items-center text-center gap-2 ${badge.unlocked ? '' : 'opacity-30 grayscale'}`}>
                   <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl border border-slate-100 dark:border-slate-700 shadow-inner">
                      {badge.icon}
                   </div>
                   <p className="text-[9px] font-black uppercase tracking-tight leading-none text-slate-900 dark:text-white">{badge.name}</p>
                </div>
              ))}
           </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
           <h3 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white">Top Momentums</h3>
           <div className="space-y-4">
              {LEADERBOARD.map(item => (
                <div key={item.rank} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                   <div className="flex items-center gap-4">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${item.rank === 1 ? 'bg-amber-400 text-amber-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{item.rank}</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{item.name}</span>
                   </div>
                   <span className="text-xs font-black text-purple-600 dark:text-purple-400">{item.points.toLocaleString()} pts</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-800/50 flex gap-6 items-center">
         <span className="text-4xl">🎁</span>
         <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest leading-relaxed">
           You earn <span className="font-black">1 Point for every ₦1,000</span> spent. Refer a friend to earn an instant 500 Points. 
           Unlocked badges grant you exclusive low exchange rates!
         </p>
      </div>
    </div>
  );
};

export default Rewards;
