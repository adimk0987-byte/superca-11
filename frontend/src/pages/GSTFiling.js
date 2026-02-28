import { useState, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle, Calculator, AlertTriangle, Download, 
  FileCheck, RefreshCw, ChevronRight, AlertCircle, Sparkles, Edit2,
  FileSpreadsheet, Building2, TrendingUp, Eye, Receipt, Package,
  Clock, Zap, X, ChevronDown, ChevronUp, PenLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const STEPS = { 
  UPLOAD: 1, 
  PROCESSING: 2, 
  REVIEW: 3
};

const STATUS_ICONS = {
  matched: { label: 'Matched', color: 'text-green-700 bg-green-50', dot: 'bg-green-500' },
  missing_in_2a: { label: 'Missing in 2A', color: 'text-amber-700 bg-amber-50', dot: 'bg-amber-500' },
  rate_mismatch: { label: 'Rate Mismatch', color: 'text-red-700 bg-red-50', dot: 'bg-red-500' },
  wrong_hsn: { label: 'Wrong HSN', color: 'text-yellow-700 bg-yellow-50', dot: 'bg-yellow-500' },
  duplicate: { label: 'Duplicate', color: 'text-blue-700 bg-blue-50', dot: 'bg-blue-500' },
  filed_next_month: { label: 'Filed Next Month', color: 'text-purple-700 bg-purple-50', dot: 'bg-purple-500' },
  amount_mismatch: { label: 'Amount Mismatch', color: 'text-orange-700 bg-orange-50', dot: 'bg-orange-500' },
};

const GSTFiling = () => {
  const [mode, setMode] = useState(null); // null = choose, 'ai', 'manual'
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [files, setFiles] = useState({
    salesRegister: null,
    purchaseRegister: null,
    gstr2a: null,
    bankStatement: null,
    previousReturns: null
  });
  const [processingStatus, setProcessingStatus] = useState({
    stage: '',
    steps: [],
    progress: 0,
    timeRemaining: 60
  });
  const [calculation, setCalculation] = useState(null);
  const [issues, setIssues] = useState([]);
  const [filingId, setFilingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState('gstr3b');
  const [expandedSections, setExpandedSections] = useState({
    sales: true, purchases: true, reconciliation: true
  });
  
  // Form data (used by both modes)
  const [formData, setFormData] = useState({
    gstin: '27ABCDE1234F1Z5',
    businessName: 'ABC Trading Co.',
    period: '',
    totalSales: 0,
    taxable5: 0,
    taxable12: 0,
    taxable18: 0,
    taxable28: 0,
    totalPurchases: 0,
    totalItc: 0,
    blockedItc: 0,
    reversedItc: 0,
    purchasesInBooks: 0,
    purchasesIn2a: 0,
    matchedPurchases: 0,
    missingIn2aValue: 0
  });

  // Detailed report data from backend
  const [detailedRecon, setDetailedRecon] = useState(null);
  const [detailedGstr3b, setDetailedGstr3b] = useState(null);
  const [detailedItc, setDetailedItc] = useState(null);

  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    processDroppedFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e) => {
    processDroppedFiles(Array.from(e.target.files));
  };

  const processDroppedFiles = (fileList) => {
    const newFiles = { ...files };
    fileList.forEach(file => {
      const name = file.name.toLowerCase();
      if (name.includes('sales') || name.includes('sale')) newFiles.salesRegister = file;
      else if (name.includes('purchase') || name.includes('buy')) newFiles.purchaseRegister = file;
      else if (name.includes('2a') || name.includes('2b') || name.includes('gstr')) newFiles.gstr2a = file;
      else if (name.includes('bank') || name.includes('statement')) newFiles.bankStatement = file;
      else if (name.includes('return') || name.includes('previous')) newFiles.previousReturns = file;
      else {
        if (!newFiles.salesRegister) newFiles.salesRegister = file;
        else if (!newFiles.purchaseRegister) newFiles.purchaseRegister = file;
      }
    });
    setFiles(newFiles);
  };

  const removeFile = (key) => {
    setFiles(prev => ({ ...prev, [key]: null }));
  };

  const hasRequiredFiles = () => files.salesRegister || files.purchaseRegister;

  // ============ CALL CALCULATE API ============
  const callCalculateAPI = async (payload) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/gst/calculate', payload);
      if (response.data.success) {
        setCalculation(response.data);
        setFilingId(response.data.filing_id);
        setDetailedRecon(response.data.reconciliation);
        setDetailedGstr3b(response.data.detailed_gstr3b);
        setDetailedItc(response.data.detailed_itc);
        setCurrentStep(STEPS.REVIEW);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Calculation failed. Please try again.');
      setCurrentStep(STEPS.UPLOAD);
    } finally {
      setLoading(false);
    }
  };

  // ============ AI PROCESSING ============
  const startAIProcessing = async () => {
    if (!hasRequiredFiles()) {
      setError('Please upload at least Sales or Purchase register');
      return;
    }
    setCurrentStep(STEPS.PROCESSING);
    setLoading(true);
    setError('');

    const processingSteps = [
      { id: 1, text: 'Uploading files...', duration: 800 },
      { id: 2, text: 'Extracting sales data...', duration: 1200 },
      { id: 3, text: 'Extracting purchase data...', duration: 1200 },
      { id: 4, text: 'Matching with GSTR-2A...', duration: 1500 },
      { id: 5, text: 'Calculating ITC eligibility...', duration: 1000 },
      { id: 6, text: 'Computing GST liability...', duration: 1000 },
      { id: 7, text: 'Generating detailed reports...', duration: 800 },
      { id: 8, text: 'Preparing CA-level analysis...', duration: 800 }
    ];

    let completedSteps = [];
    for (let i = 0; i < processingSteps.length; i++) {
      const step = processingSteps[i];
      setProcessingStatus({
        stage: step.text,
        steps: [...completedSteps, { ...step, status: 'processing' }],
        progress: Math.round(((i + 1) / processingSteps.length) * 100),
        timeRemaining: Math.round((processingSteps.length - i) * 1.2)
      });
      await new Promise(resolve => setTimeout(resolve, step.duration));
      completedSteps.push({ ...step, status: 'complete' });
    }

    // Simulated extraction (demo mode)
    const extracted = {
      gstin: '27ABCDE1234F1Z5',
      businessName: files.salesRegister?.name?.split('.')[0] || 'ABC Trading Co.',
      period: new Date().toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }).replace('/', ''),
      sales: { invoiceCount: 198, totalValue: 2500000, taxable5: 500000, taxable12: 800000, taxable18: 1000000, taxable28: 200000 },
      purchases: { invoiceCount: 156, totalValue: 1420000, totalItc: 177000, blockedItc: 8000, reversedItc: 7250 },
      reconciliation: { purchasesInBooks: 156, purchasesIn2a: 142, matched: 138, missingIn2a: 18, missingValue: 85000, matchPercentage: 88.5 },
      issues: [
        { type: 'warning', text: '5 vendors haven\'t filed returns (ITC at risk: Rs.42,000)' },
        { type: 'warning', text: '3 rate mismatches found (Rs.12,000 difference)' },
        { type: 'info', text: '8 e-way bills missing for interstate supplies' }
      ]
    };

    setIssues(extracted.issues);
    const fd = {
      gstin: extracted.gstin, businessName: extracted.businessName, period: extracted.period,
      totalSales: extracted.sales.totalValue, taxable5: extracted.sales.taxable5,
      taxable12: extracted.sales.taxable12, taxable18: extracted.sales.taxable18,
      taxable28: extracted.sales.taxable28, totalPurchases: extracted.purchases.totalValue,
      totalItc: extracted.purchases.totalItc, blockedItc: extracted.purchases.blockedItc,
      reversedItc: extracted.purchases.reversedItc, purchasesInBooks: extracted.reconciliation.purchasesInBooks,
      purchasesIn2a: extracted.reconciliation.purchasesIn2a, matchedPurchases: extracted.reconciliation.matched,
      missingIn2aValue: extracted.reconciliation.missingValue
    };
    setFormData(fd);

    await callCalculateAPI({
      gstin: fd.gstin, business_name: fd.businessName, period: fd.period,
      total_sales: fd.totalSales, taxable_5: fd.taxable5, taxable_12: fd.taxable12,
      taxable_18: fd.taxable18, taxable_28: fd.taxable28, total_purchases: fd.totalPurchases,
      total_itc: fd.totalItc, blocked_itc: fd.blockedItc, reversed_itc: fd.reversedItc,
      purchases_in_books: fd.purchasesInBooks, purchases_in_2a: fd.purchasesIn2a,
      matched_purchases: fd.matchedPurchases, missing_in_2a_value: fd.missingIn2aValue,
      is_interstate: false
    });
  };

  // ============ MANUAL SUBMIT ============
  const submitManualData = async () => {
    const fd = formData;
    if (!fd.gstin || !fd.businessName) {
      setError('GSTIN and Business Name are required');
      return;
    }
    const period = fd.period || new Date().toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }).replace('/', '');
    setFormData(prev => ({ ...prev, period }));

    await callCalculateAPI({
      gstin: fd.gstin, business_name: fd.businessName, period: period,
      total_sales: parseFloat(fd.totalSales) || 0, taxable_5: parseFloat(fd.taxable5) || 0,
      taxable_12: parseFloat(fd.taxable12) || 0, taxable_18: parseFloat(fd.taxable18) || 0,
      taxable_28: parseFloat(fd.taxable28) || 0, total_purchases: parseFloat(fd.totalPurchases) || 0,
      total_itc: parseFloat(fd.totalItc) || 0, blocked_itc: parseFloat(fd.blockedItc) || 0,
      reversed_itc: parseFloat(fd.reversedItc) || 0,
      purchases_in_books: parseInt(fd.purchasesInBooks) || 0,
      purchases_in_2a: parseInt(fd.purchasesIn2a) || 0,
      matched_purchases: parseInt(fd.matchedPurchases) || 0,
      missing_in_2a_value: parseFloat(fd.missingIn2aValue) || 0,
      is_interstate: false
    });
  };

  // ============ RECALCULATE AFTER EDIT ============
  const recalculate = async () => {
    await callCalculateAPI({
      gstin: formData.gstin, business_name: formData.businessName,
      period: formData.period || '012025',
      total_sales: parseFloat(formData.totalSales) || 0,
      taxable_5: parseFloat(formData.taxable5) || 0, taxable_12: parseFloat(formData.taxable12) || 0,
      taxable_18: parseFloat(formData.taxable18) || 0, taxable_28: parseFloat(formData.taxable28) || 0,
      total_purchases: parseFloat(formData.totalPurchases) || 0,
      total_itc: parseFloat(formData.totalItc) || 0,
      blocked_itc: parseFloat(formData.blockedItc) || 0,
      reversed_itc: parseFloat(formData.reversedItc) || 0,
      purchases_in_books: parseInt(formData.purchasesInBooks) || 0,
      purchases_in_2a: parseInt(formData.purchasesIn2a) || 0,
      matched_purchases: parseInt(formData.matchedPurchases) || 0,
      missing_in_2a_value: parseFloat(formData.missingIn2aValue) || 0,
      is_interstate: false
    });
    setEditMode(false);
  };

  // ============ DOWNLOAD ============
  const handleDownload = async (type) => {
    if (!filingId) return;
    setLoading(true);
    try {
      const response = await api.post(`/gst/${filingId}/generate-pdf?report_type=${type}`, {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GST_${type}_${formData.period}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Download failed');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val) => `Rs.${(parseFloat(val) || 0).toLocaleString('en-IN')}`;
  const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const resetAll = () => {
    setMode(null);
    setCurrentStep(STEPS.UPLOAD);
    setFiles({ salesRegister: null, purchaseRegister: null, gstr2a: null, bankStatement: null, previousReturns: null });
    setCalculation(null);
    setEditMode(false);
    setDetailedRecon(null);
    setDetailedGstr3b(null);
    setDetailedItc(null);
    setFormData({
      gstin: '27ABCDE1234F1Z5', businessName: 'ABC Trading Co.', period: '',
      totalSales: 0, taxable5: 0, taxable12: 0, taxable18: 0, taxable28: 0,
      totalPurchases: 0, totalItc: 0, blockedItc: 0, reversedItc: 0,
      purchasesInBooks: 0, purchasesIn2a: 0, matchedPurchases: 0, missingIn2aValue: 0
    });
    setIssues([]);
    setError('');
  };

  // ============ RENDER ============
  return (
    <div className="space-y-6" data-testid="gst-filing-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>GST Return Filing</h1>
          <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">CA-LEVEL</span>
        </div>
        <p className="text-slate-300 text-lg">Detailed GSTR-3B computation, GSTR-2A reconciliation & ITC analysis</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" data-testid="error-banner">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <p className="text-red-600 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ============ MODE SELECTION ============ */}
      {mode === null && currentStep === STEPS.UPLOAD && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8" data-testid="mode-selection">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Choose Your Filing Mode</h2>
          <p className="text-slate-500 text-center mb-8">Upload documents for AI processing or enter data manually</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => setMode('ai')}
              data-testid="mode-ai-btn"
              className="border-2 border-slate-200 rounded-2xl p-8 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <Sparkles className="mx-auto text-emerald-500 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI Mode (Automatic)</h3>
              <p className="text-slate-500 text-sm">Upload documents, AI extracts & calculates everything</p>
            </button>
            <button
              onClick={() => setMode('manual')}
              data-testid="mode-manual-btn"
              className="border-2 border-slate-200 rounded-2xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <PenLine className="mx-auto text-blue-500 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Manual Entry</h3>
              <p className="text-slate-500 text-sm">Enter sales, purchase & ITC data directly</p>
            </button>
          </div>
        </div>
      )}

      {/* ============ AI MODE: UPLOAD ============ */}
      {mode === 'ai' && currentStep === STEPS.UPLOAD && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8" data-testid="ai-upload-section">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Your Documents</h2>
            <p className="text-slate-600">AI will extract data, reconcile & generate detailed reports</p>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            data-testid="file-drop-zone"
            className="border-2 border-dashed border-emerald-300 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all"
          >
            <input ref={fileInputRef} type="file" multiple accept=".xlsx,.xls,.pdf,.csv" onChange={handleFileSelect} className="hidden" />
            <Upload className="mx-auto text-emerald-500 mb-4" size={48} />
            <p className="text-xl font-semibold text-slate-900 mb-2">Drag & Drop or Browse</p>
            <p className="text-slate-500">Excel, PDF, or CSV files</p>
          </div>

          {/* File Types Guide */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: 'salesRegister', label: 'Sales Register', icon: TrendingUp, required: true },
              { key: 'purchaseRegister', label: 'Purchase Register', icon: FileSpreadsheet, required: true },
              { key: 'gstr2a', label: 'GSTR-2A/2B', icon: FileCheck, required: false },
              { key: 'bankStatement', label: 'Bank Statement', icon: Building2, required: false },
              { key: 'previousReturns', label: 'Previous Returns', icon: Receipt, required: false }
            ].map(item => (
              <div key={item.key} className={`rounded-xl p-4 border-2 ${files[item.key] ? 'border-green-400 bg-green-50' : 'border-slate-200'}`}>
                <item.icon className={`mx-auto mb-2 ${files[item.key] ? 'text-green-600' : 'text-slate-400'}`} size={24} />
                <p className="text-sm font-medium text-center text-slate-700">{item.label}</p>
                {item.required && <p className="text-xs text-center text-red-500">Required</p>}
                {files[item.key] && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <CheckCircle className="text-green-500" size={14} />
                    <span className="text-xs text-green-700 truncate max-w-[80px]">{files[item.key].name}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(item.key); }} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Button onClick={startAIProcessing} disabled={!hasRequiredFiles() || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-16 py-6 text-lg disabled:opacity-50"
              data-testid="start-ai-processing-btn">
              <Zap className="mr-3" size={24} /> START AI PROCESSING
            </Button>
            {!hasRequiredFiles() && <p className="text-amber-600 text-sm">Upload at least Sales or Purchase register</p>}
            <button onClick={() => {
              setFiles({
                salesRegister: { name: 'Sales_Register_Jan2025.xlsx' },
                purchaseRegister: { name: 'Purchase_Register_Jan2025.xlsx' },
                gstr2a: { name: 'GSTR2A_Jan2025.pdf' },
                bankStatement: null, previousReturns: null
              });
            }} className="text-emerald-600 hover:text-emerald-800 text-sm underline" data-testid="demo-data-btn">
              Run Demo with Sample Data
            </button>
            <button onClick={() => setMode(null)} className="text-slate-500 hover:text-slate-700 text-sm">Back to mode selection</button>
          </div>
        </div>
      )}

      {/* ============ MANUAL MODE: DATA ENTRY ============ */}
      {mode === 'manual' && currentStep === STEPS.UPLOAD && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8" data-testid="manual-entry-section">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Manual Data Entry</h2>
              <p className="text-slate-500">Enter your GST data directly for detailed computation</p>
            </div>
            <button onClick={() => setMode(null)} className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1">
              <ChevronRight size={14} className="rotate-180" /> Back
            </button>
          </div>

          {/* Business Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
              <input type="text" value={formData.gstin} onChange={(e) => setFormData(p => ({ ...p, gstin: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="27XXXXX0000X1Z5" data-testid="manual-gstin-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
              <input type="text" value={formData.businessName} onChange={(e) => setFormData(p => ({ ...p, businessName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Your Business Name" data-testid="manual-business-name-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Period (MMYYYY)</label>
              <input type="text" value={formData.period} onChange={(e) => setFormData(p => ({ ...p, period: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="012025" data-testid="manual-period-input" />
            </div>
          </div>

          {/* Sales Data */}
          <div className="mb-6 border rounded-xl overflow-hidden">
            <div className="p-4 bg-emerald-50 border-b border-emerald-200">
              <h3 className="font-semibold text-emerald-800 flex items-center gap-2"><TrendingUp size={18} /> Sales Data Entry</h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Total Sales (Rs.)</label>
                <input type="number" value={formData.totalSales} onChange={(e) => setFormData(p => ({ ...p, totalSales: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" data-testid="manual-total-sales" />
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className="block text-sm text-slate-600 mb-2 font-medium">Rate-wise Split</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'taxable5', label: '5%' },
                    { key: 'taxable12', label: '12%' },
                    { key: 'taxable18', label: '18%' },
                    { key: 'taxable28', label: '28%' }
                  ].map(r => (
                    <div key={r.key}>
                      <label className="block text-xs text-slate-500 mb-1">{r.label} Taxable</label>
                      <input type="number" value={formData[r.key]}
                        onChange={(e) => setFormData(p => ({ ...p, [r.key]: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        data-testid={`manual-${r.key}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Data */}
          <div className="mb-6 border rounded-xl overflow-hidden">
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2"><FileSpreadsheet size={18} /> Purchase Data & ITC</h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Total Purchases (Rs.)</label>
                <input type="number" value={formData.totalPurchases} onChange={(e) => setFormData(p => ({ ...p, totalPurchases: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" data-testid="manual-total-purchases" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">ITC Available (Rs.)</label>
                <input type="number" value={formData.totalItc} onChange={(e) => setFormData(p => ({ ...p, totalItc: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" data-testid="manual-total-itc" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Blocked ITC (Rs.)</label>
                <input type="number" value={formData.blockedItc} onChange={(e) => setFormData(p => ({ ...p, blockedItc: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" data-testid="manual-blocked-itc" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Reversed ITC (Rs.)</label>
                <input type="number" value={formData.reversedItc} onChange={(e) => setFormData(p => ({ ...p, reversedItc: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" data-testid="manual-reversed-itc" />
              </div>
            </div>
          </div>

          {/* Reconciliation Data */}
          <div className="mb-6 border rounded-xl overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-200">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle size={18} /> 2A Reconciliation (Optional)</h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Invoices in Books</label>
                <input type="number" value={formData.purchasesInBooks} onChange={(e) => setFormData(p => ({ ...p, purchasesInBooks: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" data-testid="manual-purchases-in-books" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Invoices in 2A</label>
                <input type="number" value={formData.purchasesIn2a} onChange={(e) => setFormData(p => ({ ...p, purchasesIn2a: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" data-testid="manual-purchases-in-2a" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Matched</label>
                <input type="number" value={formData.matchedPurchases} onChange={(e) => setFormData(p => ({ ...p, matchedPurchases: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" data-testid="manual-matched-purchases" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Missing Value (Rs.)</label>
                <input type="number" value={formData.missingIn2aValue} onChange={(e) => setFormData(p => ({ ...p, missingIn2aValue: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" data-testid="manual-missing-value" />
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button onClick={submitManualData} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-16 py-5 text-lg"
              data-testid="manual-calculate-btn">
              {loading ? <RefreshCw className="animate-spin mr-2" size={20} /> : <Calculator className="mr-2" size={20} />}
              Calculate & Generate Reports
            </Button>
          </div>
        </div>
      )}

      {/* ============ STEP 2: PROCESSING ============ */}
      {currentStep === STEPS.PROCESSING && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8" data-testid="processing-section">
          <div className="text-center mb-8">
            <RefreshCw className="animate-spin mx-auto text-emerald-600 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Processing - Do Not Close</h2>
            <p className="text-slate-600">{processingStatus.stage}</p>
          </div>
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Progress</span><span>{processingStatus.progress}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${processingStatus.progress}%` }} />
            </div>
          </div>
          <div className="space-y-3 max-w-md mx-auto">
            {processingStatus.steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {step.status === 'complete'
                  ? <CheckCircle className="text-green-500" size={20} />
                  : <RefreshCw className="animate-spin text-emerald-500" size={20} />}
                <span className={step.status === 'complete' ? 'text-green-700' : 'text-slate-700'}>{step.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
              <Clock className="text-slate-500" size={16} />
              <span className="text-slate-600">~{processingStatus.timeRemaining}s remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* ============ STEP 3: REVIEW WITH DETAILED REPORTS ============ */}
      {currentStep === STEPS.REVIEW && calculation && (
        <div className="space-y-6" data-testid="review-section">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3">
              <CheckCircle size={32} />
              <div>
                <h2 className="text-2xl font-bold">GST Returns Ready - Detailed Reports Generated</h2>
                <p className="text-emerald-100">Period: {formData.period} | GSTIN: {formData.gstin} | {formData.businessName}</p>
              </div>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center" data-testid="summary-total-sales">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Sales</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{fmt(formData.totalSales)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center" data-testid="summary-total-tax">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Output Tax</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{fmt(calculation.calculation?.output_tax?.total_tax)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center" data-testid="summary-itc">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Net ITC Eligible</p>
              <p className="text-xl font-bold text-purple-700 mt-1">{fmt(calculation.calculation?.input_tax_credit?.eligible_itc)}</p>
            </div>
            <div className="bg-emerald-600 rounded-xl p-4 text-center text-white" data-testid="summary-net-payable">
              <p className="text-xs text-emerald-100 uppercase tracking-wide">Net Payable</p>
              <p className="text-xl font-bold mt-1">{fmt(calculation.calculation?.net_payable?.total)}</p>
            </div>
          </div>

          {/* Edit Mode Toggle + Issues */}
          <div className="flex items-center gap-4">
            <button onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 font-medium text-sm"
              data-testid="toggle-edit-btn">
              <Edit2 size={16} /> {editMode ? 'Cancel Edit' : 'Edit Data & Recalculate'}
            </button>
          </div>

          {/* Edit Panel */}
          {editMode && (
            <div className="bg-white rounded-2xl border border-emerald-200 p-6" data-testid="edit-panel">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Edit2 className="text-emerald-600" size={20} /> Edit Data</h3>
              {/* Sales */}
              <div className="mb-4 border rounded-xl overflow-hidden">
                <button onClick={() => toggleSection('sales')} className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100">
                  <span className="font-semibold text-green-800 flex items-center gap-2 text-sm"><TrendingUp size={16} /> Sales Data</span>
                  {expandedSections.sales ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expandedSections.sales && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { key: 'totalSales', label: 'Total Sales' },
                      { key: 'taxable5', label: '5% Taxable' },
                      { key: 'taxable12', label: '12% Taxable' },
                      { key: 'taxable18', label: '18% Taxable' },
                      { key: 'taxable28', label: '28% Taxable' }
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                        <input type="number" value={formData[f.key]}
                          onChange={(e) => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-2 py-1.5 border rounded-lg text-sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Purchases */}
              <div className="mb-4 border rounded-xl overflow-hidden">
                <button onClick={() => toggleSection('purchases')} className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100">
                  <span className="font-semibold text-blue-800 flex items-center gap-2 text-sm"><FileSpreadsheet size={16} /> Purchase & ITC</span>
                  {expandedSections.purchases ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expandedSections.purchases && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'totalPurchases', label: 'Total Purchases' },
                      { key: 'totalItc', label: 'Total ITC' },
                      { key: 'blockedItc', label: 'Blocked ITC' },
                      { key: 'reversedItc', label: 'Reversed ITC' }
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                        <input type="number" value={formData[f.key]}
                          onChange={(e) => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-2 py-1.5 border rounded-lg text-sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-center">
                <Button onClick={recalculate} disabled={loading} className="bg-emerald-600 text-white px-8 py-2.5" data-testid="recalculate-btn">
                  {loading ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Calculator className="mr-2" size={16} />} Recalculate
                </Button>
              </div>
            </div>
          )}

          {/* Issues */}
          {issues.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4" data-testid="issues-panel">
              <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2 text-sm"><AlertTriangle size={16} /> Auto-Detected Issues</h3>
              <div className="space-y-1">
                {issues.map((issue, idx) => (
                  <p key={idx} className="text-amber-700 text-sm flex items-start gap-2">
                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {issue.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* ============ DETAILED REPORT TABS ============ */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="detailed-reports">
            <div className="border-b border-slate-200 flex">
              {[
                { id: 'gstr3b', label: 'GSTR-3B Computation', icon: Calculator },
                { id: 'recon', label: '2A Reconciliation', icon: FileCheck },
                { id: 'itc', label: 'ITC Statement', icon: Eye }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveReportTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                  className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeReportTab === tab.id
                      ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}>
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* ===== GSTR-3B TAB ===== */}
              {activeReportTab === 'gstr3b' && detailedGstr3b && (
                <div className="space-y-6" data-testid="gstr3b-detail">
                  <h3 className="text-lg font-bold text-slate-900">GSTR-3B Detailed Computation</h3>

                  {/* Rate-wise Breakdown */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Section A: Outward Supplies - Rate-wise Breakdown</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="rate-wise-table">
                        <thead>
                          <tr className="bg-slate-800 text-white">
                            <th className="px-3 py-2 text-left">Rate</th>
                            <th className="px-3 py-2 text-right">Taxable Value</th>
                            <th className="px-3 py-2 text-right">CGST</th>
                            <th className="px-3 py-2 text-right">SGST</th>
                            <th className="px-3 py-2 text-right">IGST</th>
                            <th className="px-3 py-2 text-right">Total Tax</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailedGstr3b.rate_wise_breakdown?.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium">{row.rate}</td>
                              <td className="px-3 py-2 text-right">{fmt(row.taxable_value)}</td>
                              <td className="px-3 py-2 text-right">{fmt(row.cgst)}</td>
                              <td className="px-3 py-2 text-right">{fmt(row.sgst)}</td>
                              <td className="px-3 py-2 text-right">{fmt(row.igst)}</td>
                              <td className="px-3 py-2 text-right font-medium">{fmt(row.total_tax)}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 font-bold">
                            <td className="px-3 py-2">TOTAL</td>
                            <td className="px-3 py-2 text-right">{fmt(detailedGstr3b.totals?.taxable_value)}</td>
                            <td className="px-3 py-2 text-right">{fmt(detailedGstr3b.totals?.cgst)}</td>
                            <td className="px-3 py-2 text-right">{fmt(detailedGstr3b.totals?.sgst)}</td>
                            <td className="px-3 py-2 text-right">{fmt(detailedGstr3b.totals?.igst)}</td>
                            <td className="px-3 py-2 text-right">{fmt(detailedGstr3b.totals?.total_tax)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ITC Computation */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Section B: ITC Calculation with Reversals</h4>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm font-mono" data-testid="itc-computation">
                      <div className="flex justify-between"><span>ITC Available (Books)</span><span className="font-bold">{fmt(detailedGstr3b.itc_computation?.itc_from_books)}</span></div>
                      <div className="flex justify-between text-red-600"><span>Less: Rule 42 Reversal</span><span>({fmt(detailedGstr3b.itc_computation?.less_rule_42)})</span></div>
                      <div className="flex justify-between text-red-600"><span>Less: Rule 43 Reversal</span><span>({fmt(detailedGstr3b.itc_computation?.less_rule_43)})</span></div>
                      <div className="flex justify-between text-red-600"><span>Less: Section 17(5) Blocked</span><span>({fmt(detailedGstr3b.itc_computation?.less_section_17_5)})</span></div>
                      <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-emerald-700">
                        <span>Net ITC Eligible</span><span>{fmt(detailedGstr3b.itc_computation?.net_itc_eligible)}</span>
                      </div>
                    </div>
                  </div>

                  {/* HSN Summary */}
                  {detailedGstr3b.hsn_summary?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Section C: HSN-wise Summary</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-700 text-white">
                              <th className="px-3 py-2 text-left">HSN</th>
                              <th className="px-3 py-2 text-left">Description</th>
                              <th className="px-3 py-2 text-center">UQC</th>
                              <th className="px-3 py-2 text-right">Qty</th>
                              <th className="px-3 py-2 text-right">Taxable Value</th>
                              <th className="px-3 py-2 text-center">Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailedGstr3b.hsn_summary.map((h, idx) => (
                              <tr key={idx} className="border-b border-slate-100">
                                <td className="px-3 py-2 font-medium">{h.hsn}</td>
                                <td className="px-3 py-2">{h.description}</td>
                                <td className="px-3 py-2 text-center">{h.uqc}</td>
                                <td className="px-3 py-2 text-right">{h.qty?.toLocaleString('en-IN')}</td>
                                <td className="px-3 py-2 text-right">{fmt(h.taxable_value)}</td>
                                <td className="px-3 py-2 text-center">{h.rate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Net Payable */}
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <h4 className="text-sm font-semibold text-emerald-800 mb-2">Net Tax Payable</h4>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div><p className="text-xs text-slate-500">CGST</p><p className="font-bold text-slate-900">{fmt(detailedGstr3b.net_payable?.cgst)}</p></div>
                      <div><p className="text-xs text-slate-500">SGST</p><p className="font-bold text-slate-900">{fmt(detailedGstr3b.net_payable?.sgst)}</p></div>
                      <div><p className="text-xs text-slate-500">IGST</p><p className="font-bold text-slate-900">{fmt(detailedGstr3b.net_payable?.igst)}</p></div>
                      <div className="bg-emerald-600 rounded-lg p-2 text-white"><p className="text-xs text-emerald-100">Total</p><p className="font-bold text-lg">{fmt(detailedGstr3b.net_payable?.total)}</p></div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== 2A RECONCILIATION TAB ===== */}
              {activeReportTab === 'recon' && detailedRecon && (
                <div className="space-y-6" data-testid="recon-detail">
                  <h3 className="text-lg font-bold text-slate-900">GSTR-2A Reconciliation Report</h3>

                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">In Books</p>
                      <p className="text-lg font-bold">{detailedRecon.summary?.total_invoices_in_books}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-600">Matched</p>
                      <p className="text-lg font-bold text-green-700">{detailedRecon.summary?.matched_count}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-red-600">Missing/Issues</p>
                      <p className="text-lg font-bold text-red-700">{detailedRecon.summary?.missing_in_2a_count}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-amber-600">Match %</p>
                      <p className="text-lg font-bold text-amber-700">{detailedRecon.summary?.match_percentage}%</p>
                    </div>
                  </div>

                  {/* Invoice-level Table */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Invoice-Level Detail</h4>
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-xs" data-testid="recon-invoice-table">
                        <thead>
                          <tr className="bg-slate-800 text-white">
                            <th className="px-2 py-2 text-left">Vendor Name</th>
                            <th className="px-2 py-2 text-left">GSTIN</th>
                            <th className="px-2 py-2 text-left">Invoice No.</th>
                            <th className="px-2 py-2 text-left">Date</th>
                            <th className="px-2 py-2 text-right">Amount</th>
                            <th className="px-2 py-2 text-right">ITC</th>
                            <th className="px-2 py-2 text-center">Status</th>
                            <th className="px-2 py-2 text-left">Reason</th>
                            <th className="px-2 py-2 text-left">Action Required</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailedRecon.invoices?.map((inv, idx) => {
                            const statusInfo = STATUS_ICONS[inv.status] || STATUS_ICONS.matched;
                            return (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-2 py-1.5 font-medium">{inv.vendor_name}</td>
                                <td className="px-2 py-1.5 font-mono text-slate-500">{inv.gstin?.substring(0, 10)}...</td>
                                <td className="px-2 py-1.5">{inv.invoice_no}</td>
                                <td className="px-2 py-1.5">{inv.date}</td>
                                <td className="px-2 py-1.5 text-right">{fmt(inv.amount)}</td>
                                <td className="px-2 py-1.5 text-right">{fmt(inv.itc)}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                    {statusInfo.label}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 text-slate-600">{inv.reason}</td>
                                <td className="px-2 py-1.5 text-slate-600">{inv.action}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Vendor-wise ITC at Risk */}
                  {detailedRecon.vendor_wise?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Vendor-wise ITC at Risk</h4>
                      <div className="overflow-x-auto border rounded-xl">
                        <table className="w-full text-xs" data-testid="vendor-risk-table">
                          <thead>
                            <tr className="bg-amber-600 text-white">
                              <th className="px-3 py-2 text-left">Vendor Name</th>
                              <th className="px-3 py-2 text-left">GSTIN</th>
                              <th className="px-3 py-2 text-right">Missing Amt</th>
                              <th className="px-3 py-2 text-right">ITC at Risk</th>
                              <th className="px-3 py-2 text-center">Status</th>
                              <th className="px-3 py-2 text-left">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailedRecon.vendor_wise.map((v, idx) => (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-amber-50/50">
                                <td className="px-3 py-2 font-medium">{v.vendor_name}</td>
                                <td className="px-3 py-2 font-mono text-slate-500">{v.gstin?.substring(0, 10)}...</td>
                                <td className="px-3 py-2 text-right">{fmt(v.missing_amount)}</td>
                                <td className="px-3 py-2 text-right font-bold text-red-600">{fmt(v.itc_at_risk)}</td>
                                <td className="px-3 py-2 text-center text-amber-700">{v.status}</td>
                                <td className="px-3 py-2 text-slate-600">{v.action}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {detailedRecon.recommendations?.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Recommendations</h4>
                      {detailedRecon.recommendations.map((r, i) => (
                        <p key={i} className="text-blue-700 text-sm flex items-start gap-2 mb-1">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" /> {r}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ===== ITC STATEMENT TAB ===== */}
              {activeReportTab === 'itc' && detailedItc && (
                <div className="space-y-6" data-testid="itc-detail">
                  <h3 className="text-lg font-bold text-slate-900">Input Tax Credit Statement</h3>

                  {/* Net ITC Summary */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm font-mono" data-testid="itc-net-summary">
                    <div className="flex justify-between"><span>ITC Available (Books)</span><span className="font-bold">{fmt(detailedItc.net_itc_summary?.itc_available_books)}</span></div>
                    <div className="flex justify-between text-red-600"><span>Less: Rule 42 Reversal</span><span>({fmt(detailedItc.net_itc_summary?.less_rule_42)})</span></div>
                    <div className="flex justify-between text-red-600"><span>Less: Rule 43 Reversal</span><span>({fmt(detailedItc.net_itc_summary?.less_rule_43)})</span></div>
                    <div className="flex justify-between text-red-600"><span>Less: Section 17(5)</span><span>({fmt(detailedItc.net_itc_summary?.less_section_17_5)})</span></div>
                    <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-emerald-700 text-base">
                      <span>Net ITC Eligible</span><span>{fmt(detailedItc.net_itc_summary?.net_eligible)}</span>
                    </div>
                  </div>

                  {/* Section 17(5) Blocked Breakdown */}
                  {detailedItc.blocked_breakdown?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Section 17(5) - Blocked Credits Breakdown</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="blocked-breakdown-table">
                          <thead>
                            <tr className="bg-red-700 text-white">
                              <th className="px-3 py-2 text-left">Section</th>
                              <th className="px-3 py-2 text-left">Description</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailedItc.blocked_breakdown.map((b, idx) => (
                              <tr key={idx} className="border-b border-slate-100">
                                <td className="px-3 py-2 font-medium">{b.section}</td>
                                <td className="px-3 py-2">{b.description}</td>
                                <td className="px-3 py-2 text-right font-medium text-red-600">{fmt(b.amount)}</td>
                              </tr>
                            ))}
                            <tr className="bg-red-50 font-bold">
                              <td className="px-3 py-2" colSpan={2}>Total Blocked ITC</td>
                              <td className="px-3 py-2 text-right text-red-700">{fmt(detailedItc.blocked_itc_total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Rule 42/43 Reversal Breakdown */}
                  {detailedItc.reversal_breakdown?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Rule 42 & 43 - Reversals</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="reversal-breakdown-table">
                          <thead>
                            <tr className="bg-amber-600 text-white">
                              <th className="px-3 py-2 text-left">Rule</th>
                              <th className="px-3 py-2 text-left">Description</th>
                              <th className="px-3 py-2 text-left">Formula</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailedItc.reversal_breakdown.map((r, idx) => (
                              <tr key={idx} className="border-b border-slate-100">
                                <td className="px-3 py-2 font-medium">{r.rule}</td>
                                <td className="px-3 py-2">{r.description}</td>
                                <td className="px-3 py-2 text-slate-500 text-xs">{r.formula}</td>
                                <td className="px-3 py-2 text-right font-medium text-amber-600">{fmt(r.amount)}</td>
                              </tr>
                            ))}
                            <tr className="bg-amber-50 font-bold">
                              <td className="px-3 py-2" colSpan={3}>Total Reversals</td>
                              <td className="px-3 py-2 text-right text-amber-700">{fmt(detailedItc.reversed_itc_total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Download Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6" data-testid="download-section">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Download Detailed Reports (PDF)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Button onClick={() => handleDownload('gstr3b')} disabled={loading}
                className="bg-slate-800 hover:bg-slate-900 text-white flex-col h-auto py-4"
                data-testid="download-gstr3b-btn">
                <Download size={22} className="mb-2" />
                <span className="text-sm">GSTR-3B</span>
                <span className="text-[10px] opacity-75">Detailed Computation</span>
              </Button>
              <Button onClick={() => handleDownload('reconciliation')} disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white flex-col h-auto py-4"
                data-testid="download-recon-btn">
                <Download size={22} className="mb-2" />
                <span className="text-sm">Reconciliation</span>
                <span className="text-[10px] opacity-75">2A Invoice-Level</span>
              </Button>
              <Button onClick={() => handleDownload('itc')} disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-col h-auto py-4"
                data-testid="download-itc-btn">
                <Download size={22} className="mb-2" />
                <span className="text-sm">ITC Statement</span>
                <span className="text-[10px] opacity-75">17(5) + Rule 42/43</span>
              </Button>
              <Button onClick={() => { handleDownload('gstr3b'); handleDownload('reconciliation'); handleDownload('itc'); }}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-col h-auto py-4"
                data-testid="download-all-btn">
                <Package size={22} className="mb-2" />
                <span className="text-sm">All Reports</span>
                <span className="text-[10px] opacity-75">Complete Package</span>
              </Button>
            </div>
            <p className="text-slate-400 text-xs text-center">All reports include line-by-line detail ready for CA review and filing</p>
          </div>

          {/* Start New */}
          <div className="text-center">
            <button onClick={resetAll} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm" data-testid="start-new-btn">
              Start New GST Filing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GSTFiling;
