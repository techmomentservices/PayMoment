
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Transaction } from '../types';
import { PayMomentLogo } from '../App';

import { parseFirestoreError } from '../src/firebase';

interface PaymentCheckoutProps {
  user: User;
  processTransaction: (tx: Transaction, currency: string, pin?: string) => Promise<void>;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({ user, processTransaction, notify }) => {
  const { payId, slug } = useParams();
  const navigate = useNavigate();
  
  const [amount, setAmount] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'info' | 'method' | 'paystack' | 'processing' | 'success'>('info');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'TRANSFER' | null>(null);

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

  const link = user.paymentLinks.find(l => l.slug === slug) || { title: 'Payment Request', amount: null };
  const finalAmount = link.amount || getRawAmount();

  const handleProceed = () => {
    if (!payerEmail.includes('@')) {
      notify("Please enter a valid email.", "error");
      return;
    }
    if (!finalAmount || finalAmount <= 100) {
      notify("Minimum payment is ₦100.00", "error");
      return;
    }
    setCheckoutStep('method');
  };

  const handlePaystackPayment = async () => {
    setCheckoutStep('processing');
    try {
      const tx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'credit',
        amount: finalAmount,
        title: slug === 'fund' ? 'Wallet Funding (Card)' : `Invoice: ${link.title}`,
        category: 'External Payment',
        timestamp: new Date().toLocaleString(),
        status: 'completed'
      };
      await processTransaction(tx, 'NGN');
      setCheckoutStep('success');
    } catch (error) {
      console.error("Payment failed", error);
      const errorMsg = parseFirestoreError(error);
      notify(errorMsg, "error");
      setCheckoutStep('method');
    }
  };

  if (checkoutStep === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="space-y-8 animate-in zoom-in-95 duration-700 max-w-sm">
           <PayMomentLogo className="w-32 h-32 mx-auto drop-shadow-xl" />
           <div className="space-y-2 px-4">
              <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">Payment Received!</h1>
              <p className="text-slate-600 dark:text-slate-400 font-medium">₦{finalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} received to {user.name}.</p>
           </div>
           <button onClick={() => navigate('/')} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row">
      <div className="md:w-1/3 bg-blue-700 dark:bg-slate-800 p-10 md:p-14 text-white flex flex-col justify-between shadow-2xl relative z-20">
        <div className="space-y-10">
           <div className="flex items-center gap-3"><PayMomentLogo className="w-12 h-12" /><h1 className="text-2xl font-black italic tracking-tighter">PayMoment</h1></div>
           <div className="space-y-6">
              <div className="w-20 h-20 bg-white/20 rounded-[2.5rem] flex items-center justify-center text-3xl font-bold border border-white/20 backdrop-blur-md">{user.name.charAt(0)}</div>
              <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Paying to</p><h2 className="text-3xl font-black tracking-tight">{user.name}</h2><p className="text-sm text-white/40 font-medium italic">@{user.payMomentId}</p></div>
           </div>
        </div>
        <div className="pt-10 space-y-3 border-t border-white/10 mt-auto"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Transaction Note</p><p className="text-base font-bold text-white/90 leading-tight">{slug === 'fund' ? 'Personal Wallet Funding' : link.title}</p></div>
      </div>
      <div className="flex-1 bg-white dark:bg-slate-950 p-8 md:p-20 flex items-center justify-center relative overflow-hidden">
        <div className="w-full max-w-md space-y-12 z-10">
           {checkoutStep === 'info' && (
             <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale"><div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></div><span className="text-[10px] font-black uppercase tracking-widest">Return to App</span></button>
                <div className="space-y-3"><h3 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Secure Checkout</h3><p className="text-slate-500 dark:text-slate-400 font-medium">Fast, secure, and globally accessible.</p></div>
                <div className="space-y-6">
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest px-1">Email</label><input type="email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="customer@example.com" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-600 font-bold transition-all text-slate-900 dark:text-white" /></div>
                   {(slug === 'fund' || !link.amount) ? (
                     <div className="space-y-2"><label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest px-1">Amount</label><div className="relative"><span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">₦</span><input type="text" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0.00" className="w-full p-5 pl-12 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-600 font-black text-3xl tabular-nums" /></div></div>
                   ) : (
                     <div className="p-8 bg-blue-50 dark:bg-blue-900/30 rounded-[2.5rem] border border-blue-200 flex flex-col items-center gap-2"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total Amount</p><h4 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums italic">₦{link.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</h4></div>
                   )}
                </div>
                <button onClick={handleProceed} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Proceed to Payment</button>
             </div>
           )}
           {checkoutStep === 'method' && (
             <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <button onClick={() => setCheckoutStep('info')} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale"><div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></div><span className="text-[10px] font-black uppercase tracking-widest">Back</span></button>
                <div className="space-y-3"><h3 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Payment Method</h3></div>
                <div className="grid gap-4"><MethodItem id="CARD" title="Card" desc="Visa, Mastercard" icon="💳" active={paymentMethod === 'CARD'} onClick={() => { setPaymentMethod('CARD'); setCheckoutStep('paystack'); }} /><MethodItem id="TRANSFER" title="Bank Transfer" desc="Instant settlement" icon="🏦" active={paymentMethod === 'TRANSFER'} onClick={() => setPaymentMethod('TRANSFER')} /></div>
                {paymentMethod === 'TRANSFER' && (
                  <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-lg space-y-6 text-center"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Send ₦{finalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} to</p><h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-widest tabular-nums">9024 1201 02</h4><button onClick={handlePaystackPayment} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest">I have made the transfer</button></div>
                )}
             </div>
           )}
           {checkoutStep === 'paystack' && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
                  <div className="bg-slate-50 dark:bg-slate-800 px-8 py-6 border-b border-slate-100 flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-[#00BBCC] rounded-full flex items-center justify-center text-white text-[10px] font-black">P</div><span className="font-bold">Paystack Checkout</span></div><button onClick={() => setCheckoutStep('method')} className="text-slate-400 text-3xl font-light hover:rotate-90 transition-transform">×</button></div>
                  <div className="p-8 space-y-8"><div className="text-center"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Paying to {user.name}</p><h4 className="text-3xl font-black text-slate-900 dark:text-white tabular-nums italic">₦{finalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</h4></div><div className="space-y-4"><button onClick={handlePaystackPayment} className="w-full py-5 bg-[#3bb75e] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Pay ₦{finalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</button></div></div>
               </div>
             </div>
           )}
           {checkoutStep === 'processing' && (<div className="flex flex-col items-center justify-center space-y-10 py-20 animate-in fade-in duration-500"><div className="relative"><div className="w-24 h-24 border-8 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center font-black text-blue-600 italic">PM</div></div><div className="text-center space-y-6"><div className="space-y-2"><h4 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Verifying</h4><p className="text-xs font-black text-slate-500 animate-pulse uppercase tracking-[0.3em]">Bridge Active...</p></div></div></div>)}
        </div>
      </div>
    </div>
  );
};

const MethodItem = ({ title, desc, icon, active, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all tap-scale group ${active ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-600 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}><div className="flex items-center gap-5 text-left"><div className="text-3xl transition-transform group-hover:scale-110">{icon}</div><div><h5 className="font-black text-slate-900 dark:text-white leading-none mb-1">{title}</h5><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{desc}</p></div></div><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>{active && <div className="w-2 h-2 bg-white rounded-full"></div>}</div></button>
);

export default PaymentCheckout;
