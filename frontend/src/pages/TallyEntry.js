import { useState, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle, Download, Scan, Sparkles, Plus, Trash2,
  AlertCircle, RefreshCw, Eye, Edit3, Save, ArrowRight, ArrowLeft,
  Building2, Calendar, Receipt, IndianRupee, FileSpreadsheet, 
  ChevronDown, ChevronUp, Filter, Search, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

// Voucher Types as per Tally
const VOUCHER_TYPES = [
  { value: 'receipt', label: 'Receipt', category: 'income' },
  { value: 'payment', label: 'Payment', category: 'expense' },
  { value: 'contra', label: 'Contra', category: 'bank' },
  { value: 'journal', label: 'Journal', category: 'adjustment' },
  { value: 'sales', label: 'Sales', category: 'income' },
  { value: 'purchase', label: 'Purchase', category: 'expense' },
  { value: 'debit_note', label: 'Debit Note', category: 'adjustment' },
  { value: 'credit_note', label: 'Credit Note', category: 'adjustment' }
];

// Common Account Heads
const ACCOUNT_HEADS = {
  bank: ['HDFC Bank A/c', 'ICICI Bank A/c', 'SBI A/c', 'Cash A/c', 'Petty Cash'],
  income: ['Sales A/c', 'Service Income', 'Interest Received', 'Other Income'],
  expense: ['Purchase A/c', 'Salary & Wages', 'Rent Expense', 'Utility Bills', 'Professional Fees', 'Office Expenses', 'Travel Expense'],
  party: ['Sundry Debtors', 'Sundry Creditors'],
  asset: ['Fixed Assets', 'Furniture', 'Computers', 'Vehicles'],
  liability: ['Loans', 'Duties & Taxes']
};

const TallyEntry = () => {
  // Mode State
  const [mode, setMode] = useState('manual'); // 'manual' or 'ai'
  const [step, setStep] = useState(1); // 1: Entry, 2: Review, 3: Export
  
  // AI Mode State
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  
  // Manual Mode State - Voucher List
  const [vouchers, setVouchers] = useState([]);
  const [editingVoucher, setEditingVoucher] = useState(null);
  
  // New Voucher Form
  const [newVoucher, setNewVoucher] = useState({
    date: new Date().toISOString().split('T')[0],
    voucher_type: 'receipt',
    voucher_number: '',
    party_name: '',
    debit_account: '',
    credit_account: '',
    amount: '',
    narration: '',
    reference: '',
    gstin: '',
    gst_applicable: false,
    gst_rate: 18
  });
  
  // Filter State
  const [filters, setFilters] = useState({
    voucher_type: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef(null);

  // Calculate GST amounts
  const calculateGST = (amount, rate) => {
    if (!amount || !rate) return { cgst: 0, sgst: 0, igst: 0, total: parseFloat(amount) || 0 };
    const taxableAmount = parseFloat(amount);
    const gstAmount = (taxableAmount * rate) / 100;
    return {
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      igst: 0,
      total: taxableAmount + gstAmount
    };
  };

  // Add new voucher
  const handleAddVoucher = () => {
    setErrors([]);
    
    // Validation
    if (!newVoucher.date) {
      setErrors(['Date is required']);
      return;
    }
    if (!newVoucher.amount || parseFloat(newVoucher.amount) <= 0) {
      setErrors(['Valid amount is required']);
      return;
    }
    if (!newVoucher.debit_account || !newVoucher.credit_account) {
      setErrors(['Both debit and credit accounts are required']);
      return;
    }
    
    const gst = newVoucher.gst_applicable ? calculateGST(newVoucher.amount, newVoucher.gst_rate) : { cgst: 0, sgst: 0, igst: 0, total: parseFloat(newVoucher.amount) };
    
    const voucher = {
      id: Date.now().toString(),
      ...newVoucher,
      amount: parseFloat(newVoucher.amount),
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      total_amount: gst.total,
      voucher_number: newVoucher.voucher_number || `V-${Date.now().toString().slice(-6)}`,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    setVouchers([...vouchers, voucher]);
    setSuccess('Voucher added successfully');
    
    // Reset form
    setNewVoucher({
      date: new Date().toISOString().split('T')[0],
      voucher_type: 'receipt',
      voucher_number: '',
      party_name: '',
      debit_account: '',
      credit_account: '',
      amount: '',
      narration: '',
      reference: '',
      gstin: '',
      gst_applicable: false,
      gst_rate: 18
    });
    
    setTimeout(() => setSuccess(''), 3000);
  };

  // Delete voucher
  const handleDeleteVoucher = (id) => {
    setVouchers(vouchers.filter(v => v.id !== id));
  };

  // Handle file upload for AI mode
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setErrors([]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/tally/extract-statement', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success && response.data.data) {
        setExtractedData(response.data.data);
        setSuccess('Bank statement processed successfully!');
      } else {
        setErrors(['Could not extract data from file']);
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      setErrors(['Error processing file. Please try again.']);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Convert AI extracted data to vouchers
  const handleConvertToVouchers = () => {
    if (!extractedData?.transactions) return;
    
    const newVouchers = extractedData.transactions.map((txn, idx) => ({
      id: `AI-${Date.now()}-${idx}`,
      date: txn.date,
      voucher_type: txn.suggested_voucher || (txn.type === 'credit' ? 'receipt' : 'payment'),
      voucher_number: `AI-${idx + 1}`,
      party_name: txn.party || '',
      debit_account: txn.type === 'credit' ? 'HDFC Bank A/c' : (txn.suggested_voucher === 'payment' ? txn.party : 'Expense A/c'),
      credit_account: txn.type === 'debit' ? 'HDFC Bank A/c' : (txn.party || 'Income A/c'),
      amount: txn.amount,
      total_amount: txn.amount,
      narration: txn.description,
      reference: '',
      gst_applicable: false,
      cgst: 0,
      sgst: 0,
      igst: 0,
      status: 'ai_suggested',
      created_at: new Date().toISOString(),
      ai_confidence: 0.85
    }));
    
    setVouchers([...vouchers, ...newVouchers]);
    setExtractedData(null);
    setMode('manual');
    setSuccess(`${newVouchers.length} vouchers created from bank statement`);
  };

  // Export to Tally XML format - Enhanced with API
  const handleExportTally = async () => {
    const verifiedVouchers = vouchers.filter(v => v.status === 'verified');
    
    if (verifiedVouchers.length === 0) {
      setErrors(['No verified vouchers to export. Please verify vouchers first.']);
      return;
    }
    
    try {
      setUploading(true);
      
      // Call backend API for comprehensive XML generation
      const response = await api.post('/tally/generate-xml', {
        vouchers: verifiedVouchers.map(v => ({
          date: v.date,
          voucher_type: v.voucher_type,
          voucher_number: v.voucher_number,
          party_name: v.party_name,
          debit_account: v.debit_account,
          credit_account: v.credit_account,
          amount: v.amount,
          narration: v.narration,
          reference: v.reference,
          gstin: v.gstin,
          gst_applicable: v.gst_applicable,
          gst_rate: v.gst_rate,
          cgst: v.cgst || 0,
          sgst: v.sgst || 0,
          igst: v.igst || 0,
          total_amount: v.total_amount
        })),
        company_name: 'Your Company',
        financial_year: '2024-25',
        include_masters: true
      });
      
      if (response.data.success) {
        // Download XML file
        const blob = new Blob([response.data.xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tally_vouchers_${new Date().toISOString().split('T')[0]}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        
        setSuccess(`Tally XML exported! ${response.data.stats.voucher_count} vouchers, Total: Rs.${response.data.stats.total_amount.toLocaleString('en-IN')}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      // Fallback to local generation
      const tallyXML = generateTallyXML(verifiedVouchers);
      const blob = new Blob([tallyXML], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tally_vouchers_${new Date().toISOString().split('T')[0]}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Tally XML exported (local generation)');
    } finally {
      setUploading(false);
    }
  };

  // Generate Tally XML
  const generateTallyXML = (vouchersToExport) => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<ENVELOPE>\n';
    xml += '  <HEADER>\n';
    xml += '    <TALLYREQUEST>Import Data</TALLYREQUEST>\n';
    xml += '  </HEADER>\n';
    xml += '  <BODY>\n';
    xml += '    <IMPORTDATA>\n';
    xml += '      <REQUESTDESC>\n';
    xml += '        <REPORTNAME>Vouchers</REPORTNAME>\n';
    xml += '      </REQUESTDESC>\n';
    xml += '      <REQUESTDATA>\n';
    
    vouchersToExport.forEach(v => {
      xml += '        <TALLYMESSAGE>\n';
      xml += `          <VOUCHER VCHTYPE="${v.voucher_type.toUpperCase()}">\n`;
      xml += `            <DATE>${v.date.replace(/-/g, '')}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${v.voucher_number}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${v.party_name}</PARTYLEDGERNAME>\n`;
      xml += `            <NARRATION>${v.narration}</NARRATION>\n`;
      xml += '            <ALLLEDGERENTRIES.LIST>\n';
      xml += `              <LEDGERNAME>${v.debit_account}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>-${v.total_amount}</AMOUNT>\n`;
      xml += '            </ALLLEDGERENTRIES.LIST>\n';
      xml += '            <ALLLEDGERENTRIES.LIST>\n';
      xml += `              <LEDGERNAME>${v.credit_account}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${v.total_amount}</AMOUNT>\n`;
      xml += '            </ALLLEDGERENTRIES.LIST>\n';
      xml += '          </VOUCHER>\n';
      xml += '        </TALLYMESSAGE>\n';
    });
    
    xml += '      </REQUESTDATA>\n';
    xml += '    </IMPORTDATA>\n';
    xml += '  </BODY>\n';
    xml += '</ENVELOPE>';
    
    return xml;
  };

  // Verify voucher
  const handleVerifyVoucher = (id) => {
    setVouchers(vouchers.map(v => 
      v.id === id ? { ...v, status: 'verified' } : v
    ));
  };

  // Verify all
  const handleVerifyAll = () => {
    setVouchers(vouchers.map(v => ({ ...v, status: 'verified' })));
    setSuccess('All vouchers verified');
  };

  // Filter vouchers
  const filteredVouchers = vouchers.filter(v => {
    if (filters.voucher_type !== 'all' && v.voucher_type !== filters.voucher_type) return false;
    if (filters.dateFrom && v.date < filters.dateFrom) return false;
    if (filters.dateTo && v.date > filters.dateTo) return false;
    if (filters.search && !v.party_name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !v.narration.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: vouchers.length,
    pending: vouchers.filter(v => v.status === 'pending' || v.status === 'ai_suggested').length,
    verified: vouchers.filter(v => v.status === 'verified').length,
    totalAmount: vouchers.reduce((sum, v) => sum + (v.total_amount || 0), 0)
  };

  return (
    <div className="space-y-4 md:space-y-6" data-testid="tally-entry-page">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 md:p-8 text-white border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Tally Data Entry & Accounting
            </h1>
            <p className="text-slate-300 text-sm md:text-lg">Dual-Mode: Manual Entry or AI-powered Bank Statement OCR</p>
            <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-4 text-xs md:text-sm">
              <div className="flex items-center space-x-2">
                <Edit3 size={18} />
                <span>Manual Entry</span>
              </div>
              <div className="flex items-center space-x-2">
                <Scan size={18} />
                <span>AI OCR</span>
              </div>
              <div className="flex items-center space-x-2">
                <Download size={18} />
                <span>Tally Export</span>
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

      {/* Mode Selector */}
      <div className="bg-white rounded-xl shadow-sm p-3 md:p-4 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex space-x-2">
            <Button
              onClick={() => setMode('manual')}
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className={mode === 'manual' ? 'bg-blue-600 hover:bg-blue-700 text-xs md:text-sm' : 'text-xs md:text-sm'}
              data-testid="mode-manual-btn"
            >
              <Edit3 size={14} className="mr-1 md:mr-2" />
              Manual
            </Button>
            <Button
              onClick={() => setMode('ai')}
              variant={mode === 'ai' ? 'default' : 'outline'}
              size="sm"
              className={mode === 'ai' ? 'bg-purple-600 hover:bg-purple-700 text-xs md:text-sm' : 'text-xs md:text-sm'}
              data-testid="mode-ai-btn"
            >
              <Sparkles size={14} className="mr-1 md:mr-2" />
              AI Mode
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
            <div className="flex items-center space-x-1 px-2 py-1 bg-slate-100 rounded-lg">
              <span className="text-slate-600">Total:</span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 rounded-lg">
              <span className="text-yellow-700">Pending:</span>
              <span className="font-semibold text-yellow-800">{stats.pending}</span>
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-lg">
              <span className="text-green-700">Done:</span>
              <span className="font-semibold text-green-800">{stats.verified}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
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

      {/* AI Mode - Upload Section */}
      {mode === 'ai' && !extractedData && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Scan className="mr-2 text-purple-600" size={24} />
            Upload Bank Statement
          </h3>
          <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center bg-purple-50/50">
            <FileText size={48} className="mx-auto text-purple-500 mb-4" />
            <p className="text-slate-600 mb-2">Upload PDF or Excel bank statement</p>
            <p className="text-sm text-slate-500 mb-4">AI will extract transactions and suggest voucher entries</p>
            <input 
              type="file" 
              className="hidden" 
              id="statement-upload" 
              ref={fileInputRef}
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
            <label htmlFor="statement-upload">
              <Button 
                className="bg-purple-600 hover:bg-purple-700" 
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading ? (
                    <><RefreshCw size={18} className="mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><Upload size={18} className="mr-2" /> Upload Statement</>
                  )}
                </span>
              </Button>
            </label>
          </div>
        </div>
      )}

      {/* AI Mode - Extracted Data */}
      {mode === 'ai' && extractedData && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center">
              <FileSpreadsheet className="mr-2 text-purple-600" size={24} />
              Extracted Transactions
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">
                {extractedData.bank_name} | A/c: {extractedData.account_number} | {extractedData.period}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Suggested Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {extractedData.transactions.map((txn, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{txn.date}</td>
                    <td className="px-4 py-3">{txn.description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        txn.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {txn.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <IndianRupee size={14} className="inline" />
                      {txn.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 capitalize">{txn.suggested_voucher}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={() => setExtractedData(null)}
            >
              <X size={18} className="mr-2" /> Cancel
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleConvertToVouchers}
              data-testid="convert-to-vouchers-btn"
            >
              <Check size={18} className="mr-2" /> Convert to Vouchers
            </Button>
          </div>
        </div>
      )}

      {/* Manual Entry Form */}
      {mode === 'manual' && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Plus className="mr-2 text-blue-600" size={24} />
            New Voucher Entry
          </h3>
          
          <div className="grid grid-cols-4 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                value={newVoucher.date}
                onChange={(e) => setNewVoucher({ ...newVoucher, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="voucher-date-input"
              />
            </div>
            
            {/* Voucher Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voucher Type *</label>
              <select
                value={newVoucher.voucher_type}
                onChange={(e) => setNewVoucher({ ...newVoucher, voucher_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="voucher-type-select"
              >
                {VOUCHER_TYPES.map(vt => (
                  <option key={vt.value} value={vt.value}>{vt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Voucher Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voucher No.</label>
              <input
                type="text"
                value={newVoucher.voucher_number}
                onChange={(e) => setNewVoucher({ ...newVoucher, voucher_number: e.target.value })}
                placeholder="Auto-generated"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Party Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Party Name</label>
              <input
                type="text"
                value={newVoucher.party_name}
                onChange={(e) => setNewVoucher({ ...newVoucher, party_name: e.target.value })}
                placeholder="Customer/Vendor name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="party-name-input"
              />
            </div>
            
            {/* Debit Account */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Debit Account *</label>
              <select
                value={newVoucher.debit_account}
                onChange={(e) => setNewVoucher({ ...newVoucher, debit_account: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="debit-account-select"
              >
                <option value="">Select Account</option>
                <optgroup label="Bank Accounts">
                  {ACCOUNT_HEADS.bank.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </optgroup>
                <optgroup label="Income">
                  {ACCOUNT_HEADS.income.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </optgroup>
                <optgroup label="Expenses">
                  {ACCOUNT_HEADS.expense.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </optgroup>
                <optgroup label="Parties">
                  {ACCOUNT_HEADS.party.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </optgroup>
              </select>
            </div>
            
            {/* Credit Account */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Credit Account *</label>
              <select
                value={newVoucher.credit_account}
                onChange={(e) => setNewVoucher({ ...newVoucher, credit_account: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="credit-account-select"
              >
                <option value="">Select Account</option>
                <optgroup label="Bank Accounts">
                  {ACCOUNT_HEADS.bank.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </optgroup>
                <optgroup label="Income">
                  {ACCOUNT_HEADS.income.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </optgroup>
                <optgroup label="Expenses">
                  {ACCOUNT_HEADS.expense.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </optgroup>
                <optgroup label="Parties">
                  {ACCOUNT_HEADS.party.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </optgroup>
              </select>
            </div>
            
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <div className="relative">
                <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  value={newVoucher.amount}
                  onChange={(e) => setNewVoucher({ ...newVoucher, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="amount-input"
                />
              </div>
            </div>
            
            {/* GST Toggle */}
            <div className="flex items-end">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={newVoucher.gst_applicable}
                  onChange={(e) => setNewVoucher({ ...newVoucher, gst_applicable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm text-slate-700">GST Applicable</span>
              </label>
            </div>
            
            {/* GST Rate (conditional) */}
            {newVoucher.gst_applicable && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GST Rate %</label>
                <select
                  value={newVoucher.gst_rate}
                  onChange={(e) => setNewVoucher({ ...newVoucher, gst_rate: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            )}
            
            {/* Narration */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Narration</label>
              <input
                type="text"
                value={newVoucher.narration}
                onChange={(e) => setNewVoucher({ ...newVoucher, narration: e.target.value })}
                placeholder="Transaction description"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="narration-input"
              />
            </div>
            
            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
              <input
                type="text"
                value={newVoucher.reference}
                onChange={(e) => setNewVoucher({ ...newVoucher, reference: e.target.value })}
                placeholder="Invoice/Cheque No."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleAddVoucher}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="add-voucher-btn"
            >
              <Plus size={18} className="mr-2" /> Add Voucher
            </Button>
          </div>
        </div>
      )}

      {/* Voucher List */}
      {vouchers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <Receipt className="mr-2 text-slate-600" size={20} />
              Voucher Entries ({filteredVouchers.length})
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} className="mr-1" /> Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyAll}
                disabled={stats.pending === 0}
              >
                <Check size={16} className="mr-1" /> Verify All
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleExportTally}
                disabled={stats.verified === 0}
                data-testid="export-tally-btn"
              >
                <Download size={16} className="mr-1" /> Export to Tally
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Voucher Type</label>
                <select
                  value={filters.voucher_type}
                  onChange={(e) => setFilters({ ...filters, voucher_type: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                >
                  <option value="all">All Types</option>
                  {VOUCHER_TYPES.map(vt => (
                    <option key={vt.value} value={vt.value}>{vt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Party/Narration"
                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                />
              </div>
            </div>
          )}
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">V.No</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Party</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Dr/Cr</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{v.date}</td>
                    <td className="px-4 py-3 font-mono text-xs">{v.voucher_number}</td>
                    <td className="px-4 py-3 capitalize">{v.voucher_type}</td>
                    <td className="px-4 py-3">{v.party_name || '-'}</td>
                    <td className="px-4 py-3 text-xs">
                      <div><span className="text-green-600">Dr:</span> {v.debit_account}</div>
                      <div><span className="text-red-600">Cr:</span> {v.credit_account}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <IndianRupee size={12} className="inline" />
                      {v.total_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        v.status === 'verified' ? 'bg-green-100 text-green-700' :
                        v.status === 'ai_suggested' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {v.status === 'ai_suggested' ? 'AI' : v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {v.status !== 'verified' && (
                          <button
                            onClick={() => handleVerifyVoucher(v.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Verify"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteVoucher(v.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Summary Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <div className="text-sm text-slate-600">
              Total: {filteredVouchers.length} vouchers
            </div>
            <div className="text-lg font-semibold">
              Total Amount: <IndianRupee size={16} className="inline" />
              {stats.totalAmount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {vouchers.length === 0 && mode === 'manual' && (
        <div className="bg-slate-50 rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
          <Receipt size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Vouchers Yet</h3>
          <p className="text-slate-500">Start adding vouchers manually or switch to AI mode to import from bank statement</p>
        </div>
      )}
    </div>
  );
};

export default TallyEntry;
