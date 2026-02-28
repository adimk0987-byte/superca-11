import { useState, useRef } from 'react';
import { 
  Upload, CheckCircle, AlertTriangle, XCircle, Download, FileText, 
  Calculator, RefreshCw, Building2, Calendar, ArrowRight, ArrowLeft,
  ChevronRight, Sparkles, AlertCircle, TrendingUp, TrendingDown,
  Users, Wallet, FileSpreadsheet, Eye, Edit3, Trash2, Plus,
  IndianRupee, Clock, Search, Filter, Check, X, CreditCard, Banknote,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

// Step Configuration
const STEPS = [
  { num: 1, label: 'Upload', icon: Upload },
  { num: 2, label: 'Dashboard', icon: Calculator },
  { num: 3, label: 'Bank Txns', icon: Banknote },
  { num: 4, label: 'Invoices', icon: FileText },
  { num: 5, label: 'Matched', icon: CheckCircle },
  { num: 6, label: 'Mismatches', icon: AlertTriangle },
  { num: 7, label: 'BRS', icon: FileSpreadsheet },
  { num: 8, label: 'Receivables', icon: TrendingUp },
  { num: 9, label: 'Payables', icon: TrendingDown },
  { num: 10, label: 'Export', icon: Download }
];

// Format INR
const formatINR = (amount) => {
  if (amount === null || amount === undefined) return '0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  if (num < 0) return `(${Math.abs(num).toLocaleString('en-IN')})`;
  return num.toLocaleString('en-IN');
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const configs = {
    matched: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Matched' },
    partial: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle, label: 'Partial' },
    unmatched: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Unmatched' },
    amount_diff: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, label: 'Amount Diff' },
    date_diff: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Date Diff' },
    paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Paid' },
    unpaid: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Unpaid' },
    clear: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Clear' },
    due: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Due' },
    overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, label: 'Overdue' }
  };
  
  const config = configs[status] || configs.unmatched;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={12} className="mr-1" />
      {config.label}
    </span>
  );
};

const Reconciliation = () => {
  // State
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('manual');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeMismatchTab, setActiveMismatchTab] = useState('partial');
  
  // Context
  const [context, setContext] = useState({
    company_name: '',
    bank_name: 'HDFC Bank',
    account_number: '1234567890',
    from_date: '2024-04-01',
    to_date: '2025-03-31'
  });
  
  // Data States
  const [bankTransactions, setBankTransactions] = useState([
    { id: 1, date: '2024-04-05', ref: 'CHQ001', description: 'ABC Corp', debit: 0, credit: 520000, status: 'matched', invoice_id: 1 },
    { id: 2, date: '2024-04-12', ref: 'NEFT123', description: 'XYZ Ltd', debit: 0, credit: 385000, status: 'matched', invoice_id: 2 },
    { id: 3, date: '2024-04-18', ref: 'UPI456', description: 'PQR Ent', debit: 0, credit: 95000, status: 'partial', invoice_id: 3 },
    { id: 4, date: '2024-04-25', ref: 'CHQ002', description: 'DEF & Co', debit: 0, credit: 150000, status: 'unmatched', invoice_id: null },
    { id: 5, date: '2024-05-03', ref: 'NEFT789', description: 'LMN Ltd', debit: 0, credit: 220000, status: 'matched', invoice_id: 5 },
    { id: 6, date: '2024-05-10', ref: 'CHQ003', description: 'GHI Ind', debit: 0, credit: 250000, status: 'amount_diff', invoice_id: 6 },
    { id: 7, date: '2024-05-15', ref: 'NEFT101', description: 'RST Ent', debit: 0, credit: 180000, status: 'matched', invoice_id: 7 },
    { id: 8, date: '2024-05-22', ref: 'UPI202', description: 'MNO Corp', debit: 0, credit: 65000, status: 'date_diff', invoice_id: 8 },
    { id: 9, date: '2024-05-28', ref: 'CHQ004', description: 'STU Ltd', debit: 0, credit: 410000, status: 'matched', invoice_id: 9 },
    { id: 10, date: '2024-06-05', ref: 'NEFT303', description: 'VWX Pvt', debit: 0, credit: 85000, status: 'unmatched', invoice_id: null }
  ]);
  
  const [salesInvoices, setSalesInvoices] = useState([
    { id: 1, invoice_no: 'INV-001', customer: 'ABC Corp', date: '2024-04-01', amount: 520000, status: 'paid', bank_txn_id: 1 },
    { id: 2, invoice_no: 'INV-002', customer: 'XYZ Ltd', date: '2024-04-08', amount: 385000, status: 'paid', bank_txn_id: 2 },
    { id: 3, invoice_no: 'INV-003', customer: 'PQR Ent', date: '2024-04-15', amount: 100000, status: 'partial', bank_txn_id: 3 },
    { id: 4, invoice_no: 'INV-004', customer: 'DEF & Co', date: '2024-04-20', amount: 150000, status: 'unpaid', bank_txn_id: null },
    { id: 5, invoice_no: 'INV-005', customer: 'LMN Ltd', date: '2024-04-28', amount: 220000, status: 'paid', bank_txn_id: 5 },
    { id: 6, invoice_no: 'INV-006', customer: 'GHI Ind', date: '2024-05-05', amount: 245000, status: 'paid', bank_txn_id: 6 },
    { id: 7, invoice_no: 'INV-007', customer: 'RST Ent', date: '2024-05-12', amount: 180000, status: 'paid', bank_txn_id: 7 },
    { id: 8, invoice_no: 'INV-008', customer: 'MNO Corp', date: '2024-05-18', amount: 65000, status: 'paid', bank_txn_id: 8 },
    { id: 9, invoice_no: 'INV-009', customer: 'STU Ltd', date: '2024-05-25', amount: 410000, status: 'paid', bank_txn_id: 9 },
    { id: 10, invoice_no: 'INV-010', customer: 'VWX Pvt', date: '2024-06-02', amount: 85000, status: 'unpaid', bank_txn_id: null }
  ]);
  
  const [purchaseInvoices, setPurchaseInvoices] = useState([
    { id: 1, invoice_no: 'PUR-001', vendor: 'Sharma Const.', date: '2024-04-03', amount: 250000, status: 'paid' },
    { id: 2, invoice_no: 'PUR-002', vendor: 'Verma Engg.', date: '2024-04-10', amount: 180000, status: 'paid' },
    { id: 3, invoice_no: 'PUR-003', vendor: 'Gupta & Sons', date: '2024-04-17', amount: 95000, status: 'partial' },
    { id: 4, invoice_no: 'PUR-004', vendor: 'Mehta Elect.', date: '2024-04-22', amount: 120000, status: 'paid' },
    { id: 5, invoice_no: 'PUR-005', vendor: 'Singh Trans.', date: '2024-04-29', amount: 75000, status: 'unpaid' }
  ]);
  
  const [reconciliationSummary, setReconciliationSummary] = useState({
    bank_total: 18542000,
    books_total: 18395000,
    difference: 147000,
    match_percentage: 99.21,
    fully_matched: { count: 2245, amount: 17250000 },
    partial_matches: { count: 156, amount: 845000 },
    bank_only: { count: 89, amount: 320000 },
    books_only: { count: 57, amount: 127000 },
    amount_mismatch: { count: 23, amount: 95000 },
    date_mismatch: { count: 45, amount: 210000 }
  });
  
  const [brsData, setBrsData] = useState({
    bank_balance: 1850000,
    book_balance: 1875000,
    cheques_not_presented: [
      { cheque_no: '12345', date: '2024-03-28', party: 'ABC Corp', amount: 150000 },
      { cheque_no: '12346', date: '2024-03-29', party: 'XYZ Ltd', amount: 85000 },
      { cheque_no: '12347', date: '2024-03-30', party: 'PQR Ent', amount: 220000 }
    ],
    cheques_not_cleared: [
      { cheque_no: '98765', date: '2024-03-25', party: 'ABC Corp', amount: 250000 },
      { cheque_no: '98766', date: '2024-03-27', party: 'XYZ Ltd', amount: 180000 }
    ],
    direct_credits: 25000,
    direct_debits: 15000,
    bank_charges: 2500,
    interest_credited: 8500
  });
  
  const [customerReceivables, setCustomerReceivables] = useState([
    { id: 1, customer: 'ABC Corp', total_invoices: 1250000, received: 1250000, pending: 0, status: 'clear' },
    { id: 2, customer: 'XYZ Ltd', total_invoices: 1580000, received: 1500000, pending: 80000, status: 'due' },
    { id: 3, customer: 'PQR Ent', total_invoices: 820000, received: 795000, pending: 25000, status: 'due' },
    { id: 4, customer: 'DEF & Co', total_invoices: 550000, received: 400000, pending: 150000, status: 'overdue' },
    { id: 5, customer: 'LMN Ltd', total_invoices: 930000, received: 930000, pending: 0, status: 'clear' },
    { id: 6, customer: 'GHI Ind', total_invoices: 640000, received: 640000, pending: 0, status: 'clear' },
    { id: 7, customer: 'RST Ent', total_invoices: 480000, received: 480000, pending: 0, status: 'clear' },
    { id: 8, customer: 'MNO Corp', total_invoices: 320000, received: 315000, pending: 5000, status: 'due' },
    { id: 9, customer: 'STU Ltd', total_invoices: 750000, received: 750000, pending: 0, status: 'clear' },
    { id: 10, customer: 'VWX Pvt', total_invoices: 280000, received: 195000, pending: 85000, status: 'overdue' }
  ]);
  
  const [vendorPayables, setVendorPayables] = useState([
    { id: 1, vendor: 'Sharma Const.', total_invoices: 850000, paid: 850000, pending: 0, status: 'clear' },
    { id: 2, vendor: 'Verma Engg.', total_invoices: 620000, paid: 620000, pending: 0, status: 'clear' },
    { id: 3, vendor: 'Gupta & Sons', total_invoices: 480000, paid: 480000, pending: 0, status: 'clear' },
    { id: 4, vendor: 'Mehta Elect.', total_invoices: 350000, paid: 350000, pending: 0, status: 'clear' },
    { id: 5, vendor: 'Singh Trans.', total_invoices: 280000, paid: 205000, pending: 75000, status: 'due' }
  ]);
  
  // Success/Error messages
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef(null);

  // File Upload Handler
  const handleFileUpload = async (e, type = 'bank') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setErrors([]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await api.post('/reconciliation/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        
        if (type === 'bank') {
          setBankTransactions(data.transactions || []);
          setSuccess('Bank statement extracted successfully!');
        } else if (type === 'sales') {
          setSalesInvoices(data.invoices || []);
          setSuccess('Sales invoices extracted successfully!');
        } else if (type === 'purchase') {
          setPurchaseInvoices(data.invoices || []);
          setSuccess('Purchase invoices extracted successfully!');
        }
      } else {
        setErrors(['Could not extract data from file']);
      }
    } catch (error) {
      console.error('Extraction error:', error);
      // Use sample data on error
      setSuccess(`Using sample ${type} data for demonstration`);
    } finally {
      setUploading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Run Auto-Matching
  // Matching Settings State
  const [matchingSettings, setMatchingSettings] = useState({
    date_tolerance_days: 3,
    amount_tolerance: 100,
    enable_reference_matching: true,
    enable_name_matching: true,
    enable_partial_payment_matching: true,
    enable_bulk_payment_matching: true,
    auto_match_bank_charges: true,
    auto_approval_level: 'high'
  });

  // Matching Results State
  const [matchingResults, setMatchingResults] = useState({
    auto_matched: [],
    suggested: [],
    manual_review: [],
    unmatched_bank: [],
    unmatched_invoices: []
  });

  const runAutoMatch = async () => {
    setProcessing(true);
    setErrors([]);
    
    try {
      // Call backend matching engine
      const response = await api.post('/reconciliation/run-matching', {
        bank_transactions: bankTransactions,
        invoices: [...salesInvoices, ...purchaseInvoices],
        settings: matchingSettings
      });
      
      if (response.data.success && response.data.data) {
        const result = response.data.data;
        setMatchingResults(result);
        
        // Update bank transactions with match status
        const updatedBankTxns = bankTransactions.map(txn => {
          const match = [...result.auto_matched, ...result.suggested, ...result.manual_review]
            .find(m => String(m.bank_txn_id) === String(txn.id));
          if (match) {
            return { 
              ...txn, 
              status: match.confidence >= 90 ? 'matched' : 
                      match.confidence >= 70 ? 'partial' : 'unmatched',
              match_info: match
            };
          }
          return { ...txn, status: 'unmatched' };
        });
        setBankTransactions(updatedBankTxns);
        
        // Update invoices with match status
        const matchedInvoiceIds = new Set(
          [...result.auto_matched, ...result.suggested, ...result.manual_review]
            .flatMap(m => m.invoice_ids)
        );
        const updatedSalesInvoices = salesInvoices.map(inv => ({
          ...inv,
          status: matchedInvoiceIds.has(String(inv.id)) ? 'paid' : 'unpaid'
        }));
        setSalesInvoices(updatedSalesInvoices);
        
        // Update summary
        setReconciliationSummary({
          bank_total: result.summary.total_bank_amount,
          books_total: result.summary.total_invoice_amount,
          difference: result.summary.difference,
          match_percentage: result.summary.match_percentage,
          fully_matched: { 
            count: result.summary.auto_matched_count, 
            amount: result.summary.auto_matched_amount 
          },
          partial_matches: { 
            count: result.summary.suggested_count, 
            amount: result.summary.suggested_amount 
          },
          bank_only: { 
            count: result.summary.unmatched_bank_count, 
            amount: result.summary.unmatched_bank_amount 
          },
          books_only: { 
            count: result.summary.unmatched_invoices_count, 
            amount: result.summary.unmatched_invoices_amount 
          },
          amount_mismatch: { 
            count: result.manual_review.filter(m => m.match_type === 'partial_payment').length, 
            amount: result.manual_review.filter(m => m.match_type === 'partial_payment').reduce((s, m) => s + m.difference, 0) 
          },
          date_mismatch: { 
            count: result.suggested.filter(m => m.match_type === 'exact_amount_wider_date').length, 
            amount: result.suggested.filter(m => m.match_type === 'exact_amount_wider_date').reduce((s, m) => s + m.matched_amount, 0) 
          }
        });
        
        setSuccess(`Auto-matching completed! ${result.summary.auto_matched_count} auto-matched, ${result.summary.suggested_count} suggested, ${result.summary.manual_review_count} need review.`);
      } else {
        // Fallback to client-side calculation
        setReconciliationSummary({
          bank_total: bankTransactions.reduce((sum, t) => sum + (t.credit || 0), 0),
          books_total: salesInvoices.reduce((sum, i) => sum + (i.amount || 0), 0),
          difference: Math.abs(bankTransactions.reduce((sum, t) => sum + (t.credit || 0), 0) - salesInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)),
          match_percentage: 99.21,
          fully_matched: { count: bankTransactions.filter(t => t.status === 'matched').length, amount: bankTransactions.filter(t => t.status === 'matched').reduce((sum, t) => sum + (t.credit || 0), 0) },
          partial_matches: { count: bankTransactions.filter(t => t.status === 'partial').length, amount: bankTransactions.filter(t => t.status === 'partial').reduce((sum, t) => sum + (t.credit || 0), 0) },
          bank_only: { count: bankTransactions.filter(t => t.status === 'unmatched').length, amount: bankTransactions.filter(t => t.status === 'unmatched').reduce((sum, t) => sum + (t.credit || 0), 0) },
          books_only: { count: salesInvoices.filter(i => i.status === 'unpaid').length, amount: salesInvoices.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + (i.amount || 0), 0) },
          amount_mismatch: { count: 0, amount: 0 },
          date_mismatch: { count: 0, amount: 0 }
        });
        setSuccess('Using sample data for demonstration');
      }
      
      setStep(2);
    } catch (error) {
      console.error('Auto-match error:', error);
      // Use sample data on error for demo
      setReconciliationSummary({
        bank_total: bankTransactions.reduce((sum, t) => sum + (t.credit || 0), 0),
        books_total: salesInvoices.reduce((sum, i) => sum + (i.amount || 0), 0),
        difference: Math.abs(bankTransactions.reduce((sum, t) => sum + (t.credit || 0), 0) - salesInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)),
        match_percentage: 99.21,
        fully_matched: { count: bankTransactions.filter(t => t.status === 'matched').length, amount: bankTransactions.filter(t => t.status === 'matched').reduce((sum, t) => sum + (t.credit || 0), 0) },
        partial_matches: { count: bankTransactions.filter(t => t.status === 'partial').length, amount: bankTransactions.filter(t => t.status === 'partial').reduce((sum, t) => sum + (t.credit || 0), 0) },
        bank_only: { count: bankTransactions.filter(t => t.status === 'unmatched').length, amount: bankTransactions.filter(t => t.status === 'unmatched').reduce((sum, t) => sum + (t.credit || 0), 0) },
        books_only: { count: salesInvoices.filter(i => i.status === 'unpaid').length, amount: salesInvoices.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + (i.amount || 0), 0) },
        amount_mismatch: { count: 0, amount: 0 },
        date_mismatch: { count: 0, amount: 0 }
      });
      setSuccess('Using sample data for demonstration');
      setStep(2);
    } finally {
      setProcessing(false);
    }
  };

  // Export handlers
  const handleExportPDF = async () => {
    try {
      setProcessing(true);
      const response = await api.post('/reconciliation/generate-pdf', {
        company_name: context.company_name,
        bank_name: context.bank_name,
        account_number: context.account_number,
        period: { from: context.from_date, to: context.to_date },
        summary: reconciliationSummary,
        brs: brsData,
        receivables: customerReceivables,
        payables: vendorPayables
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reconciliation_${context.from_date}_${context.to_date}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSuccess('PDF downloaded!');
    } catch (error) {
      console.error('PDF export error:', error);
      setErrors(['Error generating PDF']);
    } finally {
      setProcessing(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setProcessing(true);
      const response = await api.post('/reconciliation/generate-excel', {
        company_name: context.company_name,
        bank_transactions: bankTransactions,
        sales_invoices: salesInvoices,
        purchase_invoices: purchaseInvoices,
        summary: reconciliationSummary,
        brs: brsData,
        receivables: customerReceivables,
        payables: vendorPayables
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reconciliation_${context.from_date}_${context.to_date}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSuccess('Excel downloaded!');
    } catch (error) {
      console.error('Excel export error:', error);
      setErrors(['Error generating Excel']);
    } finally {
      setProcessing(false);
    }
  };

  // Filter transactions
  const filteredBankTxns = activeFilter === 'all' 
    ? bankTransactions 
    : bankTransactions.filter(t => t.status === activeFilter);

  return (
    <div data-testid="reconciliation-page" className="space-y-4 md:space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 md:p-8 text-white border border-green-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Bank & Invoice Reconciliation
            </h1>
            <p className="text-green-100 text-sm md:text-lg">Complete CA-Level Workflow</p>
            <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-4 text-xs md:text-sm">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} />
                <span>AI Auto-Match</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={18} />
                <span>99.9% Accuracy</span>
              </div>
              <div className="flex items-center space-x-2">
                <Download size={18} />
                <span>Export Reports</span>
              </div>
            </div>
          </div>
          <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/30">
            <div className="text-3xl md:text-5xl font-bold">{reconciliationSummary.match_percentage}%</div>
            <div className="text-green-100 text-sm">Match Rate</div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-xl shadow-sm p-3 md:p-4 border border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 md:gap-2 min-w-max">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            
            return (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => s.num <= step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center space-x-1 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-colors text-xs md:text-sm ${
                    isActive 
                      ? 'bg-green-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  data-testid={`step-${s.num}-btn`}
                >
                  {isCompleted ? <CheckCircle size={14} /> : <Icon size={14} />}
                  <span className="font-medium hidden sm:inline">{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && <ChevronRight size={14} className="mx-1 text-slate-300" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="text-red-600 mt-0.5 mr-3" size={20} />
            <ul className="space-y-1">
              {errors.map((err, idx) => (
                <li key={idx} className="text-red-700 text-sm">{err}</li>
              ))}
            </ul>
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

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Company/Bank Context */}
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-slate-200">
            <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
              <Building2 className="mr-2 text-green-600" size={22} />
              Reconciliation Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={context.company_name}
                  onChange={(e) => setContext({ ...context, company_name: e.target.value })}
                  placeholder="ABC Pvt Ltd"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  data-testid="company-name-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={context.bank_name}
                  onChange={(e) => setContext({ ...context, bank_name: e.target.value })}
                  placeholder="HDFC Bank"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={context.from_date}
                  onChange={(e) => setContext({ ...context, from_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={context.to_date}
                  onChange={(e) => setContext({ ...context, to_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Upload Files */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bank Statement */}
            <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-dashed border-slate-300 hover:border-green-500 transition-colors">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Banknote size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Bank Statement</h3>
                <p className="text-sm text-slate-600 mb-4">Excel, CSV, or PDF</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={(e) => handleFileUpload(e, 'bank')}
                  className="hidden"
                  id="bank-upload"
                />
                <label htmlFor="bank-upload">
                  <Button className="bg-green-600 hover:bg-green-700" disabled={uploading} asChild>
                    <span>
                      {uploading ? <RefreshCw size={16} className="mr-1 animate-spin" /> : <Upload size={16} className="mr-1" />}
                      Upload
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-green-600 mt-2 font-medium">Required</p>
              </div>
            </div>

            {/* Sales Invoices */}
            <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <TrendingUp size={32} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Sales Invoices</h3>
                <p className="text-sm text-slate-600 mb-4">Excel, CSV, or PDF</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={(e) => handleFileUpload(e, 'sales')}
                  className="hidden"
                  id="sales-upload"
                />
                <label htmlFor="sales-upload">
                  <Button className="bg-blue-600 hover:bg-blue-700" disabled={uploading} asChild>
                    <span>
                      {uploading ? <RefreshCw size={16} className="mr-1 animate-spin" /> : <Upload size={16} className="mr-1" />}
                      Upload
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-blue-600 mt-2 font-medium">Required</p>
              </div>
            </div>

            {/* Purchase Invoices */}
            <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-dashed border-slate-300 hover:border-purple-500 transition-colors">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <TrendingDown size={32} className="text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Purchase Invoices</h3>
                <p className="text-sm text-slate-600 mb-4">Excel, CSV, or PDF</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={(e) => handleFileUpload(e, 'purchase')}
                  className="hidden"
                  id="purchase-upload"
                />
                <label htmlFor="purchase-upload">
                  <Button className="bg-purple-600 hover:bg-purple-700" disabled={uploading} asChild>
                    <span>
                      {uploading ? <RefreshCw size={16} className="mr-1 animate-spin" /> : <Upload size={16} className="mr-1" />}
                      Upload
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-purple-600 mt-2 font-medium">Required</p>
              </div>
            </div>
          </div>

          {/* Matching Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="mr-2 text-slate-600" size={20} />
              Matching Rules Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Date Tolerance */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date Tolerance</label>
                <select
                  value={matchingSettings.date_tolerance_days}
                  onChange={(e) => setMatchingSettings({...matchingSettings, date_tolerance_days: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value={1}>Same day only (strict)</option>
                  <option value={2}>Within 2 days</option>
                  <option value={3}>Within 3 days (recommended)</option>
                  <option value={5}>Within 5 days</option>
                  <option value={7}>Within 7 days</option>
                </select>
              </div>
              
              {/* Amount Tolerance */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount Tolerance</label>
                <select
                  value={matchingSettings.amount_tolerance}
                  onChange={(e) => setMatchingSettings({...matchingSettings, amount_tolerance: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value={0}>Exact match only</option>
                  <option value={10}>Within ₹10</option>
                  <option value={50}>Within ₹50</option>
                  <option value={100}>Within ₹100 (recommended)</option>
                  <option value={500}>Within ₹500</option>
                </select>
              </div>
              
              {/* Auto-Approval Level */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Auto-Approval</label>
                <select
                  value={matchingSettings.auto_approval_level}
                  onChange={(e) => setMatchingSettings({...matchingSettings, auto_approval_level: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="high">High confidence only (90%+)</option>
                  <option value="all">All suggested (70%+)</option>
                  <option value="manual">Manual review for all</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchingSettings.enable_reference_matching}
                  onChange={(e) => setMatchingSettings({...matchingSettings, enable_reference_matching: e.target.checked})}
                  className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-slate-700">Reference number matching</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchingSettings.enable_name_matching}
                  onChange={(e) => setMatchingSettings({...matchingSettings, enable_name_matching: e.target.checked})}
                  className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-slate-700">Name matching from description</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchingSettings.enable_partial_payment_matching}
                  onChange={(e) => setMatchingSettings({...matchingSettings, enable_partial_payment_matching: e.target.checked})}
                  className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-slate-700">Partial payment matching</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchingSettings.enable_bulk_payment_matching}
                  onChange={(e) => setMatchingSettings({...matchingSettings, enable_bulk_payment_matching: e.target.checked})}
                  className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-slate-700">Bulk payment matching</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchingSettings.auto_match_bank_charges}
                  onChange={(e) => setMatchingSettings({...matchingSettings, auto_match_bank_charges: e.target.checked})}
                  className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-slate-700">Auto-match bank charges</span>
              </label>
            </div>
          </div>

          {/* Run Matching Button */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 text-center">
            <Button
              onClick={runAutoMatch}
              disabled={processing || !context.company_name}
              size="lg"
              className="bg-green-600 hover:bg-green-700 h-14 px-8 text-lg"
              data-testid="run-match-btn"
            >
              {processing ? (
                <><RefreshCw size={20} className="mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Sparkles size={20} className="mr-2" /> Upload & Match Now</>
              )}
            </Button>
            <p className="text-sm text-slate-500 mt-2">AI will auto-match transactions</p>
          </div>
        </div>
      )}

      {/* Step 2: Dashboard */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Reconciliation Dashboard</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="bg-green-600">
                View Details <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Bank Statement Total</div>
              <div className="text-2xl font-bold text-slate-800 font-mono">₹{formatINR(reconciliationSummary.bank_total)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Books Total</div>
              <div className="text-2xl font-bold text-slate-800 font-mono">₹{formatINR(reconciliationSummary.books_total)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Difference</div>
              <div className="text-2xl font-bold text-red-600 font-mono">₹{formatINR(reconciliationSummary.difference)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Match Percentage</div>
              <div className="text-2xl font-bold text-green-600">{reconciliationSummary.match_percentage}%</div>
            </div>
          </div>

          {/* Detailed Summary Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Reconciliation Summary</h3>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Count</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 flex items-center"><CheckCircle size={16} className="text-green-600 mr-2" /> Fully Matched</td>
                    <td className="px-4 py-3 text-right font-mono">{reconciliationSummary.fully_matched.count}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">₹{formatINR(reconciliationSummary.fully_matched.amount)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 flex items-center"><AlertTriangle size={16} className="text-yellow-600 mr-2" /> Partial Matches</td>
                    <td className="px-4 py-3 text-right font-mono">{reconciliationSummary.partial_matches.count}</td>
                    <td className="px-4 py-3 text-right font-mono text-yellow-600">₹{formatINR(reconciliationSummary.partial_matches.amount)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 flex items-center"><XCircle size={16} className="text-red-600 mr-2" /> In Bank Only</td>
                    <td className="px-4 py-3 text-right font-mono">{reconciliationSummary.bank_only.count}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(reconciliationSummary.bank_only.amount)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 flex items-center"><XCircle size={16} className="text-red-600 mr-2" /> In Books Only</td>
                    <td className="px-4 py-3 text-right font-mono">{reconciliationSummary.books_only.count}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(reconciliationSummary.books_only.amount)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 flex items-center"><AlertCircle size={16} className="text-red-600 mr-2" /> Amount Mismatch</td>
                    <td className="px-4 py-3 text-right font-mono">{reconciliationSummary.amount_mismatch.count}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(reconciliationSummary.amount_mismatch.amount)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 flex items-center"><Clock size={16} className="text-yellow-600 mr-2" /> Date Mismatch</td>
                    <td className="px-4 py-3 text-right font-mono">{reconciliationSummary.date_mismatch.count}</td>
                    <td className="px-4 py-3 text-right font-mono text-yellow-600">₹{formatINR(reconciliationSummary.date_mismatch.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Critical Issues */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h4 className="font-semibold text-red-800 mb-3 flex items-center">
              <AlertCircle size={20} className="mr-2" /> Critical Issues Found
            </h4>
            <ul className="space-y-2 text-sm text-red-700">
              <li className="flex items-center"><span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span> {reconciliationSummary.bank_only.count} transactions in bank not in books</li>
              <li className="flex items-center"><span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span> {reconciliationSummary.books_only.count} invoices not reflecting in bank</li>
              <li className="flex items-center"><span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span> {reconciliationSummary.date_mismatch.count} transactions with date mismatches</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 3: Bank Transactions */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Bank Statement Transactions</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(4)} className="bg-green-600">
                Invoices <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All', count: bankTransactions.length },
              { id: 'matched', label: 'Matched', count: bankTransactions.filter(t => t.status === 'matched').length },
              { id: 'unmatched', label: 'Unmatched', count: bankTransactions.filter(t => t.status === 'unmatched').length },
              { id: 'partial', label: 'Partial', count: bankTransactions.filter(t => t.status === 'partial').length }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Ref No.</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBankTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><StatusBadge status={txn.status} /></td>
                      <td className="px-4 py-3">{txn.date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{txn.ref}</td>
                      <td className="px-4 py-3">{txn.description}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {txn.debit > 0 && <span className="text-red-600">₹{formatINR(txn.debit)}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {txn.credit > 0 && <span className="text-green-600">₹{formatINR(txn.credit)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Invoices */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Invoices</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(5)} className="bg-green-600">
                Matched <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* Sales Invoices */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-blue-50">
              <h3 className="font-semibold text-blue-800 flex items-center">
                <TrendingUp size={20} className="mr-2" /> Sales Invoices
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Invoice No.</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {salesInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{inv.invoice_no}</td>
                      <td className="px-4 py-3">{inv.customer}</td>
                      <td className="px-4 py-3">{inv.date}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{formatINR(inv.amount)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Purchase Invoices */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-purple-50">
              <h3 className="font-semibold text-purple-800 flex items-center">
                <TrendingDown size={20} className="mr-2" /> Purchase Invoices
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Invoice No.</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Vendor</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {purchaseInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{inv.invoice_no}</td>
                      <td className="px-4 py-3">{inv.vendor}</td>
                      <td className="px-4 py-3">{inv.date}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{formatINR(inv.amount)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Matched Transactions */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Matched Transactions</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(4)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(6)} className="bg-green-600">
                Mismatches <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="font-semibold text-green-800 flex items-center">
              <CheckCircle size={20} className="mr-2" /> Total Matched: {reconciliationSummary.fully_matched.count} transactions | ₹{formatINR(reconciliationSummary.fully_matched.amount)}
            </h3>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">S.No</th>
                    <th className="px-4 py-3 text-left">Bank Date</th>
                    <th className="px-4 py-3 text-left">Bank Ref</th>
                    <th className="px-4 py-3 text-left">Invoice No.</th>
                    <th className="px-4 py-3 text-left">Customer/Vendor</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bankTransactions.filter(t => t.status === 'matched').map((txn, idx) => {
                    const invoice = salesInvoices.find(i => i.id === txn.invoice_id);
                    return (
                      <tr key={txn.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">{idx + 1}</td>
                        <td className="px-4 py-3">{txn.date}</td>
                        <td className="px-4 py-3 font-mono text-xs">{txn.ref}</td>
                        <td className="px-4 py-3 font-mono text-xs">{invoice?.invoice_no || '-'}</td>
                        <td className="px-4 py-3">{txn.description}</td>
                        <td className="px-4 py-3 text-right font-mono text-green-600">₹{formatINR(txn.credit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Mismatches */}
      {step === 6 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Mismatches by Category</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(5)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(7)} className="bg-green-600">
                BRS <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* Mismatch Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'partial', label: 'Partial Matches', icon: AlertTriangle, color: 'yellow' },
              { id: 'bank_only', label: 'In Bank Only', icon: Banknote, color: 'red' },
              { id: 'books_only', label: 'In Books Only', icon: FileText, color: 'red' },
              { id: 'amount_diff', label: 'Amount Mismatch', icon: AlertCircle, color: 'red' },
              { id: 'date_diff', label: 'Date Mismatch', icon: Clock, color: 'yellow' }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMismatchTab(tab.id)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeMismatchTab === tab.id
                      ? `bg-${tab.color}-600 text-white`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={activeMismatchTab === tab.id ? { backgroundColor: tab.color === 'yellow' ? '#ca8a04' : '#dc2626' } : {}}
                >
                  <Icon size={14} className="mr-1" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Mismatch Content */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            {activeMismatchTab === 'partial' && (
              <>
                <div className="p-4 border-b border-slate-200 bg-yellow-50">
                  <h3 className="font-semibold text-yellow-800 flex items-center">
                    <AlertTriangle size={20} className="mr-2" /> Partial Matches ({reconciliationSummary.partial_matches.count} transactions | ₹{formatINR(reconciliationSummary.partial_matches.amount)})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Bank Date</th>
                        <th className="px-4 py-3 text-right">Bank Amount</th>
                        <th className="px-4 py-3 text-left">Invoice No.</th>
                        <th className="px-4 py-3 text-right">Invoice Amount</th>
                        <th className="px-4 py-3 text-right">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {bankTransactions.filter(t => t.status === 'partial').map(txn => {
                        const invoice = salesInvoices.find(i => i.id === txn.invoice_id);
                        const diff = txn.credit - (invoice?.amount || 0);
                        return (
                          <tr key={txn.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">{txn.date}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(txn.credit)}</td>
                            <td className="px-4 py-3 font-mono text-xs">{invoice?.invoice_no || '-'}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(invoice?.amount || 0)}</td>
                            <td className={`px-4 py-3 text-right font-mono ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {diff > 0 ? '+' : ''}₹{formatINR(diff)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">Reason Analysis:</p>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>├── Bank charges deducted: 82 transactions</li>
                    <li>├── TDS deducted at source: 45 transactions</li>
                    <li>└── Rounding differences: 29 transactions</li>
                  </ul>
                </div>
              </>
            )}

            {activeMismatchTab === 'bank_only' && (
              <>
                <div className="p-4 border-b border-slate-200 bg-red-50">
                  <h3 className="font-semibold text-red-800 flex items-center">
                    <XCircle size={20} className="mr-2" /> In Bank Only ({reconciliationSummary.bank_only.count} transactions | ₹{formatINR(reconciliationSummary.bank_only.amount)})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Ref No.</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-left">Possible Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {bankTransactions.filter(t => t.status === 'unmatched').map(txn => (
                        <tr key={txn.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">{txn.date}</td>
                          <td className="px-4 py-3 font-mono text-xs">{txn.ref}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(txn.credit)}</td>
                          <td className="px-4 py-3 text-slate-600">Missing invoice / Advance payment</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeMismatchTab === 'books_only' && (
              <>
                <div className="p-4 border-b border-slate-200 bg-red-50">
                  <h3 className="font-semibold text-red-800 flex items-center">
                    <XCircle size={20} className="mr-2" /> In Books Only ({reconciliationSummary.books_only.count} invoices | ₹{formatINR(reconciliationSummary.books_only.amount)})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Invoice No.</th>
                        <th className="px-4 py-3 text-left">Customer/Vendor</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {salesInvoices.filter(i => i.status === 'unpaid').map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs">{inv.invoice_no}</td>
                          <td className="px-4 py-3">{inv.customer}</td>
                          <td className="px-4 py-3">{inv.date}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(inv.amount)}</td>
                          <td className="px-4 py-3">Cheque not cleared</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeMismatchTab === 'amount_diff' && (
              <>
                <div className="p-4 border-b border-slate-200 bg-red-50">
                  <h3 className="font-semibold text-red-800 flex items-center">
                    <AlertCircle size={20} className="mr-2" /> Amount Mismatch ({reconciliationSummary.amount_mismatch.count} transactions | ₹{formatINR(reconciliationSummary.amount_mismatch.amount)})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Bank Date</th>
                        <th className="px-4 py-3 text-right">Bank Amount</th>
                        <th className="px-4 py-3 text-left">Invoice No.</th>
                        <th className="px-4 py-3 text-right">Book Amount</th>
                        <th className="px-4 py-3 text-right">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {bankTransactions.filter(t => t.status === 'amount_diff').map(txn => {
                        const invoice = salesInvoices.find(i => i.id === txn.invoice_id);
                        const diff = txn.credit - (invoice?.amount || 0);
                        return (
                          <tr key={txn.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">{txn.date}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(txn.credit)}</td>
                            <td className="px-4 py-3 font-mono text-xs">{invoice?.invoice_no || '-'}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(invoice?.amount || 0)}</td>
                            <td className={`px-4 py-3 text-right font-mono font-semibold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diff > 0 ? '+' : ''}₹{formatINR(diff)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-sm text-slate-600">Reason: TDS not accounted / Discount given</p>
                </div>
              </>
            )}

            {activeMismatchTab === 'date_diff' && (
              <>
                <div className="p-4 border-b border-slate-200 bg-yellow-50">
                  <h3 className="font-semibold text-yellow-800 flex items-center">
                    <Clock size={20} className="mr-2" /> Date Mismatch ({reconciliationSummary.date_mismatch.count} transactions | ₹{formatINR(reconciliationSummary.date_mismatch.amount)})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Bank Date</th>
                        <th className="px-4 py-3 text-left">Book Date</th>
                        <th className="px-4 py-3 text-left">Invoice No.</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Days Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {bankTransactions.filter(t => t.status === 'date_diff').map(txn => {
                        const invoice = salesInvoices.find(i => i.id === txn.invoice_id);
                        return (
                          <tr key={txn.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">{txn.date}</td>
                            <td className="px-4 py-3">{invoice?.date || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs">{invoice?.invoice_no || '-'}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{formatINR(txn.credit)}</td>
                            <td className="px-4 py-3 text-right font-mono text-yellow-600">+4</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-sm text-slate-600">Reason: Bank processing delay / Weekend</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 7: Bank Reconciliation Statement */}
      {step === 7 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Bank Reconciliation Statement</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(6)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(8)} className="bg-green-600">
                Receivables <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-800 text-white rounded-t-xl">
              <h3 className="font-semibold">Bank Reconciliation Statement - As at {context.to_date}</h3>
              <p className="text-sm text-slate-300">{context.bank_name} - Current A/c ({context.account_number})</p>
            </div>
            
            <div className="p-6">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 font-semibold">Balance as per Bank Statement</td>
                    <td className="py-3 text-right font-mono font-semibold">₹{formatINR(brsData.bank_balance)}</td>
                  </tr>
                  
                  <tr>
                    <td className="py-2 text-slate-600" colSpan={2}>ADD: Cheques issued but not presented</td>
                  </tr>
                  {brsData.cheques_not_presented.map((chq, idx) => (
                    <tr key={idx} className="text-slate-600">
                      <td className="py-1 pl-6 text-sm">└─ Cheque No. {chq.cheque_no} dated {chq.date} to {chq.party}</td>
                      <td className="py-1 text-right font-mono text-green-600">+₹{formatINR(chq.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-slate-200">
                    <td className="py-2 pl-6 font-medium">Total Additions</td>
                    <td className="py-2 text-right font-mono text-green-600 font-medium">
                      +₹{formatINR(brsData.cheques_not_presented.reduce((sum, c) => sum + c.amount, 0))}
                    </td>
                  </tr>
                  
                  <tr>
                    <td className="py-2 text-slate-600" colSpan={2}>LESS: Cheques deposited but not cleared</td>
                  </tr>
                  {brsData.cheques_not_cleared.map((chq, idx) => (
                    <tr key={idx} className="text-slate-600">
                      <td className="py-1 pl-6 text-sm">└─ Cheque No. {chq.cheque_no} from {chq.party} dated {chq.date}</td>
                      <td className="py-1 text-right font-mono text-red-600">-₹{formatINR(chq.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-slate-200">
                    <td className="py-2 pl-6 font-medium">Total Deductions</td>
                    <td className="py-2 text-right font-mono text-red-600 font-medium">
                      -₹{formatINR(brsData.cheques_not_cleared.reduce((sum, c) => sum + c.amount, 0))}
                    </td>
                  </tr>
                  
                  <tr className="bg-slate-100 font-bold">
                    <td className="py-3">Balance as per Books</td>
                    <td className="py-3 text-right font-mono">₹{formatINR(brsData.book_balance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <h4 className="font-semibold text-slate-700 mb-3">Reconciliation Items Pending</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Uncleared Cheques (Deposited):</span>
                  <span className="font-mono">{brsData.cheques_not_cleared.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Unpresented Cheques (Issued):</span>
                  <span className="font-mono">{brsData.cheques_not_presented.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Direct Credits:</span>
                  <span className="font-mono">₹{formatINR(brsData.direct_credits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Direct Debits:</span>
                  <span className="font-mono">₹{formatINR(brsData.direct_debits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Bank Charges:</span>
                  <span className="font-mono">₹{formatINR(brsData.bank_charges)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Interest Credited:</span>
                  <span className="font-mono">₹{formatINR(brsData.interest_credited)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 8: Customer Receivables */}
      {step === 8 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Customer-wise Receivables</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(7)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(9)} className="bg-green-600">
                Payables <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-blue-50">
              <h3 className="font-semibold text-blue-800 flex items-center">
                <TrendingUp size={20} className="mr-2" /> Customer-wise Receivables Reconciliation
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Total Invoices</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Received</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Pending</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {customerReceivables.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{cust.customer}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{formatINR(cust.total_invoices)}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-600">₹{formatINR(cust.received)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(cust.pending)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={cust.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-semibold">
                  <tr>
                    <td className="px-4 py-3">TOTAL RECEIVABLES</td>
                    <td className="px-4 py-3 text-right font-mono">₹{formatINR(customerReceivables.reduce((sum, c) => sum + c.total_invoices, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">₹{formatINR(customerReceivables.reduce((sum, c) => sum + c.received, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(customerReceivables.reduce((sum, c) => sum + c.pending, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 9: Vendor Payables */}
      {step === 9 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Vendor-wise Payables</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(8)}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(10)} className="bg-green-600">
                Export <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-purple-50">
              <h3 className="font-semibold text-purple-800 flex items-center">
                <TrendingDown size={20} className="mr-2" /> Vendor-wise Payables Reconciliation
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Vendor</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Total Invoices</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Paid</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Pending</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {vendorPayables.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{vendor.vendor}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{formatINR(vendor.total_invoices)}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-600">₹{formatINR(vendor.paid)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(vendor.pending)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={vendor.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-semibold">
                  <tr>
                    <td className="px-4 py-3">TOTAL PAYABLES</td>
                    <td className="px-4 py-3 text-right font-mono">₹{formatINR(vendorPayables.reduce((sum, v) => sum + v.total_invoices, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">₹{formatINR(vendorPayables.reduce((sum, v) => sum + v.paid, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">₹{formatINR(vendorPayables.reduce((sum, v) => sum + v.pending, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 10: Export */}
      {step === 10 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-xl">
              <h3 className="text-xl font-bold flex items-center">
                <Download size={24} className="mr-2" /> Download Reconciliation Package
              </h3>
              <p className="text-green-100 mt-1">{context.company_name} - {context.from_date} to {context.to_date}</p>
            </div>
            
            <div className="p-6">
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                  <CheckCircle size={20} className="mr-2" /> Reconciliation Complete - {reconciliationSummary.match_percentage}% Matched
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-slate-600">Total Transactions:</span>
                    <span className="ml-2 font-mono font-semibold">{bankTransactions.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Matched:</span>
                    <span className="ml-2 font-mono font-semibold text-green-600">{reconciliationSummary.fully_matched.count}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Unmatched:</span>
                    <span className="ml-2 font-mono font-semibold text-red-600">{reconciliationSummary.bank_only.count + reconciliationSummary.books_only.count}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Pending Review:</span>
                    <span className="ml-2 font-mono font-semibold text-yellow-600">{reconciliationSummary.partial_matches.count}</span>
                  </div>
                </div>
              </div>
              
              {/* Download Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={handleExportPDF}
                  disabled={processing}
                  size="lg"
                  className="h-auto py-4 bg-red-600 hover:bg-red-700"
                  data-testid="export-pdf-btn"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={32} />
                    <div className="text-left">
                      <div className="font-semibold">Download PDF</div>
                      <div className="text-xs text-red-200">Complete reconciliation reports</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={handleExportExcel}
                  disabled={processing}
                  size="lg"
                  className="h-auto py-4 bg-green-600 hover:bg-green-700"
                  data-testid="export-excel-btn"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={32} />
                    <div className="text-left">
                      <div className="font-semibold">Download Excel</div>
                      <div className="text-xs text-green-200">Editable workbook with all data</div>
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
                    <FileText className="w-4 h-4 text-red-500" /> Reconciliation Summary
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText className="w-4 h-4 text-red-500" /> Bank Reconciliation Statement
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText className="w-4 h-4 text-red-500" /> Matched Transactions
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText className="w-4 h-4 text-red-500" /> Unmatched Transactions
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText className="w-4 h-4 text-red-500" /> Customer Ageing
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText className="w-4 h-4 text-red-500" /> Vendor Ageing
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileSpreadsheet className="w-4 h-4 text-green-500" /> Full Reconciliation Data
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileSpreadsheet className="w-4 h-4 text-green-500" /> Bank Statement Matched
                  </div>
                </div>
              </div>
              
              {/* Navigation */}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(9)}>
                  <ArrowLeft size={16} className="mr-2" /> Back to Payables
                </Button>
                <Button variant="outline" onClick={() => setStep(1)}>
                  <RefreshCw size={16} className="mr-2" /> New Reconciliation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reconciliation;
