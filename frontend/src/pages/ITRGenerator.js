import { useState } from 'react';
import { 
  Upload, FileText, CheckCircle, Calculator, AlertTriangle, Download, 
  FileCheck, RefreshCw, ChevronRight, AlertCircle, Sparkles, Eye,
  FileSpreadsheet, Building2, CreditCard, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { processITRDocuments, calculateTax, generateITRPdf } from '@/services/api';

// ============ WORKFLOW STEPS ============
const STEPS = {
  UPLOAD: 1,
  EXTRACTING: 2,
  RECONCILIATION: 3,
  ITR_FORM_SELECTION: 4,
  TAX_CALCULATION: 5,
  REVIEW: 6,
  DOWNLOAD: 7
};

const ITRGenerator = () => {
  // ============ STATE ============
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [files, setFiles] = useState({ form16: null, ais: null, bank: null, investments: [] });
  const [extractedData, setExtractedData] = useState(null);
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

  const canProceedToExtract = () => files.form16 !== null;

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
      
      if (response.data.errors && response.data.errors.length > 0) {
        setError(`Some files failed: ${response.data.errors.map(e => e.file).join(', ')}`);
      }

      setExtractedData(response.data.extracted_data);
      setReconciliation(response.data.reconciliation);
      setItrForm(response.data.suggested_itr_form);
      setAiProvider(response.data.provider_used || 'emergent');
      
      setCurrentStep(STEPS.RECONCILIATION);
    } catch (err) {
      setError(err.response?.data?.detail || 'AI extraction failed. Please try again.');
      setCurrentStep(STEPS.UPLOAD);
    } finally {
      setLoading(false);
    }
  };

  // ============ STEP 5: TAX CALCULATION ============
  const handleCalculateTax = async () => {
    setLoading(true);
    setError('');
    setCurrentStep(STEPS.TAX_CALCULATION);

    try {
      const form16 = extractedData?.form16 || {};
      const calculationData = {
        financial_year: form16.financial_year || '2024-25',
        gross_salary: form16.gross_salary || 0,
        section_80c: form16.section_80c || 0,
        section_80d: form16.section_80d || 0,
        hra_claimed: 0,
        tds_deducted: form16.tds_deducted || 0,
        employee_pan: form16.employee_pan || '',
        employee_name: form16.employee_name || '',
        employer_tan: form16.employer_tan || '',
        employer_name: form16.employer_name || ''
      };

      const response = await calculateTax(calculationData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Tax calculation failed');
      }

      setTaxCalculation(response.data.calculation);
      setItrId(response.data.itr_id);
      setCurrentStep(STEPS.REVIEW);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Tax calculation failed');
    } finally {
      setLoading(false);
    }
  };

  // ============ STEP 7: PDF DOWNLOAD ============
  const handleDownloadPdf = async () => {
    if (!itrId) {
      setError('No ITR ID available');
      return;
    }

    setLoading(true);
    try {
      const response = await generateITRPdf(itrId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ITR_2024-25_Complete.pdf`);
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

  // ============ RENDER ============
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold">ITR PDF Generator</h1>
        </div>
        <p className="text-indigo-200 text-lg">AI-Powered • Multi-Document • Auto-Reconciliation</p>
        
        {/* Progress Steps */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2">
          {['Upload', 'Extract', 'Reconcile', 'ITR Form', 'Calculate', 'Review', 'Download'].map((step, idx) => (
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
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* STEP 1: UPLOAD DOCUMENTS */}
      {currentStep === STEPS.UPLOAD && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 1: Upload Documents</h2>
          <p className="text-slate-600 mb-6">Upload your tax documents. AI will extract data from all sources.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form 16 - Required */}
            <div className={`border-2 rounded-xl p-6 ${files.form16 ? 'border-green-400 bg-green-50' : 'border-dashed border-slate-300'}`}>
              <div className="flex items-center gap-3 mb-3">
                <FileText className={files.form16 ? 'text-green-600' : 'text-slate-400'} size={24} />
                <div>
                  <h3 className="font-semibold text-slate-900">Form 16 *</h3>
                  <p className="text-xs text-slate-500">Required - Salary & TDS details</p>
                </div>
              </div>
              {files.form16 ? (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle size={16} />
                  <span>{files.form16.name}</span>
                </div>
              ) : (
                <label className="block">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload('form16', e)} className="hidden" />
                  <div className="cursor-pointer text-center py-4 text-slate-500 hover:text-indigo-600">
                    <Upload className="mx-auto mb-2" size={24} />
                    <span className="text-sm">Click to upload</span>
                  </div>
                </label>
              )}
            </div>

            {/* AIS/TIS - Optional */}
            <div className={`border-2 rounded-xl p-6 ${files.ais ? 'border-green-400 bg-green-50' : 'border-dashed border-slate-300'}`}>
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
                  <span>{files.ais.name}</span>
                </div>
              ) : (
                <label className="block">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload('ais', e)} className="hidden" />
                  <div className="cursor-pointer text-center py-4 text-slate-500 hover:text-indigo-600">
                    <Upload className="mx-auto mb-2" size={24} />
                    <span className="text-sm">Click to upload</span>
                  </div>
                </label>
              )}
            </div>

            {/* Bank Statement - Optional */}
            <div className={`border-2 rounded-xl p-6 ${files.bank ? 'border-green-400 bg-green-50' : 'border-dashed border-slate-300'}`}>
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
                  <span>{files.bank.name}</span>
                </div>
              ) : (
                <label className="block">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload('bank', e)} className="hidden" />
                  <div className="cursor-pointer text-center py-4 text-slate-500 hover:text-indigo-600">
                    <Upload className="mx-auto mb-2" size={24} />
                    <span className="text-sm">Click to upload</span>
                  </div>
                </label>
              )}
            </div>

            {/* Investment Proofs - Optional */}
            <div className={`border-2 rounded-xl p-6 ${files.investments.length > 0 ? 'border-green-400 bg-green-50' : 'border-dashed border-slate-300'}`}>
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className={files.investments.length > 0 ? 'text-green-600' : 'text-slate-400'} size={24} />
                <div>
                  <h3 className="font-semibold text-slate-900">Investment Proofs</h3>
                  <p className="text-xs text-slate-500">Optional - 80C/80D deductions</p>
                </div>
              </div>
              {files.investments.length > 0 ? (
                <div className="space-y-1">
                  {files.investments.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-green-700 text-sm">
                      <CheckCircle size={14} />
                      <span>{f.name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <label className="block mt-2">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload('investments', e)} className="hidden" />
                <div className="cursor-pointer text-center py-2 text-slate-500 hover:text-indigo-600 text-sm">
                  <Upload className="mx-auto mb-1" size={18} />
                  <span>Add investment proof</span>
                </div>
              </label>
            </div>
          </div>

          {/* Extract Button */}
          <div className="mt-8 text-center">
            <Button
              onClick={handleExtractAll}
              disabled={!canProceedToExtract() || loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-6 text-lg disabled:opacity-50"
              data-testid="extract-all-btn"
            >
              {loading ? (
                <><RefreshCw className="animate-spin mr-3" size={20} /> Extracting with AI...</>
              ) : (
                <><Sparkles className="mr-3" size={20} /> Extract All Data with AI</>
              )}
            </Button>
            {!canProceedToExtract() && (
              <p className="text-amber-600 text-sm mt-2">Please upload Form 16 to continue</p>
            )}
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
            Provider fallback: Emergent → OpenAI → Gemini
          </div>
        </div>
      )}

      {/* STEP 3: RECONCILIATION */}
      {currentStep === STEPS.RECONCILIATION && reconciliation && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 3: Data Reconciliation</h2>
          <p className="text-slate-600 mb-6">AI has compared data from all sources</p>

          {/* Confidence Score */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Data Confidence Score</span>
              <span className={`text-2xl font-bold ${
                reconciliation.confidence_score >= 0.9 ? 'text-green-600' :
                reconciliation.confidence_score >= 0.7 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(reconciliation.confidence_score * 100)}%
              </span>
            </div>
          </div>

          {/* Auto-Fixed Items */}
          {reconciliation.auto_fixed?.length > 0 && (
            <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle size={18} />
                Auto-Fixed ({reconciliation.auto_fixed.length})
              </h3>
              {reconciliation.auto_fixed.map((item, i) => (
                <p key={i} className="text-sm text-green-700">{item.action}</p>
              ))}
            </div>
          )}

          {/* Needs Review */}
          {reconciliation.needs_review?.length > 0 && (
            <div className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle size={18} />
                Needs Review ({reconciliation.needs_review.length})
              </h3>
              {reconciliation.needs_review.map((item, i) => (
                <div key={i} className="text-sm text-amber-700 mb-1">
                  <strong>{item.field}:</strong> {item.recommendation}
                </div>
              ))}
            </div>
          )}

          {/* Continue Button */}
          <div className="mt-6 text-center">
            <Button
              onClick={() => setCurrentStep(STEPS.ITR_FORM_SELECTION)}
              className="bg-indigo-600 text-white px-8 py-4"
            >
              Continue to ITR Form Selection <ChevronRight className="ml-2" size={18} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: ITR FORM SELECTION */}
      {currentStep === STEPS.ITR_FORM_SELECTION && itrForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 4: ITR Form Selection</h2>
          <p className="text-slate-600 mb-6">Based on your income sources</p>

          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-6">
            <div className="flex items-center gap-4">
              <FileCheck size={48} />
              <div>
                <h3 className="text-3xl font-bold">{itrForm.form}</h3>
                <p className="text-indigo-100">{itrForm.description}</p>
              </div>
            </div>
            <p className="mt-4 text-indigo-100 text-sm">{itrForm.reason}</p>
          </div>

          <div className="text-center">
            <Button
              onClick={handleCalculateTax}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4"
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

      {/* STEP 5: TAX CALCULATION */}
      {currentStep === STEPS.TAX_CALCULATION && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="animate-spin mx-auto text-green-600 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Calculating Tax</h2>
          <p className="text-slate-600">Computing Old vs New Regime comparison...</p>
        </div>
      )}

      {/* STEP 6: REVIEW */}
      {currentStep === STEPS.REVIEW && taxCalculation && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 6: Tax Calculation Review</h2>
          <p className="text-slate-600 mb-6">Compare regimes and download your ITR</p>

          {/* Regime Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Old Regime */}
            <div className={`rounded-xl p-6 border-2 ${
              taxCalculation.suggested_regime === 'old' ? 'border-green-400 bg-green-50' : 'border-slate-200'
            }`}>
              {taxCalculation.suggested_regime === 'old' && (
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold inline-block mb-3">
                  ⭐ RECOMMENDED
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
                <div className="flex justify-between bg-slate-100 p-3 rounded-lg">
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
                  ⭐ RECOMMENDED
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
                  <span className="font-semibold">-₹{taxCalculation.standard_deduction?.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between border-t pt-2 ${taxCalculation.suggested_regime === 'new' ? 'border-green-400' : ''}`}>
                  <span className={taxCalculation.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Taxable Income</span>
                  <span className="font-bold">₹{taxCalculation.taxable_income_new?.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between p-3 rounded-lg ${taxCalculation.suggested_regime === 'new' ? 'bg-white/20' : 'bg-slate-100'}`}>
                  <span className="font-semibold">Tax Payable</span>
                  <span className={`text-xl font-bold ${taxCalculation.suggested_regime === 'new' ? 'text-white' : 'text-red-600'}`}>
                    ₹{Math.round(taxCalculation.new_regime_tax || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              {taxCalculation.suggested_regime === 'new' && taxCalculation.savings > 0 && (
                <div className="mt-4 bg-yellow-400 text-slate-900 p-3 rounded-lg text-center font-bold">
                  💰 YOU SAVE: ₹{Math.round(taxCalculation.savings).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {taxCalculation.recommendations?.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-6 mb-8 border border-indigo-100">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <TrendingUp size={18} />
                Tax Saving Recommendations
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

          {/* Download Button */}
          <div className="text-center">
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
            <p className="text-slate-500 text-sm mt-2">
              Includes: Computation Sheet + All Schedules + Verification Page
            </p>
          </div>
        </div>
      )}

      {/* STEP 7: SUCCESS */}
      {currentStep === STEPS.DOWNLOAD && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-12 text-white text-center">
          <CheckCircle className="mx-auto mb-4" size={64} />
          <h2 className="text-3xl font-bold mb-2">ITR PDF Generated Successfully!</h2>
          <p className="text-green-100 text-lg mb-6">Your complete ITR package has been downloaded</p>
          
          <div className="bg-white/10 rounded-xl p-6 mb-6 inline-block text-left">
            <h3 className="font-semibold mb-3">Package Includes:</h3>
            <ul className="space-y-2 text-green-100">
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Cover Page with PAN & Personal Info</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Complete Tax Computation Sheet</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Schedule S - Salary Income</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Schedule HP - House Property</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Schedule VI-A - Deductions</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Schedule TDS - Tax Deducted</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} /> Verification & Declaration Page</li>
            </ul>
          </div>

          <Button
            onClick={() => {
              setCurrentStep(STEPS.UPLOAD);
              setFiles({ form16: null, ais: null, bank: null, investments: [] });
              setExtractedData(null);
              setReconciliation(null);
              setTaxCalculation(null);
              setItrId(null);
            }}
            variant="outline"
            className="bg-white text-green-600 hover:bg-green-50"
          >
            Generate Another ITR
          </Button>
        </div>
      )}
    </div>
  );
};

export default ITRGenerator;
