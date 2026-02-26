import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import { 
  FileText, Download, AlertTriangle, CheckCircle, Users, 
  Building, Calculator, Landmark, RefreshCw, FileSpreadsheet,
  ChevronRight, AlertCircle, Check, X, Upload, FileUp, Table
} from 'lucide-react';

const TDSFiling = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1); // 1: Setup, 2: Entry, 3: Results
  const [returnId, setReturnId] = useState(null);
  const [results, setResults] = useState(null);
  const [uploadMode, setUploadMode] = useState(null); // 'deductees' or 'employees'
  const [uploadErrors, setUploadErrors] = useState([]);
  const deducteeFileRef = useRef(null);
  const employeeFileRef = useRef(null);
  
  // Form data
  const [formData, setFormData] = useState({
    tan: 'DELA12345B',
    pan: 'AABCT1234F',
    company_name: 'ABC Trading Co.',
    quarter: 4,
    financial_year: '2024-25',
    deductees: [],
    employees: []
  });

  // Download Excel template
  const downloadTemplate = async (dataType) => {
    try {
      const response = await api.get(`/tds/download-template?data_type=${dataType}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `TDS_${dataType}_template.xlsx`;
      link.click();
    } catch (err) {
      setError('Failed to download template');
    }
  };

  // Upload Excel file
  const handleFileUpload = async (e, dataType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setUploadErrors([]);
    setError('');
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
      const response = await api.post(`/tds/upload-excel?data_type=${dataType}`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        if (dataType === 'deductees') {
          setFormData(prev => ({
            ...prev,
            deductees: [...prev.deductees, ...response.data.data]
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            employees: [...prev.employees, ...response.data.data]
          }));
        }
        
        setSuccess(`Uploaded ${response.data.total_rows} ${dataType} successfully!`);
        
        if (response.data.errors.length > 0) {
          setUploadErrors(response.data.errors);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Load sample data
  const loadSampleData = async () => {
    setLoading(true);
    try {
      const response = await api.post('/tds/generate-sample');
      if (response.data.success) {
        setFormData(response.data.sample_data);
        setSuccess('Sample data loaded successfully!');
      }
    } catch (err) {
      setError('Failed to load sample data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate TDS
  const calculateTDS = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/tds/calculate', formData);
      if (response.data.success) {
        setReturnId(response.data.return_id);
        setResults(response.data);
        setStep(3);
        setSuccess('TDS calculation complete!');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate TDS');
    } finally {
      setLoading(false);
    }
  };

  // Export Tally XML
  const exportTallyXML = async () => {
    if (!returnId) return;
    setLoading(true);
    try {
      const response = await api.post(`/tds/returns/${returnId}/tally-xml`);
      if (response.data.success) {
        // Download XML
        const blob = new Blob([response.data.xml], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `TDS_Tally_Q${formData.quarter}_${formData.financial_year}.xml`;
        link.click();
        
        // Download summary
        const summaryBlob = new Blob([response.data.summary], { type: 'text/plain' });
        const summaryUrl = window.URL.createObjectURL(summaryBlob);
        const summaryLink = document.createElement('a');
        summaryLink.href = summaryUrl;
        summaryLink.download = `TDS_Tally_Summary_Q${formData.quarter}.txt`;
        summaryLink.click();
        
        setSuccess('Tally XML exported!');
      }
    } catch (err) {
      setError('Failed to export Tally XML');
    } finally {
      setLoading(false);
    }
  };

  // Export TRACES JSON
  const exportTracesJSON = async (formType) => {
    if (!returnId) return;
    setLoading(true);
    try {
      const response = await api.post(`/tds/returns/${returnId}/traces-json?form_type=${formType}`);
      if (response.data.success) {
        const blob = new Blob([JSON.stringify(response.data.json, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${formType}_TRACES_Q${formData.quarter}_${formData.financial_year}.json`;
        link.click();
        setSuccess(`${formType} JSON exported for TRACES!`);
      }
    } catch (err) {
      setError('Failed to export TRACES JSON');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val) => `₹${(parseFloat(val) || 0).toLocaleString('en-IN')}`;

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="tds-filing-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileText size={28} />
          <h1 className="text-2xl font-bold">TDS Return Filing</h1>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">CA-LEVEL</span>
        </div>
        <p className="opacity-90">Form 24Q (Salary) + Form 26Q (Non-Salary) | Complete TDS Processing</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <span className="text-red-800">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-600">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="text-green-600" size={20} />
          <span className="text-green-800">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-600">×</button>
        </div>
      )}

      {/* Step 1: Setup */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">TDS Return Setup</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">TAN</label>
                <Input 
                  value={formData.tan}
                  onChange={(e) => setFormData({...formData, tan: e.target.value})}
                  placeholder="DELA12345B"
                  data-testid="tan-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company PAN</label>
                <Input 
                  value={formData.pan}
                  onChange={(e) => setFormData({...formData, pan: e.target.value})}
                  placeholder="AABCT1234F"
                  data-testid="pan-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <Input 
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="ABC Trading Co."
                  data-testid="company-name-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quarter</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={formData.quarter}
                  onChange={(e) => setFormData({...formData, quarter: parseInt(e.target.value)})}
                  data-testid="quarter-select"
                >
                  <option value={1}>Q1 (Apr-Jun)</option>
                  <option value={2}>Q2 (Jul-Sep)</option>
                  <option value={3}>Q3 (Oct-Dec)</option>
                  <option value={4}>Q4 (Jan-Mar)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year</label>
                <Input 
                  value={formData.financial_year}
                  onChange={(e) => setFormData({...formData, financial_year: e.target.value})}
                  placeholder="2024-25"
                  data-testid="fy-input"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={loadSampleData} 
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="load-sample-btn"
              >
                <RefreshCw size={18} className="mr-2" />
                Load Sample Data (Demo)
              </Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!formData.tan || !formData.pan}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="proceed-entry-btn"
              >
                Proceed to Data Entry
                <ChevronRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>

          {/* Data Summary */}
          {formData.deductees.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building className="text-blue-600" size={24} />
                  <h3 className="font-bold text-slate-900">Form 26Q - Non-Salary</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Deductees:</span>
                    <span className="font-semibold">{formData.deductees.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">194C (Contractors):</span>
                    <span className="font-semibold">{formData.deductees.filter(d => d.section === '194C').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">194J (Professional):</span>
                    <span className="font-semibold">{formData.deductees.filter(d => d.section === '194J').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">194I (Rent):</span>
                    <span className="font-semibold">{formData.deductees.filter(d => d.section === '194I').length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="text-green-600" size={24} />
                  <h3 className="font-bold text-slate-900">Form 24Q - Salary</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Employees:</span>
                    <span className="font-semibold">{formData.employees.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Monthly Salary:</span>
                    <span className="font-semibold">{fmt(formData.employees.reduce((sum, e) => sum + e.monthly_salary, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Data Entry/Review */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep(1)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back to Setup
            </button>
          </div>

          {/* Deductees Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building size={20} className="text-blue-600" />
              Non-Salary Deductees (Form 26Q)
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">S.No</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">PAN</th>
                    <th className="px-3 py-2 text-left">Section</th>
                    <th className="px-3 py-2 text-left">Invoice</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Month</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.deductees.map((d, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{d.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{d.pan}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          d.section === '194C' ? 'bg-blue-100 text-blue-800' :
                          d.section === '194J' ? 'bg-purple-100 text-purple-800' :
                          d.section === '194I' ? 'bg-green-100 text-green-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {d.section}
                        </span>
                      </td>
                      <td className="px-3 py-2">{d.invoice_no}</td>
                      <td className="px-3 py-2">{d.date}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(d.amount)}</td>
                      <td className="px-3 py-2">{d.month}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-right">Total:</td>
                    <td className="px-3 py-2 text-right">{fmt(formData.deductees.reduce((sum, d) => sum + d.amount, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users size={20} className="text-green-600" />
              Salary Employees (Form 24Q)
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">S.No</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">PAN</th>
                    <th className="px-3 py-2 text-left">Designation</th>
                    <th className="px-3 py-2 text-right">Monthly Salary</th>
                    <th className="px-3 py-2 text-right">80C</th>
                    <th className="px-3 py-2 text-right">80D</th>
                    <th className="px-3 py-2 text-right">HRA</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.employees.map((e, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{e.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{e.pan}</td>
                      <td className="px-3 py-2">{e.designation}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(e.monthly_salary)}</td>
                      <td className="px-3 py-2 text-right">{fmt(e.exemptions?.['80C'] || 0)}</td>
                      <td className="px-3 py-2 text-right">{fmt(e.exemptions?.['80D'] || 0)}</td>
                      <td className="px-3 py-2 text-right">{fmt(e.exemptions?.HRA || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={calculateTDS}
              disabled={loading || (formData.deductees.length === 0 && formData.employees.length === 0)}
              className="bg-orange-600 hover:bg-orange-700 px-8"
              data-testid="calculate-tds-btn"
            >
              <Calculator size={18} className="mr-2" />
              {loading ? 'Calculating...' : 'Calculate TDS & Generate Reports'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && results && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep(1)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Start New Return
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500 uppercase mb-1">Total Deductees</p>
              <p className="text-2xl font-bold text-slate-900">{results.summary.total_deductees}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500 uppercase mb-1">Total Employees</p>
              <p className="text-2xl font-bold text-slate-900">{results.summary.total_employees}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500 uppercase mb-1">Total TDS</p>
              <p className="text-2xl font-bold text-orange-600">{fmt(results.summary.total_tds)}</p>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-4 text-center text-white">
              <p className="text-xs uppercase mb-1 opacity-90">Due Date</p>
              <p className="text-2xl font-bold">{results.summary.due_date}</p>
            </div>
          </div>

          {/* Tabs for Form 26Q and 24Q */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button className="flex-1 px-6 py-4 bg-blue-50 border-b-2 border-blue-600 font-semibold text-blue-700">
                Form 26Q - Non-Salary
              </button>
              <button className="flex-1 px-6 py-4 hover:bg-slate-50 text-slate-600">
                Form 24Q - Salary
              </button>
            </div>

            {/* Form 26Q Details */}
            {results.form_26q && (
              <div className="p-6">
                <h3 className="font-bold text-slate-900 mb-4">Section-wise Summary</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Section</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Deductees</th>
                        <th className="px-3 py-2 text-right">Total Payment</th>
                        <th className="px-3 py-2 text-right">Total TDS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.form_26q.section_wise_summary?.map((s, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-semibold">{s.section}</td>
                          <td className="px-3 py-2">{s.description}</td>
                          <td className="px-3 py-2 text-right">{s.deductee_count}</td>
                          <td className="px-3 py-2 text-right">{fmt(s.total_payment)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-orange-600">{fmt(s.total_tds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="font-bold text-slate-900 mb-4">Month-wise TDS Deposit</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Month</th>
                        <th className="px-3 py-2 text-right">TDS Deducted</th>
                        <th className="px-3 py-2 text-right">TDS Deposited</th>
                        <th className="px-3 py-2 text-left">Due Date</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.form_26q.month_wise_summary?.map((m, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium">{m.month}</td>
                          <td className="px-3 py-2 text-right">{fmt(m.tds_deducted)}</td>
                          <td className="px-3 py-2 text-right">{fmt(m.tds_deposited)}</td>
                          <td className="px-3 py-2">{m.due_date}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                              <Check size={12} /> {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* PAN Validation */}
          {results.pan_validation && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-600" />
                PAN Validation Report
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">PAN</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.pan_validation.slice(0, 10).map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-mono text-xs">{p.pan}</td>
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            p.status === 'Valid' ? 'bg-green-100 text-green-800' :
                            p.status === 'Mismatch' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {p.status === 'Valid' ? <Check size={12} /> : <X size={12} />}
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{p.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 26AS Reconciliation */}
          {results.reconciliation_26as && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Landmark size={20} className="text-blue-600" />
                26AS Reconciliation
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">As per Books</p>
                  <p className="text-xl font-bold">{fmt(results.reconciliation_26as.as_per_books)}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">As per 26AS</p>
                  <p className="text-xl font-bold">{fmt(results.reconciliation_26as.as_per_26as)}</p>
                </div>
                <div className={`text-center p-4 rounded-lg ${
                  results.reconciliation_26as.difference === 0 ? 'bg-green-50' : 'bg-amber-50'
                }`}>
                  <p className="text-sm text-slate-600">Difference</p>
                  <p className={`text-xl font-bold ${
                    results.reconciliation_26as.difference === 0 ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {fmt(results.reconciliation_26as.difference)}
                  </p>
                </div>
              </div>
              {results.reconciliation_26as.mismatches?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-slate-800 mb-2">Mismatches Found:</h4>
                  <div className="space-y-2">
                    {results.reconciliation_26as.mismatches.map((m, idx) => (
                      <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <strong>{m.deductee_name}</strong> ({m.pan}): {m.reason} - Diff: {fmt(m.difference)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Download Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Download & Export</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                onClick={() => exportTracesJSON('26Q')}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 flex-col h-auto py-4"
                data-testid="export-26q-json-btn"
              >
                <FileText size={22} className="mb-2" />
                <span className="text-sm">Form 26Q JSON</span>
                <span className="text-[10px] opacity-75">For TRACES</span>
              </Button>
              <Button 
                onClick={() => exportTracesJSON('24Q')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 flex-col h-auto py-4"
                data-testid="export-24q-json-btn"
              >
                <FileText size={22} className="mb-2" />
                <span className="text-sm">Form 24Q JSON</span>
                <span className="text-[10px] opacity-75">For TRACES</span>
              </Button>
              <Button 
                onClick={exportTallyXML}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 flex-col h-auto py-4"
                data-testid="export-tally-xml-btn"
              >
                <FileSpreadsheet size={22} className="mb-2" />
                <span className="text-sm">Tally XML</span>
                <span className="text-[10px] opacity-75">Ready to Import</span>
              </Button>
              <Button 
                onClick={() => {
                  exportTracesJSON('26Q');
                  exportTracesJSON('24Q');
                  exportTallyXML();
                }}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 flex-col h-auto py-4"
                data-testid="export-all-btn"
              >
                <Download size={22} className="mb-2" />
                <span className="text-sm">Export All</span>
                <span className="text-[10px] opacity-75">Complete Package</span>
              </Button>
            </div>
          </div>

          {/* Recommendations */}
          {results.recommendations && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <AlertTriangle size={20} />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {results.recommendations.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-amber-800">
                    <ChevronRight size={16} className="mt-0.5 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TDSFiling;
