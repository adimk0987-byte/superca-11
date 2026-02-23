import { useState, useRef } from 'react';
import { 
  Calculator, Download, FileText, CheckCircle, Sparkles, Plus, Trash2,
  AlertCircle, RefreshCw, Upload, IndianRupee, Users, Building2,
  Calendar, Search, Filter, Eye, X, Check, FileSpreadsheet, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

// TDS Sections with rates
const TDS_SECTIONS = [
  { code: '192', name: 'Salary', rate: 'As per slab', threshold: 0, description: 'TDS on Salary' },
  { code: '194A', name: 'Interest (other than securities)', rate: 10, threshold: 40000, description: 'TDS on Interest from banks, deposits' },
  { code: '194C', name: 'Contractor Payment', rate: 1, rate_company: 2, threshold: 30000, annual_threshold: 100000, description: 'TDS on Payment to Contractors' },
  { code: '194H', name: 'Commission/Brokerage', rate: 5, threshold: 15000, description: 'TDS on Commission or Brokerage' },
  { code: '194I', name: 'Rent', rate_land: 10, rate_plant: 2, threshold: 240000, description: 'TDS on Rent' },
  { code: '194J', name: 'Professional/Technical Fees', rate: 10, rate_tech: 2, threshold: 30000, description: 'TDS on Professional or Technical Services' },
  { code: '194Q', name: 'Purchase of Goods', rate: 0.1, threshold: 5000000, description: 'TDS on Purchase of Goods above 50L' },
  { code: '194B', name: 'Lottery/Game Winnings', rate: 30, threshold: 10000, description: 'TDS on Lottery/Crossword/Game winnings' },
  { code: '194D', name: 'Insurance Commission', rate: 5, threshold: 15000, description: 'TDS on Insurance Commission' },
  { code: '195', name: 'Non-Resident Payments', rate: 'Varies', threshold: 0, description: 'TDS on payments to non-residents' }
];

// Form types
const FORM_TYPES = [
  { value: '24Q', label: 'Form 24Q - Salary TDS', description: 'Quarterly statement for TDS on Salary' },
  { value: '26Q', label: 'Form 26Q - Non-Salary TDS', description: 'Quarterly statement for TDS other than Salary' },
  { value: '27Q', label: 'Form 27Q - NRI Payments', description: 'Quarterly statement for TDS on Non-Resident payments' },
  { value: '27EQ', label: 'Form 27EQ - TCS', description: 'Quarterly statement for Tax Collected at Source' }
];

// Quarters
const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Apr-Jun)', months: 'April - June' },
  { value: 'Q2', label: 'Q2 (Jul-Sep)', months: 'July - September' },
  { value: 'Q3', label: 'Q3 (Oct-Dec)', months: 'October - December' },
  { value: 'Q4', label: 'Q4 (Jan-Mar)', months: 'January - March' }
];

const TDSFiling = () => {
  // Mode State
  const [mode, setMode] = useState('manual'); // 'manual' or 'ai'
  const [step, setStep] = useState(1); // 1: Setup, 2: Entries, 3: Review, 4: Export
  
  // Filing Context
  const [filingContext, setFilingContext] = useState({
    form_type: '26Q',
    financial_year: '2025-26',
    quarter: 'Q3',
    tan: '',
    deductor_name: '',
    deductor_pan: ''
  });
  
  // TDS Entries
  const [entries, setEntries] = useState([]);
  
  // New Entry Form
  const [newEntry, setNewEntry] = useState({
    deductee_name: '',
    deductee_pan: '',
    section: '194J',
    payment_date: new Date().toISOString().split('T')[0],
    payment_amount: '',
    tds_rate: 10,
    tds_amount: '',
    deposit_date: '',
    challan_no: '',
    bsr_code: ''
  });
  
  // AI Mode State
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [aiError, setAiError] = useState('');
  
  // Validation & Errors
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [success, setSuccess] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  
  const fileInputRef = useRef(null);

  // Calculate TDS automatically
  const calculateTDS = (amount, rate) => {
    if (!amount || !rate) return 0;
    return Math.round((parseFloat(amount) * parseFloat(rate)) / 100);
  };

  // Handle section change - auto-fill rate
  const handleSectionChange = (sectionCode) => {
    const section = TDS_SECTIONS.find(s => s.code === sectionCode);
    let rate = 10;
    if (section) {
      rate = typeof section.rate === 'number' ? section.rate : 
             section.rate_company || section.rate_land || 10;
    }
    setNewEntry({ 
      ...newEntry, 
      section: sectionCode, 
      tds_rate: rate,
      tds_amount: calculateTDS(newEntry.payment_amount, rate)
    });
  };

  // Handle amount change
  const handleAmountChange = (value) => {
    const tds = calculateTDS(value, newEntry.tds_rate);
    setNewEntry({ ...newEntry, payment_amount: value, tds_amount: tds });
  };

  // Validate Entry
  const validateEntry = (entry) => {
    const errs = [];
    
    // PAN validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(entry.deductee_pan)) {
      errs.push('Invalid PAN format');
    }
    
    // Amount validation
    if (!entry.payment_amount || parseFloat(entry.payment_amount) <= 0) {
      errs.push('Payment amount must be greater than 0');
    }
    
    // TDS amount validation
    if (!entry.tds_amount || parseFloat(entry.tds_amount) < 0) {
      errs.push('TDS amount is required');
    }
    
    // Date validation
    if (!entry.payment_date) {
      errs.push('Payment date is required');
    }
    
    // Check threshold
    const section = TDS_SECTIONS.find(s => s.code === entry.section);
    if (section && section.threshold > 0 && parseFloat(entry.payment_amount) < section.threshold) {
      warnings.push(`Amount below threshold of Rs. ${section.threshold.toLocaleString('en-IN')} for section ${entry.section}`);
    }
    
    return errs;
  };

  // Add Entry
  const handleAddEntry = () => {
    setErrors([]);
    setWarnings([]);
    
    const validationErrors = validateEntry(newEntry);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    const entry = {
      id: Date.now().toString(),
      ...newEntry,
      payment_amount: parseFloat(newEntry.payment_amount),
      tds_amount: parseFloat(newEntry.tds_amount),
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    setEntries([...entries, entry]);
    setSuccess('TDS entry added successfully');
    
    // Reset form
    setNewEntry({
      deductee_name: '',
      deductee_pan: '',
      section: '194J',
      payment_date: new Date().toISOString().split('T')[0],
      payment_amount: '',
      tds_rate: 10,
      tds_amount: '',
      deposit_date: '',
      challan_no: '',
      bsr_code: ''
    });
    
    setTimeout(() => setSuccess(''), 3000);
  };

  // Delete Entry
  const handleDeleteEntry = (id) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  // File Upload for AI Mode
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setErrors([]);
    setAiError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/tds/extract-data', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success && response.data.data) {
        setExtractedData(response.data.data);
        setSuccess('File processed successfully!');
      } else {
        setAiError('Could not extract data from file');
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      setAiError('Error processing file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Convert AI data to entries
  const handleConvertToEntries = () => {
    if (!extractedData?.entries) return;
    
    const newEntries = extractedData.entries.map((e, idx) => ({
      id: `AI-${Date.now()}-${idx}`,
      deductee_name: e.deductee_name,
      deductee_pan: e.deductee_pan,
      section: e.section,
      payment_date: new Date().toISOString().split('T')[0],
      payment_amount: e.payment_amount,
      tds_rate: e.tds_rate,
      tds_amount: e.tds_amount,
      deposit_date: '',
      challan_no: '',
      bsr_code: '',
      status: 'ai_suggested',
      created_at: new Date().toISOString()
    }));
    
    setEntries([...entries, ...newEntries]);
    setExtractedData(null);
    setMode('manual');
    setSuccess(`${newEntries.length} TDS entries imported`);
  };

  // Validate Filing
  const handleValidateFiling = () => {
    setErrors([]);
    setWarnings([]);
    
    const validationErrors = [];
    const validationWarnings = [];
    
    // Check filing context
    if (!filingContext.tan || filingContext.tan.length !== 10) {
      validationErrors.push('Valid TAN is required');
    }
    if (!filingContext.deductor_pan) {
      validationErrors.push('Deductor PAN is required');
    }
    
    // Check entries
    if (entries.length === 0) {
      validationErrors.push('At least one TDS entry is required');
    }
    
    // Check for missing challan details
    const missingChallan = entries.filter(e => !e.challan_no || !e.deposit_date);
    if (missingChallan.length > 0) {
      validationWarnings.push(`${missingChallan.length} entries missing challan/deposit details`);
    }
    
    // Check PAN verification
    entries.forEach((e, idx) => {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(e.deductee_pan)) {
        validationErrors.push(`Entry ${idx + 1}: Invalid PAN format`);
      }
    });
    
    setErrors(validationErrors);
    setWarnings(validationWarnings);
    
    setValidationResult({
      valid: validationErrors.length === 0,
      errors: validationErrors,
      warnings: validationWarnings,
      summary: {
        total_entries: entries.length,
        total_payment: entries.reduce((sum, e) => sum + e.payment_amount, 0),
        total_tds: entries.reduce((sum, e) => sum + e.tds_amount, 0)
      }
    });
    
    if (validationErrors.length === 0) {
      setSuccess('Validation passed! Ready to export.');
      setStep(4);
    }
  };

  // Export to JSON (for TRACES upload)
  const handleExportJSON = () => {
    const exportData = {
      form_type: filingContext.form_type,
      financial_year: filingContext.financial_year,
      quarter: filingContext.quarter,
      deductor: {
        tan: filingContext.tan,
        name: filingContext.deductor_name,
        pan: filingContext.deductor_pan
      },
      challan_details: [],
      deductee_details: entries.map(e => ({
        deductee_name: e.deductee_name,
        deductee_pan: e.deductee_pan,
        section_code: e.section,
        payment_date: e.payment_date,
        payment_amount: e.payment_amount,
        tds_rate: e.tds_rate,
        tds_amount: e.tds_amount,
        deposit_date: e.deposit_date,
        challan_no: e.challan_no,
        bsr_code: e.bsr_code
      })),
      summary: {
        total_payment: entries.reduce((sum, e) => sum + e.payment_amount, 0),
        total_tds: entries.reduce((sum, e) => sum + e.tds_amount, 0),
        total_entries: entries.length
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TDS_${filingContext.form_type}_${filingContext.quarter}_${filingContext.financial_year}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    setSuccess('TDS return exported successfully!');
  };

  // Stats
  const stats = {
    total_entries: entries.length,
    total_payment: entries.reduce((sum, e) => sum + (e.payment_amount || 0), 0),
    total_tds: entries.reduce((sum, e) => sum + (e.tds_amount || 0), 0),
    pending: entries.filter(e => e.status === 'pending' || e.status === 'ai_suggested').length,
    verified: entries.filter(e => e.status === 'verified').length
  };

  const currentFormType = FORM_TYPES.find(f => f.value === filingContext.form_type);

  return (
    <div className="space-y-4 md:space-y-6" data-testid="tds-filing-page">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 md:p-8 text-white border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              TDS Return Filing
            </h1>
            <p className="text-slate-300 text-sm md:text-lg">Dual-Mode: Manual Entry or AI-powered Invoice/Ledger OCR</p>
            <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-4 text-xs md:text-sm">
              <div className="flex items-center space-x-2">
                <Calculator size={18} />
                <span>Auto-calculate</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={18} />
                <span>Section-wise TDS</span>
              </div>
              <div className="flex items-center space-x-2">
                <Download size={18} />
                <span>TRACES-ready</span>
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
              { num: 1, label: 'Setup' },
              { num: 2, label: 'Entries' },
              { num: 3, label: 'Review' },
              { num: 4, label: 'Export' }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => setStep(s.num)}
                  className={`flex items-center space-x-1 md:space-x-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-colors text-xs md:text-sm ${
                    step === s.num 
                      ? 'bg-blue-600 text-white' 
                      : step > s.num 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-100 text-slate-500'
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
              Manual
            </Button>
            <Button
              onClick={() => setMode('ai')}
              variant={mode === 'ai' ? 'default' : 'outline'}
              size="sm"
              className={mode === 'ai' ? 'bg-purple-600 text-xs md:text-sm' : 'text-xs md:text-sm'}
            >
              <Sparkles size={12} className="mr-1" /> AI Mode
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="text-red-600 mt-0.5 mr-3" size={20} />
            <div>
              <h4 className="font-semibold text-red-800">Errors</h4>
              <ul className="mt-1 space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx} className="text-red-700 text-sm">{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="text-yellow-600 mt-0.5 mr-3" size={20} />
            <div>
              <h4 className="font-semibold text-yellow-800">Warnings</h4>
              <ul className="mt-1 space-y-1">
                {warnings.map((w, idx) => (
                  <li key={idx} className="text-yellow-700 text-sm">{w}</li>
                ))}
              </ul>
            </div>
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

      {/* Step 1: Setup */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-slate-200">
          <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 flex items-center">
            <Building2 className="mr-2 text-blue-600" size={22} />
            Filing Setup
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Form Type *</label>
              <select
                value={filingContext.form_type}
                onChange={(e) => setFilingContext({ ...filingContext, form_type: e.target.value })}
                className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                data-testid="form-type-select"
              >
                {FORM_TYPES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">{currentFormType?.description}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Financial Year *</label>
              <select
                value={filingContext.financial_year}
                onChange={(e) => setFilingContext({ ...filingContext, financial_year: e.target.value })}
                className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              >
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
                <option value="2023-24">2023-24</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quarter *</label>
              <select
                value={filingContext.quarter}
                onChange={(e) => setFilingContext({ ...filingContext, quarter: e.target.value })}
                className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                data-testid="quarter-select"
              >
                {QUARTERS.map(q => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">TAN *</label>
              <input
                type="text"
                value={filingContext.tan}
                onChange={(e) => setFilingContext({ ...filingContext, tan: e.target.value.toUpperCase() })}
                placeholder="ABCD12345E"
                maxLength={10}
                className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase text-sm md:text-base"
                data-testid="tan-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Deductor Name *</label>
              <input
                type="text"
                value={filingContext.deductor_name}
                onChange={(e) => setFilingContext({ ...filingContext, deductor_name: e.target.value })}
                placeholder="Company Name"
                className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                data-testid="deductor-name-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Deductor PAN *</label>
              <input
                type="text"
                value={filingContext.deductor_pan}
                onChange={(e) => setFilingContext({ ...filingContext, deductor_pan: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase text-sm md:text-base"
                data-testid="deductor-pan-input"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setStep(2)}
              className="bg-blue-600 hover:bg-blue-700 text-sm md:text-base"
              disabled={!filingContext.tan || !filingContext.deductor_name}
              data-testid="proceed-to-entries-btn"
            >
              Proceed to Entries <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* AI Upload (when in AI mode) */}
      {mode === 'ai' && !extractedData && step >= 2 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Sparkles className="mr-2 text-purple-600" size={24} />
            Upload Invoices/Ledger for AI Extraction
          </h3>
          <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center bg-purple-50/50">
            <FileText size={48} className="mx-auto text-purple-500 mb-4" />
            <p className="text-slate-600 mb-2">Upload invoices or ledger extract</p>
            <p className="text-sm text-slate-500 mb-4">AI will identify deductees, sections, and calculate TDS</p>
            <input 
              type="file" 
              className="hidden" 
              id="tds-file-upload" 
              ref={fileInputRef}
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
            <label htmlFor="tds-file-upload">
              <Button 
                className="bg-purple-600 hover:bg-purple-700" 
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading ? (
                    <><RefreshCw size={18} className="mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><Upload size={18} className="mr-2" /> Upload File</>
                  )}
                </span>
              </Button>
            </label>
          </div>
        </div>
      )}

      {/* AI Extracted Data */}
      {extractedData && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center">
              <FileSpreadsheet className="mr-2 text-purple-600" size={24} />
              AI Extracted TDS Entries
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Deductee Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">PAN</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Section</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Payment</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Rate</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">TDS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {extractedData.entries.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{e.deductee_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.deductee_pan}</td>
                    <td className="px-4 py-3">{e.section}</td>
                    <td className="px-4 py-3 text-right">
                      <IndianRupee size={12} className="inline" />
                      {e.payment_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">{e.tds_rate}%</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <IndianRupee size={12} className="inline" />
                      {e.tds_amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setExtractedData(null)}>
              <X size={18} className="mr-2" /> Cancel
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleConvertToEntries}>
              <Check size={18} className="mr-2" /> Import Entries
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Manual Entry Form */}
      {step >= 2 && mode === 'manual' && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Plus className="mr-2 text-blue-600" size={24} />
            Add TDS Entry
          </h3>
          
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deductee Name *</label>
              <input
                type="text"
                value={newEntry.deductee_name}
                onChange={(e) => setNewEntry({ ...newEntry, deductee_name: e.target.value })}
                placeholder="Party name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="deductee-name-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deductee PAN *</label>
              <input
                type="text"
                value={newEntry.deductee_pan}
                onChange={(e) => setNewEntry({ ...newEntry, deductee_pan: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                data-testid="deductee-pan-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">TDS Section *</label>
              <select
                value={newEntry.section}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="tds-section-select"
              >
                {TDS_SECTIONS.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                value={newEntry.payment_date}
                onChange={(e) => setNewEntry({ ...newEntry, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount *</label>
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  value={newEntry.payment_amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="payment-amount-input"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">TDS Rate %</label>
              <input
                type="number"
                value={newEntry.tds_rate}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value);
                  setNewEntry({ 
                    ...newEntry, 
                    tds_rate: rate,
                    tds_amount: calculateTDS(newEntry.payment_amount, rate)
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">TDS Amount</label>
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  value={newEntry.tds_amount}
                  onChange={(e) => setNewEntry({ ...newEntry, tds_amount: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deposit Date</label>
              <input
                type="date"
                value={newEntry.deposit_date}
                onChange={(e) => setNewEntry({ ...newEntry, deposit_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Challan No.</label>
              <input
                type="text"
                value={newEntry.challan_no}
                onChange={(e) => setNewEntry({ ...newEntry, challan_no: e.target.value })}
                placeholder="Challan number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">BSR Code</label>
              <input
                type="text"
                value={newEntry.bsr_code}
                onChange={(e) => setNewEntry({ ...newEntry, bsr_code: e.target.value })}
                placeholder="7 digit BSR code"
                maxLength={7}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button onClick={handleAddEntry} className="bg-blue-600 hover:bg-blue-700" data-testid="add-tds-entry-btn">
              <Plus size={18} className="mr-2" /> Add Entry
            </Button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      {entries.length > 0 && step >= 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <Users className="mr-2 text-slate-600" size={20} />
              TDS Entries ({entries.length})
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(3)}
              >
                <Eye size={16} className="mr-1" /> Review
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleValidateFiling}
                data-testid="validate-filing-btn"
              >
                <CheckCircle size={16} className="mr-1" /> Validate & Export
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Deductee</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">PAN</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Section</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Payment</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">TDS</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{e.deductee_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.deductee_pan}</td>
                    <td className="px-4 py-3">{e.section}</td>
                    <td className="px-4 py-3">{e.payment_date}</td>
                    <td className="px-4 py-3 text-right">
                      <IndianRupee size={12} className="inline" />
                      {e.payment_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <IndianRupee size={12} className="inline" />
                      {e.tds_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        e.status === 'verified' ? 'bg-green-100 text-green-700' :
                        e.status === 'ai_suggested' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {e.status === 'ai_suggested' ? 'AI' : e.status}
                      </span>
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
            </table>
          </div>
          
          {/* Summary */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-slate-600">Total Entries</div>
              <div className="text-xl font-bold text-slate-900">{stats.total_entries}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600">Total Payment</div>
              <div className="text-xl font-bold text-slate-900">
                <IndianRupee size={16} className="inline" />
                {stats.total_payment.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600">Total TDS</div>
              <div className="text-xl font-bold text-blue-600">
                <IndianRupee size={16} className="inline" />
                {stats.total_tds.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Export */}
      {step === 4 && validationResult?.valid && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="text-center py-8">
            <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Validation Passed!</h3>
            <p className="text-slate-600 mb-6">Your TDS return is ready for export</p>
            
            <div className="inline-grid grid-cols-3 gap-8 mb-8 text-left">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Form Type</div>
                <div className="font-semibold">{filingContext.form_type}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Quarter</div>
                <div className="font-semibold">{filingContext.quarter} / {filingContext.financial_year}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Total TDS</div>
                <div className="font-semibold text-blue-600">
                  <IndianRupee size={14} className="inline" />
                  {stats.total_tds.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleExportJSON}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
              data-testid="export-tds-btn"
            >
              <Download size={20} className="mr-2" /> Export for TRACES Upload
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && step >= 2 && (
        <div className="bg-slate-50 rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
          <Calculator size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No TDS Entries Yet</h3>
          <p className="text-slate-500">Add entries manually or use AI mode to import from invoices</p>
        </div>
      )}
    </div>
  );
};

export default TDSFiling;
