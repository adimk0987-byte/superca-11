import { useState } from 'react';
import { 
  Upload, FileText, CheckCircle, Calculator, AlertTriangle, Download, 
  FileCheck, RefreshCw, ChevronRight, AlertCircle, Sparkles, Edit2,
  FileSpreadsheet, Building2, CreditCard, TrendingUp, ChevronLeft, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { processITRDocuments, calculateTax, generateITRPdf } from '@/services/api';

// ============ WORKFLOW STEPS ============
const STEPS = {
  UPLOAD: 1,
  EXTRACTING: 2,
  REVIEW_DATA: 3,  // Combined reconciliation + edit
  ITR_FORM_SELECTION: 4,
  TAX_CALCULATION: 5,
  RESULT: 6,
  DOWNLOAD: 7
};

const ITRGenerator = () => {
  // ============ STATE ============
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [files, setFiles] = useState({ form16: null, ais: null, bank: null, investments: [] });
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_pan: '',
    employer_name: '',
    employer_tan: '',
    financial_year: '2024-25',
    gross_salary: '',
    tds_deducted: '',
    section_80c: '',
    section_80d: '',
    hra_claimed: '',
    interest_income: '',
  });
  const [reconciliation, setReconciliation] = useState(null);
  const [itrForm, setItrForm] = useState(null);
  const [taxCalculation, setTaxCalculation] = useState(null);
  const [itrId, setItrId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiProvider, setAiProvider] = useState(null);

  // ============ FILE UPLOAD HANDLERS ============
  const handleFileUpload = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'investments') {
        setFiles(prev => ({ ...prev, investments: [...prev.investments, file] }));
      } else {
        setFiles(prev => ({ ...prev, [type]: file }));
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ============ STEP 2: AI EXTRACTION ============
  const handleExtractAll = async () => {
    setLoading(true);
    setError('');
    setCurrentStep(STEPS.EXTRACTING);

    try {
      const uploadFiles = [];
      if (files.form16) uploadFiles.push(files.form16);
      if (files.ais) uploadFiles.push(files.ais);
      if (files.bank) uploadFiles.push(files.bank);
      files.investments.forEach(f => uploadFiles.push(f));

      const response = await processITRDocuments(uploadFiles);
      
      // Extract data and populate form
      const form16 = response.data.extracted_data?.form16 || {};
      setFormData(prev => ({
        ...prev,
        employee_name: form16.employee_name || prev.employee_name,
        employee_pan: form16.employee_pan || prev.employee_pan,
        employer_name: form16.employer_name || prev.employer_name,
        employer_tan: form16.employer_tan || prev.employer_tan,
        financial_year: form16.financial_year || prev.financial_year || '2024-25',
        gross_salary: form16.gross_salary || prev.gross_salary,
        tds_deducted: form16.tds_deducted || prev.tds_deducted,
        section_80c: form16.section_80c || prev.section_80c,
        section_80d: form16.section_80d || prev.section_80d,
      }));

      setReconciliation(response.data.reconciliation);
      setItrForm(response.data.suggested_itr_form || {
        form: 'ITR-1',
        reason: 'Salary income detected',
        description: 'ITR-1 (Sahaj) - For salary income'
      });
      setAiProvider(response.data.provider_used || 'emergent');
      
      setCurrentStep(STEPS.REVIEW_DATA);
    } catch (err) {
      setError(err.response?.data?.detail || 'AI extraction failed. Please enter details manually.');
      setCurrentStep(STEPS.REVIEW_DATA); // Go to manual entry
    } finally {
      setLoading(false);
    }
  };

  // Skip to manual entry
  const handleSkipToManual = () => {
    setItrForm({
      form: 'ITR-1',
      reason: 'Manual entry mode',
      description: 'ITR-1 (Sahaj) - For individuals with salary/pension',
      eligible_forms: ['ITR-1', 'ITR-2']
    });
    setCurrentStep(STEPS.REVIEW_DATA);
  };

  // ============ STEP 5: TAX CALCULATION ============
  const handleCalculateTax = async () => {
    // Validate required fields
    if (!formData.gross_salary || parseFloat(formData.gross_salary) <= 0) {
      setError('Please enter your Gross Salary');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentStep(STEPS.TAX_CALCULATION);

    try {
      const calculationData = {
        financial_year: formData.financial_year || '2024-25',
        gross_salary: parseFloat(formData.gross_salary) || 0,
        section_80c: parseFloat(formData.section_80c) || 0,
        section_80d: parseFloat(formData.section_80d) || 0,
        hra_claimed: parseFloat(formData.hra_claimed) || 0,
        tds_deducted: parseFloat(formData.tds_deducted) || 0,
        employee_pan: formData.employee_pan || 'ABCDE1234F',
        employee_name: formData.employee_name || 'Taxpayer',
        employer_tan: formData.employer_tan || '',
        employer_name: formData.employer_name || ''
      };

      const response = await calculateTax(calculationData);
      
      if (!response.data.success) {
        // Get detailed error message
        const errorMsg = response.data.errors?.[0]?.message || response.data.message || 'Tax calculation failed';
        const fixHint = response.data.errors?.[0]?.fix_hint || '';
        throw new Error(fixHint ? `${errorMsg}. ${fixHint}` : errorMsg);
      }

      setTaxCalculation(response.data.calculation);
      setItrId(response.data.itr_id);
      setCurrentStep(STEPS.RESULT);
    } catch (err) {
      // Get the most detailed error message available
      let errorMessage = 'Tax calculation failed';
      if (err.response?.data?.errors?.[0]?.message) {
        errorMessage = err.response.data.errors[0].message;
        if (err.response.data.errors[0].fix_hint) {
          errorMessage += `. Fix: ${err.response.data.errors[0].fix_hint}`;
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setCurrentStep(STEPS.ITR_FORM_SELECTION);
    } finally {
      setLoading(false);
    }
  };

  // ============ STEP 7: PDF DOWNLOAD ============
  const handleDownloadPdf = async () => {
    if (!itrId) {
      setError('No ITR ID available. Please calculate tax first.');
      return;
    }

    setLoading(true);
    try {
      const response = await generateITRPdf(itrId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ITR_${formData.financial_year}_${formData.employee_name || 'Complete'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setCurrentStep(STEPS.DOWNLOAD);
    } catch (err) {
      setError('PDF download failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Go back to previous step
  const goBack = () => {
    if (currentStep > STEPS.UPLOAD) {
      if (currentStep === STEPS.RESULT) {
        setCurrentStep(STEPS.ITR_FORM_SELECTION);
      } else if (currentStep === STEPS.ITR_FORM_SELECTION) {
        setCurrentStep(STEPS.REVIEW_DATA);
      } else if (currentStep === STEPS.REVIEW_DATA) {
        setCurrentStep(STEPS.UPLOAD);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  // ============ RENDER ============
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold">ITR PDF Generator</h1>
        </div>
        <p className="text-indigo-200 text-lg">AI-Powered • Editable • Auto-Reconciliation</p>
        
        {/* Progress Steps */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2">
          {['Upload', 'Extract', 'Review & Edit', 'ITR Form', 'Calculate', 'Result', 'Download'].map((step, idx) => (
            <div key={idx} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                currentStep > idx + 1 ? 'bg-green-500 text-white' :
                currentStep === idx + 1 ? 'bg-white text-indigo-900 font-semibold' :
                'bg-indigo-800/50 text-indigo-300'
              }`}>
                {currentStep > idx + 1 ? <CheckCircle size={16} /> : <span>{idx + 1}</span>}
                <span>{step}</span>
              </div>
              {idx < 6 && <ChevronRight className="text-indigo-400 mx-1" size={16} />}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-xl">×</button>
        </div>
      )}

      {/* Back Button */}
      {currentStep > STEPS.UPLOAD && currentStep < STEPS.DOWNLOAD && (
        <button onClick={goBack} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600">
          <ChevronLeft size={18} />
          <span>Back to previous step</span>
        </button>
      )}

      {/* STEP 1: UPLOAD DOCUMENTS */}
      {currentStep === STEPS.UPLOAD && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 1: Upload Documents</h2>
          <p className="text-slate-600 mb-6">Upload your tax documents or skip to enter manually.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form 16 */}
            <div className={`border-2 rounded-xl p-6 ${files.form16 ? 'border-green-400 bg-green-50' : 'border-dashed border-slate-300 hover:border-indigo-400'}`}>
              <div className="flex items-center gap-3 mb-3">
                <FileText className={files.form16 ? 'text-green-600' : 'text-slate-400'} size={24} />
                <div>
                  <h3 className="font-semibold text-slate-900">Form 16</h3>
                  <p className="text-xs text-slate-500">Salary & TDS details</p>
                </div>
              </div>
              {files.form16 ? (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle size={16} />
                  <span className="truncate">{files.form16.name}</span>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload('form16', e)} className="hidden" />
                  <div className="text-center py-4 text-slate-500 hover:text-indigo-600">
                    <Upload className="mx-auto mb-2" size={24} />
                    <span className="text-sm">Click to upload</span>
                  </div>
                </label>
              )}
            </div>

            {/* AIS/TIS */}
            <div className={`border-2 rounded-xl p-6 ${files.ais ? 'border-green-400 bg-green-50' : 'border-dashed border-slate-300 hover:border-indigo-400'}`}>
              <div className="flex items-center gap-3 mb-3">
                <FileSpreadsheet className={files.ais ? 'text-green-600' : 'text-slate-400'} size={24} />
                <div>
                  <h3 className="font-semibold text-slate-900">AIS / TIS</h3>
                  <p className="text-xs text-slate-500">Optional - For reconciliation</p>
                </div>
              </div>
              {files.ais ? (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle size={16} />
                  <span className="truncate">{files.ais.name}</span>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload('ais', e)} className="hidden" />
                  <div className="text-center py-4 text-slate-500 hover:text-indigo-600">
                    <Upload className="mx-auto mb-2" size={24} />
                    <span className="text-sm">Click to upload</span>
                  </div>
                </label>
              )}
            </div>

            {/* Bank Statement */}
            <div className={`border-2 rounded-xl p-6 ${files.bank ? 'border-green-400 bg-green-50' : 'border-dashed border-slate-300 hover:border-indigo-400'}`}>
              <div className="flex items-center gap-3 mb-3">
                <Building2 className={files.bank ? 'text-green-600' : 'text-slate-400'} size={24} />
                <div>
                  <h3 className="font-semibold text-slate-900">Bank Statement</h3>
                  <p className="text-xs text-slate-500">Optional - Interest income</p>
                </div>
              </div>
              {files.bank ? (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle size={16} />
                  <span className="truncate">{files.bank.name}</span>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload('bank', e)} className="hidden" />
                  <div className="text-center py-4 text-slate-500 hover:text-indigo-600">
                    <Upload className="mx-auto mb-2" size={24} />
                    <span className="text-sm">Click to upload</span>
                  </div>
                </label>
              )}
            </div>

            {/* Investment Proofs */}
            <div className={`border-2 rounded-xl p-6 ${files.investments.length > 0 ? 'border-green-400 bg-green-50' : 'border-dashed border-slate-300 hover:border-indigo-400'}`}>
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className={files.investments.length > 0 ? 'text-green-600' : 'text-slate-400'} size={24} />
                <div>
                  <h3 className="font-semibold text-slate-900">Investment Proofs</h3>
                  <p className="text-xs text-slate-500">Optional - 80C/80D</p>
                </div>
              </div>
              {files.investments.length > 0 && (
                <div className="space-y-1 mb-2">
                  {files.investments.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-green-700 text-sm">
                      <CheckCircle size={14} />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <label className="block cursor-pointer">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload('investments', e)} className="hidden" />
                <div className="text-center py-2 text-slate-500 hover:text-indigo-600 text-sm">
                  <Upload className="mx-auto mb-1" size={18} />
                  <span>Add file</span>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col items-center gap-4">
            {files.form16 && (
              <Button
                onClick={handleExtractAll}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-6 text-lg"
                data-testid="extract-all-btn"
              >
                <Sparkles className="mr-3" size={20} />
                Extract Data with AI
              </Button>
            )}
            
            <button
              onClick={handleSkipToManual}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2"
            >
              <Edit2 size={18} />
              Skip to Manual Entry
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: EXTRACTING */}
      {currentStep === STEPS.EXTRACTING && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="animate-spin mx-auto text-indigo-600 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Processing Documents</h2>
          <p className="text-slate-600">Extracting data using {aiProvider || 'Emergent AI'}...</p>
          <div className="mt-4 text-sm text-slate-500">
            Fallback: Emergent → OpenAI → Gemini
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & EDIT DATA */}
      {currentStep === STEPS.REVIEW_DATA && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Step 3: Review & Edit Data</h2>
              <p className="text-slate-600">Verify extracted data or enter manually. All fields are editable.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Edit2 size={16} className="text-indigo-600" />
              <span className="text-indigo-600 font-medium">Fully Editable</span>
            </div>
          </div>

          {/* Reconciliation Alerts */}
          {reconciliation?.needs_review?.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle size={18} />
                Reconciliation Notes ({reconciliation.needs_review.length})
              </h3>
              {reconciliation.needs_review.map((item, i) => (
                <p key={i} className="text-sm text-amber-700 mb-1">
                  • <strong>{item.field}:</strong> {item.recommendation}
                </p>
              ))}
              <p className="text-xs text-amber-600 mt-2">You can edit the values below to correct any issues.</p>
            </div>
          )}

          {/* Editable Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info Section */}
            <div className="md:col-span-2 bg-slate-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={formData.employee_name}
                    onChange={(e) => handleInputChange('employee_name', e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={formData.employee_pan}
                    onChange={(e) => handleInputChange('employee_pan', e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Employer Name</label>
                  <input
                    type="text"
                    value={formData.employer_name}
                    onChange={(e) => handleInputChange('employer_name', e.target.value)}
                    placeholder="Company name"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Financial Year</label>
                  <select
                    value={formData.financial_year}
                    onChange={(e) => handleInputChange('financial_year', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2022-23">2022-23</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Income Section */}
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-green-600" />
                Income Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Gross Salary (₹) *</label>
                  <input
                    type="number"
                    value={formData.gross_salary}
                    onChange={(e) => handleInputChange('gross_salary', e.target.value)}
                    placeholder="e.g., 1200000"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    data-testid="gross-salary-input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Interest Income (₹)</label>
                  <input
                    type="number"
                    value={formData.interest_income}
                    onChange={(e) => handleInputChange('interest_income', e.target.value)}
                    placeholder="e.g., 50000"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                Deductions (Chapter VI-A)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Section 80C (₹)</label>
                  <input
                    type="number"
                    value={formData.section_80c}
                    onChange={(e) => handleInputChange('section_80c', e.target.value)}
                    placeholder="Max ₹1,50,000"
                    max={150000}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">PPF, ELSS, LIC, etc.</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Section 80D (₹)</label>
                  <input
                    type="number"
                    value={formData.section_80d}
                    onChange={(e) => handleInputChange('section_80d', e.target.value)}
                    placeholder="Max ₹1,00,000"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Health insurance premium</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">HRA Exemption (₹)</label>
                  <input
                    type="number"
                    value={formData.hra_claimed}
                    onChange={(e) => handleInputChange('hra_claimed', e.target.value)}
                    placeholder="As per Form 16"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* TDS Section */}
            <div className="md:col-span-2 bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-purple-600" />
                Tax Deducted at Source (TDS)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">TDS Deducted by Employer (₹)</label>
                  <input
                    type="number"
                    value={formData.tds_deducted}
                    onChange={(e) => handleInputChange('tds_deducted', e.target.value)}
                    placeholder="As per Form 16"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Employer TAN</label>
                  <input
                    type="text"
                    value={formData.employer_tan}
                    onChange={(e) => handleInputChange('employer_tan', e.target.value.toUpperCase())}
                    placeholder="ABCD12345E"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="mt-8 text-center">
            <Button
              onClick={() => setCurrentStep(STEPS.ITR_FORM_SELECTION)}
              className="bg-indigo-600 text-white px-8 py-4"
              data-testid="continue-to-itr-form-btn"
            >
              Continue to ITR Form Selection <ChevronRight className="ml-2" size={18} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: ITR FORM SELECTION */}
      {currentStep === STEPS.ITR_FORM_SELECTION && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 4: ITR Form Selection</h2>
          <p className="text-slate-600 mb-6">Based on your income sources</p>

          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-6">
            <div className="flex items-center gap-4">
              <FileCheck size={48} />
              <div>
                <h3 className="text-3xl font-bold">{itrForm?.form || 'ITR-1'}</h3>
                <p className="text-indigo-100">{itrForm?.description || 'For individuals with salary income'}</p>
              </div>
            </div>
            <p className="mt-4 text-indigo-100 text-sm">{itrForm?.reason || 'Salary income detected'}</p>
          </div>

          {/* Summary of entered data */}
          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Eye size={18} className="text-slate-600" />
              Summary of Your Data
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Gross Salary</p>
                <p className="font-semibold text-lg">₹{parseFloat(formData.gross_salary || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">TDS Deducted</p>
                <p className="font-semibold text-lg">₹{parseFloat(formData.tds_deducted || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">80C Deductions</p>
                <p className="font-semibold text-lg">₹{parseFloat(formData.section_80c || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">80D Deductions</p>
                <p className="font-semibold text-lg">₹{parseFloat(formData.section_80d || 0).toLocaleString()}</p>
              </div>
            </div>
            <button 
              onClick={() => setCurrentStep(STEPS.REVIEW_DATA)}
              className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
            >
              <Edit2 size={14} /> Edit data
            </button>
          </div>

          <div className="text-center">
            <Button
              onClick={handleCalculateTax}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4"
              data-testid="calculate-tax-btn"
            >
              {loading ? (
                <><RefreshCw className="animate-spin mr-2" size={18} /> Calculating...</>
              ) : (
                <><Calculator className="mr-2" size={18} /> Calculate Tax (Both Regimes)</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: TAX CALCULATION (Loading) */}
      {currentStep === STEPS.TAX_CALCULATION && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="animate-spin mx-auto text-green-600 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Calculating Tax</h2>
          <p className="text-slate-600">Computing Old vs New Regime comparison...</p>
        </div>
      )}

      {/* STEP 6: RESULT */}
      {currentStep === STEPS.RESULT && taxCalculation && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 6: Tax Calculation Result</h2>
          <p className="text-slate-600 mb-6">Compare regimes and download your ITR PDF</p>

          {/* Regime Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Old Regime */}
            <div className={`rounded-xl p-6 border-2 ${
              taxCalculation.suggested_regime === 'old' ? 'border-green-400 bg-green-50' : 'border-slate-200'
            }`}>
              {taxCalculation.suggested_regime === 'old' && (
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold inline-block mb-3">
                  RECOMMENDED
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-4">Old Regime</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Gross Income</span>
                  <span className="font-semibold">₹{taxCalculation.gross_income?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Deductions</span>
                  <span className="font-semibold">-₹{taxCalculation.total_deductions?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-600">Taxable Income</span>
                  <span className="font-bold">₹{taxCalculation.taxable_income_old?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between bg-slate-100 p-3 rounded-lg mt-2">
                  <span className="font-semibold">Tax Payable</span>
                  <span className="text-xl font-bold text-red-600">₹{Math.round(taxCalculation.old_regime_tax || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* New Regime */}
            <div className={`rounded-xl p-6 border-2 ${
              taxCalculation.suggested_regime === 'new' ? 'border-green-400 bg-gradient-to-br from-green-500 to-emerald-600 text-white' : 'border-slate-200'
            }`}>
              {taxCalculation.suggested_regime === 'new' && (
                <div className="bg-white text-green-600 px-3 py-1 rounded-full text-sm font-bold inline-block mb-3">
                  RECOMMENDED
                </div>
              )}
              <h3 className={`text-xl font-bold mb-4 ${taxCalculation.suggested_regime === 'new' ? 'text-white' : 'text-slate-900'}`}>
                New Regime
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={taxCalculation.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Gross Income</span>
                  <span className="font-semibold">₹{taxCalculation.gross_income?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={taxCalculation.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Std. Deduction</span>
                  <span className="font-semibold">-₹{(taxCalculation.standard_deduction || 75000).toLocaleString()}</span>
                </div>
                <div className={`flex justify-between border-t pt-2 ${taxCalculation.suggested_regime === 'new' ? 'border-green-400' : ''}`}>
                  <span className={taxCalculation.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Taxable Income</span>
                  <span className="font-bold">₹{taxCalculation.taxable_income_new?.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between p-3 rounded-lg mt-2 ${taxCalculation.suggested_regime === 'new' ? 'bg-white/20' : 'bg-slate-100'}`}>
                  <span className="font-semibold">Tax Payable</span>
                  <span className={`text-xl font-bold ${taxCalculation.suggested_regime === 'new' ? 'text-white' : 'text-red-600'}`}>
                    ₹{Math.round(taxCalculation.new_regime_tax || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              {taxCalculation.suggested_regime === 'new' && taxCalculation.savings > 0 && (
                <div className="mt-4 bg-yellow-400 text-slate-900 p-3 rounded-lg text-center font-bold">
                  YOU SAVE: ₹{Math.round(taxCalculation.savings).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {taxCalculation.recommendations?.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-6 mb-8 border border-indigo-100">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <TrendingUp size={18} />
                Tax Saving Tips
              </h4>
              <ul className="space-y-2">
                {taxCalculation.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-indigo-800 flex items-start gap-2">
                    <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={handleDownloadPdf}
              disabled={loading || !itrId}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-6 text-lg"
              data-testid="download-itr-pdf-btn"
            >
              {loading ? (
                <><RefreshCw className="animate-spin mr-3" size={20} /> Generating PDF...</>
              ) : (
                <><Download className="mr-3" size={20} /> Download Complete ITR PDF</>
              )}
            </Button>
            <p className="text-slate-500 text-sm">
              Includes: Cover + Computation Sheet + All Schedules + Verification
            </p>
            <button 
              onClick={() => setCurrentStep(STEPS.REVIEW_DATA)}
              className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
            >
              <Edit2 size={14} /> Edit data and recalculate
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: SUCCESS */}
      {currentStep === STEPS.DOWNLOAD && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-12 text-white text-center">
          <CheckCircle className="mx-auto mb-4" size={64} />
          <h2 className="text-3xl font-bold mb-2">ITR PDF Downloaded!</h2>
          <p className="text-green-100 text-lg mb-6">Your complete ITR package is ready</p>
          
          <div className="bg-white/10 rounded-xl p-6 mb-6 inline-block text-left">
            <h3 className="font-semibold mb-3">Package Contents:</h3>
            <ul className="space-y-2 text-green-100">
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Cover Page with PAN</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Tax Computation Sheet</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Schedule S (Salary)</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Schedule VI-A (Deductions)</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Schedule TDS</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Verification Page</li>
            </ul>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleDownloadPdf}
              variant="outline"
              className="bg-white text-green-600 hover:bg-green-50"
            >
              <Download size={18} className="mr-2" /> Download Again
            </Button>
            <Button
              onClick={() => {
                setCurrentStep(STEPS.UPLOAD);
                setFiles({ form16: null, ais: null, bank: null, investments: [] });
                setFormData({
                  employee_name: '',
                  employee_pan: '',
                  employer_name: '',
                  employer_tan: '',
                  financial_year: '2024-25',
                  gross_salary: '',
                  tds_deducted: '',
                  section_80c: '',
                  section_80d: '',
                  hra_claimed: '',
                  interest_income: '',
                });
                setTaxCalculation(null);
                setItrId(null);
                setReconciliation(null);
              }}
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              Start New ITR
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITRGenerator;
