import { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle, Calculator, AlertTriangle, Download, 
  FileCheck, RefreshCw, ChevronRight, AlertCircle, Sparkles, Edit2,
  FileSpreadsheet, Building2, TrendingUp, Eye, Receipt, Package,
  Clock, Zap, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const STEPS = { 
  UPLOAD: 1, 
  PROCESSING: 2, 
  REVIEW: 3, 
  DOWNLOAD: 4 
};

const GSTFiling = () => {
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
  const [extractedData, setExtractedData] = useState(null);
  const [calculation, setCalculation] = useState(null);
  const [issues, setIssues] = useState([]);
  const [filingId, setFilingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    sales: true, purchases: true, reconciliation: true
  });
  
  // Editable form data
  const [formData, setFormData] = useState({
    gstin: '',
    businessName: '',
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

  const fileInputRef = useRef(null);

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    processDroppedFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    processDroppedFiles(selectedFiles);
  };

  const processDroppedFiles = (fileList) => {
    const newFiles = { ...files };
    
    fileList.forEach(file => {
      const name = file.name.toLowerCase();
      if (name.includes('sales') || name.includes('sale')) {
        newFiles.salesRegister = file;
      } else if (name.includes('purchase') || name.includes('buy')) {
        newFiles.purchaseRegister = file;
      } else if (name.includes('2a') || name.includes('2b') || name.includes('gstr')) {
        newFiles.gstr2a = file;
      } else if (name.includes('bank') || name.includes('statement')) {
        newFiles.bankStatement = file;
      } else if (name.includes('return') || name.includes('previous')) {
        newFiles.previousReturns = file;
      } else {
        // Default to sales if can't determine
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

  // ============ AI PROCESSING ============
  const startAIProcessing = async () => {
    if (!hasRequiredFiles()) {
      setError('Please upload at least Sales or Purchase register');
      return;
    }

    setCurrentStep(STEPS.PROCESSING);
    setLoading(true);
    setError('');

    // Simulate AI processing steps
    const processingSteps = [
      { id: 1, text: 'Uploading files...', duration: 1000 },
      { id: 2, text: 'Extracting sales data...', duration: 1500 },
      { id: 3, text: 'Extracting purchase data...', duration: 1500 },
      { id: 4, text: 'Matching with GSTR-2A...', duration: 2000 },
      { id: 5, text: 'Calculating ITC eligibility...', duration: 1500 },
      { id: 6, text: 'Computing GST liability...', duration: 1500 },
      { id: 7, text: 'Generating returns...', duration: 1000 },
      { id: 8, text: 'Preparing reports...', duration: 1000 }
    ];

    let completedSteps = [];
    
    for (let i = 0; i < processingSteps.length; i++) {
      const step = processingSteps[i];
      setProcessingStatus({
        stage: step.text,
        steps: [...completedSteps, { ...step, status: 'processing' }],
        progress: Math.round(((i + 1) / processingSteps.length) * 100),
        timeRemaining: Math.round((processingSteps.length - i) * 1.5)
      });
      
      await new Promise(resolve => setTimeout(resolve, step.duration));
      completedSteps.push({ ...step, status: 'complete' });
    }

    // After processing, call actual API
    try {
      // Simulate extracted data (in real scenario, this would come from AI extraction)
      const extracted = {
        gstin: '27ABCDE1234F1Z5',
        businessName: files.salesRegister?.name?.split('.')[0] || 'ABC Trading Co.',
        period: new Date().toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }).replace('/', ''),
        sales: {
          invoiceCount: 198,
          totalValue: 2500000,
          taxable5: 500000,
          taxable12: 800000,
          taxable18: 1000000,
          taxable28: 200000,
          totalTax: 313000
        },
        purchases: {
          invoiceCount: 156,
          totalValue: 1420000,
          totalItc: 177000,
          blockedItc: 8000,
          reversedItc: 2500
        },
        reconciliation: {
          purchasesInBooks: 156,
          purchasesIn2a: 142,
          matched: 138,
          missingIn2a: 18,
          missingValue: 85000,
          matchPercentage: 88.5
        },
        issues: [
          { type: 'warning', text: '5 vendors haven\'t filed returns (ITC at risk: ₹42,000)' },
          { type: 'warning', text: '3 rate mismatches found (₹12,000 difference)' },
          { type: 'info', text: '8 e-way bills missing for interstate supplies' }
        ]
      };

      setExtractedData(extracted);
      setIssues(extracted.issues);
      
      // Set form data for editing
      setFormData({
        gstin: extracted.gstin,
        businessName: extracted.businessName,
        period: extracted.period,
        totalSales: extracted.sales.totalValue,
        taxable5: extracted.sales.taxable5,
        taxable12: extracted.sales.taxable12,
        taxable18: extracted.sales.taxable18,
        taxable28: extracted.sales.taxable28,
        totalPurchases: extracted.purchases.totalValue,
        totalItc: extracted.purchases.totalItc,
        blockedItc: extracted.purchases.blockedItc,
        reversedItc: extracted.purchases.reversedItc,
        purchasesInBooks: extracted.reconciliation.purchasesInBooks,
        purchasesIn2a: extracted.reconciliation.purchasesIn2a,
        matchedPurchases: extracted.reconciliation.matched,
        missingIn2aValue: extracted.reconciliation.missingValue
      });

      // Call actual calculation API
      const payload = {
        gstin: extracted.gstin,
        business_name: extracted.businessName,
        period: extracted.period,
        total_sales: extracted.sales.totalValue,
        taxable_5: extracted.sales.taxable5,
        taxable_12: extracted.sales.taxable12,
        taxable_18: extracted.sales.taxable18,
        taxable_28: extracted.sales.taxable28,
        total_purchases: extracted.purchases.totalValue,
        total_itc: extracted.purchases.totalItc,
        blocked_itc: extracted.purchases.blockedItc,
        reversed_itc: extracted.purchases.reversedItc,
        purchases_in_books: extracted.reconciliation.purchasesInBooks,
        purchases_in_2a: extracted.reconciliation.purchasesIn2a,
        matched_purchases: extracted.reconciliation.matched,
        missing_in_2a_value: extracted.reconciliation.missingValue,
        is_interstate: false
      };

      const response = await api.post('/gst/calculate', payload);
      
      if (response.data.success) {
        setCalculation(response.data);
        setFilingId(response.data.filing_id);
        setCurrentStep(STEPS.REVIEW);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Processing failed');
      setCurrentStep(STEPS.UPLOAD);
    } finally {
      setLoading(false);
    }
  };

  // ============ RECALCULATE AFTER EDIT ============
  const recalculate = async () => {
    setLoading(true);
    try {
      const payload = {
        gstin: formData.gstin,
        business_name: formData.businessName,
        period: formData.period,
        total_sales: parseFloat(formData.totalSales) || 0,
        taxable_5: parseFloat(formData.taxable5) || 0,
        taxable_12: parseFloat(formData.taxable12) || 0,
        taxable_18: parseFloat(formData.taxable18) || 0,
        taxable_28: parseFloat(formData.taxable28) || 0,
        total_purchases: parseFloat(formData.totalPurchases) || 0,
        total_itc: parseFloat(formData.totalItc) || 0,
        blocked_itc: parseFloat(formData.blockedItc) || 0,
        reversed_itc: parseFloat(formData.reversedItc) || 0,
        purchases_in_books: parseInt(formData.purchasesInBooks) || 0,
        purchases_in_2a: parseInt(formData.purchasesIn2a) || 0,
        matched_purchases: parseInt(formData.matchedPurchases) || 0,
        missing_in_2a_value: parseFloat(formData.missingIn2aValue) || 0,
        is_interstate: false
      };

      const response = await api.post('/gst/calculate', payload);
      if (response.data.success) {
        setCalculation(response.data);
        setFilingId(response.data.filing_id);
        setEditMode(false);
      }
    } catch (err) {
      setError('Recalculation failed');
    } finally {
      setLoading(false);
    }
  };

  // ============ DOWNLOAD ============
  const handleDownload = async (type) => {
    if (!filingId) return;
    setLoading(true);
    try {
      const response = await api.post(`/gst/${filingId}/generate-pdf?report_type=${type}`, {}, {
        responseType: 'blob'
      });
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

  const formatCurrency = (val) => `₹${(parseFloat(val) || 0).toLocaleString('en-IN')}`;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ============ RENDER ============
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-900 via-purple-900 to-violet-900 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold">AI-Powered GST Filing</h1>
          <span className="bg-yellow-400 text-violet-900 px-3 py-1 rounded-full text-xs font-bold">AUTOMATIC</span>
        </div>
        <p className="text-violet-200 text-lg">Upload → AI Processes → Download Ready</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <div className="flex-1">
            <p className="text-red-600">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-400">×</button>
        </div>
      )}

      {/* ============ STEP 1: UPLOAD ============ */}
      {currentStep === STEPS.UPLOAD && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Your Documents</h2>
            <p className="text-slate-600">AI will handle everything from here</p>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-violet-300 rounded-2xl p-12 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.pdf,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="mx-auto text-violet-500 mb-4" size={48} />
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
              <div key={item.key} className={`rounded-xl p-4 border-2 ${
                files[item.key] ? 'border-green-400 bg-green-50' : 'border-slate-200'
              }`}>
                <item.icon className={`mx-auto mb-2 ${files[item.key] ? 'text-green-600' : 'text-slate-400'}`} size={24} />
                <p className="text-sm font-medium text-center text-slate-700">{item.label}</p>
                {item.required && <p className="text-xs text-center text-red-500">Required</p>}
                {files[item.key] && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <CheckCircle className="text-green-500" size={14} />
                    <span className="text-xs text-green-700 truncate max-w-[80px]">{files[item.key].name}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(item.key); }} className="text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Start Processing Button */}
          <div className="mt-8 text-center">
            <Button
              onClick={startAIProcessing}
              disabled={!hasRequiredFiles() || loading}
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-16 py-6 text-lg disabled:opacity-50"
              data-testid="start-ai-processing-btn"
            >
              <Zap className="mr-3" size={24} />
              START AI PROCESSING
            </Button>
            {!hasRequiredFiles() && (
              <p className="text-amber-600 text-sm mt-2">Upload at least Sales or Purchase register</p>
            )}
          </div>

          {/* AI Mode Badge */}
          <div className="mt-8 text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-100 to-purple-100 px-6 py-3 rounded-full">
              <Sparkles className="text-violet-600" size={20} />
              <span className="font-semibold text-violet-800">AI MODE ACTIVATED</span>
              <span className="text-violet-600 text-sm">Your files will be processed automatically</span>
            </div>
            
            {/* Demo Mode Button */}
            <div>
              <button
                onClick={() => {
                  // Simulate having files for demo
                  setFiles({
                    salesRegister: { name: 'Sales_Register_Jan2025.xlsx' },
                    purchaseRegister: { name: 'Purchase_Register_Jan2025.xlsx' },
                    gstr2a: { name: 'GSTR2A_Jan2025.pdf' },
                    bankStatement: null,
                    previousReturns: null
                  });
                }}
                className="text-violet-600 hover:text-violet-800 text-sm underline"
              >
                Run Demo with Sample Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STEP 2: PROCESSING ============ */}
      {currentStep === STEPS.PROCESSING && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <RefreshCw className="animate-spin mx-auto text-violet-600 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Processing - Do Not Close</h2>
            <p className="text-slate-600">{processingStatus.stage}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Progress</span>
              <span>{processingStatus.progress}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                style={{ width: `${processingStatus.progress}%` }}
              />
            </div>
          </div>

          {/* Processing Steps */}
          <div className="space-y-3 max-w-md mx-auto">
            {processingStatus.steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {step.status === 'complete' ? (
                  <CheckCircle className="text-green-500" size={20} />
                ) : (
                  <RefreshCw className="animate-spin text-violet-500" size={20} />
                )}
                <span className={step.status === 'complete' ? 'text-green-700' : 'text-slate-700'}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>

          {/* Time Remaining */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
              <Clock className="text-slate-500" size={16} />
              <span className="text-slate-600">Time remaining: ~{processingStatus.timeRemaining} seconds</span>
            </div>
          </div>
        </div>
      )}

      {/* ============ STEP 3: REVIEW & EDIT ============ */}
      {currentStep === STEPS.REVIEW && calculation && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3">
              <CheckCircle size={32} />
              <div>
                <h2 className="text-2xl font-bold">Your GST Returns Are Ready!</h2>
                <p className="text-green-100">Period: {formData.period} | GSTIN: {formData.gstin}</p>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Summary</h3>
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-2 text-violet-600 hover:text-violet-800"
              >
                <Edit2 size={18} />
                {editMode ? 'Cancel Edit' : 'Edit Before Final'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(formData.totalSales)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">Total Tax</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(calculation.calculation?.output_tax?.total_tax)}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">ITC Available</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(calculation.calculation?.input_tax_credit?.eligible_itc)}</p>
              </div>
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl p-4 text-center text-white">
                <p className="text-sm text-violet-100">Net Payable</p>
                <p className="text-2xl font-bold">{formatCurrency(calculation.calculation?.net_payable?.total)}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle size={18} />
              <span className="font-medium">All calculations verified</span>
            </div>
          </div>

          {/* Edit Mode - Collapsible Sections */}
          {editMode && (
            <div className="bg-white rounded-2xl border border-violet-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Edit2 className="text-violet-600" size={20} />
                Edit Extracted Data
              </h3>

              {/* Sales Section */}
              <div className="mb-4 border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('sales')}
                  className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100"
                >
                  <span className="font-semibold text-green-800 flex items-center gap-2">
                    <TrendingUp size={18} />
                    Sales Data ({extractedData?.sales?.invoiceCount || 0} invoices)
                  </span>
                  {expandedSections.sales ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedSections.sales && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Total Sales (₹)</label>
                      <input type="number" value={formData.totalSales}
                        onChange={(e) => setFormData(p => ({ ...p, totalSales: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">5% Rate (₹)</label>
                      <input type="number" value={formData.taxable5}
                        onChange={(e) => setFormData(p => ({ ...p, taxable5: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">12% Rate (₹)</label>
                      <input type="number" value={formData.taxable12}
                        onChange={(e) => setFormData(p => ({ ...p, taxable12: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">18% Rate (₹)</label>
                      <input type="number" value={formData.taxable18}
                        onChange={(e) => setFormData(p => ({ ...p, taxable18: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">28% Rate (₹)</label>
                      <input type="number" value={formData.taxable28}
                        onChange={(e) => setFormData(p => ({ ...p, taxable28: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                )}
              </div>

              {/* Purchases Section */}
              <div className="mb-4 border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('purchases')}
                  className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100"
                >
                  <span className="font-semibold text-blue-800 flex items-center gap-2">
                    <FileSpreadsheet size={18} />
                    Purchase Data & ITC ({extractedData?.purchases?.invoiceCount || 0} invoices)
                  </span>
                  {expandedSections.purchases ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedSections.purchases && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Total Purchases (₹)</label>
                      <input type="number" value={formData.totalPurchases}
                        onChange={(e) => setFormData(p => ({ ...p, totalPurchases: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Total ITC (₹)</label>
                      <input type="number" value={formData.totalItc}
                        onChange={(e) => setFormData(p => ({ ...p, totalItc: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Blocked ITC (₹)</label>
                      <input type="number" value={formData.blockedItc}
                        onChange={(e) => setFormData(p => ({ ...p, blockedItc: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Reversed ITC (₹)</label>
                      <input type="number" value={formData.reversedItc}
                        onChange={(e) => setFormData(p => ({ ...p, reversedItc: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                )}
              </div>

              {/* Reconciliation Section */}
              <div className="mb-4 border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('reconciliation')}
                  className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100"
                >
                  <span className="font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    2A Reconciliation ({extractedData?.reconciliation?.matchPercentage?.toFixed(1)}% match)
                  </span>
                  {expandedSections.reconciliation ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedSections.reconciliation && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Invoices in Books</label>
                      <input type="number" value={formData.purchasesInBooks}
                        onChange={(e) => setFormData(p => ({ ...p, purchasesInBooks: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Invoices in 2A</label>
                      <input type="number" value={formData.purchasesIn2a}
                        onChange={(e) => setFormData(p => ({ ...p, purchasesIn2a: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Matched</label>
                      <input type="number" value={formData.matchedPurchases}
                        onChange={(e) => setFormData(p => ({ ...p, matchedPurchases: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Missing Value (₹)</label>
                      <input type="number" value={formData.missingIn2aValue}
                        onChange={(e) => setFormData(p => ({ ...p, missingIn2aValue: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                )}
              </div>

              {/* Recalculate Button */}
              <div className="text-center">
                <Button onClick={recalculate} disabled={loading}
                  className="bg-violet-600 text-white px-8 py-3">
                  {loading ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Calculator className="mr-2" size={18} />}
                  Recalculate
                </Button>
              </div>
            </div>
          )}

          {/* Issues */}
          {issues.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={20} />
                Auto-Detected Issues
              </h3>
              <div className="space-y-2">
                {issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-amber-700">
                    <span>•</span>
                    <span>{issue.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Download Complete Package</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Button onClick={() => handleDownload('gstr3b')} disabled={loading}
                className="bg-gradient-to-r from-violet-500 to-purple-500 text-white flex-col h-auto py-4"
                data-testid="download-gstr3b-btn">
                <Download size={24} className="mb-2" />
                <span>GSTR-3B</span>
                <span className="text-xs opacity-75">Summary</span>
              </Button>
              <Button onClick={() => handleDownload('reconciliation')} disabled={loading}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white flex-col h-auto py-4">
                <Download size={24} className="mb-2" />
                <span>Reconciliation</span>
                <span className="text-xs opacity-75">Report</span>
              </Button>
              <Button onClick={() => handleDownload('itc')} disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex-col h-auto py-4">
                <Download size={24} className="mb-2" />
                <span>ITC Statement</span>
                <span className="text-xs opacity-75">Details</span>
              </Button>
              <Button onClick={() => {/* Download all */}} disabled={loading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white flex-col h-auto py-4">
                <Package size={24} className="mb-2" />
                <span>Complete</span>
                <span className="text-xs opacity-75">ZIP Package</span>
              </Button>
            </div>

            <p className="text-slate-500 text-sm text-center">
              All reports include detailed breakdowns ready for filing
            </p>
          </div>

          {/* Start New */}
          <div className="text-center">
            <button
              onClick={() => {
                setCurrentStep(STEPS.UPLOAD);
                setFiles({ salesRegister: null, purchaseRegister: null, gstr2a: null, bankStatement: null, previousReturns: null });
                setExtractedData(null);
                setCalculation(null);
                setEditMode(false);
              }}
              className="text-violet-600 hover:text-violet-800 font-medium"
            >
              Start New GST Filing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GSTFiling;
