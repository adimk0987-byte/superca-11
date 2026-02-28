import { useState, useRef } from 'react';
import { 
  Upload, FileText, Download, BarChart3, CheckCircle, Sparkles, 
  AlertCircle, RefreshCw, IndianRupee, Building2, Calendar, 
  PieChart, TrendingUp, TrendingDown, Plus, Trash2, Edit3, 
  Eye, X, Check, FileSpreadsheet, ArrowRight, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

// Account Groups for Classification
const ACCOUNT_GROUPS = {
  assets: {
    fixed_assets: ['Land & Building', 'Plant & Machinery', 'Furniture & Fixtures', 'Vehicles', 'Computers', 'Intangible Assets'],
    current_assets: ['Cash & Cash Equivalents', 'Bank Balances', 'Trade Receivables', 'Inventories', 'Prepaid Expenses', 'Other Current Assets'],
    investments: ['Investments - Long Term', 'Investments - Short Term']
  },
  liabilities: {
    equity: ['Share Capital', 'Reserves & Surplus', 'Retained Earnings'],
    non_current: ['Long Term Borrowings', 'Deferred Tax Liability', 'Long Term Provisions'],
    current: ['Trade Payables', 'Short Term Borrowings', 'Other Current Liabilities', 'Provisions', 'Duties & Taxes Payable']
  },
  income: ['Sales Revenue', 'Service Revenue', 'Interest Income', 'Other Income', 'Discount Received'],
  expenses: ['Cost of Goods Sold', 'Salary & Wages', 'Rent Expense', 'Utility Expense', 'Depreciation', 'Interest Expense', 'Professional Fees', 'Office Expenses', 'Travel Expense', 'Marketing Expense', 'Other Expenses']
};

const FinancialStatements = () => {
  // Mode State
  const [mode, setMode] = useState('manual'); // 'manual' or 'ai'
  const [step, setStep] = useState(1); // 1: Upload/Entry, 2: Classification, 3: Generate, 4: Export
  
  // Context
  const [context, setContext] = useState({
    company_name: '',
    financial_year: '2025-26',
    period_end_date: '2026-03-31',
    statement_type: 'both' // 'balance_sheet', 'pnl', 'both'
  });
  
  // Trial Balance Data
  const [trialBalance, setTrialBalance] = useState([]);
  
  // Generated Statements
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  
  // New Entry Form
  const [newEntry, setNewEntry] = useState({
    account_name: '',
    account_group: '',
    debit: '',
    credit: ''
  });
  
  // State
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef(null);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setErrors([]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/financial/extract-trial-balance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        // Map the extracted accounts with IDs
        const accounts = (data.accounts || []).map((acc, idx) => ({
          id: `${Date.now()}-${idx}`,
          account_name: acc.account_name,
          account_group: acc.account_group,
          debit: acc.debit || 0,
          credit: acc.credit || 0
        }));
        setTrialBalance(accounts);
        if (data.company_name) {
          setContext(prev => ({ ...prev, company_name: data.company_name }));
        }
        setSuccess('Trial balance extracted successfully!');
        setStep(2);
      } else {
        setErrors(['Could not extract trial balance from file']);
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      setErrors(['Error processing file. Please try again or enter manually.']);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add manual entry
  const handleAddEntry = () => {
    setErrors([]);
    
    if (!newEntry.account_name || !newEntry.account_group) {
      setErrors(['Account name and group are required']);
      return;
    }
    
    if (!newEntry.debit && !newEntry.credit) {
      setErrors(['Either debit or credit amount is required']);
      return;
    }
    
    const entry = {
      id: Date.now().toString(),
      account_name: newEntry.account_name,
      account_group: newEntry.account_group,
      debit: parseFloat(newEntry.debit) || 0,
      credit: parseFloat(newEntry.credit) || 0
    };
    
    setTrialBalance([...trialBalance, entry]);
    setSuccess('Entry added');
    setNewEntry({ account_name: '', account_group: '', debit: '', credit: '' });
    setTimeout(() => setSuccess(''), 2000);
  };

  // Delete entry
  const handleDeleteEntry = (id) => {
    setTrialBalance(trialBalance.filter(e => e.id !== id));
  };

  // Update entry group
  const handleUpdateGroup = (id, newGroup) => {
    setTrialBalance(trialBalance.map(e => 
      e.id === id ? { ...e, account_group: newGroup } : e
    ));
  };

  // Validate Trial Balance
  const validateTrialBalance = () => {
    const totalDebit = trialBalance.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = trialBalance.reduce((sum, e) => sum + (e.credit || 0), 0);
    
    const isBalanced = Math.abs(totalDebit - totalCredit) < 1;
    
    if (!isBalanced) {
      return {
        valid: false,
        error: `Trial balance does not tally. Debit: Rs. ${totalDebit.toLocaleString('en-IN')}, Credit: Rs. ${totalCredit.toLocaleString('en-IN')}, Difference: Rs. ${Math.abs(totalDebit - totalCredit).toLocaleString('en-IN')}`
      };
    }
    
    // Check for unclassified accounts
    const unclassified = trialBalance.filter(e => !e.account_group);
    if (unclassified.length > 0) {
      return {
        valid: false,
        error: `${unclassified.length} accounts are not classified`
      };
    }
    
    return { valid: true };
  };

  // Generate Financial Statements
  const generateStatements = async () => {
    setGenerating(true);
    setErrors([]);
    
    const validation = validateTrialBalance();
    if (!validation.valid) {
      setErrors([validation.error]);
      setGenerating(false);
      return;
    }
    
    try {
      // Classify accounts
      const assets = {
        fixed: trialBalance.filter(e => e.account_group === 'fixed_assets'),
        current: trialBalance.filter(e => e.account_group === 'current_assets'),
        investments: trialBalance.filter(e => e.account_group === 'investments')
      };
      
      const liabilities = {
        equity: trialBalance.filter(e => e.account_group === 'equity'),
        non_current: trialBalance.filter(e => e.account_group === 'non_current_liabilities'),
        current: trialBalance.filter(e => e.account_group === 'current_liabilities')
      };
      
      const income = trialBalance.filter(e => e.account_group === 'income');
      const expenses = trialBalance.filter(e => e.account_group === 'expenses');
      
      // Calculate totals
      const totalFixedAssets = assets.fixed.reduce((sum, e) => sum + e.debit, 0);
      const totalCurrentAssets = assets.current.reduce((sum, e) => sum + e.debit, 0);
      const totalInvestments = assets.investments.reduce((sum, e) => sum + e.debit, 0);
      const totalAssets = totalFixedAssets + totalCurrentAssets + totalInvestments;
      
      const totalEquity = liabilities.equity.reduce((sum, e) => sum + e.credit, 0);
      const totalNonCurrentLiab = liabilities.non_current.reduce((sum, e) => sum + e.credit, 0);
      const totalCurrentLiab = liabilities.current.reduce((sum, e) => sum + e.credit, 0);
      
      const totalIncome = income.reduce((sum, e) => sum + e.credit, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.debit, 0);
      const netProfitLoss = totalIncome - totalExpenses;
      
      // Update equity with current year P&L
      const totalLiabilities = totalEquity + totalNonCurrentLiab + totalCurrentLiab + netProfitLoss;
      
      // Generate Balance Sheet
      setBalanceSheet({
        as_on: context.period_end_date,
        assets: {
          fixed_assets: {
            items: assets.fixed.map(e => ({ name: e.account_name, amount: e.debit })),
            total: totalFixedAssets
          },
          current_assets: {
            items: assets.current.map(e => ({ name: e.account_name, amount: e.debit })),
            total: totalCurrentAssets
          },
          investments: {
            items: assets.investments.map(e => ({ name: e.account_name, amount: e.debit })),
            total: totalInvestments
          },
          total: totalAssets
        },
        liabilities: {
          equity: {
            items: [
              ...liabilities.equity.map(e => ({ name: e.account_name, amount: e.credit })),
              { name: 'Current Year Profit/(Loss)', amount: netProfitLoss }
            ],
            total: totalEquity + netProfitLoss
          },
          non_current: {
            items: liabilities.non_current.map(e => ({ name: e.account_name, amount: e.credit })),
            total: totalNonCurrentLiab
          },
          current: {
            items: liabilities.current.map(e => ({ name: e.account_name, amount: e.credit })),
            total: totalCurrentLiab
          },
          total: totalLiabilities
        }
      });
      
      // Generate P&L
      setProfitLoss({
        period: context.financial_year,
        income: {
          items: income.map(e => ({ name: e.account_name, amount: e.credit })),
          total: totalIncome
        },
        expenses: {
          items: expenses.map(e => ({ name: e.account_name, amount: e.debit })),
          total: totalExpenses
        },
        gross_profit: totalIncome - expenses.filter(e => e.account_name.includes('Cost')).reduce((sum, e) => sum + e.debit, 0),
        net_profit: netProfitLoss,
        eps: netProfitLoss > 0 ? (netProfitLoss / 10000).toFixed(2) : 0
      });
      
      setStep(4);
      setSuccess('Financial statements generated successfully!');
    } catch (error) {
      setErrors(['Error generating statements: ' + error.message]);
    } finally {
      setGenerating(false);
    }
  };

  // Export to Excel/PDF
  const handleExport = (format) => {
    const data = {
      company: context.company_name,
      financial_year: context.financial_year,
      balance_sheet: balanceSheet,
      profit_loss: profitLoss,
      generated_on: new Date().toISOString()
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Financial_Statements_${context.financial_year}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    setSuccess(`Exported as ${format.toUpperCase()}`);
  };

  // Stats
  const totalDebit = trialBalance.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = trialBalance.reduce((sum, e) => sum + (e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

  return (
    <div className="space-y-4 md:space-y-6" data-testid="financial-statements-page">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 md:p-8 text-white border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Financial Statement Preparation
            </h1>
            <p className="text-slate-300 text-sm md:text-lg">Dual-Mode: Upload Trial Balance or Manual Entry</p>
            <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-4 text-xs md:text-sm">
              <div className="flex items-center space-x-2">
                <Upload size={18} />
                <span>Trial Balance</span>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 size={18} />
                <span>Auto-generate</span>
              </div>
              <div className="flex items-center space-x-2">
                <Download size={18} />
                <span>Export PDF/Excel</span>
              </div>
            </div>
          </div>
          <div className="text-center bg-orange-500/20 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-orange-500/30">
            <Sparkles size={32} className="mx-auto mb-2 md:hidden" />
            <Sparkles size={48} className="mx-auto mb-2 hidden md:block" />
            <div className="text-slate-200 text-sm">Dual Mode</div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-xl shadow-sm p-3 md:p-4 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            {[
              { num: 1, label: 'Trial Balance' },
              { num: 2, label: 'Classification' },
              { num: 3, label: 'Generate' },
              { num: 4, label: 'Export' }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => s.num <= step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center space-x-1 md:space-x-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-colors text-xs md:text-sm ${
                    step === s.num 
                      ? 'bg-blue-600 text-white' 
                      : step > s.num 
                        ? 'bg-green-100 text-green-700 cursor-pointer' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {step > s.num ? <CheckCircle size={14} /> : <span className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">{s.num}</span>}
                  <span className="font-medium">{s.label}</span>
                </button>
                {idx < 3 && <ArrowRight size={14} className="mx-1 md:mx-2 text-slate-300 hidden sm:block" />}
              </div>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setMode('manual')}
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className={mode === 'manual' ? 'bg-blue-600 text-xs md:text-sm' : 'text-xs md:text-sm'}
            >
              Manual Entry
            </Button>
            <Button
              onClick={() => setMode('ai')}
              variant={mode === 'ai' ? 'default' : 'outline'}
              size="sm"
              className={mode === 'ai' ? 'bg-purple-600 text-xs md:text-sm' : 'text-xs md:text-sm'}
            >
              <Sparkles size={12} className="mr-1" /> Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="text-red-600 mt-0.5 mr-3" size={20} />
            <ul className="space-y-1">
              {errors.map((err, idx) => (
                <li key={idx} className="text-red-700 text-sm">{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="text-green-600 mr-3" size={20} />
            <span className="text-green-800 font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Step 1: Company Context + Upload/Entry */}
      {step === 1 && (
        <>
          {/* Company Context */}
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-slate-200">
            <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
              <Building2 className="mr-2 text-blue-600" size={22} />
              Company Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={context.company_name}
                  onChange={(e) => setContext({ ...context, company_name: e.target.value })}
                  placeholder="ABC Pvt Ltd"
                  className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                  data-testid="company-name-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Financial Year *</label>
                <select
                  value={context.financial_year}
                  onChange={(e) => setContext({ ...context, financial_year: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                >
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                  <option value="2023-24">2023-24</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Period End Date *</label>
                <input
                  type="date"
                  value={context.period_end_date}
                  onChange={(e) => setContext({ ...context, period_end_date: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                />
              </div>
            </div>
          </div>

          {/* Upload Trial Balance */}
          {mode === 'ai' && (
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-slate-200">
              <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
                <Upload className="mr-2 text-purple-600" size={22} />
                Upload Trial Balance
              </h3>
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 md:p-8 text-center bg-purple-50/50">
                <FileText size={40} className="mx-auto text-purple-500 mb-4" />
                <p className="text-slate-600 mb-2">Upload your trial balance (Excel/CSV/PDF)</p>
                <p className="text-sm text-slate-500 mb-4">AI will classify accounts and generate statements</p>
                <input 
                  type="file" 
                  className="hidden" 
                  id="trial-balance-upload" 
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                />
                <label htmlFor="trial-balance-upload">
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700" 
                    disabled={uploading || !context.company_name}
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <><RefreshCw size={18} className="mr-2 animate-spin" /> Processing...</>
                      ) : (
                        <><Upload size={18} className="mr-2" /> Upload Trial Balance</>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          {mode === 'manual' && (
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-slate-200">
              <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
                <Plus className="mr-2 text-blue-600" size={22} />
                Add Trial Balance Entry
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Name *</label>
                  <input
                    type="text"
                    value={newEntry.account_name}
                    onChange={(e) => setNewEntry({ ...newEntry, account_name: e.target.value })}
                    placeholder="Account name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    data-testid="account-name-input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Group *</label>
                  <select
                    value={newEntry.account_group}
                    onChange={(e) => setNewEntry({ ...newEntry, account_group: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    data-testid="account-group-select"
                  >
                    <option value="">Select Group</option>
                    <optgroup label="Assets">
                      <option value="fixed_assets">Fixed Assets</option>
                      <option value="current_assets">Current Assets</option>
                      <option value="investments">Investments</option>
                    </optgroup>
                    <optgroup label="Liabilities">
                      <option value="equity">Equity & Reserves</option>
                      <option value="non_current_liabilities">Non-Current Liabilities</option>
                      <option value="current_liabilities">Current Liabilities</option>
                    </optgroup>
                    <optgroup label="P&L">
                      <option value="income">Income</option>
                      <option value="expenses">Expenses</option>
                    </optgroup>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Debit (Dr)</label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={newEntry.debit}
                      onChange={(e) => setNewEntry({ ...newEntry, debit: e.target.value, credit: '' })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      data-testid="debit-input"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Credit (Cr)</label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={newEntry.credit}
                      onChange={(e) => setNewEntry({ ...newEntry, credit: e.target.value, debit: '' })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      data-testid="credit-input"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
                <div className={`text-xs md:text-sm px-3 py-1 rounded ${isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Dr: <IndianRupee size={10} className="inline" />{totalDebit.toLocaleString('en-IN')} | 
                  Cr: <IndianRupee size={10} className="inline" />{totalCredit.toLocaleString('en-IN')} 
                  {isBalanced ? ' ✓ Balanced' : ` | Diff: ${Math.abs(totalDebit - totalCredit).toLocaleString('en-IN')}`}
                </div>
                <Button onClick={handleAddEntry} className="bg-blue-600 hover:bg-blue-700 text-sm" data-testid="add-entry-btn">
                  <Plus size={16} className="mr-2" /> Add Entry
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trial Balance Table (Step 1-3) */}
      {trialBalance.length > 0 && step < 4 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <FileSpreadsheet className="mr-2 text-slate-600" size={20} />
              Trial Balance ({trialBalance.length} accounts)
            </h3>
            <div className="flex items-center space-x-2">
              {step >= 2 && (
                <Button
                  onClick={generateStatements}
                  disabled={generating || !isBalanced}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="generate-statements-btn"
                >
                  {generating ? (
                    <><RefreshCw size={16} className="mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><BarChart3 size={16} className="mr-1" /> Generate Statements</>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Account Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Group</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Debit (Dr)</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Credit (Cr)</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {trialBalance.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{e.account_name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={e.account_group}
                        onChange={(ev) => handleUpdateGroup(e.id, ev.target.value)}
                        className="text-xs px-2 py-1 border border-slate-200 rounded bg-slate-50"
                      >
                        <option value="">Unclassified</option>
                        <optgroup label="Assets">
                          <option value="fixed_assets">Fixed Assets</option>
                          <option value="current_assets">Current Assets</option>
                          <option value="investments">Investments</option>
                        </optgroup>
                        <optgroup label="Liabilities">
                          <option value="equity">Equity</option>
                          <option value="non_current_liabilities">Non-Current Liabilities</option>
                          <option value="current_liabilities">Current Liabilities</option>
                        </optgroup>
                        <optgroup label="P&L">
                          <option value="income">Income</option>
                          <option value="expenses">Expenses</option>
                        </optgroup>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.debit > 0 && (
                        <span className="text-green-700 font-medium">
                          <IndianRupee size={12} className="inline" />
                          {e.debit.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.credit > 0 && (
                        <span className="text-blue-700 font-medium">
                          <IndianRupee size={12} className="inline" />
                          {e.credit.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteEntry(e.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-semibold">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-right text-green-700">
                    <IndianRupee size={14} className="inline" />
                    {totalDebit.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    <IndianRupee size={14} className="inline" />
                    {totalCredit.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isBalanced ? (
                      <CheckCircle size={18} className="inline text-green-600" />
                    ) : (
                      <AlertCircle size={18} className="inline text-red-600" />
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Step 4: Generated Statements */}
      {step === 4 && balanceSheet && profitLoss && (
        <>
          {/* Export Actions */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">{context.company_name}</h3>
              <p className="text-sm text-slate-600">Financial Statements for FY {context.financial_year}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => handleExport('json')}>
                <Download size={16} className="mr-1" /> JSON
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleExport('pdf')} data-testid="export-pdf-btn">
                <Download size={16} className="mr-1" /> Export PDF
              </Button>
            </div>
          </div>

          {/* Balance Sheet */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-blue-50">
              <h3 className="text-xl font-bold text-blue-900 flex items-center">
                <BarChart3 className="mr-2" size={24} />
                Balance Sheet
              </h3>
              <p className="text-sm text-blue-700">As on {balanceSheet.as_on}</p>
            </div>
            
            <div className="grid grid-cols-2 divide-x divide-slate-200">
              {/* Assets Side */}
              <div className="p-4">
                <h4 className="font-semibold text-slate-800 mb-4 text-lg">ASSETS</h4>
                
                {/* Fixed Assets */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Fixed Assets</h5>
                  {balanceSheet.assets.fixed_assets.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                      <span>{item.name}</span>
                      <span><IndianRupee size={12} className="inline" />{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                    <span>Total Fixed Assets</span>
                    <span><IndianRupee size={12} className="inline" />{balanceSheet.assets.fixed_assets.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                
                {/* Current Assets */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Current Assets</h5>
                  {balanceSheet.assets.current_assets.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                      <span>{item.name}</span>
                      <span><IndianRupee size={12} className="inline" />{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                    <span>Total Current Assets</span>
                    <span><IndianRupee size={12} className="inline" />{balanceSheet.assets.current_assets.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                
                {/* Total Assets */}
                <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-2 mt-4">
                  <span>TOTAL ASSETS</span>
                  <span className="text-green-700"><IndianRupee size={16} className="inline" />{balanceSheet.assets.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              {/* Liabilities Side */}
              <div className="p-4">
                <h4 className="font-semibold text-slate-800 mb-4 text-lg">EQUITY & LIABILITIES</h4>
                
                {/* Equity */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Shareholders Equity</h5>
                  {balanceSheet.liabilities.equity.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                      <span>{item.name}</span>
                      <span className={item.amount < 0 ? 'text-red-600' : ''}>
                        <IndianRupee size={12} className="inline" />{item.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                    <span>Total Equity</span>
                    <span><IndianRupee size={12} className="inline" />{balanceSheet.liabilities.equity.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                
                {/* Current Liabilities */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Current Liabilities</h5>
                  {balanceSheet.liabilities.current.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                      <span>{item.name}</span>
                      <span><IndianRupee size={12} className="inline" />{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                    <span>Total Current Liabilities</span>
                    <span><IndianRupee size={12} className="inline" />{balanceSheet.liabilities.current.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                
                {/* Total Liabilities */}
                <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-2 mt-4">
                  <span>TOTAL EQUITY & LIABILITIES</span>
                  <span className="text-blue-700"><IndianRupee size={16} className="inline" />{balanceSheet.liabilities.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profit & Loss Statement */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-purple-50">
              <h3 className="text-xl font-bold text-purple-900 flex items-center">
                <PieChart className="mr-2" size={24} />
                Profit & Loss Statement
              </h3>
              <p className="text-sm text-purple-700">For the year ended {context.period_end_date}</p>
            </div>
            
            <div className="p-6">
              {/* Income */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                  <TrendingUp className="mr-2 text-green-600" size={20} />
                  Revenue / Income
                </h4>
                {profitLoss.income.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="text-green-700 font-medium">
                      <IndianRupee size={14} className="inline" />{item.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-green-50 px-3 rounded mt-2 font-semibold">
                  <span>Total Revenue</span>
                  <span className="text-green-700">
                    <IndianRupee size={14} className="inline" />{profitLoss.income.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              
              {/* Expenses */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                  <TrendingDown className="mr-2 text-red-600" size={20} />
                  Expenses
                </h4>
                {profitLoss.expenses.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="text-red-600 font-medium">
                      <IndianRupee size={14} className="inline" />{item.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-red-50 px-3 rounded mt-2 font-semibold">
                  <span>Total Expenses</span>
                  <span className="text-red-600">
                    <IndianRupee size={14} className="inline" />{profitLoss.expenses.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              
              {/* Net Profit/Loss */}
              <div className={`p-4 rounded-lg ${profitLoss.net_profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">Net Profit / (Loss)</span>
                  <span className={`text-2xl font-bold ${profitLoss.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    <IndianRupee size={20} className="inline" />
                    {profitLoss.net_profit.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {trialBalance.length === 0 && step === 1 && (
        <div className="bg-slate-50 rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
          <BarChart3 size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Trial Balance Data</h3>
          <p className="text-slate-500">Upload a trial balance file or add entries manually to generate financial statements</p>
        </div>
      )}
    </div>
  );
};

export default FinancialStatements;
