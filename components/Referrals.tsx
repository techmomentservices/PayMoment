
import React, { useState } from 'react';
import { User } from '../types';

// Add missing props interface
interface ReferralsProps {
  user: User;
}

// Update component signature to accept props
const Referrals: React.FC<ReferralsProps> = ({ user }) => {
  const [copied, setCopied] = useState(false);
  const referralCode = "PAY-TOBI-906";
  const inviteLink = `https://paymoment.ng/invite/${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <div className="inline-block p-4 bg-purple-100 dark:bg-purple-900/40 rounded-3xl text-4xl mb-4 transition-colors">🎁</div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">Invite & Earn</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto transition-colors font-medium">Get <span className="text-purple-700 dark:text-purple-400 font-bold">₦500</span> for every friend who joins PayMoment and completes a transaction.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RewardMetric label="Total Earnings" value="₦4,500" icon="💰" />
        <RewardMetric label="Pending Rewards" value="₦1,500" icon="⏳" />
        <RewardMetric label="Friends Invited" value="12" icon="👥" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 transition-colors">
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center block">Your Unique Referral Code</label>
          <div className="flex items-center justify-center gap-4 bg-slate-50 dark:bg-slate-800/80 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 transition-colors">
             <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tracking-wider">{referralCode}</span>
             <button 
               onClick={copyToClipboard}
               className={`p-3 rounded-xl transition-all tap-scale ${copied ? 'bg-emerald-500 text-white shadow-lg' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'}`}
             >
               {copied ? '✅' : '📋'}
             </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
            <span className="w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px]">?</span>
            The Mechanics
          </h3>
          <div className="space-y-4">
            <Step number={1} title="Distribute your link" desc="Send your unique invite link or code to your network." />
            <Step number={2} title="Verified Sign Up" desc="Your network joins PayMoment and completes KYC level 1." />
            <Step number={3} title="Collect Bounties" desc="Once they transact ₦1,000+, you both receive a ₦500 credit." />
          </div>
        </div>

        <button 
          onClick={copyToClipboard}
          className="w-full py-5 bg-gradient-to-r from-blue-700 to-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 dark:shadow-none transition-all hover:scale-[1.01] active:scale-95 tap-scale"
        >
          {copied ? 'Link Copied Successfully!' : 'Share Referral Link'}
        </button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-6 rounded-3xl space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <h4 className="font-bold text-amber-900 dark:text-amber-400 transition-colors">Referral Leaderboard</h4>
        </div>
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">The top 10 referrers this month will receive an additional <span className="font-bold">₦50,000</span> prize pool!</p>
        <div className="flex justify-between items-center bg-white/60 dark:bg-black/20 p-3 rounded-2xl text-[10px] font-bold text-amber-900 dark:text-amber-400 transition-colors border border-amber-100 dark:border-transparent">
          <span>Current Rank: #142</span>
          <button className="text-blue-600 dark:text-blue-400 uppercase tracking-tighter font-black">View Rankings →</button>
        </div>
      </div>
    </div>
  );
};

const RewardMetric = ({ label, value, icon }: { label: string, value: string, icon: string }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors group hover:border-blue-300 dark:hover:border-blue-700">
    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-all group-hover:scale-110">{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">{label}</p>
      <p className="text-lg font-bold text-slate-900 dark:text-white tracking-tight transition-colors">{value}</p>
    </div>
  </div>
);

const Step = ({ number, title, desc }: { number: number, title: string, desc: string }) => (
  <div className="flex gap-4 group">
    <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 text-sm transition-all group-hover:bg-blue-600 group-hover:text-white">
      {number}
    </div>
    <div>
      <p className="font-bold text-sm text-slate-900 dark:text-slate-100 transition-colors">{title}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed transition-colors font-medium">{desc}</p>
    </div>
  </div>
);

export default Referrals;
