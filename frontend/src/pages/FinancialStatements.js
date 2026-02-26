import { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Download, BarChart3, CheckCircle, Sparkles, 
  AlertCircle, RefreshCw, IndianRupee, Building2, Calendar, 
  PieChart, TrendingUp, TrendingDown, Plus, Trash2, Edit3, 
  Eye, X, Check, FileSpreadsheet, ArrowRight, ArrowLeft,
  ChevronDown, ChevronUp, ChevronRight, Calculator, Users,
  Package, Clock, Scale, FileCheck, Coins, Landmark, Briefcase,
  CreditCard, ReceiptText, ScrollText, FilePen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/services/api';

const FinancialStatements = () => {
  // Step state: 1-Upload, 2-Extract TB, 3-Extract P&L, 4-Schedules, 5-Ratios, 6-Notes, 7-Cash Flow, 8-Download
  const [step, setStep] = useState(1);
  const [extractionMode, setExtractionMode] = useState('rule'); // 'rule' or 'ai'
  
  // Context
  const [context, setContext] = useState({
    company_name: '',
    financial_year: '2024-25',
    period_end_date: '2025-03-31',
  });
  
  // Data state
  const [trialBalance, setTrialBalance] = useState([]);
  const [profitLoss, setProfitLoss] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [schedules, setSchedules] = useState({});
  const [ratios, setRatios] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [notes, setNotes] = useState({});
  const [statementId, setStatementId] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  
  const fileInputRef = useRef(null);
  const prevYearFileRef = useRef(null);

  const fmt = (val) => `₹${(parseFloat(val) || 0).toLocaleString('en-IN')}`;
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate totals
  const totalDebit = trialBalance.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = trialBalance.reduce((sum, e) => sum + (e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

  // Upload and parse trial balance
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setErrors([]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use rule-based or AI extraction based on mode
      const endpoint = extractionMode === 'ai' 
        ? '/financial/extract-trial-balance' 
        : '/financial/parse-excel';
      
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        const accounts = (data.accounts || []).map((acc, idx) => ({
          id: `${Date.now()}-${idx}`,
          ...acc
        }));
        setTrialBalance(accounts);
        if (data.company_name) {
          setContext(prev => ({ ...prev, company_name: data.company_name }));
        }
        setSuccess(`Extracted ${accounts.length} accounts (${response.data.extraction_method || 'AI'} mode)`);
        setStep(2);
      }
    } catch (error) {
      console.error('Extraction error:', error);
      setErrors(['Error processing file. Please try again.']);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load sample data
  const loadSampleData = async () => {
    setLoading(true);
    setErrors([]);
    try {
      const response = await api.post('/financial/generate-sample-data');
      if (response.data.success) {
        const data = response.data.sample_data;
        setContext({
          company_name: data.company_name,
          financial_year: data.financial_year,
          period_end_date: data.period_end_date
        });
        setTrialBalance(data.trial_balance.map((acc, idx) => ({
          id: `sample-${idx}`,
          ...acc
        })));
        setSchedules(data.schedules || {});
        setSuccess('Sample data loaded successfully!');
        setStep(2);
      }
    } catch (error) {
      setErrors(['Failed to load sample data']);
    } finally {
      setLoading(false);
    }
  };

  // Update account group
  const updateAccountGroup = (id, newGroup) => {
    setTrialBalance(prev => prev.map(acc => 
      acc.id === id ? { ...acc, account_group: newGroup } : acc
    ));
  };

  // Update account value
  const updateAccountValue = (id, field, value) => {
    setTrialBalance(prev => prev.map(acc => 
      acc.id === id ? { ...acc, [field]: parseFloat(value) || 0 } : acc
    ));
  };

  // Delete account
  const deleteAccount = (id) => {
    setTrialBalance(prev => prev.filter(acc => acc.id !== id));
  };

  // Add new account
  const addAccount = () => {
    setTrialBalance(prev => [...prev, {
      id: `new-${Date.now()}`,
      account_name: '',
      account_group: '',
      debit: 0,
      credit: 0
    }]);
  };

  // Generate financial statements
  const generateStatements = async () => {
    if (!isBalanced) {
      setErrors(['Trial balance must be balanced before generating statements']);
      return;
    }
    
    setLoading(true);
    setErrors([]);
    
    try {
      const response = await api.post('/financial/generate-statements', {
        company_name: context.company_name,
        financial_year: context.financial_year,
        period_end_date: context.period_end_date,
        trial_balance: trialBalance,
        schedules: schedules
      });
      
      if (response.data.success) {
        setStatementId(response.data.statement_id);
        setBalanceSheet(response.data.balance_sheet);
        setProfitLoss(response.data.profit_loss);
        setRatios(response.data.ratios);
        setSuccess('Financial statements generated!');
        setStep(3);
      }
    } catch (error) {
      setErrors(['Failed to generate statements']);
    } finally {
      setLoading(false);
    }
  };

  // Generate cash flow
  const generateCashFlow = async () => {
    if (!statementId) return;
    
    setLoading(true);
    try {
      const response = await api.post(`/financial/generate-cash-flow?statement_id=${statementId}`);
      if (response.data.success) {
        setCashFlow(response.data.cash_flow);
        setSuccess('Cash flow statement generated!');
      }
    } catch (error) {
      setErrors(['Failed to generate cash flow']);
    } finally {
      setLoading(false);
    }
  };

  // Export as JSON
  const exportJSON = () => {
    const data = {
      company_name: context.company_name,
      financial_year: context.financial_year,
      trial_balance: trialBalance,
      balance_sheet: balanceSheet,
      profit_loss: profitLoss,
      ratios: ratios,
      cash_flow: cashFlow,
      schedules: schedules,
      generated_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Financial_Statements_${context.company_name}_${context.financial_year}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Downloaded JSON file');
  };

  // Step labels
  const steps = [
    { num: 1, label: 'Upload', icon: Upload },
    { num: 2, label: 'Trial Balance', icon: FileSpreadsheet },
    { num: 3, label: 'P&L & Balance Sheet', icon: BarChart3 },
    { num: 4, label: 'Schedules', icon: ScrollText },
    { num: 5, label: 'Ratios', icon: Calculator },
    { num: 6, label: 'Notes', icon: FilePen },
    { num: 7, label: 'Cash Flow', icon: Coins },
    { num: 8, label: 'Download', icon: Download }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="financial-statements-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={28} />
          <h1 className="text-2xl font-bold">Financial Statement Preparation</h1>
          <span className="bg-purple-500/30 px-3 py-1 rounded-full text-sm">CA-LEVEL</span>
        </div>
        <p className="text-slate-300">Balance Sheet | Profit & Loss | Cash Flow | Schedules | Notes | Ratios</p>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-1 mt-4 text-sm overflow-x-auto pb-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => s.num <= step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all ${
                    step >= s.num 
                      ? step === s.num ? 'bg-white/30' : 'bg-white/20' 
                      : 'bg-white/10 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    step > s.num ? 'bg-green-500' : step === s.num ? 'bg-white text-slate-900 font-bold' : 'bg-white/20'
                  }`}>
                    {step > s.num ? <Check size={12} /> : s.num}
                  </span>
                  <span className="hidden md:inline whitespace-nowrap">{s.label}</span>
                </button>
                {i < steps.length - 1 && <ChevronRight size={14} className="mx-1 opacity-50 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            {errors.map((err, idx) => <p key={idx} className="text-red-700 text-sm">{err}</p>)}
          </div>
          <button onClick={() => setErrors([])} className="ml-auto text-red-600">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={20} />
          <span className="text-green-700">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-600">×</button>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Company Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="text-blue-600" size={22} />
              Company Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <Input 
                  value={context.company_name} 
                  onChange={(e) => setContext({...context, company_name: e.target.value})}
                  placeholder="ABC Pvt Ltd"
                  data-testid="company-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={context.financial_year}
                  onChange={(e) => setContext({...context, financial_year: e.target.value})}
                >
                  <option value="2024-25">2024-25</option>
                  <option value="2023-24">2023-24</option>
                  <option value="2025-26">2025-26</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Period End Date</label>
                <Input 
                  type="date"
                  value={context.period_end_date}
                  onChange={(e) => setContext({...context, period_end_date: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Extraction Mode */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Select Extraction Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div 
                onClick={() => setExtractionMode('rule')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  extractionMode === 'rule' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${extractionMode === 'rule' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Rule-Based (Excel)</h4>
                    <p className="text-sm text-slate-500">Fast, no API cost</p>
                  </div>
                </div>
                <ul className="text-sm text-slate-600 space-y-1 mt-3">
                  <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Direct Excel parsing</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Auto account classification</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Instant processing</li>
                </ul>
              </div>
              
              <div 
                onClick={() => setExtractionMode('ai')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  extractionMode === 'ai' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${extractionMode === 'ai' ? 'bg-purple-600 text-white' : 'bg-slate-100'}`}>
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold">AI-Powered</h4>
                    <p className="text-sm text-slate-500">Flexible, handles any format</p>
                  </div>
                </div>
                <ul className="text-sm text-slate-600 space-y-1 mt-3">
                  <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Excel, PDF, Images</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Smart classification</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Unstructured data support</li>
                </ul>
              </div>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
              <Upload size={40} className="mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 mb-2">Upload Trial Balance</p>
              <p className="text-sm text-slate-500 mb-4">
                {extractionMode === 'rule' ? 'Excel files (.xlsx, .xls)' : 'Excel, PDF, or Images'}
              </p>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                accept={extractionMode === 'rule' ? '.xlsx,.xls,.csv' : '.xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg'}
                onChange={handleFileUpload}
              />
              <div className="flex items-center justify-center gap-4">
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || !context.company_name}
                  className={extractionMode === 'ai' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}
                  data-testid="upload-trial-balance-btn"
                >
                  {loading ? <RefreshCw size={18} className="mr-2 animate-spin" /> : <Upload size={18} className="mr-2" />}
                  {loading ? 'Processing...' : 'Upload File'}
                </Button>
                <span className="text-slate-400">or</span>
                <Button 
                  variant="outline" 
                  onClick={loadSampleData}
                  disabled={loading}
                  data-testid="load-sample-btn"
                >
                  <RefreshCw size={18} className="mr-2" /> Load Sample Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Trial Balance Review */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back to Upload
            </button>
            <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg">
              <Eye size={18} />
              <span className="font-medium">Extraction View - Verify & Edit</span>
            </div>
          </div>

          {/* Balance Status */}
          <div className={`rounded-xl p-4 flex items-center justify-between ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-3">
              {isBalanced ? <CheckCircle className="text-green-600" size={24} /> : <AlertCircle className="text-red-600" size={24} />}
              <div>
                <p className={`font-semibold ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                  {isBalanced ? 'Trial Balance is Balanced' : 'Trial Balance NOT Balanced'}
                </p>
                <p className="text-sm text-slate-600">
                  Debit: {fmt(totalDebit)} | Credit: {fmt(totalCredit)} 
                  {!isBalanced && ` | Difference: ${fmt(Math.abs(totalDebit - totalCredit))}`}
                </p>
              </div>
            </div>
            <Button onClick={addAccount} variant="outline" size="sm">
              <Plus size={16} className="mr-1" /> Add Account
            </Button>
          </div>

          {/* Trial Balance Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-blue-600" />
                Trial Balance - {context.company_name || 'Company'} ({trialBalance.length} accounts)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 w-8">#</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 min-w-[200px]">Account Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 min-w-[150px]">Classification</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600 w-32">Debit (Dr)</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600 w-32">Credit (Cr)</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600 w-16">Del</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.map((acc, idx) => (
                    <tr key={acc.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-2">
                        <Input 
                          value={acc.account_name}
                          onChange={(e) => setTrialBalance(prev => prev.map(a => a.id === acc.id ? {...a, account_name: e.target.value} : a))}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select 
                          value={acc.account_group || ''}
                          onChange={(e) => updateAccountGroup(acc.id, e.target.value)}
                          className={`w-full h-8 text-sm border rounded px-2 ${!acc.account_group ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                        >
                          <option value="">-- Select --</option>
                          <optgroup label="Assets">
                            <option value="fixed_assets">Fixed Assets</option>
                            <option value="accumulated_depreciation">Accumulated Depreciation</option>
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
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          type="number"
                          value={acc.debit || ''}
                          onChange={(e) => updateAccountValue(acc.id, 'debit', e.target.value)}
                          className="h-8 text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          type="number"
                          value={acc.credit || ''}
                          onChange={(e) => updateAccountValue(acc.id, 'credit', e.target.value)}
                          className="h-8 text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => deleteAccount(acc.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-semibold">
                  <tr>
                    <td className="px-4 py-3" colSpan={3}>TOTAL</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(totalDebit)}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{fmt(totalCredit)}</td>
                    <td className="px-4 py-3 text-center">
                      {isBalanced ? <CheckCircle size={18} className="text-green-600 mx-auto" /> : <AlertCircle size={18} className="text-red-600 mx-auto" />}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">
              {trialBalance.filter(a => !a.account_group).length} unclassified accounts
            </p>
            <Button 
              onClick={generateStatements}
              disabled={loading || !isBalanced || trialBalance.filter(a => !a.account_group).length > 0}
              className="bg-green-600 hover:bg-green-700 px-8"
              data-testid="generate-statements-btn"
            >
              {loading ? <RefreshCw size={18} className="mr-2 animate-spin" /> : <BarChart3 size={18} className="mr-2" />}
              Generate Financial Statements
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: P&L and Balance Sheet */}
      {step === 3 && balanceSheet && profitLoss && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back to Trial Balance
            </button>
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
              <CheckCircle size={18} />
              <span className="font-medium">Statements Generated</span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <Scale className="mx-auto mb-2 text-blue-600" size={24} />
              <p className="text-xs text-slate-500 uppercase">Total Assets</p>
              <p className="text-xl font-bold text-slate-900">{fmt(balanceSheet.assets.total)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <Landmark className="mx-auto mb-2 text-purple-600" size={24} />
              <p className="text-xs text-slate-500 uppercase">Total Liabilities</p>
              <p className="text-xl font-bold text-slate-900">{fmt(balanceSheet.liabilities.total)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <TrendingUp className="mx-auto mb-2 text-green-600" size={24} />
              <p className="text-xs text-slate-500 uppercase">Total Revenue</p>
              <p className="text-xl font-bold text-green-600">{fmt(profitLoss.income.total)}</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${profitLoss.net_profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {profitLoss.net_profit >= 0 ? <TrendingUp className="mx-auto mb-2 text-green-600" size={24} /> : <TrendingDown className="mx-auto mb-2 text-red-600" size={24} />}
              <p className="text-xs text-slate-500 uppercase">Net Profit/Loss</p>
              <p className={`text-xl font-bold ${profitLoss.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(profitLoss.net_profit)}</p>
            </div>
          </div>

          {/* Balance Sheet */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-blue-50">
              <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <BarChart3 size={24} />
                Balance Sheet
              </h3>
              <p className="text-sm text-blue-700">As on {balanceSheet.as_on}</p>
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Assets */}
              <div className="p-4">
                <h4 className="font-bold text-slate-800 mb-4 text-lg">ASSETS</h4>
                
                {/* Fixed Assets */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Fixed Assets</h5>
                  {balanceSheet.assets.fixed_assets.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                      <span>{item.name}</span>
                      <span>{fmt(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm py-1 pl-4 text-red-600">
                    <span>Less: Accumulated Depreciation</span>
                    <span>({fmt(balanceSheet.assets.fixed_assets.accumulated_depreciation)})</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                    <span>Net Fixed Assets</span>
                    <span>{fmt(balanceSheet.assets.fixed_assets.net_block)}</span>
                  </div>
                </div>
                
                {/* Current Assets */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Current Assets</h5>
                  {balanceSheet.assets.current_assets.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                      <span>{item.name}</span>
                      <span>{fmt(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                    <span>Total Current Assets</span>
                    <span>{fmt(balanceSheet.assets.current_assets.total)}</span>
                  </div>
                </div>
                
                {/* Total Assets */}
                <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-2 mt-4">
                  <span>TOTAL ASSETS</span>
                  <span className="text-green-700">{fmt(balanceSheet.assets.total)}</span>
                </div>
              </div>
              
              {/* Liabilities */}
              <div className="p-4">
                <h4 className="font-bold text-slate-800 mb-4 text-lg">EQUITY & LIABILITIES</h4>
                
                {/* Equity */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Shareholders Equity</h5>
                  {balanceSheet.liabilities.equity.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                      <span>{item.name}</span>
                      <span className={item.amount < 0 ? 'text-red-600' : ''}>{fmt(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                    <span>Total Equity</span>
                    <span>{fmt(balanceSheet.liabilities.equity.total)}</span>
                  </div>
                </div>
                
                {/* Non-Current Liabilities */}
                {balanceSheet.liabilities.non_current.items.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-slate-700 mb-2">Non-Current Liabilities</h5>
                    {balanceSheet.liabilities.non_current.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                        <span>{item.name}</span>
                        <span>{fmt(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Current Liabilities */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Current Liabilities</h5>
                  {balanceSheet.liabilities.current.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 pl-4">
                      <span>{item.name}</span>
                      <span>{fmt(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t border-slate-200 pt-1 mt-1 pl-4">
                    <span>Total Current Liabilities</span>
                    <span>{fmt(balanceSheet.liabilities.current.total)}</span>
                  </div>
                </div>
                
                {/* Total Liabilities */}
                <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-2 mt-4">
                  <span>TOTAL EQUITY & LIABILITIES</span>
                  <span className="text-blue-700">{fmt(balanceSheet.liabilities.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profit & Loss */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-purple-50">
              <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                <PieChart size={24} />
                Profit & Loss Statement
              </h3>
              <p className="text-sm text-purple-700">For FY {profitLoss.period}</p>
            </div>
            <div className="p-6">
              {/* Income */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                  <TrendingUp className="mr-2 text-green-600" size={20} />
                  Revenue / Income
                </h4>
                {profitLoss.income.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="text-green-700 font-medium">{fmt(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-green-50 px-3 rounded mt-2 font-semibold">
                  <span>Total Revenue</span>
                  <span className="text-green-700">{fmt(profitLoss.income.total)}</span>
                </div>
              </div>
              
              {/* Expenses */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                  <TrendingDown className="mr-2 text-red-600" size={20} />
                  Expenses
                </h4>
                {profitLoss.expenses.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="text-red-600 font-medium">{fmt(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-red-50 px-3 rounded mt-2 font-semibold">
                  <span>Total Expenses</span>
                  <span className="text-red-600">{fmt(profitLoss.expenses.total)}</span>
                </div>
              </div>
              
              {/* Net Profit */}
              <div className={`p-4 rounded-lg ${profitLoss.net_profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">Net Profit / (Loss)</span>
                  <span className={`text-2xl font-bold ${profitLoss.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {fmt(profitLoss.net_profit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              ← Edit Trial Balance
            </Button>
            <Button onClick={() => setStep(4)} className="bg-blue-600 hover:bg-blue-700 px-8">
              Continue to Schedules <ChevronRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Schedules */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(3)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back to Statements
            </button>
            <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <ScrollText size={18} />
              <span className="font-medium">Schedules & Notes</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold mb-4">Schedule Details</h3>
            <p className="text-slate-600 mb-4">
              {schedules && Object.keys(schedules).length > 0 
                ? `${Object.keys(schedules).length} schedules loaded from sample data`
                : 'No detailed schedules available. You can add them manually or they will be auto-generated from the trial balance data.'
              }
            </p>
            
            {schedules.share_capital && (
              <div className="border rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-2">Schedule 1: Share Capital</h4>
                <p className="text-sm text-slate-600">
                  Authorized: {fmt(schedules.share_capital.authorized?.amount)} | 
                  Issued: {fmt(schedules.share_capital.issued?.amount)}
                </p>
              </div>
            )}
            
            {schedules.fixed_assets && (
              <div className="border rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-2">Schedule 3: Fixed Assets</h4>
                <p className="text-sm text-slate-600">
                  {schedules.fixed_assets.length} asset classes loaded
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
              ← Back
            </Button>
            <Button onClick={() => setStep(5)} className="bg-blue-600 hover:bg-blue-700 px-8">
              Continue to Ratios <ChevronRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Ratios */}
      {step === 5 && ratios && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(4)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back
            </button>
            <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
              <Calculator size={18} />
              <span className="font-medium">Financial Ratio Analysis</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Profitability */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="text-green-600" size={20} />
                Profitability Ratios
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Gross Profit Margin</span>
                  <span className="font-semibold text-green-600">{ratios.profitability.gross_profit_margin}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Net Profit Margin</span>
                  <span className="font-semibold text-green-600">{ratios.profitability.net_profit_margin}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Return on Equity</span>
                  <span className="font-semibold text-green-600">{ratios.profitability.return_on_equity}%</span>
                </div>
              </div>
            </div>

            {/* Liquidity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Coins className="text-blue-600" size={20} />
                Liquidity Ratios
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Current Ratio</span>
                  <span className="font-semibold text-blue-600">{ratios.liquidity.current_ratio}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Quick Ratio</span>
                  <span className="font-semibold text-blue-600">{ratios.liquidity.quick_ratio}</span>
                </div>
              </div>
            </div>

            {/* Solvency */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Scale className="text-purple-600" size={20} />
                Solvency Ratios
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Debt-Equity Ratio</span>
                  <span className="font-semibold text-purple-600">{ratios.solvency.debt_equity_ratio}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(4)}>
              ← Back
            </Button>
            <Button onClick={() => { generateCashFlow(); setStep(7); }} className="bg-blue-600 hover:bg-blue-700 px-8">
              Generate Cash Flow <ChevronRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 7: Cash Flow */}
      {step === 7 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(5)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back
            </button>
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
              <Coins size={18} />
              <span className="font-medium">Cash Flow Statement</span>
            </div>
          </div>

          {cashFlow ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-green-50">
                <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
                  <Coins size={24} />
                  Cash Flow Statement
                </h3>
                <p className="text-sm text-green-700">For FY {context.financial_year}</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Operating */}
                <div>
                  <h4 className="font-bold mb-3">A. Cash Flow from Operating Activities</h4>
                  <div className="pl-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Net Profit Before Tax</span>
                      <span>{fmt(cashFlow.operating.net_profit_before_tax)}</span>
                    </div>
                    {cashFlow.operating.adjustments.map((adj, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-slate-600">
                        <span>Add: {adj.name}</span>
                        <span>{fmt(adj.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net Cash from Operating Activities</span>
                      <span className="text-green-600">{fmt(cashFlow.operating.net_cash)}</span>
                    </div>
                  </div>
                </div>

                {/* Investing */}
                <div>
                  <h4 className="font-bold mb-3">B. Cash Flow from Investing Activities</h4>
                  <div className="pl-4">
                    <div className="flex justify-between font-semibold">
                      <span>Net Cash from Investing Activities</span>
                      <span className={cashFlow.investing.net_cash >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {fmt(cashFlow.investing.net_cash)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financing */}
                <div>
                  <h4 className="font-bold mb-3">C. Cash Flow from Financing Activities</h4>
                  <div className="pl-4">
                    <div className="flex justify-between font-semibold">
                      <span>Net Cash from Financing Activities</span>
                      <span className={cashFlow.financing.net_cash >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {fmt(cashFlow.financing.net_cash)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Change */}
                <div className="bg-slate-100 p-4 rounded-lg">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Net Increase/(Decrease) in Cash</span>
                    <span className={cashFlow.net_change >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {fmt(cashFlow.net_change)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Coins size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">Generating cash flow statement...</p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(5)}>
              ← Back
            </Button>
            <Button onClick={() => setStep(8)} className="bg-green-600 hover:bg-green-700 px-8">
              Proceed to Download <ChevronRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 8: Download */}
      {step === 8 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(7)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back
            </button>
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
              <Package size={18} />
              <span className="font-medium">Download Package</span>
            </div>
          </div>

          {/* Success Banner */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <CheckCircle size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Financial Statements Ready!</h2>
                <p className="opacity-90">{context.company_name} | FY {context.financial_year}</p>
              </div>
            </div>
          </div>

          {/* Download Options */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Download size={20} className="text-blue-600" />
              Download Financial Statements Package
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-slate-200 rounded-xl p-5 hover:border-blue-400 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Complete Package</h4>
                    <p className="text-xs text-slate-500">JSON Format</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">All statements, schedules, and ratios in one file</p>
                <Button onClick={exportJSON} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="download-json-btn">
                  <Download size={16} className="mr-2" /> Download JSON
                </Button>
              </div>

              <div className="border-2 border-slate-200 rounded-xl p-5 hover:border-purple-400 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileSpreadsheet className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Trial Balance</h4>
                    <p className="text-xs text-slate-500">Excel Format</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">Working trial balance with classifications</p>
                <Button variant="outline" className="w-full">
                  <Download size={16} className="mr-2" /> Coming Soon
                </Button>
              </div>

              <div className="border-2 border-slate-200 rounded-xl p-5 hover:border-green-400 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ReceiptText className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Tally XML</h4>
                    <p className="text-xs text-slate-500">Ready to Import</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">Import directly into Tally Prime</p>
                <Button variant="outline" className="w-full">
                  <Download size={16} className="mr-2" /> Coming Soon
                </Button>
              </div>
            </div>
          </div>

          {/* Start New */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => { setStep(1); setTrialBalance([]); setBalanceSheet(null); setProfitLoss(null); }}>
              <RefreshCw size={16} className="mr-2" /> Start New Financial Statement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialStatements;
