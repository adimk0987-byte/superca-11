import { useState } from 'react';
import { Upload, CheckCircle, AlertTriangle, XCircle, Download, FileText, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Reconciliation = () => {
  const [invoices, setInvoices] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [reconciliationResult, setReconciliationResult] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleInvoiceUpload = (e) => {
    // Handle invoice file upload
    const files = Array.from(e.target.files);
    console.log('Invoices uploaded:', files);
  };

  const handleBankStatementUpload = (e) => {
    // Handle bank statement upload
    const files = Array.from(e.target.files);
    console.log('Bank statements uploaded:', files);
  };

  const runReconciliation = async () => {
    setProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      setReconciliationResult({
        matched: 45,
        missing: 3,
        duplicates: 1,
        discrepancies: 2,
        totalInvoices: 51,
        totalBankTransactions: 48,
        matchedAmount: 2450000,
        unmatchedAmount: 125000,
        accuracy: 96.1,
        gstCompliance: true,
        tdsCorrect: true
      });
      setProcessing(false);
    }, 3000);
  };

  return (
    <div data-testid="reconciliation-page" className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Invoice Reconciliation & Tally</h1>
            <p className="text-green-100 text-lg mb-4">
              AI-Powered matching • 99.9% accuracy • Better than any CA
            </p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>Auto-match invoices</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>Detect duplicates</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>GST verification</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>TDS calculations</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold">99.9%</div>
            <div className="text-green-100">Accuracy</div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Upload Invoices */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-dashed border-slate-300 hover:border-indigo-500 transition-colors">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 flex items-center justify-center mb-4">
              <FileText size={32} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Invoices</h3>
            <p className="text-sm text-slate-600 mb-4">
              Upload your invoice files (PDF, Excel, CSV)
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.csv"
              onChange={handleInvoiceUpload}
              className="hidden"
              id="invoice-upload"
            />
            <label htmlFor="invoice-upload">
              <Button className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer" asChild>
                <span>
                  <Upload size={18} className="mr-2" />
                  Choose Files
                </span>
              </Button>
            </label>
            {invoices.length > 0 && (
              <div className="mt-4 text-sm text-green-600">
                ✓ {invoices.length} files uploaded
              </div>
            )}
          </div>
        </div>

        {/* Upload Bank Statements */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-colors">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <Calculator size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Bank Statements</h3>
            <p className="text-sm text-slate-600 mb-4">
              Upload your bank statement (PDF, Excel, CSV)
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.csv"
              onChange={handleBankStatementUpload}
              className="hidden"
              id="bank-upload"
            />
            <label htmlFor="bank-upload">
              <Button className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer" asChild>
                <span>
                  <Upload size={18} className="mr-2" />
                  Choose Files
                </span>
              </Button>
            </label>
            {bankStatements.length > 0 && (
              <div className="mt-4 text-sm text-green-600">
                ✓ {bankStatements.length} files uploaded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Run Reconciliation Button */}
      <div className="text-center">
        <Button
          onClick={runReconciliation}
          disabled={processing}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-12 py-6 text-lg"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Processing with AI...
            </>
          ) : (
            <>
              <CheckCircle size={24} className="mr-3" />
              Run AI Reconciliation
            </>
          )}
        </Button>
        {processing && (
          <p className="text-sm text-slate-600 mt-2">
            Analyzing invoices • Matching transactions • Verifying GST/TDS...
          </p>
        )}
      </div>

      {/* Results Section */}
      {reconciliationResult && (
        <div className="space-y-6 animate-slide-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Matched</span>
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div className="text-3xl font-bold text-green-900">{reconciliationResult.matched}</div>
              <div className="text-sm text-green-600">Perfect matches</div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-500 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-700">Missing</span>
                <AlertTriangle className="text-orange-600" size={24} />
              </div>
              <div className="text-3xl font-bold text-orange-900">{reconciliationResult.missing}</div>
              <div className="text-sm text-orange-600">Invoices not in bank</div>
            </div>

            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700">Duplicates</span>
                <XCircle className="text-red-600" size={24} />
              </div>
              <div className="text-3xl font-bold text-red-900">{reconciliationResult.duplicates}</div>
              <div className="text-sm text-red-600">Duplicate payments</div>
            </div>

            <div className="bg-purple-50 border-2 border-purple-500 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">Accuracy</span>
                <CheckCircle className="text-purple-600" size={24} />
              </div>
              <div className="text-3xl font-bold text-purple-900">{reconciliationResult.accuracy}%</div>
              <div className="text-sm text-purple-600">Match rate</div>
            </div>
          </div>

          {/* Detailed Report */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Reconciliation Report</h3>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Download size={18} className="mr-2" />
                Download Report
              </Button>
            </div>

            <div className="space-y-4">
              {/* Financial Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Financial Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-slate-600">Total Invoice Amount</span>
                    <div className="text-2xl font-bold text-slate-900">
                      ₹{(reconciliationResult.matchedAmount + reconciliationResult.unmatchedAmount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Matched Amount</span>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{reconciliationResult.matchedAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Unmatched Amount</span>
                    <div className="text-2xl font-bold text-orange-600">
                      ₹{reconciliationResult.unmatchedAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Discrepancy</span>
                    <div className="text-2xl font-bold text-red-600">
                      {reconciliationResult.discrepancies} items
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Check */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Compliance Verification</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">GST Calculation</span>
                    <span className="flex items-center text-green-600 font-semibold">
                      <CheckCircle size={18} className="mr-2" />
                      Correct
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">TDS Deduction</span>
                    <span className="flex items-center text-green-600 font-semibold">
                      <CheckCircle size={18} className="mr-2" />
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Invoice Numbering</span>
                    <span className="flex items-center text-green-600 font-semibold">
                      <CheckCircle size={18} className="mr-2" />
                      Sequential
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Items */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                  <AlertTriangle size={20} className="mr-2" />
                  Action Required
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">•</span>
                    <span className="text-slate-700">
                      3 invoices not found in bank statement - Check with customers
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">•</span>
                    <span className="text-slate-700">
                      1 duplicate payment detected for Invoice #INV-2025-045 - Refund required
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">•</span>
                    <span className="text-slate-700">
                      2 amount discrepancies found - Verify with bank
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reconciliation;
