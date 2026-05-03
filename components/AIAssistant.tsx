
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeFinances } from '../services/geminiService';
import { ChatMessage, Transaction, BudgetCategory } from '../types';
import { auth, db } from '../src/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Wallet, Plus, Trash2, Settings, X, PieChart, TrendingUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIAssistantProps {}

const AIAssistant: React.FC<AIAssistantProps> = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hi! I'm PayAI. I've analyzed your real-time activity and custom budget categories. How can I help you optimize your Moment today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTransactions = async () => {
    if (!auth.currentUser) return [];
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Transaction);
  };

  const fetchBudgetCategories = async () => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      setBudgetCategories(data.budgetCategories || []);
    }
  };

  useEffect(() => {
    fetchBudgetCategories();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryLimit || !auth.currentUser) return;
    
    const newCategory: BudgetCategory = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCategoryName,
      limit: parseFloat(newCategoryLimit),
      spent: 0,
      icon: 'Wallet',
      color: 'blue'
    };

    const updatedCategories = [...budgetCategories, newCategory];
    setBudgetCategories(updatedCategories);
    setNewCategoryName('');
    setNewCategoryLimit('');

    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, { budgetCategories: updatedCategories });
  };

  const handleRemoveCategory = async (id: string) => {
    if (!auth.currentUser) return;
    const updatedCategories = budgetCategories.filter(c => c.id !== id);
    setBudgetCategories(updatedCategories);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, { budgetCategories: updatedCategories });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const transactions = await fetchTransactions();
      const response = await analyzeFinances(input, transactions, budgetCategories);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "PayAI is fine-tuning its engine. Please try again soon." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-120px)] relative overflow-hidden">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-start">
          <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors tap-scale">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>
          
          <button 
            onClick={() => setShowBudgetPanel(true)}
            className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <PieChart className="w-4 h-4" />
            Budget Categories
          </button>
        </div>
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">PayAI Assistant</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mt-1">Intelligence driven by your financial moments.</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 mb-6 no-scrollbar shadow-inner transition-colors">
        {messages.map((m, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-5 rounded-[1.5rem] text-sm leading-relaxed font-medium transition-all ${m.role === 'user' ? 'bg-blue-700 text-white rounded-tr-none shadow-xl' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'}`}>
              {m.content}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-[1.5rem] rounded-tl-none animate-pulse text-slate-500 text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
              <TrendingUp className="w-4 h-4 animate-bounce" />
              Crunching Data...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-3">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about your spending habits..." className="flex-1 p-5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/20 text-slate-900 dark:text-white font-bold transition-all" />
        <button onClick={handleSend} disabled={loading} className="bg-gradient-to-r from-blue-800 to-purple-700 text-white px-8 rounded-[1.5rem] font-black uppercase tracking-widest disabled:opacity-50 transition-all hover:shadow-2xl active:scale-95 flex items-center justify-center">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Ask"}
        </button>
      </div>

      {/* Budget Categories Sliding Panel */}
      <AnimatePresence>
        {showBudgetPanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBudgetPanel(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 rounded-[2.5rem]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-slate-900 z-50 p-8 shadow-2xl flex flex-col transition-colors border-l border-slate-200 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black italic tracking-tighter">Custom Budgets</h3>
                <button onClick={() => setShowBudgetPanel(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                {/* Current Categories */}
                <div className="space-y-4">
                  {budgetCategories.length === 0 && (
                    <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                      <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No custom categories yet</p>
                    </div>
                  )}
                  {budgetCategories.map(cat => (
                    <div key={cat.id} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 group relative">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{cat.name}</span>
                        <button 
                          onClick={() => handleRemoveCategory(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-medium text-slate-500">Limit: ₦{cat.limit.toLocaleString()}</span>
                        <div className="text-right">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter">Spent</span>
                          <span className="text-sm font-bold">₦{cat.spent.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min((cat.spent / cat.limit) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Category */}
                <div className="p-6 rounded-[2rem] bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                  <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Category
                  </h4>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Category Name (e.g. Suya)" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                    />
                    <input 
                      type="number" 
                      placeholder="Monthly Limit (₦)" 
                      value={newCategoryLimit}
                      onChange={(e) => setNewCategoryLimit(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                    />
                    <button 
                      onClick={handleAddCategory}
                      className="w-full p-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
                    >
                      Define Category
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-[1.5rem] flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-1 shrink-0" />
                <p className="text-[10px] font-medium text-orange-700 dark:text-orange-300 leading-relaxed">
                  PayAI will use these categories to filter and highlight matching expenses in your transaction history for better insights.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAssistant;
