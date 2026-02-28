import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Download, BarChart3, CheckCircle, Sparkles, 
  AlertCircle, RefreshCw, IndianRupee, Building2, Calendar, 
  PieChart, TrendingUp, TrendingDown, Plus, Trash2, Edit3, 
  Eye, X, Check, FileSpreadsheet, ArrowRight, ArrowLeft,
  ChevronDown, ChevronRight, Calculator, BookOpen, Wallet,
  Users, Package, FileCheck, DollarSign, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
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
  { num: 1, label: 'Upload', icon: Upload, description: 'Upload Documents' },
  { num: 2, label: 'Trial Balance', icon: FileSpreadsheet, description: 'Review & Edit' },
  { num: 3, label: 'P&L Statement', icon: TrendingUp, description: 'Profit & Loss' },
  { num: 4, label: 'Schedules', icon: BookOpen, description: 'Detailed Schedules' },
  { num: 5, label: 'Ratios', icon: PieChart, description: 'Financial Ratios' },
  { num: 6, label: 'Notes', icon: FileText, description: 'Notes to Accounts' },
  { num: 7, label: 'Cash Flow', icon: Wallet, description: 'Cash Flow Statement' },
  { num: 8, label: 'Export', icon: Download, description: 'Download Package' }
];

const formatINR = (amount) => {
  if (amount === null || amount === undefined) return '0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  if (num < 0) return `(${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export default function FinancialStatements() {
  // State
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('manual');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Context
  const [context, setContext] = useState({
    company_name: '',
    financial_year: '2024-25',
    period_end_date: '2025-03-31'
  });
  
  // Data
  const [trialBalance, setTrialBalance] = useState([]);
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
    { name: 'PQR Traders', days_0_30: 95000, days_31_60: 45000, days_61_90: 20000, days_over_90: 15000 },
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
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [ratios, setRatios] = useState(null);
  
  // New Entry Form
  const [newEntry, setNewEntry] = useState({
    account_name: '',
    account_group: '',
    debit: '',
    credit: ''
  });
  
  const fileInputRef = useRef(null);
  
  // Calculate totals
  const totalDebit = trialBalance.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const totalCredit = trialBalance.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;
  
  // File Upload Handler
  const handleFileUpload = async (e, type = 'trial_balance') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      let endpoint = '/financial/extract-trial-balance';
      if (type === 'fixed_assets') endpoint = '/financial/extract-fixed-assets';
      else if (type === 'debtors' || type === 'creditors') {
        endpoint = '/financial/extract-ageing';
        formData.append('doc_type', type);
      }
      
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        
        if (type === 'trial_balance') {
          const accounts = (data.accounts || []).map((acc, idx) => ({
            id: `${Date.now()}-${idx}`,
            account_name: acc.account_name,
            account_group: acc.account_group || '',
            debit: acc.debit || 0,
            credit: acc.credit || 0
          }));
          setTrialBalance(accounts);
          if (data.company_name) {
            setContext(prev => ({ ...prev, company_name: data.company_name }));
          }
          toast.success('Trial balance extracted successfully!');
          setStep(2);
        } else if (type === 'fixed_assets') {
          setFixedAssets(data.assets || []);
          toast.success('Fixed assets extracted!');
        } else if (type === 'debtors') {
          setDebtors(data);
          toast.success('Debtors ageing extracted!');
        } else if (type === 'creditors') {
          setCreditors(data);
          toast.success('Creditors ageing extracted!');
        }
      } else {
        toast.error('Could not extract data from file');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Error processing file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  // Add manual entry
  const handleAddEntry = () => {
    if (!newEntry.account_name || !newEntry.account_group) {
      toast.error('Account name and group are required');
      return;
    }
    
    if (!newEntry.debit && !newEntry.credit) {
      toast.error('Either debit or credit amount is required');
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
    setNewEntry({ account_name: '', account_group: '', debit: '', credit: '' });
    toast.success('Entry added');
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
    if (!isBalanced && trialBalance.length > 0) {
      toast.error('Trial balance does not tally!');
      return;
    }
    
    setGenerating(true);
    
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
      const totalFixedAssets = assets.fixed.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalCurrentAssets = assets.current.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalInvestments = assets.investments.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalAssets = totalFixedAssets + totalCurrentAssets + totalInvestments;
      
      const totalEquity = liabilities.equity.reduce((sum, e) => sum + (e.credit || 0), 0);
      const totalNonCurrentLiab = liabilities.non_current.reduce((sum, e) => sum + (e.credit || 0), 0);
      const totalCurrentLiab = liabilities.current.reduce((sum, e) => sum + (e.credit || 0), 0);
      
      const totalIncome = income.reduce((sum, e) => sum + (e.credit || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.debit || 0), 0);
      const netProfitLoss = totalIncome - totalExpenses;
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
      const costOfGoods = expenses.filter(e => e.account_name.toLowerCase().includes('cost')).reduce((sum, e) => sum + e.debit, 0);
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
        interest_expense: expenses.filter(e => e.account_name.toLowerCase().includes('interest')).reduce((sum, e) => sum + e.debit, 0) || 1,
        cost_of_goods_sold: costOfGoods,
        trade_receivables: debtorsTotal,
        trade_payables: creditorsTotal
      });
      
      if (ratioResponse.data.success) {
        setRatios(ratioResponse.data.ratios);
      }
      
      // Generate Cash Flow
      const depreciation = expenses.filter(e => e.account_name.toLowerCase().includes('depreciation')).reduce((sum, e) => sum + e.debit, 0);
      const interestExpense = expenses.filter(e => e.account_name.toLowerCase().includes('interest')).reduce((sum, e) => sum + e.debit, 0);
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
          working_capital_changes: 0,
          total: operatingCashFlow
        },
        investing: {
          fixed_assets_purchased: investingCashFlow,
          investments: 0,
          interest_received: interestIncome,
          total: investingCashFlow + interestIncome
        },
        financing: {
          borrowings: 0,
          repayments: 0,
          interest_paid: -interestExpense,
          dividends: -100000,
          total: financingCashFlow - 100000
        },
        net_change: operatingCashFlow + investingCashFlow + interestIncome + financingCashFlow - 100000,
        opening_cash: 130000,
        closing_cash: 130000 + operatingCashFlow + investingCashFlow + interestIncome + financingCashFlow - 100000
      });
      
      setStep(3);
      toast.success('Financial statements generated!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Error generating statements');
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
        cash_flow: {
          operating: cashFlow?.operating?.total || 0,
          investing: cashFlow?.investing?.total || 0,
          financing: cashFlow?.financing?.total || 0,
          net_change: cashFlow?.net_change || 0,
          opening_cash: cashFlow?.opening_cash || 0,
          closing_cash: cashFlow?.closing_cash || 0
        },
        ratios: ratios
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Financial_Statements_${context.financial_year}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Error generating PDF');
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
      toast.success('Excel downloaded!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Error generating Excel');
    } finally {
      setGenerating(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50" data-testid="financial-statements-page">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Financial Statements
                </h1>
                <p className="text-xs text-slate-500">CA-Level Workflow</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('manual')}
                className={mode === 'manual' ? 'bg-slate-900' : ''}
                data-testid="manual-mode-btn"
              >
                Manual Entry
              </Button>
              <Button
                variant={mode === 'ai' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('ai')}
                className={mode === 'ai' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                data-testid="ai-mode-btn"
              >
                <Sparkles className="w-4 h-4 mr-1" /> AI Upload
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Step Indicator */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isCompleted = step > s.num;
              
              return (
                <div key={s.num} className="flex items-center">
                  <button
                    onClick={() => s.num <= Math.max(step, 1) && setStep(s.num)}
                    disabled={s.num > step + 1}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-slate-900 text-white' 
                        : isCompleted 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                          : 'bg-slate-100 text-slate-400'
                    } ${s.num <= step + 1 ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    data-testid={`step-${s.num}-btn`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 mx-1 text-slate-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Upload / Company Context */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Company Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-slate-600" />
                    Company Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Company Name *</label>
                      <Input
                        value={context.company_name}
                        onChange={(e) => setContext({ ...context, company_name: e.target.value })}
                        placeholder="ABC Pvt Ltd"
                        data-testid="company-name-input"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Financial Year *</label>
                      <Select
                        value={context.financial_year}
                        onValueChange={(v) => setContext({ ...context, financial_year: v })}
                      >
                        <SelectTrigger data-testid="financial-year-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024-25">2024-25</SelectItem>
                          <SelectItem value="2023-24">2023-24</SelectItem>
                          <SelectItem value="2025-26">2025-26</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Period End Date *</label>
                      <Input
                        type="date"
                        value={context.period_end_date}
                        onChange={(e) => setContext({ ...context, period_end_date: e.target.value })}
                        data-testid="period-end-date-input"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Upload Section - AI Mode */}
              {mode === 'ai' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-emerald-600" />
                      Upload Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Trial Balance Upload */}
                      <div className="upload-zone" data-testid="trial-balance-upload-zone">
                        <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                        <p className="font-medium text-slate-700 mb-1">Trial Balance</p>
                        <p className="text-sm text-slate-500 mb-3">Excel, CSV, or PDF</p>
                        <input
                          type="file"
                          className="hidden"
                          id="tb-upload"
                          ref={fileInputRef}
                          accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileUpload(e, 'trial_balance')}
                        />
                        <label htmlFor="tb-upload">
                          <Button
                            asChild
                            disabled={uploading || !context.company_name}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <span>
                              {uploading ? (
                                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                              ) : (
                                <><Upload className="w-4 h-4 mr-2" /> Upload</>
                              )}
                            </span>
                          </Button>
                        </label>
                        <p className="text-xs text-slate-400 mt-2">Required</p>
                      </div>
                      
                      {/* Fixed Assets Upload */}
                      <div className="upload-zone">
                        <Package className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                        <p className="font-medium text-slate-700 mb-1">Fixed Asset Register</p>
                        <p className="text-sm text-slate-500 mb-3">Excel or PDF</p>
                        <input
                          type="file"
                          className="hidden"
                          id="fa-upload"
                          accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileUpload(e, 'fixed_assets')}
                        />
                        <label htmlFor="fa-upload">
                          <Button asChild variant="outline" disabled={uploading}>
                            <span><Upload className="w-4 h-4 mr-2" /> Upload</span>
                          </Button>
                        </label>
                        <p className="text-xs text-slate-400 mt-2">Optional</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Manual Entry Section */}
              {mode === 'manual' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-slate-600" />
                      Add Trial Balance Entry
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Account Name *</label>
                        <Input
                          value={newEntry.account_name}
                          onChange={(e) => setNewEntry({ ...newEntry, account_name: e.target.value })}
                          placeholder="Account name"
                          data-testid="account-name-input"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Account Group *</label>
                        <Select
                          value={newEntry.account_group}
                          onValueChange={(v) => setNewEntry({ ...newEntry, account_group: v })}
                        >
                          <SelectTrigger data-testid="account-group-select">
                            <SelectValue placeholder="Select Group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed_assets">Fixed Assets</SelectItem>
                            <SelectItem value="current_assets">Current Assets</SelectItem>
                            <SelectItem value="investments">Investments</SelectItem>
                            <SelectItem value="equity">Equity & Reserves</SelectItem>
                            <SelectItem value="non_current_liabilities">Non-Current Liabilities</SelectItem>
                            <SelectItem value="current_liabilities">Current Liabilities</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expenses">Expenses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Debit (Dr)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            type="number"
                            value={newEntry.debit}
                            onChange={(e) => setNewEntry({ ...newEntry, debit: e.target.value, credit: '' })}
                            placeholder="0"
                            className="pl-9 font-mono text-right"
                            data-testid="debit-input"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Credit (Cr)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            type="number"
                            value={newEntry.credit}
                            onChange={(e) => setNewEntry({ ...newEntry, credit: e.target.value, debit: '' })}
                            placeholder="0"
                            className="pl-9 font-mono text-right"
                            data-testid="credit-input"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
                      <div className={`text-sm px-3 py-1.5 rounded-lg font-mono ${
                        isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        Dr: Rs. {formatINR(totalDebit)} | Cr: Rs. {formatINR(totalCredit)}
                        {isBalanced ? ' ✓' : ` | Diff: Rs. ${formatINR(Math.abs(totalDebit - totalCredit))}`}
                      </div>
                      <Button
                        onClick={handleAddEntry}
                        className="bg-slate-900 hover:bg-slate-800"
                        data-testid="add-entry-btn"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Entry
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Trial Balance Table */}
              {trialBalance.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-slate-600" />
                      Trial Balance ({trialBalance.length} accounts)
                    </CardTitle>
                    <Button
                      onClick={generateStatements}
                      disabled={generating || !isBalanced}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      data-testid="generate-statements-btn"
                    >
                      {generating ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                      ) : (
                        <><BarChart3 className="w-4 h-4 mr-2" /> Generate Statements</>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full financial-table">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Account Name</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Group</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Debit (Dr)</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Credit (Cr)</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trialBalance.map((e) => (
                            <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-700">{e.account_name}</td>
                              <td className="px-4 py-3">
                                <Select
                                  value={e.account_group}
                                  onValueChange={(v) => handleUpdateGroup(e.id, v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed_assets">Fixed Assets</SelectItem>
                                    <SelectItem value="current_assets">Current Assets</SelectItem>
                                    <SelectItem value="investments">Investments</SelectItem>
                                    <SelectItem value="equity">Equity</SelectItem>
                                    <SelectItem value="non_current_liabilities">Non-Current Liab.</SelectItem>
                                    <SelectItem value="current_liabilities">Current Liab.</SelectItem>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expenses">Expenses</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-emerald-600">
                                {e.debit > 0 && `Rs. ${formatINR(e.debit)}`}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-blue-600">
                                {e.credit > 0 && `Rs. ${formatINR(e.credit)}`}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEntry(e.id)}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-semibold">
                            <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-700">
                              Rs. {formatINR(totalDebit)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-blue-700">
                              Rs. {formatINR(totalCredit)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isBalanced ? (
                                <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Empty State */}
              {trialBalance.length === 0 && (
                <div className="bg-slate-50 rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
                  <BarChart3 className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Trial Balance Data</h3>
                  <p className="text-slate-500">
                    {mode === 'ai' 
                      ? 'Upload a trial balance file to get started'
                      : 'Add entries manually to begin'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
          
          {/* Step 2: Trial Balance Review - same as step 1 but more editing focused */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Trial Balance Review</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">Verify and classify all accounts</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      onClick={generateStatements}
                      disabled={generating || !isBalanced}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {generating ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                      ) : (
                        <>Generate Statements <ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-4 py-3 text-left text-sm font-semibold">Account Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Classification</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Debit (Dr)</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Credit (Cr)</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trialBalance.map((e, idx) => (
                          <tr key={e.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            <td className="px-4 py-3 font-medium text-slate-700">{e.account_name}</td>
                            <td className="px-4 py-3">
                              <Select
                                value={e.account_group}
                                onValueChange={(v) => handleUpdateGroup(e.id, v)}
                              >
                                <SelectTrigger className={`h-9 ${!e.account_group ? 'border-rose-300 bg-rose-50' : ''}`}>
                                  <SelectValue placeholder="Select Group" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed_assets">Fixed Assets</SelectItem>
                                  <SelectItem value="current_assets">Current Assets</SelectItem>
                                  <SelectItem value="investments">Investments</SelectItem>
                                  <SelectItem value="equity">Equity & Reserves</SelectItem>
                                  <SelectItem value="non_current_liabilities">Non-Current Liabilities</SelectItem>
                                  <SelectItem value="current_liabilities">Current Liabilities</SelectItem>
                                  <SelectItem value="income">Income</SelectItem>
                                  <SelectItem value="expenses">Expenses</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {e.debit > 0 && (
                                <span className="text-emerald-600 font-medium">Rs. {formatINR(e.debit)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {e.credit > 0 && (
                                <span className="text-blue-600 font-medium">Rs. {formatINR(e.credit)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntry(e.id)}
                                className="text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold">
                          <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-700">
                            Rs. {formatINR(totalDebit)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-blue-700">
                            Rs. {formatINR(totalCredit)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isBalanced ? (
                              <div className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="text-xs">Balanced</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-rose-600">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-xs">Diff: Rs. {formatINR(Math.abs(totalDebit - totalCredit))}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Step 3: P&L Statement */}
          {step === 3 && profitLoss && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Statement of Profit and Loss
                      </CardTitle>
                      <p className="text-slate-300 text-sm mt-1">
                        For the year ended {context.period_end_date}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep(2)} className="text-white border-white/30 hover:bg-white/10">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button onClick={() => setStep(4)} className="bg-white text-slate-900 hover:bg-slate-100">
                        Schedules <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Income Section */}
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        Revenue / Income
                      </h3>
                      <div className="bg-slate-50 rounded-lg overflow-hidden">
                        {profitLoss.income.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between px-4 py-3 border-b border-slate-100 last:border-0">
                            <span className="text-slate-700">{item.name}</span>
                            <span className="font-mono text-emerald-600 font-medium">
                              Rs. {formatINR(item.amount)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-3 bg-emerald-100 font-semibold">
                          <span>Total Revenue</span>
                          <span className="font-mono text-emerald-700">
                            Rs. {formatINR(profitLoss.income.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expenses Section */}
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-rose-600" />
                        Expenses
                      </h3>
                      <div className="bg-slate-50 rounded-lg overflow-hidden">
                        {profitLoss.expenses.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between px-4 py-3 border-b border-slate-100 last:border-0">
                            <span className="text-slate-700">{item.name}</span>
                            <span className="font-mono text-rose-600 font-medium">
                              Rs. {formatINR(item.amount)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-3 bg-rose-100 font-semibold">
                          <span>Total Expenses</span>
                          <span className="font-mono text-rose-700">
                            Rs. {formatINR(profitLoss.expenses.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Summary */}
                    <div className={`p-4 rounded-lg ${profitLoss.net_profit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">Net Profit / (Loss)</span>
                        <span className={`text-2xl font-bold font-mono ${
                          profitLoss.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          Rs. {formatINR(profitLoss.net_profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Balance Sheet Preview */}
              {balanceSheet && (
                <Card>
                  <CardHeader className="bg-blue-900 text-white rounded-t-xl">
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Balance Sheet
                    </CardTitle>
                    <p className="text-blue-200 text-sm">As on {balanceSheet.as_on}</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 divide-x divide-slate-200">
                      {/* Assets */}
                      <div className="p-4">
                        <h4 className="font-semibold text-slate-800 mb-3">ASSETS</h4>
                        
                        {balanceSheet.assets.fixed_assets.items.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-slate-600 mb-2">Fixed Assets</h5>
                            {balanceSheet.assets.fixed_assets.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-1 pl-3">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="font-mono text-slate-700">Rs. {formatINR(item.amount)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-3">
                              <span>Total Fixed Assets</span>
                              <span className="font-mono">Rs. {formatINR(balanceSheet.assets.fixed_assets.total)}</span>
                            </div>
                          </div>
                        )}
                        
                        {balanceSheet.assets.current_assets.items.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-slate-600 mb-2">Current Assets</h5>
                            {balanceSheet.assets.current_assets.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-1 pl-3">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="font-mono text-slate-700">Rs. {formatINR(item.amount)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-3">
                              <span>Total Current Assets</span>
                              <span className="font-mono">Rs. {formatINR(balanceSheet.assets.current_assets.total)}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-2 mt-4">
                          <span>TOTAL ASSETS</span>
                          <span className="font-mono text-emerald-700">Rs. {formatINR(balanceSheet.assets.total)}</span>
                        </div>
                      </div>
                      
                      {/* Liabilities */}
                      <div className="p-4">
                        <h4 className="font-semibold text-slate-800 mb-3">EQUITY & LIABILITIES</h4>
                        
                        {balanceSheet.liabilities.equity.items.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-slate-600 mb-2">Shareholders Equity</h5>
                            {balanceSheet.liabilities.equity.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-1 pl-3">
                                <span className="text-slate-600">{item.name}</span>
                                <span className={`font-mono ${item.amount < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                  Rs. {formatINR(item.amount)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-3">
                              <span>Total Equity</span>
                              <span className="font-mono">Rs. {formatINR(balanceSheet.liabilities.equity.total)}</span>
                            </div>
                          </div>
                        )}
                        
                        {balanceSheet.liabilities.current.items.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-slate-600 mb-2">Current Liabilities</h5>
                            {balanceSheet.liabilities.current.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-1 pl-3">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="font-mono text-slate-700">Rs. {formatINR(item.amount)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-3">
                              <span>Total Current Liabilities</span>
                              <span className="font-mono">Rs. {formatINR(balanceSheet.liabilities.current.total)}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-2 mt-4">
                          <span>TOTAL LIABILITIES</span>
                          <span className="font-mono text-blue-700">Rs. {formatINR(balanceSheet.liabilities.total)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
          
          {/* Step 4: Schedules */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Schedule-wise Details
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={() => setStep(5)} className="bg-slate-900 hover:bg-slate-800">
                    Ratio Analysis <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              
              <Tabs defaultValue="share_capital" className="w-full">
                <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1 bg-slate-100 p-1 rounded-lg h-auto">
                  <TabsTrigger value="share_capital" className="text-xs">Share Capital</TabsTrigger>
                  <TabsTrigger value="reserves" className="text-xs">Reserves</TabsTrigger>
                  <TabsTrigger value="fixed_assets" className="text-xs">Fixed Assets</TabsTrigger>
                  <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
                  <TabsTrigger value="debtors" className="text-xs">Debtors</TabsTrigger>
                  <TabsTrigger value="creditors" className="text-xs">Creditors</TabsTrigger>
                </TabsList>
                
                {/* Share Capital Tab */}
                <TabsContent value="share_capital">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-slate-600" />
                        Schedule 1: Share Capital
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Authorized Capital</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="number"
                              value={shareCapital.authorized}
                              onChange={(e) => setShareCapital({ ...shareCapital, authorized: parseFloat(e.target.value) || 0 })}
                              className="pl-9 font-mono text-right"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Issued Capital</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="number"
                              value={shareCapital.issued}
                              onChange={(e) => setShareCapital({ ...shareCapital, issued: parseFloat(e.target.value) || 0 })}
                              className="pl-9 font-mono text-right"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Paid-up Capital</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="number"
                              value={shareCapital.paidUp}
                              onChange={(e) => setShareCapital({ ...shareCapital, paidUp: parseFloat(e.target.value) || 0 })}
                              className="pl-9 font-mono text-right"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-3">Shareholding Pattern ({'>'}5%)</h4>
                        <table className="w-full financial-table">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="px-4 py-2 text-left">Shareholder</th>
                              <th className="px-4 py-2 text-right">No. of Shares</th>
                              <th className="px-4 py-2 text-right">% Holding</th>
                              <th className="px-4 py-2 text-right">Amount (Rs.)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shareCapital.shareholders.map((sh, idx) => (
                              <tr key={idx} className="border-b border-slate-100">
                                <td className="px-4 py-2">{sh.name}</td>
                                <td className="px-4 py-2 text-right font-mono">{sh.shares.toLocaleString()}</td>
                                <td className="px-4 py-2 text-right font-mono">{sh.percentage}%</td>
                                <td className="px-4 py-2 text-right font-mono">Rs. {formatINR(sh.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Reserves Tab */}
                <TabsContent value="reserves">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-slate-600" />
                        Schedule 2: Reserves & Surplus
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Securities Premium</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="number"
                              value={reserves.securities_premium}
                              onChange={(e) => setReserves({ ...reserves, securities_premium: parseFloat(e.target.value) || 0 })}
                              className="pl-9 font-mono text-right"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">General Reserve</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="number"
                              value={reserves.general_reserve}
                              onChange={(e) => setReserves({ ...reserves, general_reserve: parseFloat(e.target.value) || 0 })}
                              className="pl-9 font-mono text-right"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Retained Earnings</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="number"
                              value={reserves.retained_earnings}
                              onChange={(e) => setReserves({ ...reserves, retained_earnings: parseFloat(e.target.value) || 0 })}
                              className="pl-9 font-mono text-right"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Other Reserves</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="number"
                              value={reserves.other_reserves}
                              onChange={(e) => setReserves({ ...reserves, other_reserves: parseFloat(e.target.value) || 0 })}
                              className="pl-9 font-mono text-right"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-slate-100 rounded-lg">
                        <div className="flex justify-between font-semibold">
                          <span>Total Reserves & Surplus</span>
                          <span className="font-mono">
                            Rs. {formatINR(reserves.securities_premium + reserves.general_reserve + reserves.retained_earnings + reserves.other_reserves)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Fixed Assets Tab */}
                <TabsContent value="fixed_assets">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-slate-600" />
                        Schedule 3: Fixed Assets & Depreciation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full financial-table">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="px-4 py-3 text-left">Asset Class</th>
                            <th className="px-4 py-3 text-right">Gross Block</th>
                            <th className="px-4 py-3 text-right">Dep Rate %</th>
                            <th className="px-4 py-3 text-right">Dep for Year</th>
                            <th className="px-4 py-3 text-right">WDV</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fixedAssets.map((asset, idx) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="px-4 py-3 font-medium">{asset.asset_class}</td>
                              <td className="px-4 py-3 text-right font-mono">Rs. {formatINR(asset.gross_block)}</td>
                              <td className="px-4 py-3 text-right font-mono">{asset.dep_rate}%</td>
                              <td className="px-4 py-3 text-right font-mono text-rose-600">Rs. {formatINR(asset.dep_for_year)}</td>
                              <td className="px-4 py-3 text-right font-mono font-semibold">Rs. {formatINR(asset.wdv)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-semibold">
                            <td className="px-4 py-3">TOTAL</td>
                            <td className="px-4 py-3 text-right font-mono">
                              Rs. {formatINR(fixedAssets.reduce((sum, a) => sum + a.gross_block, 0))}
                            </td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600">
                              Rs. {formatINR(fixedAssets.reduce((sum, a) => sum + a.dep_for_year, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              Rs. {formatINR(fixedAssets.reduce((sum, a) => sum + a.wdv, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Inventory Tab */}
                <TabsContent value="inventory">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-slate-600" />
                        Schedule 4: Inventory
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(inventory).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                type="number"
                                value={value}
                                onChange={(e) => setInventory({ ...inventory, [key]: parseFloat(e.target.value) || 0 })}
                                className="pl-9 font-mono text-right"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-4 bg-slate-100 rounded-lg">
                        <div className="flex justify-between font-semibold">
                          <span>Total Inventory</span>
                          <span className="font-mono">
                            Rs. {formatINR(Object.values(inventory).reduce((sum, v) => sum + v, 0))}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Debtors Tab */}
                <TabsContent value="debtors">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-600" />
                        Schedule 5: Trade Receivables (Debtors Ageing)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full financial-table">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="px-4 py-3 text-left">Customer Name</th>
                            <th className="px-4 py-3 text-right">0-30 days</th>
                            <th className="px-4 py-3 text-right">31-60 days</th>
                            <th className="px-4 py-3 text-right">61-90 days</th>
                            <th className="px-4 py-3 text-right">{'>'}90 days</th>
                            <th className="px-4 py-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debtors.map((d, idx) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="px-4 py-3 font-medium">{d.name}</td>
                              <td className="px-4 py-3 text-right font-mono">Rs. {formatINR(d.days_0_30)}</td>
                              <td className="px-4 py-3 text-right font-mono">Rs. {formatINR(d.days_31_60)}</td>
                              <td className="px-4 py-3 text-right font-mono text-amber-600">Rs. {formatINR(d.days_61_90)}</td>
                              <td className="px-4 py-3 text-right font-mono text-rose-600">Rs. {formatINR(d.days_over_90)}</td>
                              <td className="px-4 py-3 text-right font-mono font-semibold">
                                Rs. {formatINR(d.days_0_30 + d.days_31_60 + d.days_61_90 + d.days_over_90)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-semibold">
                            <td className="px-4 py-3">TOTAL</td>
                            <td className="px-4 py-3 text-right font-mono">
                              Rs. {formatINR(debtors.reduce((sum, d) => sum + d.days_0_30, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              Rs. {formatINR(debtors.reduce((sum, d) => sum + d.days_31_60, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-amber-600">
                              Rs. {formatINR(debtors.reduce((sum, d) => sum + d.days_61_90, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600">
                              Rs. {formatINR(debtors.reduce((sum, d) => sum + d.days_over_90, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              Rs. {formatINR(debtors.reduce((sum, d) => sum + d.days_0_30 + d.days_31_60 + d.days_61_90 + d.days_over_90, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Creditors Tab */}
                <TabsContent value="creditors">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-600" />
                        Schedule 6: Trade Payables (Creditors Ageing)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full financial-table">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="px-4 py-3 text-left">Vendor Name</th>
                            <th className="px-4 py-3 text-right">0-30 days</th>
                            <th className="px-4 py-3 text-right">31-60 days</th>
                            <th className="px-4 py-3 text-right">61-90 days</th>
                            <th className="px-4 py-3 text-right">{'>'}90 days</th>
                            <th className="px-4 py-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditors.map((c, idx) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="px-4 py-3 font-medium">{c.name}</td>
                              <td className="px-4 py-3 text-right font-mono">Rs. {formatINR(c.days_0_30)}</td>
                              <td className="px-4 py-3 text-right font-mono">Rs. {formatINR(c.days_31_60)}</td>
                              <td className="px-4 py-3 text-right font-mono text-amber-600">Rs. {formatINR(c.days_61_90)}</td>
                              <td className="px-4 py-3 text-right font-mono text-rose-600">Rs. {formatINR(c.days_over_90)}</td>
                              <td className="px-4 py-3 text-right font-mono font-semibold">
                                Rs. {formatINR(c.days_0_30 + c.days_31_60 + c.days_61_90 + c.days_over_90)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-semibold">
                            <td className="px-4 py-3">TOTAL</td>
                            <td className="px-4 py-3 text-right font-mono">
                              Rs. {formatINR(creditors.reduce((sum, c) => sum + c.days_0_30, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              Rs. {formatINR(creditors.reduce((sum, c) => sum + c.days_31_60, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-amber-600">
                              Rs. {formatINR(creditors.reduce((sum, c) => sum + c.days_61_90, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600">
                              Rs. {formatINR(creditors.reduce((sum, c) => sum + c.days_over_90, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              Rs. {formatINR(creditors.reduce((sum, c) => sum + c.days_0_30 + c.days_31_60 + c.days_61_90 + c.days_over_90, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
          
          {/* Step 5: Ratios */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Financial Ratio Analysis
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={() => setStep(6)} className="bg-slate-900 hover:bg-slate-800">
                    Notes <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              
              {ratios ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profitability Ratios */}
                  <Card>
                    <CardHeader className="bg-emerald-600 text-white rounded-t-xl">
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Profitability Ratios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <tbody>
                          {Object.entries(ratios.profitability).map(([key, value], idx) => (
                            <tr key={key} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`}>
                              <td className="px-4 py-3 text-slate-700">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                                {value}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                  
                  {/* Liquidity Ratios */}
                  <Card>
                    <CardHeader className="bg-blue-600 text-white rounded-t-xl">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Wallet className="w-5 h-5" />
                        Liquidity Ratios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <tbody>
                          {Object.entries(ratios.liquidity).map(([key, value], idx) => (
                            <tr key={key} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`}>
                              <td className="px-4 py-3 text-slate-700">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-blue-600">
                                {value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                  
                  {/* Solvency Ratios */}
                  <Card>
                    <CardHeader className="bg-amber-600 text-white rounded-t-xl">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Calculator className="w-5 h-5" />
                        Solvency Ratios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <tbody>
                          {Object.entries(ratios.solvency).map(([key, value], idx) => (
                            <tr key={key} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`}>
                              <td className="px-4 py-3 text-slate-700">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-amber-600">
                                {value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                  
                  {/* Efficiency Ratios */}
                  <Card>
                    <CardHeader className="bg-purple-600 text-white rounded-t-xl">
                      <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Efficiency Ratios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <tbody>
                          {Object.entries(ratios.efficiency).map(([key, value], idx) => (
                            <tr key={key} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`}>
                              <td className="px-4 py-3 text-slate-700">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-purple-600">
                                {value} times
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <PieChart className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-500">Generate statements first to view ratios</p>
                </Card>
              )}
            </motion.div>
          )}
          
          {/* Step 6: Notes */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Notes to Accounts
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(5)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={() => setStep(7)} className="bg-slate-900 hover:bg-slate-800">
                    Cash Flow <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                {notes.map((note, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-600" />
                        Note {idx + 1}: {note.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        value={note.content}
                        onChange={(e) => {
                          const newNotes = [...notes];
                          newNotes[idx].content = e.target.value;
                          setNotes(newNotes);
                        }}
                        className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      />
                    </CardContent>
                  </Card>
                ))}
                
                <Button
                  variant="outline"
                  onClick={() => setNotes([...notes, { title: 'New Note', content: '' }])}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Note
                </Button>
              </div>
            </motion.div>
          )}
          
          {/* Step 7: Cash Flow */}
          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Cash Flow Statement
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(6)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={() => setStep(8)} className="bg-emerald-600 hover:bg-emerald-700">
                    Export <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              
              {cashFlow ? (
                <Card>
                  <CardHeader className="bg-slate-900 text-white rounded-t-xl">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Cash Flow Statement
                    </CardTitle>
                    <p className="text-slate-300 text-sm">For the year ended {context.period_end_date}</p>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Operating Activities */}
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">A</div>
                        Cash Flow from Operating Activities
                      </h3>
                      <div className="bg-slate-50 rounded-lg overflow-hidden">
                        <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                          <span className="text-slate-600">Net Profit Before Tax</span>
                          <span className="font-mono">Rs. {formatINR(cashFlow.operating.net_profit)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                          <span className="text-slate-600">Add: Depreciation</span>
                          <span className="font-mono text-emerald-600">+Rs. {formatINR(cashFlow.operating.depreciation)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                          <span className="text-slate-600">Add: Interest Expense</span>
                          <span className="font-mono text-emerald-600">+Rs. {formatINR(cashFlow.operating.interest_expense)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 bg-emerald-100 font-semibold">
                          <span>Net Cash from Operating</span>
                          <span className="font-mono text-emerald-700">Rs. {formatINR(cashFlow.operating.total)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Investing Activities */}
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">B</div>
                        Cash Flow from Investing Activities
                      </h3>
                      <div className="bg-slate-50 rounded-lg overflow-hidden">
                        <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                          <span className="text-slate-600">Purchase of Fixed Assets</span>
                          <span className="font-mono text-rose-600">Rs. {formatINR(cashFlow.investing.fixed_assets_purchased)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                          <span className="text-slate-600">Interest Received</span>
                          <span className="font-mono text-emerald-600">+Rs. {formatINR(cashFlow.investing.interest_received)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 bg-blue-100 font-semibold">
                          <span>Net Cash from Investing</span>
                          <span className={`font-mono ${cashFlow.investing.total >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                            Rs. {formatINR(cashFlow.investing.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Financing Activities */}
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">C</div>
                        Cash Flow from Financing Activities
                      </h3>
                      <div className="bg-slate-50 rounded-lg overflow-hidden">
                        <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                          <span className="text-slate-600">Interest Paid</span>
                          <span className="font-mono text-rose-600">Rs. {formatINR(cashFlow.financing.interest_paid)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 border-b border-slate-100">
                          <span className="text-slate-600">Dividend Paid</span>
                          <span className="font-mono text-rose-600">Rs. {formatINR(cashFlow.financing.dividends)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 bg-purple-100 font-semibold">
                          <span>Net Cash from Financing</span>
                          <span className={`font-mono ${cashFlow.financing.total >= 0 ? 'text-purple-700' : 'text-rose-700'}`}>
                            Rs. {formatINR(cashFlow.financing.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Summary */}
                    <div className="bg-slate-900 text-white rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Net Increase/(Decrease) in Cash</span>
                        <span className="font-mono font-semibold">Rs. {formatINR(cashFlow.net_change)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Opening Cash Balance</span>
                        <span className="font-mono">Rs. {formatINR(cashFlow.opening_cash)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-2 mt-2">
                        <span>Closing Cash Balance</span>
                        <span className="font-mono text-emerald-400">Rs. {formatINR(cashFlow.closing_cash)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="p-12 text-center">
                  <Wallet className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-500">Generate statements first to view cash flow</p>
                </Card>
              )}
            </motion.div>
          )}
          
          {/* Step 8: Export */}
          {step === 8 && (
            <motion.div
              key="step8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-xl">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Financial Statements Package
                  </CardTitle>
                  <p className="text-emerald-100 text-sm mt-1">
                    {context.company_name} - FY {context.financial_year}
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Verification Status */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      All Data Verified & Ready
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        Balance Sheet: Balanced
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        P&L: Calculated
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        Cash Flow: Reconciled
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        Schedules: 6 verified
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        Notes: {notes.length} prepared
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        Ratios: Computed
                      </div>
                    </div>
                  </div>
                  
                  {/* Download Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={handleExportPDF}
                      disabled={generating}
                      size="lg"
                      className="h-auto py-4 bg-rose-600 hover:bg-rose-700"
                      data-testid="export-pdf-btn"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8" />
                        <div className="text-left">
                          <div className="font-semibold">Download PDF</div>
                          <div className="text-xs text-rose-200">Complete statements package</div>
                        </div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={handleExportExcel}
                      disabled={generating}
                      size="lg"
                      className="h-auto py-4 bg-emerald-600 hover:bg-emerald-700"
                      data-testid="export-excel-btn"
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-8 h-8" />
                        <div className="text-left">
                          <div className="font-semibold">Download Excel</div>
                          <div className="text-xs text-emerald-200">Editable workbook</div>
                        </div>
                      </div>
                    </Button>
                  </div>
                  
                  {/* Package Contents */}
                  <div className="mt-6 border border-slate-200 rounded-lg">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      Package Contents
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4 text-rose-500" /> Balance Sheet
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4 text-rose-500" /> Profit & Loss
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4 text-rose-500" /> Cash Flow Statement
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4 text-rose-500" /> Schedules (All 6)
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4 text-rose-500" /> Notes to Accounts
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4 text-rose-500" /> Ratio Analysis
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Trial Balance
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Working Sheets
                      </div>
                    </div>
                  </div>
                  
                  {/* Navigation */}
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(7)}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cash Flow
                    </Button>
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Start New
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
