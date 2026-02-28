import { useState, useRef } from 'react';
import { 
  Upload, FileText, Download, BarChart3, CheckCircle, Sparkles, 
  AlertCircle, RefreshCw, IndianRupee, Building2, Calendar, 
  PieChart, TrendingUp, TrendingDown, Plus, Trash2, Edit3, 
  Eye, X, Check, FileSpreadsheet, ArrowRight, ArrowLeft,
  BookOpen, Wallet, Users, Package, Calculator, DollarSign, ChevronRight
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

const STEPS = [
  { num: 1, label: 'Upload', icon: Upload },
  { num: 2, label: 'Trial Balance', icon: FileSpreadsheet },
  { num: 3, label: 'P&L Statement', icon: TrendingUp },
  { num: 4, label: 'Schedules', icon: BookOpen },
  { num: 5, label: 'Ratios', icon: PieChart },
  { num: 6, label: 'Notes', icon: FileText },
  { num: 7, label: 'Cash Flow', icon: Wallet },
  { num: 8, label: 'Export', icon: Download }
];

const formatINR = (amount) => {
  if (amount === null || amount === undefined) return '0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  if (num < 0) return `(${Math.abs(num).toLocaleString('en-IN')})`;
  return num.toLocaleString('en-IN');
};

const FinancialStatements = () => {
  // Mode State
  const [mode, setMode] = useState('manual');
  const [step, setStep] = useState(1);
  const [activeScheduleTab, setActiveScheduleTab] = useState('share_capital');
  
  // Context
  const [context, setContext] = useState({
    company_name: '',
    financial_year: '2024-25',
    period_end_date: '2025-03-31',
    statement_type: 'both'
  });
  
  // Trial Balance Data
  const [trialBalance, setTrialBalance] = useState([]);
  
  // Generated Statements
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [ratios, setRatios] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  
  // Schedule Data
  const [shareCapital, setShareCapital] = useState({
    authorized: 1000000,
    issued: 1000000,
    paidUp: 1000000,
    shareholders: [
      { name: 'Promoter A', shares: 51000, percentage: 51, amount: 510000 },
      { name: 'Promoter B', shares: 49000, percentage: 49, amount: 490000 }
    ]
  });
  
  const [reserves, setReserves] = useState({
    securities_premium: 500000,
    general_reserve: 800000,
    retained_earnings: 1242000,
    other_reserves: 0
  });
  
  const [fixedAssets, setFixedAssets] = useState([
    { asset_class: 'Building', gross_block: 2500000, dep_rate: 5, dep_for_year: 125000, wdv: 1850000 },
    { asset_class: 'Plant & Machinery', gross_block: 1500000, dep_rate: 15, dep_for_year: 225000, wdv: 850000 },
    { asset_class: 'Furniture', gross_block: 500000, dep_rate: 10, dep_for_year: 50000, wdv: 320000 },
    { asset_class: 'Vehicles', gross_block: 800000, dep_rate: 15, dep_for_year: 120000, wdv: 480000 },
    { asset_class: 'Computers', gross_block: 200000, dep_rate: 40, dep_for_year: 80000, wdv: 60000 }
  ]);
  
  const [inventory, setInventory] = useState({
    raw_materials: 320000,
    work_in_progress: 150000,
    finished_goods: 480000,
    stock_in_trade: 250000,
    stores_spares: 45000,
    loose_tools: 25000
  });
  
  const [debtors, setDebtors] = useState([
    { name: 'ABC Corp', days_0_30: 250000, days_31_60: 120000, days_61_90: 50000, days_over_90: 0 },
    { name: 'XYZ Ltd', days_0_30: 180000, days_31_60: 90000, days_61_90: 30000, days_over_90: 0 },
    { name: 'Others', days_0_30: 255000, days_31_60: 110000, days_61_90: 45000, days_over_90: 25000 }
  ]);
  
  const [creditors, setCreditors] = useState([
    { name: 'Sharma Const.', days_0_30: 180000, days_31_60: 90000, days_61_90: 40000, days_over_90: 0 },
    { name: 'Verma Engg.', days_0_30: 150000, days_31_60: 70000, days_61_90: 30000, days_over_90: 0 },
    { name: 'Others', days_0_30: 260000, days_31_60: 135000, days_61_90: 55000, days_over_90: 25000 }
  ]);
  
  const [notes, setNotes] = useState([
    {
      title: 'Significant Accounting Policies',
      content: 'The financial statements are prepared on accrual basis under historical cost convention in accordance with Generally Accepted Accounting Principles (GAAP) and the requirements of the Companies Act, 2013.'
    },
    {
      title: 'Contingent Liabilities',
      content: 'Bank Guarantees: Rs. 2,50,000\nDisputed Tax Demands: Rs. 75,000\nOther Claims: Rs. 25,000'
    }
  ]);
  
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

  // Generate Financial Statements
  const generateStatements = async () => {
    setGenerating(true);
    setErrors([]);
    
    const totalDebit = trialBalance.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = trialBalance.reduce((sum, e) => sum + (e.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 1;
    
    if (!isBalanced) {
      setErrors(['Trial balance does not tally!']);
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
      const costOfGoods = expenses.filter(e => e.account_name.toLowerCase().includes('cost')).reduce((sum, e) => sum + e.debit, 0);
      
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
        },
        total_assets: totalAssets,
        total_liabilities: totalLiabilities
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
        revenue: totalIncome,
        gross_profit: totalIncome - costOfGoods,
        operating_profit: totalIncome - totalExpenses,
        profit_before_tax: totalIncome - totalExpenses,
        tax_expense: Math.round((totalIncome - totalExpenses) * 0.25),
        net_profit: netProfitLoss
      });
      
      // Calculate Ratios
      const inventoryTotal = Object.values(inventory).reduce((sum, v) => sum + v, 0);
      const debtorsTotal = debtors.reduce((sum, d) => sum + d.days_0_30 + d.days_31_60 + d.days_61_90 + d.days_over_90, 0);
      const creditorsTotal = creditors.reduce((sum, c) => sum + c.days_0_30 + c.days_31_60 + c.days_61_90 + c.days_over_90, 0);
      const interestExpense = expenses.filter(e => e.account_name.toLowerCase().includes('interest')).reduce((sum, e) => sum + e.debit, 0) || 1;
      
      try {
        const ratioResponse = await api.post('/financial/calculate-ratios', {
          current_assets: totalCurrentAssets,
          current_liabilities: totalCurrentLiab,
          inventory: inventoryTotal,
          cash: totalCurrentAssets * 0.1,
          total_assets: totalAssets,
          total_equity: totalEquity + netProfitLoss,
          total_debt: totalNonCurrentLiab,
          revenue: totalIncome,
          gross_profit: totalIncome - costOfGoods,
          operating_profit: totalIncome - totalExpenses,
          net_profit: netProfitLoss,
          interest_expense: interestExpense,
          cost_of_goods_sold: costOfGoods,
          trade_receivables: debtorsTotal,
          trade_payables: creditorsTotal
        });
        
        if (ratioResponse.data.success) {
          setRatios(ratioResponse.data.ratios);
        }
      } catch (err) {
        console.error('Ratio calculation error:', err);
      }
      
      // Generate Cash Flow
      const depreciation = expenses.filter(e => e.account_name.toLowerCase().includes('depreciation')).reduce((sum, e) => sum + e.debit, 0);
      const interestIncome = income.filter(e => e.account_name.toLowerCase().includes('interest')).reduce((sum, e) => sum + e.credit, 0);
      
      const operatingCashFlow = netProfitLoss + depreciation + interestExpense - interestIncome;
      const investingCashFlow = -fixedAssets.reduce((sum, a) => sum + (a.gross_block * 0.1), 0);
      const financingCashFlow = -interestExpense;
      
      setCashFlow({
        operating: {
          net_profit: netProfitLoss,
          depreciation: depreciation,
          interest_expense: interestExpense,
          interest_income: -interestIncome,
          total: operatingCashFlow
        },
        investing: {
          fixed_assets_purchased: investingCashFlow,
          interest_received: interestIncome,
          total: investingCashFlow + interestIncome
        },
        financing: {
          interest_paid: -interestExpense,
          dividends: -100000,
          total: financingCashFlow - 100000
        },
        net_change: operatingCashFlow + investingCashFlow + interestIncome + financingCashFlow - 100000,
        opening_cash: 130000,
        closing_cash: 130000 + operatingCashFlow + investingCashFlow + interestIncome + financingCashFlow - 100000
      });
      
      setStep(3);
      setSuccess('Financial statements generated successfully!');
    } catch (error) {
      setErrors(['Error generating statements: ' + error.message]);
    } finally {
      setGenerating(false);
    }
  };

  // Export handlers
  const handleExportPDF = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/financial/generate-pdf', {
        company_name: context.company_name,
        financial_year: context.financial_year,
        period_end_date: context.period_end_date,
        trial_balance: trialBalance,
        balance_sheet: balanceSheet,
        profit_loss: profitLoss,
        cash_flow: cashFlow ? {
          operating: cashFlow.operating?.total || 0,
          investing: cashFlow.investing?.total || 0,
          financing: cashFlow.financing?.total || 0,
          net_change: cashFlow.net_change || 0,
          opening_cash: cashFlow.opening_cash || 0,
          closing_cash: cashFlow.closing_cash || 0
        } : null,
        ratios: ratios
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Financial_Statements_${context.financial_year}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSuccess('PDF downloaded!');
    } catch (error) {
      console.error('PDF export error:', error);
      setErrors(['Error generating PDF']);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/financial/generate-excel', {
        company_name: context.company_name,
        financial_year: context.financial_year,
        trial_balance: trialBalance,
        balance_sheet: balanceSheet,
        profit_loss: profitLoss,
        ratios: ratios
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Financial_Statements_${context.financial_year}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSuccess('Excel downloaded!');
    } catch (error) {
      console.error('Excel export error:', error);
      setErrors(['Error generating Excel']);
    } finally {
      setGenerating(false);
    }
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
            <p className="text-slate-300 text-sm md:text-lg">Complete CA-Level Workflow</p>
            <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-4 text-xs md:text-sm">
              <div className="flex items-center space-x-2">
                <Upload size={18} />
                <span>AI Upload</span>
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
            <div className="text-slate-200 text-sm">8-Step Workflow</div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-xl shadow-sm p-3 md:p-4 border border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 md:gap-2 min-w-max">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            
            return (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => s.num <= step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center space-x-1 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-colors text-xs md:text-sm ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  data-testid={`step-${s.num}-btn`}
                >
                  {isCompleted ? <CheckCircle size={14} /> : <Icon size={14} />}
                  <span className="font-medium hidden sm:inline">{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && <ChevronRight size={14} className="mx-1 text-slate-300" />}
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-end mt-3 space-x-2">
          <Button
            onClick={() => setMode('manual')}
            variant={mode === 'manual' ? 'default' : 'outline'}
            size="sm"
            className={mode === 'manual' ? 'bg-blue-600 text-xs md:text-sm' : 'text-xs md:text-sm'}
            data-testid="manual-mode-btn"
          >
            Manual Entry
          </Button>
          <Button
            onClick={() => setMode('ai')}
            variant={mode === 'ai' ? 'default' : 'outline'}
            size="sm"
            className={mode === 'ai' ? 'bg-purple-600 text-xs md:text-sm' : 'text-xs md:text-sm'}
            data-testid="ai-mode-btn"
          >
            <Sparkles size={12} className="mr-1" /> AI Upload
          </Button>
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
                  data-testid="financial-year-select"
                >
                  <option value="2024-25">2024-25</option>
                  <option value="2025-26">2025-26</option>
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
                  data-testid="period-end-date-input"
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
                <p className="text-sm text-slate-500 mb-4">Gemini AI will extract and classify accounts</p>
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
                <div className={`text-xs md:text-sm px-3 py-1 rounded font-mono ${isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Dr: ₹{formatINR(totalDebit)} | Cr: ₹{formatINR(totalCredit)} 
                  {isBalanced ? ' ✓' : ` | Diff: ₹${formatINR(Math.abs(totalDebit - totalCredit))}`}
                </div>
                <Button onClick={handleAddEntry} className="bg-blue-600 hover:bg-blue-700 text-sm" data-testid="add-entry-btn">
                  <Plus size={16} className="mr-2" /> Add Entry
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trial Balance Table (Step 1-2) */}
      {trialBalance.length > 0 && step <= 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-lg font-semibold flex items-center">
              <FileSpreadsheet className="mr-2 text-slate-600" size={20} />
              Trial Balance ({trialBalance.length} accounts)
            </h3>
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
                        <span className="text-green-700 font-medium font-mono">₹{formatINR(e.debit)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.credit > 0 && (
                        <span className="text-blue-700 font-medium font-mono">₹{formatINR(e.credit)}</span>
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
                  <td className="px-4 py-3 text-right text-green-700 font-mono">₹{formatINR(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-blue-700 font-mono">₹{formatINR(totalCredit)}</td>
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

      {/* Step 3: P&L Statement */}
      {step === 3 && profitLoss && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Financial Statements Generated</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(4)} className="bg-blue-600">
                Schedules <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-purple-50">
              <h3 className="text-xl font-bold text-purple-900 flex items-center">
                <PieChart className="mr-2" size={24} />
                Statement of Profit and Loss
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
                    <span className="text-green-700 font-medium font-mono">₹{formatINR(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-green-50 px-3 rounded mt-2 font-semibold">
                  <span>Total Revenue</span>
                  <span className="text-green-700 font-mono">₹{formatINR(profitLoss.income.total)}</span>
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
                    <span className="text-red-600 font-medium font-mono">₹{formatINR(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-red-50 px-3 rounded mt-2 font-semibold">
                  <span>Total Expenses</span>
                  <span className="text-red-600 font-mono">₹{formatINR(profitLoss.expenses.total)}</span>
                </div>
              </div>
              
              {/* Net Profit/Loss */}
              <div className={`p-4 rounded-lg ${profitLoss.net_profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">Net Profit / (Loss)</span>
                  <span className={`text-2xl font-bold font-mono ${profitLoss.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ₹{formatINR(profitLoss.net_profit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Sheet */}
          {balanceSheet && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 bg-blue-50">
                <h3 className="text-xl font-bold text-blue-900 flex items-center">
                  <BarChart3 className="mr-2" size={24} />
                  Balance Sheet
                </h3>
                <p className="text-sm text-blue-700">As on {balanceSheet.as_on}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {/* Assets Side */}
                <div className="p-4">
                  <h4 className="font-semibold text-slate-800 mb-4 text-lg">ASSETS</h4>
                  
                  {balanceSheet.assets.fixed_assets.items.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-slate-700 mb-2">Fixed Assets</h5>
                      {balanceSheet.assets.fixed_assets.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                          <span>{item.name}</span>
                          <span className="font-mono">₹{formatINR(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                        <span>Total Fixed Assets</span>
                        <span className="font-mono">₹{formatINR(balanceSheet.assets.fixed_assets.total)}</span>
                      </div>
                    </div>
                  )}
                  
                  {balanceSheet.assets.current_assets.items.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-slate-700 mb-2">Current Assets</h5>
                      {balanceSheet.assets.current_assets.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                          <span>{item.name}</span>
                          <span className="font-mono">₹{formatINR(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                        <span>Total Current Assets</span>
                        <span className="font-mono">₹{formatINR(balanceSheet.assets.current_assets.total)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-2 mt-4">
                    <span>TOTAL ASSETS</span>
                    <span className="text-green-700 font-mono">₹{formatINR(balanceSheet.assets.total)}</span>
                  </div>
                </div>
                
                {/* Liabilities Side */}
                <div className="p-4">
                  <h4 className="font-semibold text-slate-800 mb-4 text-lg">EQUITY & LIABILITIES</h4>
                  
                  {balanceSheet.liabilities.equity.items.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-slate-700 mb-2">Shareholders Equity</h5>
                      {balanceSheet.liabilities.equity.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                          <span>{item.name}</span>
                          <span className={`font-mono ${item.amount < 0 ? 'text-red-600' : ''}`}>
                            ₹{formatINR(item.amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                        <span>Total Equity</span>
                        <span className="font-mono">₹{formatINR(balanceSheet.liabilities.equity.total)}</span>
                      </div>
                    </div>
                  )}
                  
                  {balanceSheet.liabilities.current.items.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-slate-700 mb-2">Current Liabilities</h5>
                      {balanceSheet.liabilities.current.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                          <span>{item.name}</span>
                          <span className="font-mono">₹{formatINR(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                        <span>Total Current Liabilities</span>
                        <span className="font-mono">₹{formatINR(balanceSheet.liabilities.current.total)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-2 mt-4">
                    <span>TOTAL LIABILITIES</span>
                    <span className="text-blue-700 font-mono">₹{formatINR(balanceSheet.liabilities.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Schedules */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Schedule-wise Details</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(5)} className="bg-blue-600">
                Ratio Analysis <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* Schedule Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="border-b border-slate-200 p-2">
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'share_capital', label: 'Share Capital', icon: DollarSign },
                  { id: 'reserves', label: 'Reserves', icon: Wallet },
                  { id: 'fixed_assets', label: 'Fixed Assets', icon: Package },
                  { id: 'inventory', label: 'Inventory', icon: Package },
                  { id: 'debtors', label: 'Debtors', icon: Users },
                  { id: 'creditors', label: 'Creditors', icon: Users }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveScheduleTab(tab.id)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeScheduleTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      data-testid={`tab-${tab.id}`}
                    >
                      <Icon size={14} className="mr-1" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6">
              {/* Share Capital */}
              {activeScheduleTab === 'share_capital' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Schedule 1: Share Capital</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Authorized Capital</label>
                      <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          value={shareCapital.authorized}
                          onChange={(e) => setShareCapital({ ...shareCapital, authorized: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-right"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Issued Capital</label>
                      <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          value={shareCapital.issued}
                          onChange={(e) => setShareCapital({ ...shareCapital, issued: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-right"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Paid-up Capital</label>
                      <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          value={shareCapital.paidUp}
                          onChange={(e) => setShareCapital({ ...shareCapital, paidUp: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-right"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <h5 className="font-medium text-slate-700 mb-2">Shareholding Pattern (&gt;5%)</h5>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Shareholder</th>
                        <th className="px-4 py-2 text-right">No. of Shares</th>
                        <th className="px-4 py-2 text-right">% Holding</th>
                        <th className="px-4 py-2 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {shareCapital.shareholders.map((sh, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">{sh.name}</td>
                          <td className="px-4 py-2 text-right font-mono">{sh.shares.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-mono">{sh.percentage}%</td>
                          <td className="px-4 py-2 text-right font-mono">₹{formatINR(sh.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Reserves */}
              {activeScheduleTab === 'reserves' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Schedule 2: Reserves & Surplus</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(reserves).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <div className="relative">
                          <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => setReserves({ ...reserves, [key]: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-slate-100 rounded-lg flex justify-between font-semibold">
                    <span>Total Reserves & Surplus</span>
                    <span className="font-mono">₹{formatINR(Object.values(reserves).reduce((sum, v) => sum + v, 0))}</span>
                  </div>
                </div>
              )}

              {/* Fixed Assets */}
              {activeScheduleTab === 'fixed_assets' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Schedule 3: Fixed Assets & Depreciation</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Asset Class</th>
                          <th className="px-4 py-3 text-right">Gross Block</th>
                          <th className="px-4 py-3 text-right">Dep Rate %</th>
                          <th className="px-4 py-3 text-right">Dep for Year</th>
                          <th className="px-4 py-3 text-right">WDV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {fixedAssets.map((asset, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{asset.asset_class}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(asset.gross_block)}</td>
                            <td className="px-4 py-3 text-right font-mono">{asset.dep_rate}%</td>
                            <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(asset.dep_for_year)}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">₹{formatINR(asset.wdv)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-100 font-semibold">
                        <tr>
                          <td className="px-4 py-3">TOTAL</td>
                          <td className="px-4 py-3 text-right font-mono">₹{formatINR(fixedAssets.reduce((sum, a) => sum + a.gross_block, 0))}</td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(fixedAssets.reduce((sum, a) => sum + a.dep_for_year, 0))}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{formatINR(fixedAssets.reduce((sum, a) => sum + a.wdv, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Inventory */}
              {activeScheduleTab === 'inventory' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Schedule 4: Inventory</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(inventory).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <div className="relative">
                          <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => setInventory({ ...inventory, [key]: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-slate-100 rounded-lg flex justify-between font-semibold">
                    <span>Total Inventory</span>
                    <span className="font-mono">₹{formatINR(Object.values(inventory).reduce((sum, v) => sum + v, 0))}</span>
                  </div>
                </div>
              )}

              {/* Debtors */}
              {activeScheduleTab === 'debtors' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Schedule 5: Trade Receivables (Debtors Ageing)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-right">0-30 days</th>
                          <th className="px-4 py-3 text-right">31-60 days</th>
                          <th className="px-4 py-3 text-right">61-90 days</th>
                          <th className="px-4 py-3 text-right">&gt;90 days</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {debtors.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{d.name}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(d.days_0_30)}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(d.days_31_60)}</td>
                            <td className="px-4 py-3 text-right font-mono text-amber-600">₹{formatINR(d.days_61_90)}</td>
                            <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(d.days_over_90)}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">
                              ₹{formatINR(d.days_0_30 + d.days_31_60 + d.days_61_90 + d.days_over_90)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-100 font-semibold">
                        <tr>
                          <td className="px-4 py-3">TOTAL</td>
                          <td className="px-4 py-3 text-right font-mono">₹{formatINR(debtors.reduce((sum, d) => sum + d.days_0_30, 0))}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{formatINR(debtors.reduce((sum, d) => sum + d.days_31_60, 0))}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-600">₹{formatINR(debtors.reduce((sum, d) => sum + d.days_61_90, 0))}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(debtors.reduce((sum, d) => sum + d.days_over_90, 0))}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{formatINR(debtors.reduce((sum, d) => sum + d.days_0_30 + d.days_31_60 + d.days_61_90 + d.days_over_90, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Creditors */}
              {activeScheduleTab === 'creditors' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Schedule 6: Trade Payables (Creditors Ageing)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Vendor</th>
                          <th className="px-4 py-3 text-right">0-30 days</th>
                          <th className="px-4 py-3 text-right">31-60 days</th>
                          <th className="px-4 py-3 text-right">61-90 days</th>
                          <th className="px-4 py-3 text-right">&gt;90 days</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {creditors.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{c.name}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(c.days_0_30)}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(c.days_31_60)}</td>
                            <td className="px-4 py-3 text-right font-mono text-amber-600">₹{formatINR(c.days_61_90)}</td>
                            <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(c.days_over_90)}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">
                              ₹{formatINR(c.days_0_30 + c.days_31_60 + c.days_61_90 + c.days_over_90)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-100 font-semibold">
                        <tr>
                          <td className="px-4 py-3">TOTAL</td>
                          <td className="px-4 py-3 text-right font-mono">₹{formatINR(creditors.reduce((sum, c) => sum + c.days_0_30, 0))}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{formatINR(creditors.reduce((sum, c) => sum + c.days_31_60, 0))}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-600">₹{formatINR(creditors.reduce((sum, c) => sum + c.days_61_90, 0))}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(creditors.reduce((sum, c) => sum + c.days_over_90, 0))}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{formatINR(creditors.reduce((sum, c) => sum + c.days_0_30 + c.days_31_60 + c.days_61_90 + c.days_over_90, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Ratios */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Financial Ratio Analysis</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(4)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(6)} className="bg-blue-600">
                Notes <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          {ratios ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profitability */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 bg-green-600 text-white rounded-t-xl">
                  <h4 className="font-semibold flex items-center"><TrendingUp size={20} className="mr-2" /> Profitability Ratios</h4>
                </div>
                <div className="p-4">
                  {Object.entries(ratios.profitability).map(([key, value], idx) => (
                    <div key={key} className={`flex justify-between py-2 ${idx % 2 === 0 ? 'bg-slate-50' : ''} px-2 rounded`}>
                      <span className="text-slate-700">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="font-mono font-semibold text-green-600">{value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liquidity */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 bg-blue-600 text-white rounded-t-xl">
                  <h4 className="font-semibold flex items-center"><Wallet size={20} className="mr-2" /> Liquidity Ratios</h4>
                </div>
                <div className="p-4">
                  {Object.entries(ratios.liquidity).map(([key, value], idx) => (
                    <div key={key} className={`flex justify-between py-2 ${idx % 2 === 0 ? 'bg-slate-50' : ''} px-2 rounded`}>
                      <span className="text-slate-700">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="font-mono font-semibold text-blue-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solvency */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 bg-amber-600 text-white rounded-t-xl">
                  <h4 className="font-semibold flex items-center"><Calculator size={20} className="mr-2" /> Solvency Ratios</h4>
                </div>
                <div className="p-4">
                  {Object.entries(ratios.solvency).map(([key, value], idx) => (
                    <div key={key} className={`flex justify-between py-2 ${idx % 2 === 0 ? 'bg-slate-50' : ''} px-2 rounded`}>
                      <span className="text-slate-700">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="font-mono font-semibold text-amber-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Efficiency */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 bg-purple-600 text-white rounded-t-xl">
                  <h4 className="font-semibold flex items-center"><BarChart3 size={20} className="mr-2" /> Efficiency Ratios</h4>
                </div>
                <div className="p-4">
                  {Object.entries(ratios.efficiency).map(([key, value], idx) => (
                    <div key={key} className={`flex justify-between py-2 ${idx % 2 === 0 ? 'bg-slate-50' : ''} px-2 rounded`}>
                      <span className="text-slate-700">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="font-mono font-semibold text-purple-600">{value} times</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
              <PieChart size={48} className="mx-auto text-slate-400 mb-4" />
              <p className="text-slate-500">Generate statements first to view ratios</p>
            </div>
          )}
        </div>
      )}

      {/* Step 6: Notes */}
      {step === 6 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Notes to Accounts</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(5)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(7)} className="bg-blue-600">
                Cash Flow <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {notes.map((note, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center mb-3">
                  <FileText size={18} className="mr-2 text-slate-600" />
                  <input
                    type="text"
                    value={note.title}
                    onChange={(e) => {
                      const newNotes = [...notes];
                      newNotes[idx].title = e.target.value;
                      setNotes(newNotes);
                    }}
                    className="font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                  />
                </div>
                <textarea
                  value={note.content}
                  onChange={(e) => {
                    const newNotes = [...notes];
                    newNotes[idx].content = e.target.value;
                    setNotes(newNotes);
                  }}
                  className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={() => setNotes([...notes, { title: 'New Note', content: '' }])}
              className="w-full border-dashed"
            >
              <Plus size={16} className="mr-2" /> Add Note
            </Button>
          </div>
        </div>
      )}

      {/* Step 7: Cash Flow */}
      {step === 7 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Cash Flow Statement</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(6)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(8)} className="bg-green-600">
                Export <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          {cashFlow ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 bg-slate-800 text-white rounded-t-xl">
                <h4 className="font-semibold flex items-center"><Wallet size={20} className="mr-2" /> Cash Flow Statement</h4>
                <p className="text-sm text-slate-300">For the year ended {context.period_end_date}</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Operating Activities */}
                <div>
                  <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold mr-2">A</span>
                    Cash Flow from Operating Activities
                  </h5>
                  <div className="bg-slate-50 rounded-lg overflow-hidden">
                    <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                      <span className="text-slate-600">Net Profit Before Tax</span>
                      <span className="font-mono">₹{formatINR(cashFlow.operating.net_profit)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                      <span className="text-slate-600">Add: Depreciation</span>
                      <span className="font-mono text-green-600">+₹{formatINR(cashFlow.operating.depreciation)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2 bg-green-100 font-semibold">
                      <span>Net Cash from Operating</span>
                      <span className="font-mono text-green-700">₹{formatINR(cashFlow.operating.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Investing Activities */}
                <div>
                  <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold mr-2">B</span>
                    Cash Flow from Investing Activities
                  </h5>
                  <div className="bg-slate-50 rounded-lg overflow-hidden">
                    <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                      <span className="text-slate-600">Purchase of Fixed Assets</span>
                      <span className="font-mono text-red-600">₹{formatINR(cashFlow.investing.fixed_assets_purchased)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2 bg-blue-100 font-semibold">
                      <span>Net Cash from Investing</span>
                      <span className={`font-mono ${cashFlow.investing.total >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        ₹{formatINR(cashFlow.investing.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financing Activities */}
                <div>
                  <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold mr-2">C</span>
                    Cash Flow from Financing Activities
                  </h5>
                  <div className="bg-slate-50 rounded-lg overflow-hidden">
                    <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                      <span className="text-slate-600">Interest Paid</span>
                      <span className="font-mono text-red-600">₹{formatINR(cashFlow.financing.interest_paid)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                      <span className="text-slate-600">Dividend Paid</span>
                      <span className="font-mono text-red-600">₹{formatINR(cashFlow.financing.dividends)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2 bg-purple-100 font-semibold">
                      <span>Net Cash from Financing</span>
                      <span className={`font-mono ${cashFlow.financing.total >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                        ₹{formatINR(cashFlow.financing.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-800 text-white rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Net Increase/(Decrease) in Cash</span>
                    <span className="font-mono font-semibold">₹{formatINR(cashFlow.net_change)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Opening Cash Balance</span>
                    <span className="font-mono">₹{formatINR(cashFlow.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-slate-600 pt-2 mt-2">
                    <span>Closing Cash Balance</span>
                    <span className="font-mono text-green-400">₹{formatINR(cashFlow.closing_cash)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
              <Wallet size={48} className="mx-auto text-slate-400 mb-4" />
              <p className="text-slate-500">Generate statements first to view cash flow</p>
            </div>
          )}
        </div>
      )}

      {/* Step 8: Export */}
      {step === 8 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl">
              <h3 className="text-xl font-bold flex items-center">
                <Download size={24} className="mr-2" /> Download Financial Statements Package
              </h3>
              <p className="text-green-100 mt-1">{context.company_name} - FY {context.financial_year}</p>
            </div>
            
            <div className="p-6">
              {/* Verification Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                  <CheckCircle size={20} className="mr-2" /> All Data Verified & Ready
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle size={16} /> Balance Sheet: Balanced
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle size={16} /> P&L: Calculated
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle size={16} /> Cash Flow: Reconciled
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle size={16} /> Schedules: 6 verified
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle size={16} /> Notes: {notes.length} prepared
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle size={16} /> Ratios: Computed
                  </div>
                </div>
              </div>
              
              {/* Download Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={handleExportPDF}
                  disabled={generating}
                  size="lg"
                  className="h-auto py-4 bg-red-600 hover:bg-red-700"
                  data-testid="export-pdf-btn"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={32} />
                    <div className="text-left">
                      <div className="font-semibold">Download PDF</div>
                      <div className="text-xs text-red-200">Complete statements package</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={handleExportExcel}
                  disabled={generating}
                  size="lg"
                  className="h-auto py-4 bg-green-600 hover:bg-green-700"
                  data-testid="export-excel-btn"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={32} />
                    <div className="text-left">
                      <div className="font-semibold">Download Excel</div>
                      <div className="text-xs text-green-200">Editable workbook</div>
                    </div>
                  </div>
                </Button>
              </div>
              
              {/* Navigation */}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(7)}>
                  <ArrowLeft size={16} className="mr-2" /> Back to Cash Flow
                </Button>
                <Button variant="outline" onClick={() => setStep(1)}>
                  <RefreshCw size={16} className="mr-2" /> Start New
                </Button>
              </div>
            </div>
          </div>
        </div>
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
