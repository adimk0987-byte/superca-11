import { useState } from 'react';
import { 
  Upload, FileText, CheckCircle, Calculator, AlertTriangle, Download, 
  FileCheck, RefreshCw, ChevronRight, AlertCircle, Sparkles, Edit2,
  FileSpreadsheet, Building2, TrendingUp, ChevronLeft, Eye, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const STEPS = { DATA_ENTRY: 1, CALCULATING: 2, REVIEW: 3, DOWNLOAD: 4 };

const GSTFiling = () => {
  const [currentStep, setCurrentStep] = useState(STEPS.DATA_ENTRY);
  const [formData, setFormData] = useState({
    gstin: '', business_name: '', period: '',
    total_sales: '', taxable_5: '', taxable_12: '', taxable_18: '', taxable_28: '',
    total_purchases: '', total_itc: '', blocked_itc: '0', reversed_itc: '0',
    purchases_in_books: '', purchases_in_2a: '', matched_purchases: '', missing_in_2a_value: '0',
    is_interstate: false
  });
  const [calculation, setCalculation] = useState(null);
  const [filingId, setFilingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async () => {
    if (!formData.gstin || !formData.period || !formData.total_sales) {
      setError('Please fill GSTIN, Period, and Total Sales');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentStep(STEPS.CALCULATING);

    try {
      const payload = {
        gstin: formData.gstin,
        business_name: formData.business_name || 'Business',
        period: formData.period,
        total_sales: parseFloat(formData.total_sales) || 0,
        taxable_5: parseFloat(formData.taxable_5) || 0,
        taxable_12: parseFloat(formData.taxable_12) || 0,
        taxable_18: parseFloat(formData.taxable_18) || 0,
        taxable_28: parseFloat(formData.taxable_28) || 0,
        total_purchases: parseFloat(formData.total_purchases) || 0,
        total_itc: parseFloat(formData.total_itc) || 0,
        blocked_itc: parseFloat(formData.blocked_itc) || 0,
        reversed_itc: parseFloat(formData.reversed_itc) || 0,
        purchases_in_books: parseInt(formData.purchases_in_books) || 0,
        purchases_in_2a: parseInt(formData.purchases_in_2a) || 0,
        matched_purchases: parseInt(formData.matched_purchases) || 0,
        missing_in_2a_value: parseFloat(formData.missing_in_2a_value) || 0,
        is_interstate: formData.is_interstate
      };

      const response = await api.post('/gst/calculate', payload);
      
      if (response.data.success) {
        setCalculation(response.data);
        setFilingId(response.data.filing_id);
        setCurrentStep(STEPS.REVIEW);
      } else {
        throw new Error(response.data.message || 'Calculation failed');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'GST calculation failed');
      setCurrentStep(STEPS.DATA_ENTRY);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (reportType = 'gstr3b') => {
    if (!filingId) return;
    setLoading(true);
    try {
      const response = await api.post(`/gst/${filingId}/generate-pdf?report_type=${reportType}`, {}, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GST_${reportType}_${formData.period}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('PDF download failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${(parseFloat(val) || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-800 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold">GST Return Filing</h1>
        </div>
        <p className="text-emerald-200 text-lg">GSTR-3B • GSTR-1 • 2A Reconciliation • ITC Statement</p>
        
        {/* Progress */}
        <div className="mt-6 flex items-center gap-2">
          {['Data Entry', 'Calculate', 'Review', 'Download'].map((step, idx) => (
            <div key={idx} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                currentStep > idx + 1 ? 'bg-green-500 text-white' :
                currentStep === idx + 1 ? 'bg-white text-emerald-900 font-semibold' :
                'bg-emerald-700/50 text-emerald-300'
              }`}>
                {currentStep > idx + 1 ? <CheckCircle size={16} /> : <span>{idx + 1}</span>}
                <span>{step}</span>
              </div>
              {idx < 3 && <ChevronRight className="text-emerald-400 mx-1" size={16} />}
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-xl">×</button>
        </div>
      )}

      {/* Back Button */}
      {currentStep > STEPS.DATA_ENTRY && currentStep < STEPS.DOWNLOAD && (
        <button onClick={() => setCurrentStep(STEPS.DATA_ENTRY)} className="flex items-center gap-2 text-slate-600 hover:text-emerald-600">
          <ChevronLeft size={18} /><span>Back to edit</span>
        </button>
      )}

      {/* STEP 1: DATA ENTRY */}
      {currentStep === STEPS.DATA_ENTRY && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 1: Enter GST Data</h2>
          <p className="text-slate-600 mb-6">Enter your sales, purchases, and ITC details</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="md:col-span-2 bg-slate-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-emerald-600" />
                Business Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">GSTIN *</label>
                  <input type="text" value={formData.gstin} onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                    placeholder="27ABCDE1234F1Z5" maxLength={15}
                    className="w-full px-4 py-2 border rounded-lg uppercase" data-testid="gstin-input" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Business Name</label>
                  <input type="text" value={formData.business_name} onChange={(e) => handleInputChange('business_name', e.target.value)}
                    placeholder="Company Name" className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Return Period *</label>
                  <input type="text" value={formData.period} onChange={(e) => handleInputChange('period', e.target.value)}
                    placeholder="012025 (MMYYYY)" maxLength={6}
                    className="w-full px-4 py-2 border rounded-lg" data-testid="period-input" />
                </div>
              </div>
            </div>

            {/* Sales (Output Tax) */}
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-green-600" />
                Sales (Outward Supplies)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Total Taxable Sales (₹) *</label>
                  <input type="number" value={formData.total_sales} onChange={(e) => handleInputChange('total_sales', e.target.value)}
                    placeholder="e.g., 2500000" className="w-full px-4 py-2 border rounded-lg" data-testid="total-sales-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">5% Rate</label>
                    <input type="number" value={formData.taxable_5} onChange={(e) => handleInputChange('taxable_5', e.target.value)}
                      placeholder="0" className="w-full px-3 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">12% Rate</label>
                    <input type="number" value={formData.taxable_12} onChange={(e) => handleInputChange('taxable_12', e.target.value)}
                      placeholder="0" className="w-full px-3 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">18% Rate</label>
                    <input type="number" value={formData.taxable_18} onChange={(e) => handleInputChange('taxable_18', e.target.value)}
                      placeholder="0" className="w-full px-3 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">28% Rate</label>
                    <input type="number" value={formData.taxable_28} onChange={(e) => handleInputChange('taxable_28', e.target.value)}
                      placeholder="0" className="w-full px-3 py-1.5 border rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Purchases (ITC) */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-blue-600" />
                Purchases (Input Tax Credit)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Total Purchases (₹)</label>
                  <input type="number" value={formData.total_purchases} onChange={(e) => handleInputChange('total_purchases', e.target.value)}
                    placeholder="e.g., 1420000" className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Total ITC Available (₹)</label>
                  <input type="number" value={formData.total_itc} onChange={(e) => handleInputChange('total_itc', e.target.value)}
                    placeholder="GST paid on purchases" className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Blocked ITC (17(5))</label>
                    <input type="number" value={formData.blocked_itc} onChange={(e) => handleInputChange('blocked_itc', e.target.value)}
                      placeholder="0" className="w-full px-3 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Reversed ITC</label>
                    <input type="number" value={formData.reversed_itc} onChange={(e) => handleInputChange('reversed_itc', e.target.value)}
                      placeholder="0" className="w-full px-3 py-1.5 border rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2A Reconciliation */}
            <div className="md:col-span-2 bg-amber-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                GSTR-2A Reconciliation
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Invoices in Books</label>
                  <input type="number" value={formData.purchases_in_books} onChange={(e) => handleInputChange('purchases_in_books', e.target.value)}
                    placeholder="185" className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Invoices in 2A</label>
                  <input type="number" value={formData.purchases_in_2a} onChange={(e) => handleInputChange('purchases_in_2a', e.target.value)}
                    placeholder="172" className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Matched</label>
                  <input type="number" value={formData.matched_purchases} onChange={(e) => handleInputChange('matched_purchases', e.target.value)}
                    placeholder="170" className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Missing Value (₹)</label>
                  <input type="number" value={formData.missing_in_2a_value} onChange={(e) => handleInputChange('missing_in_2a_value', e.target.value)}
                    placeholder="85000" className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
            </div>

            {/* Interstate Toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.is_interstate} onChange={(e) => handleInputChange('is_interstate', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-emerald-600" />
                <span className="text-slate-700">Interstate supplies (IGST instead of CGST+SGST)</span>
              </label>
            </div>
          </div>

          {/* Calculate Button */}
          <div className="mt-8 text-center">
            <Button onClick={handleCalculate} disabled={loading}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-12 py-6 text-lg"
              data-testid="calculate-gst-btn">
              <Calculator className="mr-3" size={20} />
              Calculate GST & Generate Returns
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: CALCULATING */}
      {currentStep === STEPS.CALCULATING && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="animate-spin mx-auto text-emerald-600 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Calculating GST</h2>
          <p className="text-slate-600">Computing output tax, ITC, and net payable...</p>
        </div>
      )}

      {/* STEP 3: REVIEW */}
      {currentStep === STEPS.REVIEW && calculation && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 3: Review & Download</h2>
          <p className="text-slate-600 mb-6">Review your GST calculation and download reports</p>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Output Tax */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <TrendingUp size={18} />
                Output Tax (Sales)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Taxable Value</span>
                  <span className="font-semibold">{formatCurrency(calculation.calculation?.output_tax?.taxable_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">CGST</span>
                  <span className="font-semibold">{formatCurrency(calculation.calculation?.output_tax?.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">SGST</span>
                  <span className="font-semibold">{formatCurrency(calculation.calculation?.output_tax?.sgst)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-semibold">Total Tax</span>
                  <span className="font-bold text-green-700">{formatCurrency(calculation.calculation?.output_tax?.total_tax)}</span>
                </div>
              </div>
            </div>

            {/* ITC */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <FileSpreadsheet size={18} />
                Input Tax Credit
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total ITC</span>
                  <span className="font-semibold">{formatCurrency(calculation.calculation?.input_tax_credit?.total_itc)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Blocked</span>
                  <span>-{formatCurrency(calculation.calculation?.input_tax_credit?.blocked_itc)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Reversed</span>
                  <span>-{formatCurrency(calculation.calculation?.input_tax_credit?.reversed_itc)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-semibold">Eligible ITC</span>
                  <span className="font-bold text-blue-700">{formatCurrency(calculation.calculation?.input_tax_credit?.eligible_itc)}</span>
                </div>
              </div>
            </div>

            {/* Net Payable */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Receipt size={18} />
                Net Tax Payable
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-100">CGST</span>
                  <span className="font-semibold">{formatCurrency(calculation.calculation?.net_payable?.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-100">SGST</span>
                  <span className="font-semibold">{formatCurrency(calculation.calculation?.net_payable?.sgst)}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-400 pt-2 mt-2">
                  <span className="font-semibold">TOTAL</span>
                  <span className="font-bold text-2xl">{formatCurrency(calculation.calculation?.net_payable?.total)}</span>
                </div>
              </div>
              <p className="text-emerald-100 text-xs mt-3">Due: {calculation.summary?.payment_summary?.due_date}</p>
            </div>
          </div>

          {/* Reconciliation */}
          {calculation.reconciliation?.summary?.match_percentage < 100 && (
            <div className="bg-amber-50 rounded-xl p-6 mb-8 border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} />
                Reconciliation Status
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl font-bold text-amber-700">
                  {calculation.reconciliation?.summary?.match_percentage?.toFixed(1)}%
                </div>
                <div className="text-sm text-amber-600">Match Rate</div>
              </div>
              {calculation.reconciliation?.recommendations?.map((rec, idx) => (
                <p key={idx} className="text-sm text-amber-700">• {rec}</p>
              ))}
            </div>
          )}

          {/* Download Buttons */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Download Reports</h3>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => handleDownloadPdf('gstr3b')} disabled={loading}
                className="bg-emerald-600 text-white" data-testid="download-gstr3b-btn">
                <Download size={18} className="mr-2" />
                GSTR-3B Summary
              </Button>
              <Button onClick={() => handleDownloadPdf('reconciliation')} disabled={loading}
                className="bg-amber-600 text-white">
                <Download size={18} className="mr-2" />
                Reconciliation Report
              </Button>
              <Button onClick={() => handleDownloadPdf('itc')} disabled={loading}
                className="bg-blue-600 text-white">
                <Download size={18} className="mr-2" />
                ITC Statement
              </Button>
            </div>
            <p className="text-slate-500 text-sm">All reports include detailed breakdowns and ready for filing reference</p>
          </div>

          {/* Edit Button */}
          <div className="mt-6 text-center">
            <button onClick={() => setCurrentStep(STEPS.DATA_ENTRY)}
              className="text-emerald-600 hover:text-emerald-800 text-sm flex items-center gap-1 mx-auto">
              <Edit2 size={14} /> Edit data and recalculate
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GSTFiling;
