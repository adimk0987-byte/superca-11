import { useState } from 'react';
import { Upload, FileText, TrendingDown, CheckCircle, Calculator, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadForm16, calculateTax, fileITR } from '@/services/api';

const ITRFiling = () => {
  const [form16File, setForm16File] = useState(null);
  const [form16Uploaded, setForm16Uploaded] = useState(false);
  const [form16Data, setForm16Data] = useState(null);
  const [itrCalculated, setItrCalculated] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [itrId, setItrId] = useState(null);
  
  const [taxData, setTaxData] = useState(null);

  const handleForm16Upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setForm16File(file);
    setProcessing(true);
    setError('');
    
    try {
      const response = await uploadForm16(file);
      if (response.data.success) {
        setForm16Data(response.data.data);
        setForm16Uploaded(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload Form-16. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const calculateITR = async () => {
    if (!form16Data) return;
    
    setProcessing(true);
    setError('');
    
    try {
      const response = await calculateTax(form16Data);
      if (response.data.success) {
        setTaxData(response.data.calculation);
        setItrId(response.data.itr_id);
        setItrCalculated(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate tax. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileITR = async () => {
    if (!itrId) return;
    
    setProcessing(true);
    setError('');
    
    try {
      await fileITR(itrId);
      alert('ITR marked as filed successfully! 🎉');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to file ITR.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Income Tax Return (ITR) Filing</h1>
            <p className="text-blue-100 text-lg">
              AI-powered • Auto-scan Form-16 • Best regime suggestion • File in 5 minutes
            </p>
            <div className="flex items-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>Form-16 auto-scan</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>Regime comparison</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>Max deductions</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>Direct e-filing</span>
              </div>
            </div>
          </div>
          <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <div className="text-5xl font-bold mb-2">5 min</div>
            <div className="text-blue-100">Complete filing</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-red-800 flex items-center space-x-3">
          <AlertTriangle size={24} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Upload Form-16 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-dashed border-blue-300">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <FileText size={40} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Form-16</h3>
          <p className="text-slate-600 mb-4">
            AI will automatically extract all income and tax details
          </p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleForm16Upload}
            className="hidden"
            id="form16-upload"
            disabled={processing}
          />
          <label htmlFor="form16-upload">
            <Button className="bg-blue-600 hover:bg-blue-700 cursor-pointer" asChild disabled={processing}>
              <span>
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Scanning Form-16...
                  </>
                ) : (
                  <>
                    <Upload size={18} className="mr-2" />
                    {form16Uploaded ? 'Re-upload Form-16' : 'Upload Form-16 (PDF/Image)'}
                  </>
                )}
              </span>
            </Button>
          </label>
          {form16Uploaded && (
            <div className="mt-4 text-sm text-green-600 flex items-center justify-center">
              <CheckCircle size={16} className="mr-2" />
              Form-16 scanned successfully! All data extracted.
            </div>
          )}
        </div>
      </div>

      {/* Calculate ITR */}
      {form16Uploaded && !itrCalculated && (
        <div className="text-center">
          <Button
            onClick={calculateITR}
            disabled={processing}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-6 text-lg"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Calculating optimal tax...
              </>
            ) : (
              <>
                <Calculator size={24} className="mr-3" />
                Calculate My Tax
              </>
            )}
          </Button>
        </div>
      )}

      {/* Results */}
      {itrCalculated && taxData && (
        <div className="space-y-6 animate-slide-in">
          {/* Regime Comparison */}
          <div className="grid grid-cols-2 gap-6">
            {/* Old Regime */}
            <div className={`bg-white rounded-xl shadow-lg p-6 border-2 ${
              taxData.suggested_regime === 'old' ? 'border-green-400' : 'border-slate-200'
            }`}>
              {taxData.suggested_regime === 'old' && (
                <div className="absolute -top-3 -right-3 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
                  RECOMMENDED ⭐
                </div>
              )}
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Old Tax Regime</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Gross Income</span>
                  <span className="font-semibold">₹{taxData.gross_income.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Deductions (80C, etc.)</span>
                  <span className="font-semibold text-green-600">-₹{taxData.total_deductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-slate-600">Taxable Income</span>
                  <span className="font-bold">₹{taxData.taxable_income_old.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 rounded-lg p-3">
                  <span className="font-semibold text-slate-900">Tax Payable</span>
                  <span className="text-2xl font-bold text-red-600">₹{Math.round(taxData.old_regime_tax).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* New Regime */}
            <div className={`rounded-xl shadow-2xl p-6 border-2 relative ${
              taxData.suggested_regime === 'new' 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white border-green-400' 
                : 'bg-white border-slate-200'
            }`}>
              {taxData.suggested_regime === 'new' && (
                <div className="absolute -top-3 -right-3 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
                  RECOMMENDED ⭐
                </div>
              )}
              <h3 className={`text-lg font-semibold mb-4 ${taxData.suggested_regime === 'new' ? 'text-white' : 'text-slate-900'}`}>
                New Tax Regime
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={taxData.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Gross Income</span>
                  <span className="font-semibold">₹{taxData.gross_income.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={taxData.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Standard Deduction</span>
                  <span className="font-semibold">-₹{taxData.standard_deduction.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between border-t pt-3 ${taxData.suggested_regime === 'new' ? 'border-green-400' : 'border-slate-200'}`}>
                  <span className={taxData.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Taxable Income</span>
                  <span className="font-bold">₹{taxData.taxable_income_new.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between items-center rounded-lg p-3 ${
                  taxData.suggested_regime === 'new' ? 'bg-white/20 backdrop-blur-sm' : 'bg-slate-50'
                }`}>
                  <span className="font-semibold">Tax Payable</span>
                  <span className={`text-2xl font-bold ${taxData.suggested_regime === 'new' ? 'text-white' : 'text-red-600'}`}>
                    ₹{Math.round(taxData.new_regime_tax).toLocaleString()}
                  </span>
                </div>
                {taxData.suggested_regime === 'new' && (
                  <div className="bg-yellow-400 text-slate-900 rounded-lg p-3 text-center font-bold mt-4">
                    💰 YOU SAVE: ₹{Math.round(taxData.savings).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          {taxData.recommendations && taxData.recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
                <TrendingDown size={24} className="mr-2" />
                AI Tax Saving Recommendations
              </h3>
              <div className="space-y-3">
                {taxData.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 flex items-start space-x-3">
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                    <div className="text-sm text-slate-700">{rec}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={handleFileITR}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
            >
              <CheckCircle size={20} className="mr-2" />
              File ITR with {taxData.suggested_regime === 'new' ? 'New' : 'Old'} Regime
            </Button>
            <Button variant="outline" className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-6 text-lg">
              <Download size={20} className="mr-2" />
              Download Computation Sheet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITRFiling;
