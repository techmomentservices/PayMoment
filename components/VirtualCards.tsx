
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType, parseFirestoreError } from '../src/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Transaction, CardData, User } from '../types';

interface VirtualCardsProps {
  user: User;
  setUser: (user: User) => void;
  processTransaction: (tx: Transaction, currency: string, pin?: string) => Promise<void>;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const VirtualCards: React.FC<VirtualCardsProps> = ({ user, setUser, processTransaction, notify }) => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isRequestingPhysical, setIsRequestingPhysical] = useState(false);
  
  const [newCardLabel, setNewCardLabel] = useState('');
  const [newCardCurrency, setNewCardCurrency] = useState<'NGN' | 'USD'>('USD');
  const [newCardNetwork, setNewCardNetwork] = useState<'VISA' | 'MASTERCARD'>('VISA');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pendingAction, setPendingAction] = useState<'virtual' | 'physical' | null>(null);

  // Physical card form state
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: ''
  });
  const [isOrderingPhysical, setIsOrderingPhysical] = useState(false);

  const generateCard = async () => {
    if (!newCardLabel.trim() || !auth.currentUser) return;
    
    const issuanceFee = newCardCurrency === 'NGN' ? 1000 : 5;
    if (user.balances[newCardCurrency] < issuanceFee) {
      notify(`Insufficient ${newCardCurrency} balance for card issuance fee.`, "error");
      return;
    }

    setPendingAction('virtual');
    setShowPinModal(true);
  };

  const finalizeGenerateCard = async () => {
    setIsGenerating(true);
    try {
      const issuanceFee = newCardCurrency === 'NGN' ? 1000 : 5;
      const newCard: CardData = {
        id: Math.random().toString(36).substr(2, 9),
        label: newCardLabel,
        number: `${newCardNetwork === 'MASTERCARD' ? '5399' : '4822'} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        expiry: `0${Math.floor(Math.random() * 9) + 1}/${28 + Math.floor(Math.random() * 3)}`,
        cvv: Math.floor(100 + Math.random() * 899).toString(),
        type: newCardNetwork,
        currency: newCardCurrency,
        balance: 0,
        monthlyLimit: newCardCurrency === 'NGN' ? 500000 : 1000,
        status: 'active'
      };

      const tx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'debit',
        amount: issuanceFee,
        title: `Virtual Card Issuance - ${newCardLabel}`,
        category: 'Service Fee',
        timestamp: new Date().toISOString(),
        status: 'completed'
      };

      const userRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(userRef, {
        cards: arrayUnion(newCard),
      });
      
      await processTransaction(tx, newCardCurrency, pin);

      setNewCardLabel('');
      setIsCreating(false);
      setIsGenerating(false);
      setShowPinModal(false);
      setPin('');
      notify("Virtual card deployed successfully!", "success");
    } catch (error) {
      console.error("Card generation failed", error);
      const errorMsg = parseFirestoreError(error);
      notify(errorMsg, "error");
      setIsGenerating(false);
      setPin('');
    }
  };

  const handlePhysicalOrder = async () => {
    if (!address.street || !address.city || !address.state || !auth.currentUser) {
      notify("Please fill in your complete delivery address.", "error");
      return;
    }

    const deliveryFee = 1500;
    if (user.balances['NGN'] < deliveryFee) {
      notify("Insufficient NGN balance for delivery fee.", "error");
      return;
    }
    
    setPendingAction('physical');
    setShowPinModal(true);
  };

  const finalizePhysicalOrder = async () => {
    setIsOrderingPhysical(true);
    try {
      const deliveryFee = 1500;
      const newPhysicalCard: CardData = {
        id: Math.random().toString(36).substr(2, 9),
        label: 'Physical Debit Card',
        number: `5399 **** **** ${Math.floor(1000 + Math.random() * 9000)}`,
        expiry: 'Pending',
        cvv: '***',
        type: 'MASTERCARD',
        currency: 'NGN',
        balance: 0,
        isPhysical: true,
        status: 'pending'
      };

      const tx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'debit',
        amount: deliveryFee,
        title: `Physical Card Order Fee`,
        category: 'Service Fee',
        timestamp: new Date().toISOString(),
        status: 'completed'
      };

      const userRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(userRef, {
        cards: arrayUnion(newPhysicalCard),
      });

      await processTransaction(tx, 'NGN', pin);

      setIsOrderingPhysical(false);
      setIsRequestingPhysical(false);
      setShowPinModal(false);
      setPin('');
      notify("Physical card order placed! It will arrive in 3-5 business days.", "success");
    } catch (error) {
      console.error("Physical card order failed", error);
      notify(typeof error === 'string' ? error : "Failed to place order. Please try again.", "error");
      setIsOrderingPhysical(false);
      setPin('');
    }
  };

  const displayCards = user.cards || [];

  return (
    <div className="space-y-10 pb-20">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight italic">Card Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Instant virtual cards and premium physical debits.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
             onClick={() => setIsRequestingPhysical(true)}
             className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all"
          >
             Request Physical
          </button>
          <button 
             onClick={() => setIsCreating(true)}
             className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-blue-700 active:scale-95 transition-all shadow-blue-500/20"
          >
             + Issue Digital
          </button>
        </div>
      </div>

      {/* PHYSICAL CARD AD BANNER */}
      {!displayCards.some(c => c.isPhysical && c.status === 'pending') && (
        <div 
          onClick={() => setIsRequestingPhysical(true)}
          className="bg-gradient-to-r from-blue-700 to-indigo-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
               <span className="px-3 py-1 bg-white/20 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20">Limited Edition</span>
               <h3 className="text-3xl font-black italic tracking-tighter leading-none">Get the PayMoment Physical Card</h3>
               <p className="text-xs text-white/70 max-w-sm font-medium leading-relaxed">Accepted at every POS and ATM nationwide. Experience premium offline banking with 0.5% cashback on every swipe.</p>
               <button className="bg-white text-blue-900 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[9px]">Apply Now</button>
            </div>
            <div className="w-48 h-32 bg-slate-900 rounded-2xl rotate-6 shadow-2xl flex flex-col justify-between p-4 border border-white/10 group-hover:rotate-0 transition-transform duration-500">
               <span className="font-black italic text-xs">PM</span>
               <div className="space-y-1">
                  <div className="w-10 h-6 bg-amber-400/20 rounded"></div>
                  <p className="text-[8px] font-mono opacity-40">5399 **** **** 8821</p>
               </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px]"></div>
        </div>
      )}

      <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {displayCards.map((card) => (
          <div 
            key={card.id} 
            className={`relative aspect-[1.6/1] w-full rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] tap-scale ${
              card.status === 'pending' ? 'grayscale opacity-60' : 
              card.currency === 'USD' ? 'bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-800' : 'bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600'
            }`}
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start">
                 <div className="flex flex-col">
                   <span className="font-black text-xl italic tracking-tighter">PayMoment</span>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mt-0.5">{card.label}</span>
                 </div>
                 {card.status === 'pending' ? (
                   <span className="bg-amber-500/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-500/20 text-amber-300">Ordering</span>
                 ) : card.isPhysical ? (
                   <span className="bg-white/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20">Physical</span>
                 ) : (
                    <span className="bg-emerald-500/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20 text-emerald-300">Virtual</span>
                 )}
              </div>
              
              <p className="text-2xl font-mono tracking-widest tabular-nums">{card.number}</p>

              <div className="flex justify-between items-end">
                <div className="flex gap-8">
                  <div>
                    <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Expiry</p>
                    <p className="text-sm font-black tabular-nums">{card.expiry}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">CVV</p>
                    <p className="text-sm font-black tabular-nums">***</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">{card.currency}</span>
                  <span className="text-xl font-black italic tracking-tighter opacity-90">{card.type === 'MASTERCARD' ? 'MC' : 'VISA'}</span>
                </div>
              </div>
            </div>
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-[60px] group-hover:scale-110 transition-transform duration-700"></div>
          </div>
        ))}

        <div onClick={() => setIsCreating(true)} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4 group cursor-pointer hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all tap-scale shadow-sm">
           <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-3xl group-hover:rotate-12 transition-transform">➕</div>
           <div>
              <h4 className="font-black text-lg text-slate-900 dark:text-white leading-none mb-1 uppercase tracking-tight italic">New Digital Asset</h4>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Deploy instant virtual card</p>
           </div>
        </div>
      </div>

      {/* PHYSICAL CARD REQUEST MODAL */}
      {isRequestingPhysical && (
        <div className="fixed-overlay bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[3.5rem] w-full max-w-xl p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10 overflow-y-auto max-h-[90vh] no-scrollbar">
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">Order Physical Card</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Premium Delivery Service</p>
                 </div>
                 <button onClick={() => setIsRequestingPhysical(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-2xl">×</button>
              </div>

              <div className="space-y-8">
                 <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
                    <span className="text-3xl">🚚</span>
                    <div>
                       <p className="text-[11px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest leading-none mb-1">Estimated Delivery</p>
                       <p className="text-sm font-bold text-blue-700 dark:text-blue-200">3 - 5 Business Days • ₦1,500 Delivery Fee</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Delivery Information</p>
                    <div className="grid gap-4">
                       <input 
                          type="text" 
                          placeholder="Street Address" 
                          value={address.street}
                          onChange={(e) => setAddress({...address, street: e.target.value})}
                          className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 font-bold dark:text-white"
                       />
                       <div className="grid grid-cols-2 gap-4">
                          <input 
                             type="text" 
                             placeholder="City" 
                             value={address.city}
                             onChange={(e) => setAddress({...address, city: e.target.value})}
                             className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 font-bold dark:text-white"
                          />
                          <input 
                             type="text" 
                             placeholder="State" 
                             value={address.state}
                             onChange={(e) => setAddress({...address, state: e.target.value})}
                             className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 font-bold dark:text-white"
                          />
                       </div>
                       <input 
                          type="text" 
                          placeholder="Postal Code (Optional)" 
                          value={address.zip}
                          onChange={(e) => setAddress({...address, zip: e.target.value})}
                          className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 font-bold dark:text-white"
                       />
                    </div>
                 </div>

                 <div className="pt-4">
                    <button 
                       onClick={handlePhysicalOrder}
                       disabled={isOrderingPhysical || !address.street || !address.city || !address.state}
                       className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                       {isOrderingPhysical ? (
                          <>
                             <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                             <span>Requesting...</span>
                          </>
                       ) : 'Order Physical Card'}
                    </button>
                    <p className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest mt-6">
                       Delivery Fee will be deducted from your Naira wallet.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* VIRTUAL CARD GENERATION MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-t-[3.5rem] md:rounded-[4rem] w-full max-w-2xl p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-12 duration-500 overflow-y-auto max-h-[95vh] no-scrollbar border-t border-slate-200 dark:border-slate-800">
            
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none">Synthesize Card</h3>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-2">Moment Asset Generation Engine</p>
              </div>
              <button onClick={() => setIsCreating(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-3xl hover:rotate-90 transition-transform shadow-sm">×</button>
            </div>
            
            <div className="space-y-10">
              <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Real-time Visualization</p>
                 <div className={`relative aspect-[1.7/1] w-full max-w-sm mx-auto rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden transition-all duration-700 ${
                    newCardCurrency === 'USD' ? 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-700' : 'bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500'
                  }`}>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                       <div className="flex justify-between items-start">
                          <span className="font-black text-xl italic tracking-tighter">PayMoment</span>
                          <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-md">Virtual</span>
                       </div>
                       <p className="text-xl font-mono tracking-widest opacity-40 font-bold">**** **** **** ****</p>
                       <div className="flex justify-between items-end">
                          <div>
                             <p className="text-[9px] text-white/60 uppercase font-black tracking-widest mb-1">Asset Label</p>
                             <p className="text-sm font-black italic tracking-tight">{newCardLabel || 'PayMoment Client'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                             <span className="text-[9px] font-black bg-white/20 px-2 py-1 rounded-lg uppercase border border-white/20">{newCardCurrency}</span>
                             <span className="text-xl font-black italic tracking-tighter opacity-90">{newCardNetwork === 'MASTERCARD' ? 'MC' : 'VISA'}</span>
                          </div>
                       </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
                 </div>
              </div>

              <div className="grid gap-8">
                <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-widest px-2 font-inter">1. Select Asset Currency</p>
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setNewCardCurrency('NGN')} 
                        className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-3 ${newCardCurrency === 'NGN' ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-600 shadow-md scale-[1.02]' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                      >
                         <span className="text-4xl">🇳🇬</span>
                         <div className="text-center">
                            <p className={`font-black text-xl tracking-tight leading-none ${newCardCurrency === 'NGN' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white'}`}>NGN</p>
                            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${newCardCurrency === 'NGN' ? 'text-blue-600' : 'text-slate-500'}`}>Naira Moment</p>
                         </div>
                      </button>
                      <button 
                        onClick={() => setNewCardCurrency('USD')} 
                        className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-3 ${newCardCurrency === 'USD' ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-600 shadow-md scale-[1.02]' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                      >
                         <span className="text-4xl">🇺🇸</span>
                         <div className="text-center">
                            <p className={`font-black text-xl tracking-tight leading-none ${newCardCurrency === 'USD' ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>USD</p>
                            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${newCardCurrency === 'USD' ? 'text-indigo-600' : 'text-slate-500'}`}>Dollar Moment</p>
                         </div>
                      </button>
                   </div>
                </div>

                <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-widest px-2">2. Select Card Network</p>
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setNewCardNetwork('VISA')} 
                        className={`p-5 rounded-[1.5rem] border-4 transition-all flex items-center justify-center gap-3 ${newCardNetwork === 'VISA' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg' : 'bg-slate-200 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-400 font-black'}`}
                      >
                         <span className="font-black italic tracking-tighter text-sm uppercase">VISA</span>
                      </button>
                      <button 
                        onClick={() => setNewCardNetwork('MASTERCARD')} 
                        className={`p-5 rounded-[1.5rem] border-4 transition-all flex items-center justify-center gap-3 ${newCardNetwork === 'MASTERCARD' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg' : 'bg-slate-200 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-400 font-black'}`}
                      >
                         <span className="font-black italic tracking-tighter text-sm uppercase">MASTERCARD</span>
                      </button>
                   </div>
                </div>

                <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-widest px-2">3. Personalize Asset Label</p>
                   <input 
                      type="text" 
                      value={newCardLabel}
                      onChange={(e) => setNewCardLabel(e.target.value)}
                      placeholder="e.g. Amazon Shop, Dollar Savings"
                      maxLength={20}
                      className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-[2rem] outline-none font-black text-lg focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner"
                   />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-200 dark:border-transparent flex items-start gap-4">
                   <span className="text-2xl mt-1">🛡️</span>
                   <p className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-widest leading-relaxed">
                     Digital assets are secured via 3D Secure 2.0. Issuance fee: <span className="font-black">{newCardCurrency === 'NGN' ? '₦1,000' : '$5'}</span>. 
                     Deployment is instant.
                   </p>
                </div>

                <button 
                  onClick={generateCard}
                  disabled={!newCardLabel || isGenerating}
                  className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl hover:opacity-90 active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-4 text-xs"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-4 border-white/20 dark:border-slate-900/20 border-t-white dark:border-t-slate-900 rounded-full animate-spin"></div>
                      <span>Synthesizing...</span>
                    </>
                  ) : 'Deploy Digital Asset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PIN AUTHORIZATION MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm space-y-10 text-center">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white italic tracking-tighter">Authorize Action</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enter your 4-digit PIN to confirm</p>
            </div>

            <div className="flex justify-center gap-4">
              {[...Array(4)].map((_, i) => {
                const isActive = pin.length === i;
                const isFilled = pin.length > i;
                return (
                  <div 
                    key={i} 
                    className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'border-blue-500 bg-blue-500/20 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.4)]' 
                        : isFilled 
                          ? 'border-white bg-white/20' 
                          : 'border-white/10 bg-white/5'
                    }`}
                  >
                    {isFilled ? (
                       <div className="w-4 h-4 bg-white rounded-full animate-in zoom-in duration-200 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                    ) : isActive ? (
                       <div className="w-1 h-8 bg-blue-500 animate-pulse rounded-full" />
                    ) : null}
                  </div>
                );
              })}
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
                onClick={() => pendingAction === 'virtual' ? finalizeGenerateCard() : finalizePhysicalOrder()}
                disabled={pin.length < 4 || isGenerating || isOrderingPhysical}
                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
              >
                {isGenerating || isOrderingPhysical ? 'Authorizing...' : 'Confirm Action'}
              </button>
              <button onClick={() => { setShowPinModal(false); setPin(''); }} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualCards;
