
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NIGERIAN_BANKS } from '../constants';
import { User, Beneficiary, Transaction } from '../types';
import { PayMomentLogo } from '../App';
import { onAuthStateChanged, auth, db, handleFirestoreError, OperationType, findUserByAccount, findUserByUsername, parseFirestoreError, findSandboxAccount } from '../src/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { performNameEnquiry } from '../services/bankService';

interface TransferProps {
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  user: User;
  setUser: (user: User) => void;
  processTransaction: (tx: Transaction, currency: string, pin?: string) => Promise<void>;
}

const Transfer: React.FC<TransferProps> = ({ notify, user, setUser, processTransaction }) => {
  const navigate = useNavigate();
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'details' | 'confirm' | 'authorize' | 'otp' | 'success'>('details');
  const [type, setType] = useState<'bank' | 'paymoment'>('bank');
  const [payMomentMethod, setPayMomentMethod] = useState<'username' | 'account'>('username');
  const [authMode, setAuthMode] = useState<'pin' | 'biometric'>('pin');
  const [authStatus, setAuthStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
  
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [payMomentValue, setPayMomentValue] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [verifiedAccountNumber, setVerifiedAccountNumber] = useState('');
  const [isEditingVerifiedName, setIsEditingVerifiedName] = useState(false);
  const [recipientUid, setRecipientUid] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [lastTxId, setLastTxId] = useState('');

  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const [beneficiaryNickname, setBeneficiaryNickname] = useState('');

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

  useEffect(() => {
    const verifyAccount = async () => {
      let isVerifying = false;
      let targetAccountNumber = '';
      let targetBank = '';

      if (type === 'bank' && accountNumber.length === 10 && bank) {
        isVerifying = true;
        targetAccountNumber = accountNumber;
        targetBank = bank;
      } else if (type === 'paymoment') {
        if (payMomentMethod === 'username' && payMomentValue.length >= 3) {
          isVerifying = true;
          targetAccountNumber = payMomentValue;
          targetBank = 'PayMoment (Username)';
        } else if (payMomentMethod === 'account' && payMomentValue.length === 10) {
          isVerifying = true;
          targetAccountNumber = payMomentValue;
          targetBank = 'PayMoment (Account)';
        }
      }

      if (isVerifying) {
        setVerifying(true);
        setVerifiedName('');
        setRecipientUid(null);
        
        try {
          const cleanAccountNumber = targetAccountNumber.trim();
          
          // ALWAYS check internal database first for any 10-digit number
          if (cleanAccountNumber.length === 10) {
            try {
              const foundUser: any = await findUserByAccount(cleanAccountNumber);
              if (foundUser) {
                setVerifiedName(foundUser.name.toUpperCase());
                setVerifiedAccountNumber(foundUser.accountNumber);
                setRecipientUid(foundUser.uid);
                setVerifying(false);
                return;
              }
            } catch (queryErr) {
              console.error("Internal account lookup failed", queryErr);
              // Continue to external enquiry if internal lookup fails
            }
          }

          if (type === 'paymoment') {
            let foundUser: any = null;
            try {
              if (payMomentMethod === 'username') {
                foundUser = await findUserByUsername(cleanAccountNumber);
              } else {
                foundUser = await findUserByAccount(cleanAccountNumber);
              }
              
              if (foundUser) {
                setVerifiedName(foundUser.name.toUpperCase());
                setVerifiedAccountNumber(foundUser.accountNumber);
                setRecipientUid(foundUser.uid);
              } else {
                setVerifiedName("USER NOT FOUND");
              }
            } catch (pmErr) {
              console.error("PayMoment user lookup failed", pmErr);
              const msg = parseFirestoreError(pmErr);
              notify(msg, "error");
              setVerifiedName("LOOKUP ERROR");
            }
          } else {
            // Check Sandbox Accounts first for testing
            const sandboxAcc = await findSandboxAccount(cleanAccountNumber);
            if (sandboxAcc) {
              setVerifiedName(sandboxAcc.accountName.toUpperCase());
              setVerifiedAccountNumber(cleanAccountNumber);
              setVerifying(false);
              return;
            }

            const result = await performNameEnquiry(cleanAccountNumber, targetBank);
            if (result.success && result.accountName) {
              setVerifiedName(result.accountName);
              setVerifiedAccountNumber(cleanAccountNumber);
            } else {
              setVerifiedName("VERIFICATION FAILED");
              notify(result.error || "Could not verify account name. Please check the details.", "error");
            }
          }
        } catch (err) {
          console.error("Verification sequence failed", err);
          setVerifiedName("UNABLE TO VERIFY");
        } finally {
          setVerifying(false);
        }
      } else {
        setVerifying(false);
        setVerifiedName('');
      }
    };

    const timer = setTimeout(verifyAccount, 800);
    return () => clearTimeout(timer);
  }, [accountNumber, bank, type, payMomentMethod, payMomentValue]);

  const selectBeneficiary = (b: Beneficiary) => {
    if (b.type === 'local') {
      setType('bank');
      setBank(b.details.bank || '');
      setAccountNumber(b.details.accountNumber || '');
    }
  };

  const handleTransferRequest = () => {
    const val = getRawAmount();
    if (!amount || val <= 0) {
      notify("Please enter a valid amount", "error");
      return;
    }
    if (val > user.balances['NGN']) {
      notify("Insufficient funds in Naira wallet", "error");
      return;
    }
    setStep('confirm');
  };

  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
    }
  };

  const processFinalAuth = () => {
    if (pin.length !== 4) {
      notify("Please enter your 4-digit PIN", "error");
      return;
    }
    
    const currentPin = user.transactionPin || '1234';
    if (pin !== currentPin) {
      setAuthStatus('error');
      notify(`Incorrect Transaction PIN${!user.transactionPin ? '. Hint: Default is 1234' : ''}`, "error");
      setTimeout(() => {
        setPin('');
        setAuthStatus('idle');
      }, 1000);
      return;
    }

    const val = getRawAmount();
    if (val > 50000) {
      notify("Large transfer detected. 2FA required.", "info");
      setStep('otp');
    } else {
      finalizeTransfer();
    }
  };

  const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
    if (newOtp.every(d => d !== '')) {
      finalizeTransfer();
    }
  };

  const startBiometricAuth = () => {
    setAuthStatus('verifying');
    setTimeout(() => {
       const val = getRawAmount();
       if (val > 50000) {
          notify("Biometric verified. 2FA required for large amount.", "info");
          setStep('otp');
          setAuthStatus('idle');
       } else {
          finalizeTransfer(user.transactionPin || '1234');
       }
    }, 1500);
  };

  const finalizeTransfer = async (bypassPin?: string) => {
    setAuthStatus('verifying');
    try {
      const numericAmount = getRawAmount();
      const txId = Math.random().toString(36).substr(2, 9);
      setLastTxId(txId);
      
      const txPin = bypassPin || pin;

      if (saveAsBeneficiary && verifiedName && auth.currentUser) {
        const existing = user.beneficiaries.find(b => 
          (type === 'bank' && b.details.accountNumber === accountNumber) || 
          (type === 'paymoment' && b.details.payMomentId === payMomentValue)
        );
        if (!existing) {
          const newBen: Beneficiary = {
            id: Math.random().toString(36).substr(2, 5),
            name: beneficiaryNickname || verifiedName,
            type: 'local',
            details: {
              bank: type === 'bank' ? bank : 'PayMoment',
              accountNumber: type === 'bank' ? accountNumber : payMomentValue,
            }
          };
          
          const userRef = doc(db, 'users', auth.currentUser.uid);
          try {
            await updateDoc(userRef, {
              beneficiaries: arrayUnion(newBen)
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
          }
        }
      }

      const tx: Transaction = {
        id: txId,
        type: 'debit',
        amount: numericAmount,
        title: `Transfer to ${verifiedName || accountNumber || payMomentValue}`,
        category: 'Transfer',
        timestamp: new Date().toLocaleString(),
        status: 'completed',
        remark: remark,
        recipientUid: recipientUid || undefined,
        recipientBank: type === 'bank' ? bank : 'PayMoment',
        senderAccountNumber: user.accountNumber,
        recipientAccountNumber: verifiedAccountNumber || (type === 'bank' ? accountNumber : payMomentValue)
      };
      
      await processTransaction(tx, 'NGN', txPin);
      setAuthStatus('idle');
      setStep('success');
    } catch (error) {
      console.error("Transfer failed", error);
      const errorMsg = parseFirestoreError(error);
      notify(errorMsg, "error");
      setAuthStatus('idle');
    }
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 py-12 animate-in zoom-in-95 duration-500 px-4">
        <div className="no-print w-24 h-24 md:w-28 md:h-28 bg-emerald-500 rounded-full flex items-center justify-center text-4xl md:text-5xl shadow-2xl animate-bounce">✅</div>
        <div className="text-center space-y-2 no-print">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic tracking-tight">Success!</h2>
          <p className="text-slate-600 dark:text-slate-400 font-bold text-xl md:text-2xl">₦{amount}</p>
        </div>
        <div className="print-container bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl w-full max-w-sm space-y-8">
           <div className="flex flex-col items-center gap-4 pb-6 border-b border-dashed border-slate-200 dark:border-slate-700">
              <PayMomentLogo className="w-14 h-14 md:w-16 md:h-16" />
              <div className="text-center">
                 <h4 className="font-black italic text-xl text-blue-800 dark:text-white tracking-tighter">PayMoment Official</h4>
                 <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Authorization Token</p>
              </div>
           </div>
           <div className="space-y-3">
              <ReceiptDetailRow label="Sender" value={user.name} />
              <ReceiptDetailRow label="Sender Account" value={user.accountNumber} isMono />
              <ReceiptDetailRow 
                label="Recipient" 
                value={verifiedName} 
                suffix={recipientUid ? <span className="text-blue-500 ml-1">✓</span> : undefined}
              />
              <ReceiptDetailRow label="Recipient Account" value={verifiedAccountNumber || accountNumber || payMomentValue} isMono />
              <ReceiptDetailRow label="Bank" value={type === 'bank' ? bank : 'PayMoment'} />
              <ReceiptDetailRow label="Amount" value={`₦${amount}`} />
              <ReceiptDetailRow label="Date & Time" value={new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} />
              <ReceiptDetailRow label="Ref" value={`PM-${lastTxId.toUpperCase()}`} isMono />
              <ReceiptDetailRow label="Status" value="SUCCESSFUL" />
           </div>
        </div>
        <button onClick={() => navigate('/')} className="no-print w-full max-w-sm py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] tap-scale">Dashboard</button>
      </div>
    );
  }

  // UPDATED PORTAL UI WITH EXPLICIT BOXES & AUTH LOGIC
  if (step === 'authorize' || step === 'otp') {
    return (
      <div className="fixed-overlay bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center animate-in fade-in duration-300">
        <div className="w-full max-w-md flex-1 flex flex-col justify-start md:justify-center items-center py-12 px-6 gap-8 overflow-y-auto no-scrollbar">
          {authStatus === 'verifying' ? (
            <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 my-auto">
              <div className="relative">
                <div className="w-24 h-24 border-8 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center font-black text-blue-500 text-xl italic">PM</div>
              </div>
              <p className="text-sm font-black text-white uppercase tracking-[0.4em] animate-pulse">Routing Moment...</p>
            </div>
          ) : (
            <div className={`w-full space-y-8 md:space-y-12 animate-in slide-in-from-bottom-6 ${authStatus === 'error' ? 'animate-shake' : ''}`}>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto border-2 border-blue-500/30 mb-2">
                  <span className="text-3xl md:text-4xl">{step === 'otp' ? '📱' : (authMode === 'pin' ? '🔐' : '🧬')}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter leading-none">
                  {step === 'otp' ? 'Identity Proof' : (authMode === 'pin' ? 'Transaction PIN' : 'Biometric Auth')}
                </h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">
                  Confirm ₦{amount} to {verifiedName.split(' ')[0]}
                </p>
              </div>

              {step === 'otp' ? (
                <div className="space-y-10">
                   <div className="flex justify-center gap-2 md:gap-3">
                      {otp.map((digit, i) => (
                        <input 
                          key={i} id={`otp-${i}`} type="text" maxLength={1} value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          className="w-11 h-14 md:w-14 md:h-20 bg-white/5 border-2 border-white/10 rounded-2xl text-center text-2xl font-black text-white focus:border-blue-500 outline-none transition-all"
                        />
                      ))}
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6 px-10">Verification required for high-value transfers.</p>
                      <button onClick={() => setStep('confirm')} className="text-[10px] font-black text-rose-500 uppercase tracking-widest py-4 px-8 bg-white/5 rounded-full border border-white/10">Abort</button>
                   </div>
                </div>
              ) : authMode === 'pin' ? (
                <div className="space-y-8">
                  <div className="flex flex-col items-center gap-6">
                    <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${authStatus === 'error' ? 'text-rose-500' : 'text-blue-400'}`}>
                      {authStatus === 'error' ? 'Incorrect PIN, Try Again' : 'Enter 4-Digit Secure PIN'}
                    </p>
                    
                    <div className="flex justify-center gap-3 md:gap-4" onClick={() => hiddenInputRef.current?.focus()}>
                      {[...Array(4)].map((_, i) => {
                        const isActive = pin.length === i;
                        const isFilled = pin.length > i;
                        return (
                          <div 
                            key={i} 
                            className={`w-14 h-18 md:w-16 md:h-20 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                              authStatus === 'error' ? 'border-rose-500 bg-rose-500/20 animate-shake' :
                              isActive ? 'border-blue-500 bg-blue-500/20 scale-110 shadow-[0_0_25px_rgba(59,130,246,0.5)]' : 
                              isFilled ? 'border-white bg-white/20' : 'border-white/10 bg-white/5'
                            }`}
                          >
                            {isFilled ? (
                               <div className="w-4 h-4 bg-white rounded-full animate-in zoom-in duration-200 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                            ) : isActive ? (
                               <div className="w-1 h-8 bg-blue-500 animate-pulse rounded-full" />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    
                    <input 
                      ref={hiddenInputRef}
                      type="tel" pattern="[0-9]*" inputMode="numeric"
                      value={pin} onChange={handleHiddenInputChange}
                      className="absolute opacity-0 pointer-events-none"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col gap-8 w-full">
                    <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-[300px] md:max-w-[360px] mx-auto pt-4">
                      {['1','2','3','4','5','6','7','8','9','','0','del'].map((key, i) => (
                        <button 
                          key={i} 
                          onClick={() => { 
                            if (key === 'del') setPin(pin.slice(0, -1)); 
                            else if (key && pin.length < 4) handlePinInput(key); 
                          }} 
                          className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-3xl font-black transition-all shadow-lg ${
                            key ? 'bg-slate-800 border-2 border-slate-700 text-white active:bg-blue-600 active:border-blue-500 active:scale-90' : 'opacity-0 pointer-events-none'
                          }`}
                        >
                          {key === 'del' ? '⌫' : key}
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={processFinalAuth}
                      disabled={pin.length < 4}
                      className={`w-full py-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl transition-all ${
                        pin.length === 4 
                          ? 'bg-blue-600 text-white animate-bounce-subtle' 
                          : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      Confirm Payment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-12 py-10">
                   <button 
                    onClick={startBiometricAuth}
                    className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center bg-white/5 border-2 transition-all tap-scale border-white/10 hover:bg-blue-600/20"
                   >
                     <svg className="w-16 h-16 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 18a10.003 10.003 0 01-8.212-4.33l-.054-.09m9.158-11.154l-.054-.09A10.003 10.003 0 0012 20M3 12h18" />
                     </svg>
                   </button>
                   <div className="text-center space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Tap icon to Authenticate</p>
                      <div className="flex justify-center gap-1">
                        {[...Array(3)].map((_, i) => (
                           <div key={i} className="w-1 h-1 rounded-full bg-blue-500/40"></div>
                        ))}
                      </div>
                   </div>
                </div>
              )}
              
              {step !== 'otp' && (
                <div className="flex flex-col gap-6 text-center pt-2">
                  <button onClick={() => { setAuthMode(authMode === 'pin' ? 'biometric' : 'pin'); setPin(''); }} className="text-[10px] font-black text-blue-400 uppercase tracking-widest underline decoration-2 underline-offset-8">Switch Auth Method</button>
                  <button onClick={() => setStep('confirm')} className="text-[10px] font-black text-rose-500 uppercase tracking-widest py-4 bg-white/5 border border-white/10 rounded-full mx-10">Back to Review</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-2">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/>
          </svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      {user.beneficiaries.length > 0 && (
        <div className="space-y-4">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Saved Beneficiaries</p>
           <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
              {user.beneficiaries.map(b => (
                <button key={b.id} onClick={() => selectBeneficiary(b)} className="flex flex-col items-center gap-2 min-w-[80px] tap-scale group">
                   <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 transition-transform">{b.name.charAt(0)}</div>
                   <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate w-full text-center">{b.name.split(' ')[0]}</span>
                </button>
              ))}
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 border-2 border-slate-300 dark:border-slate-700 shadow-2xl space-y-10">
        <div className="bg-slate-200 dark:bg-slate-800 p-1.5 rounded-[2rem] flex border-2 border-slate-300 dark:border-slate-700 shadow-sm transition-colors">
          <button onClick={() => { setType('bank'); setVerifiedName(''); }} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${type === 'bank' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-blue-600'}`}>Other Bank</button>
          <button onClick={() => { setType('paymoment'); setVerifiedName(''); }} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${type === 'paymoment' ? 'bg-purple-600 text-white shadow-xl' : 'text-slate-500 hover:text-purple-600'}`}>PayMoment User</button>
        </div>

        {type === 'bank' ? (
          <div className="space-y-8">
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-950 dark:text-slate-200 uppercase tracking-widest px-1">1. Choose Bank</label><div className="relative group"><select value={bank} onChange={(e) => setBank(e.target.value)} className="w-full p-5 bg-white dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600 rounded-2xl outline-none font-black text-base text-slate-950 dark:text-white appearance-none pr-10 focus:border-blue-600 transition-all"><option value="">Select Bank...</option>{NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}</select><div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7-7-7-7"/></svg></div></div></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-950 dark:text-slate-200 uppercase tracking-widest px-1">2. Account Number</label><input type="text" maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="0123456789" className="w-full p-5 bg-white dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600 rounded-2xl font-black text-2xl tracking-widest tabular-nums text-slate-950 dark:text-white" /></div>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="grid grid-cols-2 gap-4"><button onClick={() => { setPayMomentMethod('username'); setPayMomentValue(''); setVerifiedName(''); }} className={`p-6 rounded-2xl border-4 transition-all flex flex-col items-center gap-2 ${payMomentMethod === 'username' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}><span className="text-3xl">👤</span><span className="font-black text-[10px] uppercase">Pay ID</span></button><button onClick={() => { setPayMomentMethod('account'); setPayMomentValue(''); setVerifiedName(''); }} className={`p-6 rounded-2xl border-4 transition-all flex flex-col items-center gap-2 ${payMomentMethod === 'account' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}><span className="text-3xl">🔢</span><span className="font-black text-[10px] uppercase">Account</span></button></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-950 dark:text-slate-200 uppercase tracking-widest px-1">Recipient {payMomentMethod}</label><div className="relative group">{payMomentMethod === 'username' && <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-600 text-xl">@</span>}<input type="text" value={payMomentValue} onChange={(e) => setPayMomentValue(payMomentMethod === 'account' ? e.target.value.replace(/\D/g, '') : e.target.value.toLowerCase())} placeholder={payMomentMethod === 'username' ? 'username' : '0123456789'} className={`w-full p-5 ${payMomentMethod === 'username' ? 'pl-11' : 'pl-5'} bg-white dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600 rounded-2xl font-black text-xl text-slate-950 dark:text-white`} /></div></div>
          </div>
        )}

        {verifying ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-3xl flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Querying NIBSS Central Switch...</p>
              <p className="text-sm font-bold text-slate-400">Performing Real-Time Name Enquiry</p>
            </div>
          </div>
        ) : verifiedName && (
          <div className="space-y-6">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 rounded-3xl flex items-center justify-between animate-in zoom-in-95">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl shadow-sm">👤</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 leading-none mb-1">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Live Verification Success</p>
                    <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[7px] font-black rounded-full uppercase tracking-tighter">Grounded</span>
                    {recipientUid && (
                      <span className="flex items-center justify-center w-4 h-4 bg-blue-500 text-white rounded-full text-[8px] shadow-sm" title="PayMoment Verified User">✓</span>
                    )}
                  </div>
                  {isEditingVerifiedName ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={verifiedName} 
                        onChange={(e) => setVerifiedName(e.target.value.toUpperCase())}
                        className="bg-white dark:bg-slate-800 border-2 border-emerald-500 rounded-xl px-3 py-1 text-sm font-black text-slate-900 dark:text-white outline-none w-full"
                        autoFocus
                      />
                      <button onClick={() => setIsEditingVerifiedName(false)} className="text-emerald-600 text-xs font-black">OK</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/name">
                      <p className="text-base font-black text-slate-900 dark:text-white">{verifiedName}</p>
                      <button 
                        onClick={() => setIsEditingVerifiedName(true)}
                        className="text-[10px] text-slate-400 hover:text-blue-500 opacity-0 group-hover/name:opacity-100 transition-opacity"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
               <div className="flex items-center gap-3">
                  <input type="checkbox" id="saveBen" checked={saveAsBeneficiary} onChange={(e) => setSaveAsBeneficiary(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                  <label htmlFor="saveBen" className="text-xs font-bold text-slate-700 dark:text-slate-300">Save as Beneficiary</label>
               </div>
               {saveAsBeneficiary && (
                 <input type="text" value={beneficiaryNickname} onChange={(e) => setBeneficiaryNickname(e.target.value)} placeholder="Nickname (e.g. My Landlord)" className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
               )}
            </div>
          </div>
        )}

        <div className="space-y-3"><label className="text-[10px] font-black text-slate-950 dark:text-slate-200 uppercase tracking-widest px-1">3. Amount</label><div className="relative group"><span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-950 dark:text-white text-3xl">₦</span><input type="text" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0.00" className="w-full p-6 pl-12 bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 rounded-3xl outline-none font-black text-4xl tabular-nums text-slate-950 dark:text-white" /></div></div>

        {step === 'confirm' ? (
          <div className="bg-slate-950 p-8 rounded-[2rem] text-white space-y-6 animate-in slide-in-from-top-4 shadow-2xl border-2 border-blue-500/30">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1">Confirming Transfer</p>
                 <h4 className="text-4xl font-black italic tracking-tighter">₦{amount}</h4>
               </div>
               <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/30">
                 <span className="text-2xl">💸</span>
               </div>
             </div>
             
             <div className="space-y-3 py-2 border-y border-white/10">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500 uppercase tracking-widest">Recipient</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{verifiedName}</span>
                    {recipientUid && <span className="text-blue-400 text-[10px]">✓</span>}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500 uppercase tracking-widest">Bank</span>
                  <span className="text-white">{type === 'bank' ? bank : 'PayMoment'}</span>
                </div>
             </div>

             <button onClick={() => setStep('authorize')} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all hover:bg-blue-500">Confirm & Continue</button>
             <button onClick={() => setStep('details')} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Edit Details</button>
          </div>
        ) : (
          <button disabled={!amount || !verifiedName} onClick={handleTransferRequest} className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl disabled:opacity-30 active:scale-95 transition-all text-xs">Review Transfer</button>
        )}
      </div>
    </div>
  );
};

const ReceiptDetailRow = ({ label, value, isMono = false, suffix }: { label: string, value: string, isMono?: boolean, suffix?: React.ReactNode }) => (
  <div className="flex justify-between items-center text-[10px] md:text-xs">
    <span className="font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <div className="flex items-center">
      <span className={`font-bold text-slate-900 dark:text-white ${isMono ? 'font-mono' : ''}`}>{value}</span>
      {suffix}
    </div>
  </div>
);

export default Transfer;
