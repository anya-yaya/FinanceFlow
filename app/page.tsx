"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, ShieldCheck, User as UserIcon, Trash2, SquarePen, Search, ArrowUpDown, X, Ban } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'insights'>('dashboard');
  const [role, setRole] = useState<'admin' | 'user'>('admin');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Form & Interaction State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ amount: '', category: '', type: 'expense', description: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, dir: 'asc' | 'desc'}>({ key: 'date', dir: 'desc' });

  useEffect(() => { setMounted(true); fetchTransactions();}, []);

  // 1. Load Data from MongoDB
  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch", e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ amount: '', category: '', type: 'expense', description: '' });
  };

  // --- Handle Adding New Transaction or Updating Existing One (Admin Only) ---
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (role !== 'admin') return;

  //DATA CLEANING
  const cleanDescription = formData.description.trim();
  const cleanCategory = formData.category.trim();
  const numericAmount = Number(formData.amount);

  //VALIDATION RULES
  if (cleanDescription.length < 3) {
    alert("❌ Description is too short (minimum 3 characters).");
    return; // Stops the function here
  }

  if (isNaN(numericAmount) || numericAmount <= 0) {
    alert("❌ Please enter a valid positive amount greater than 0.");
    return;
  }

  if (!cleanCategory) {
    alert("❌ Please select a category.");
    return;
  }

  //PROCEED TO API CALL
  const isEditing = !!editingId;
  const url = '/api/transactions';
  const method = isEditing ? 'PATCH' : 'POST';
  
  const payload = isEditing 
    ? { id: editingId, description: cleanDescription, amount: numericAmount, category: cleanCategory, type: formData.type }
    : { description: cleanDescription, amount: numericAmount, category: cleanCategory, type: formData.type, date: new Date().toISOString().split('T')[0] };

  try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-role': role },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        resetForm();
        await fetchTransactions();
        // SUCCESS TOAST
        toast.success(isEditing ? 'Transaction Updated!' : 'Transaction Added!', {
          style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' },
          iconTheme: { primary: '#10b981', secondary: '#fff' },
        });
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to save data");
      }
    } catch (err) {
      toast.error("Network connection lost!");
    }
};

  //--- Handle Deletion of Transaction (Admin Only, with Optimistic UI Update) ---
  const handleDelete = async (id: string) => {
  if (role !== 'admin') return toast.error("Admin access required");

  // Optimistic UI update: remove from screen immediately
  const originalTransactions = [...transactions];
  setTransactions(transactions.filter((t: any) => t._id !== id));

  try {
    const res = await fetch(`/api/transactions?id=${id}`, {
      method: 'DELETE', headers: { 'x-user-role': role }
    });

    if (res.ok){
      toast.success("Transaction deleted!");
      fetchTransactions();
    } else { throw new Error("Delete failed"); }
    } catch (err) {
    // If database fails, put the item back on the screen
    setTransactions(originalTransactions);
    toast.error("Could not delete from database. Check your connection.");
  }
};

  // Calculations for Summary Cards
  const totals = useMemo(() => {
    return transactions.reduce((acc: any, tx: any) => {
      if (tx.type === 'income') acc.income += tx.amount;
      else acc.expense += tx.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [transactions]);

  // Sorting and Searching for Transaction List
  const sortedTransactions = useMemo(() => {
    let items = [...transactions].filter(t => 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    items.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.dir === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [transactions, searchQuery, sortConfig]);

  //Chart Data 
  const chartData = useMemo(() => {
    const categories: any = {};
    const trend: any = [];
    let bal = 0;
    [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(t => {
      bal += t.type === 'income' ? t.amount : -t.amount;
      trend.push({ date: t.date, balance: bal });
      if(t.type === 'expense') categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    const pie = Object.entries(categories).map(([name, value]) => ({ name, value }));
    return { trend, pie };
    }, [transactions]);
  

  const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'];

  const insights = useMemo(() => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  
    // 1. Savings Rate (%)
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // 2. Biggest Single Expense
    const biggestExpense = expenseTransactions.length > 0 
      ? [...expenseTransactions].sort((a, b) => b.amount - a.amount)[0] 
      : null;

    // 3. Average Expense per Transaction
    const avgExpense = expenseTransactions.length > 0 ? (totalExpense / expenseTransactions.length) : 0;

    // 4. Most Frequent Category (By count, not just total amount)
    const frequency: Record<string, number> = {};
    expenseTransactions.forEach(t => { frequency[t.category] = (frequency[t.category] || 0) + 1; });
    const mostFrequent = Object.entries(frequency).sort((a: any, b: any) => b[1] - a[1])[0];

    return {
      savingsRate: Math.max(0, savingsRate).toFixed(1),
      biggestExpense,
      avgExpense: avgExpense.toFixed(0),
      mostFrequent: mostFrequent ? mostFrequent[0] : 'N/A'
    };
  }, [transactions]);

  if (!mounted || loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-blue-400">Loading Finance Flow...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header with Tabs and Role Switcher */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
    
          <h1 className="text-2xl font-bold italic tracking-tight">FINANCE<span className="text-blue-500">FLOW</span></h1>

          
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl overflow-x-auto max-w-full">
            {(['dashboard', 'transactions', 'insights'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                {tab}
              </button>
            ))}
          </div>

          
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setRole('user')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${role === 'user' ? 'bg-slate-700' : 'text-slate-500'}`}><UserIcon size={16}/> User</button>
            <button onClick={() => setRole('admin')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${role === 'admin' ? 'bg-blue-600' : 'text-slate-500'}`}><ShieldCheck size={16}/> Admin</button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Balance" value={totals.balance} icon={<Wallet className="text-blue-400"/>} />
          <StatCard title="Income" value={totals.income} icon={<ArrowUpRight className="text-emerald-400"/>} />
          <StatCard title="Expenses" value={totals.expense} icon={<ArrowDownRight className="text-rose-400"/>} />
        </div>

        {/* TAB CONTENT: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
            {/* Balance Trend (Line/Area Chart) */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-[350px] w-full relative">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-6">Balance Over Time</h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartData.trend}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#3b82f6' }}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#3b82f6"  fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Spending Breakdown (Pie Chart) */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-[350px] w-full relative">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-6">Expense Breakdown</h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie data={chartData.pie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {chartData.pie.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    />
                  </PieChart>
              </ResponsiveContainer>
             </div>
            </div>
            </div>

            {/* QUICK ADD FORM (Only visible to Admin) */}
            {role === 'admin' && (
              <TransactionForm
               formData={formData} setFormData={setFormData} 
               handleSubmit={handleSubmit} editingId={editingId} setEditingId={setEditingId}
              />
            )}

            {/* Preview List */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 overflow-hidden ">
              <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>  
              <div className="overflow-x-auto">           
                <TransactionTable items={sortedTransactions.slice(0, 5)} role={role} onEdit={() => {}} onDelete={() => {}} showActions={false} />              
               <button onClick={() => setActiveTab('transactions')} className="w-full mt-4 text-slate-500 hover:text-blue-400 text-sm font-bold transition-all">VIEW ALL TRANSACTIONS →</button>
              </div>
            </div>
         </div>    
        )}

        {/* TAB CONTENT: TRANSACTIONS LISTING */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-800 p-3 pl-10 rounded-xl focus:ring-2 ring-blue-500 outline-none" placeholder="Search by description or category..."/>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => setSortConfig({key: 'amount', dir: sortConfig.dir === 'asc' ? 'desc' : 'asc'})} className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:bg-slate-800"><ArrowUpDown size={18}/></button>
               </div>
            </div>

            {role === 'admin' && (
               <TransactionForm 
                formData={formData} setFormData={setFormData} 
                handleSubmit={handleSubmit} editingId={editingId} setEditingId={setEditingId}
              />
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
               <TransactionTable 
                items={sortedTransactions} 
                role={role} 
                onEdit={(t: any) => {setEditingId(t._id); setFormData({amount: t.amount.toString(), category: t.category, type: t.type, description: t.description}); window.scrollTo({top:0, behavior:'smooth'})}} 
                onDelete={handleDelete} 
                showActions={true} 
              />
            </div>
          </div>
        )}

        {/* TAB CONTENT: INSIGHTS */}
        {activeTab === 'insights' && (
        <div className="space-y-6 animate-in zoom-in duration-500">
          {/* Row 1: High-Level Percentages & Averages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-center hover:border-emerald-500/50 transition-all">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">Savings Rate</p>
              <h2 className="text-4xl font-black text-emerald-500 mb-1">{insights.savingsRate}%</h2>
              <p className="text-slate-400 text-xs font-medium">of income saved</p>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-center hover:border-blue-500/50 transition-all">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">Avg. Expense</p>
              <h2 className="text-4xl font-black text-blue-500 mb-1">₹{insights.avgExpense}</h2>
              <p className="text-slate-400 text-xs font-medium">per transaction</p>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-center hover:border-amber-500/50 transition-all">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">Habitual Category</p>
              <h2 className="text-4xl font-black text-amber-500 mb-1">{insights.mostFrequent}</h2>
              <p className="text-slate-400 text-xs font-medium">most frequent expense</p>
            </div>
          </div>

          {/* Row 2: Deep Dives & Observations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Biggest Hit Observation */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Biggest Single Expense</p>
                <h3 className="text-2xl font-black text-white group-hover:text-rose-400 transition-colors">
                  {insights.biggestExpense ? insights.biggestExpense.description : 'No Data'}
                </h3>
                <p className="text-slate-400 text-xs">Categorized under {insights.biggestExpense?.category}</p>
              </div>
              <div className="text-3xl font-black text-rose-500">
                ₹{insights.biggestExpense?.amount.toLocaleString() || '0'}
              </div>
            </div>

            {/* Smart Analysis Card */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 flex flex-col justify-center">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Financial Health Check</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                {Number(insights.savingsRate) > 20 
                  ? "Excellent! You are maintaining a healthy savings rate above the 20% rule. Your financial discipline is strong." 
                  : "Caution: Your savings rate is below 20%. You might want to analyze your most frequent expenses to identify where money is leaking."}
              </p>
            </div>
          </div>
        </div>
      )}
       

      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:bg-slate-800/50 transition-all cursor-default">
      <div className="flex justify-between items-center mb-2 text-slate-400 text-sm font-medium">{title} {icon}</div>
      <div className="text-3xl font-bold">₹{value.toLocaleString()}</div>
    </div>
  );
}


function TransactionForm({ formData, setFormData, handleSubmit, editingId, setEditingId }: any) {
  return (
    <form onSubmit={handleSubmit} className={`p-6 rounded-3xl border transition-all duration-300 ${editingId ? 'border-amber-500 bg-amber-500/5' : 'bg-slate-900 border-slate-800'} grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-4 items-end`}>
      <div className="flex-1 min-w-[200px]">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Description</label>
        <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none focus:border-blue-500" placeholder="Expense name..." />
      </div>
      <div className="w-32">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Amount</label>
        <input required type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none" />
      </div>
      <div className="w-40">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Category</label>
        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1" required>
          <option value="">Select...</option>
          <option value="Child's Allowance">Child's Allowance</option>
          <option value="Salary">Salary</option>
          <option value="Rent">Rent</option>
          <option value="Groceries">Groceries</option>
          <option value="Food">Food</option>
          <option value="Fun">Fun</option>
          <option value="Travel">Travel</option>
          <option value="Shopping">Shopping</option>
          <option value="Miscellaneous">Miscellaneous</option>
        </select>
      </div>
      <div className="w-40">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Type</label>
        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={`p-3 px-8 rounded-xl font-bold flex items-center gap-2 ${editingId ? 'bg-amber-600' : 'bg-blue-600'}`}>
          {editingId ? 'Update' : (<><Plus size={18}/> Add Transaction</>)}
        </button>
        {editingId && 
        <button onClick={() => setEditingId(null)} className="p-3 bg-slate-800 rounded-xl"><Ban size={18}/></button>}
      </div>
    </form>
  );
}

function TransactionTable({ items, role, onEdit, onDelete, showActions }: any) {
  return (
        <div className="overflow-x-auto"> 
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-slate-800/50 text-xs text-slate-500 uppercase font-bold">
              <tr>
                <th className="p-4">Transaction</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Amount</th>
                {showActions && role === 'admin' && 
                <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 4 : 3} className="p-8 text-center text-slate-500 italic">No transactions found.</td>
                </tr>
               ) : (
                 items.map((t: any) => (
                  <tr key={t._id} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium  text-slate-200">{t.description}<div className="text-[10px] text-slate-500 font-normal">{t.date}</div></td>
                    <td className="p-4 text-slate-400 text-sm">{t.category}</td>
                    <td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                    </td>
                    {/* ACTION COLUMN: Only visible to Admin */}
                    {showActions && role === 'admin' && (
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => onEdit(t)} className="p-2 text-blue-400 bg-blue-400/10 lg:bg-transparent lg:text-slate-500 lg:hover:text-blue-400 lg:hover:bg-blue-400/10 rounded-lg transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100" title="Edit Transaction">
                            <SquarePen size={16} />
                          </button>
                          <button onClick={() => onDelete(t._id)} className="p-2 text-rose-500 bg-rose-500/10 lg:bg-transparent lg:text-slate-500 lg:hover:text-rose-500 lg:hover:bg-rose-500/10 rounded-lg transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100" title="Delete Transaction">
                        <Trash2 size={16} />
                      </button> 
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table> 
        </div> 
  );
}

function InsightCard({ label, value, desc, color }: any) {
  return (
    <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-center hover:border-slate-700 transition-all">
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">{label}</p>
      <h2 className={`text-4xl font-black ${color} mb-1`}>{value}</h2>
      <p className="text-slate-400 text-xs">{desc}</p>
    </div>
  );
}
