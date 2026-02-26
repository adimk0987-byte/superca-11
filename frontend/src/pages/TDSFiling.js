import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import { 
  FileText, Download, AlertTriangle, CheckCircle, Users, 
  Building, Calculator, Landmark, RefreshCw, FileSpreadsheet,
  ChevronRight, AlertCircle, Check, X, Upload, FileUp, Table,
  Edit3, Plus, Trash2, Sparkles, PenTool, Eye, Package
} from 'lucide-react';

const TDSFiling = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState(null); // 'ai' or 'manual'
  const [step, setStep] = useState(1); // 1: Mode Select, 2: Setup, 3: Extraction/Entry, 4: Summary, 5: Results
  const [returnId, setReturnId] = useState(null);
  const [results, setResults] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [activeTab, setActiveTab] = useState('26q'); // '26q' or '24q'
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

  // PAN validation results
  const [panValidation, setPanValidation] = useState([]);

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
            deductees: response.data.data
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            employees: response.data.data
          }));
        }
        
        setSuccess(`Uploaded ${response.data.total_rows} ${dataType} successfully!`);
        
        if (response.data.errors.length > 0) {
          setUploadErrors(response.data.errors);
        }
        
        // Move to extraction view
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setLoading(false);
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
        setSuccess('Sample data loaded!');
        setStep(3);
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
        setPanValidation(response.data.pan_validation || []);
        setStep(5);
        setSuccess('TDS calculation complete!');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate TDS');
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const exportTallyXML = async () => {
    if (!returnId) return;
    setLoading(true);
    try {
      const response = await api.post(`/tds/returns/${returnId}/tally-xml`);
      if (response.data.success) {
        const blob = new Blob([response.data.xml], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `TDS_Tally_Q${formData.quarter}_${formData.financial_year}.xml`;
        link.click();
        setSuccess('Tally XML exported!');
      }
    } catch (err) {
      setError('Failed to export Tally XML');
    } finally {
      setLoading(false);
    }
  };

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
        link.download = `${formType}_TRACES_Q${formData.quarter}.json`;
        link.click();
        setSuccess(`${formType} JSON exported!`);
      }
    } catch (err) {
      setError('Failed to export');
    } finally {
      setLoading(false);
    }
  };

  // Add/Edit/Delete deductee
  const addDeductee = (section) => {
    const newDeductee = {
      name: '',
      pan: '',
      section: section,
      invoice_no: `${section === '194C' ? 'CONT' : section === '194J' ? 'PROF' : 'RENT'}/${formData.deductees.length + 1}`,
      date: '01-01-2025',
      amount: 0,
      is_company: false,
      month: 'January'
    };
    setFormData(prev => ({
      ...prev,
      deductees: [...prev.deductees, newDeductee]
    }));
    setEditingRow(formData.deductees.length);
  };

  const updateDeductee = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      deductees: prev.deductees.map((d, i) => 
        i === index ? { ...d, [field]: value } : d
      )
    }));
  };

  const deleteDeductee = (index) => {
    setFormData(prev => ({
      ...prev,
      deductees: prev.deductees.filter((_, i) => i !== index)
    }));
  };

  // Add/Edit/Delete employee
  const addEmployee = () => {
    const newEmployee = {
      name: '',
      pan: '',
      designation: 'Employee',
      date_of_joining: '01-04-2020',
      monthly_salary: 0,
      exemptions: { '80C': 0, '80D': 0, 'HRA': 0, 'LTA': 0 }
    };
    setFormData(prev => ({
      ...prev,
      employees: [...prev.employees, newEmployee]
    }));
  };

  const updateEmployee = (index, field, value) => {
    if (field.startsWith('exemptions.')) {
      const exemptionField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        employees: prev.employees.map((e, i) => 
          i === index ? { ...e, exemptions: { ...e.exemptions, [exemptionField]: parseFloat(value) || 0 } } : e
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        employees: prev.employees.map((e, i) => 
          i === index ? { ...e, [field]: value } : e
        )
      }));
    }
  };

  const deleteEmployee = (index) => {
    setFormData(prev => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index)
    }));
  };

  // Calculate TDS rate for display
  const getTDSRate = (section, isCompany = false) => {
    if (section === '194C') return isCompany ? 2 : 1;
    if (section === '194J') return 10;
    if (section === '194I') return 10;
    if (section === '194A') return 10;
    return 10;
  };

  const calculateDeducteeTDS = (d) => {
    const rate = getTDSRate(d.section, d.is_company);
    return Math.round(d.amount * rate / 100);
  };

  const fmt = (val) => `₹${(parseFloat(val) || 0).toLocaleString('en-IN')}`;

  const resetAll = () => {
    setStep(1);
    setMode(null);
    setResults(null);
    setReturnId(null);
    setFormData({
      tan: 'DELA12345B',
      pan: 'AABCT1234F',
      company_name: 'ABC Trading Co.',
      quarter: 4,
      financial_year: '2024-25',
      deductees: [],
      employees: []
    });
  };

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
          <button onClick={() => setError('')} className="ml-auto text-red-600 text-xl">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="text-green-600" size={20} />
          <span className="text-green-800">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-600 text-xl">×</button>
        </div>
      )}

      {/* Step 1: Mode Selection */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Mode */}
          <div 
            onClick={() => { setMode('ai'); setStep(2); }}
            className="bg-white rounded-2xl border-2 border-slate-200 p-8 cursor-pointer hover:border-orange-400 hover:shadow-lg transition-all group"
            data-testid="ai-mode-btn"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl text-white group-hover:scale-110 transition-transform">
                <Sparkles size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">AI Mode (Upload Excel)</h2>
                <p className="text-slate-500">Auto-extract & validate</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Upload deductee/employee Excel files</li>
              <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Auto PAN validation</li>
              <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Edit extracted data</li>
              <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Generate TRACES JSON + Tally XML</li>
            </ul>
          </div>

          {/* Manual Mode */}
          <div 
            onClick={() => { setMode('manual'); setStep(2); }}
            className="bg-white rounded-2xl border-2 border-slate-200 p-8 cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all group"
            data-testid="manual-mode-btn"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white group-hover:scale-110 transition-transform">
                <PenTool size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Manual Entry</h2>
                <p className="text-slate-500">Enter data directly</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Add deductees one by one</li>
              <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Full control over entries</li>
              <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Load sample data (demo)</li>
              <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Generate TRACES JSON + Tally XML</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Setup & Upload */}
      {step === 2 && (
        <div className="space-y-6">
          <button onClick={() => setStep(1)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2 mb-4">
            ← Back to Mode Selection
          </button>

          {/* Company Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Company Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">TAN</label>
                <Input value={formData.tan} onChange={(e) => setFormData({...formData, tan: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company PAN</label>
                <Input value={formData.pan} onChange={(e) => setFormData({...formData, pan: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <Input value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quarter</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.quarter} onChange={(e) => setFormData({...formData, quarter: parseInt(e.target.value)})}>
                  <option value={1}>Q1 (Apr-Jun)</option>
                  <option value={2}>Q2 (Jul-Sep)</option>
                  <option value={3}>Q3 (Oct-Dec)</option>
                  <option value={4}>Q4 (Jan-Mar)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year</label>
                <Input value={formData.financial_year} onChange={(e) => setFormData({...formData, financial_year: e.target.value})} />
              </div>
            </div>
          </div>

          {/* AI Mode - Upload */}
          {mode === 'ai' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deductees Upload */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building className="text-blue-600" size={24} />
                  <h3 className="font-bold text-slate-900">Upload Form 26Q Data</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4">Contractors, Professionals, Rent, Interest payments</p>
                
                <div className="space-y-3">
                  <Button onClick={() => downloadTemplate('deductees')} variant="outline" className="w-full justify-start">
                    <Download size={16} className="mr-2" /> Download Template
                  </Button>
                  <input type="file" ref={deducteeFileRef} accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'deductees')} className="hidden" />
                  <Button onClick={() => deducteeFileRef.current?.click()} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                    <FileUp size={16} className="mr-2" /> {loading ? 'Uploading...' : 'Upload Deductees Excel'}
                  </Button>
                </div>
              </div>

              {/* Employees Upload */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="text-green-600" size={24} />
                  <h3 className="font-bold text-slate-900">Upload Form 24Q Data</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4">Employee salary & exemption details</p>
                
                <div className="space-y-3">
                  <Button onClick={() => downloadTemplate('employees')} variant="outline" className="w-full justify-start">
                    <Download size={16} className="mr-2" /> Download Template
                  </Button>
                  <input type="file" ref={employeeFileRef} accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'employees')} className="hidden" />
                  <Button onClick={() => employeeFileRef.current?.click()} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                    <FileUp size={16} className="mr-2" /> {loading ? 'Uploading...' : 'Upload Employees Excel'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Mode - Options */}
          {mode === 'manual' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Start Manual Entry</h3>
              <div className="flex gap-4">
                <Button onClick={loadSampleData} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                  <RefreshCw size={18} className="mr-2" /> Load Sample Data (Demo)
                </Button>
                <Button onClick={() => setStep(3)} className="bg-orange-600 hover:bg-orange-700">
                  <PenTool size={18} className="mr-2" /> Start Empty Entry
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Extraction View / Manual Entry */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep(2)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back
            </button>
            <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg">
              <Eye size={18} />
              <span className="font-medium">Extraction View - Verify & Edit</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('26q')}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${activeTab === '26q' ? 'bg-blue-50 border-b-2 border-blue-600 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <Building size={18} /> Form 26Q - Non-Salary ({formData.deductees.length})
              </button>
              <button 
                onClick={() => setActiveTab('24q')}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${activeTab === '24q' ? 'bg-green-50 border-b-2 border-green-600 text-green-700' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <Users size={18} /> Form 24Q - Salary ({formData.employees.length})
              </button>
            </div>

            {/* Form 26Q Content */}
            {activeTab === '26q' && (
              <div className="p-6">
                {/* Section 194C */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">194C</span>
                      Contractors ({formData.deductees.filter(d => d.section === '194C').length} entries)
                    </h4>
                    <Button onClick={() => addDeductee('194C')} size="sm" variant="outline" className="text-blue-600">
                      <Plus size={14} className="mr-1" /> Add Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left w-8">#</th>
                          <th className="px-3 py-2 text-left">Deductee Name</th>
                          <th className="px-3 py-2 text-left">PAN</th>
                          <th className="px-3 py-2 text-left">Invoice No</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-center">Rate</th>
                          <th className="px-3 py-2 text-right">TDS</th>
                          <th className="px-3 py-2 text-center w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.deductees.filter(d => d.section === '194C').map((d, idx) => {
                          const actualIdx = formData.deductees.findIndex(x => x === d);
                          return (
                            <tr key={actualIdx} className="border-t border-slate-100 hover:bg-blue-50/50">
                              <td className="px-3 py-2">{idx + 1}</td>
                              <td className="px-3 py-2">
                                <Input value={d.name} onChange={(e) => updateDeductee(actualIdx, 'name', e.target.value)} className="h-8 text-sm" />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={d.pan} onChange={(e) => updateDeductee(actualIdx, 'pan', e.target.value.toUpperCase())} className="h-8 text-sm font-mono" maxLength={10} />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={d.invoice_no} onChange={(e) => updateDeductee(actualIdx, 'invoice_no', e.target.value)} className="h-8 text-sm" />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={d.date} onChange={(e) => updateDeductee(actualIdx, 'date', e.target.value)} className="h-8 text-sm" />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" value={d.amount} onChange={(e) => updateDeductee(actualIdx, 'amount', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <select value={d.is_company ? 'yes' : 'no'} onChange={(e) => updateDeductee(actualIdx, 'is_company', e.target.value === 'yes')} className="h-8 text-sm border rounded px-1">
                                  <option value="no">1%</option>
                                  <option value="yes">2%</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-blue-600">{fmt(calculateDeducteeTDS(d))}</td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => deleteDeductee(actualIdx)} className="text-red-500 hover:text-red-700">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-blue-50 font-semibold">
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-right">Total 194C:</td>
                          <td className="px-3 py-2 text-right">{fmt(formData.deductees.filter(d => d.section === '194C').reduce((sum, d) => sum + d.amount, 0))}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right text-blue-700">{fmt(formData.deductees.filter(d => d.section === '194C').reduce((sum, d) => sum + calculateDeducteeTDS(d), 0))}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Section 194J */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">194J</span>
                      Professional Services ({formData.deductees.filter(d => d.section === '194J').length} entries)
                    </h4>
                    <Button onClick={() => addDeductee('194J')} size="sm" variant="outline" className="text-purple-600">
                      <Plus size={14} className="mr-1" /> Add Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left w-8">#</th>
                          <th className="px-3 py-2 text-left">Deductee Name</th>
                          <th className="px-3 py-2 text-left">PAN</th>
                          <th className="px-3 py-2 text-left">Invoice No</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-center">Rate</th>
                          <th className="px-3 py-2 text-right">TDS</th>
                          <th className="px-3 py-2 text-center w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.deductees.filter(d => d.section === '194J').map((d, idx) => {
                          const actualIdx = formData.deductees.findIndex(x => x === d);
                          return (
                            <tr key={actualIdx} className="border-t border-slate-100 hover:bg-purple-50/50">
                              <td className="px-3 py-2">{idx + 1}</td>
                              <td className="px-3 py-2">
                                <Input value={d.name} onChange={(e) => updateDeductee(actualIdx, 'name', e.target.value)} className="h-8 text-sm" />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={d.pan} onChange={(e) => updateDeductee(actualIdx, 'pan', e.target.value.toUpperCase())} className="h-8 text-sm font-mono" maxLength={10} />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={d.invoice_no} onChange={(e) => updateDeductee(actualIdx, 'invoice_no', e.target.value)} className="h-8 text-sm" />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={d.date} onChange={(e) => updateDeductee(actualIdx, 'date', e.target.value)} className="h-8 text-sm" />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" value={d.amount} onChange={(e) => updateDeductee(actualIdx, 'amount', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                              </td>
                              <td className="px-3 py-2 text-center text-slate-600">10%</td>
                              <td className="px-3 py-2 text-right font-semibold text-purple-600">{fmt(calculateDeducteeTDS(d))}</td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => deleteDeductee(actualIdx)} className="text-red-500 hover:text-red-700">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-purple-50 font-semibold">
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-right">Total 194J:</td>
                          <td className="px-3 py-2 text-right">{fmt(formData.deductees.filter(d => d.section === '194J').reduce((sum, d) => sum + d.amount, 0))}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right text-purple-700">{fmt(formData.deductees.filter(d => d.section === '194J').reduce((sum, d) => sum + calculateDeducteeTDS(d), 0))}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Section 194I */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">194I</span>
                      Rent Payments ({formData.deductees.filter(d => d.section === '194I').length} entries)
                    </h4>
                    <Button onClick={() => addDeductee('194I')} size="sm" variant="outline" className="text-green-600">
                      <Plus size={14} className="mr-1" /> Add Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left w-8">#</th>
                          <th className="px-3 py-2 text-left">Landlord Name</th>
                          <th className="px-3 py-2 text-left">PAN</th>
                          <th className="px-3 py-2 text-left">Invoice No</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-center">Rate</th>
                          <th className="px-3 py-2 text-right">TDS</th>
                          <th className="px-3 py-2 text-center w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.deductees.filter(d => d.section === '194I').map((d, idx) => {
                          const actualIdx = formData.deductees.findIndex(x => x === d);
                          return (
                            <tr key={actualIdx} className="border-t border-slate-100 hover:bg-green-50/50">
                              <td className="px-3 py-2">{idx + 1}</td>
                              <td className="px-3 py-2">
                                <Input value={d.name} onChange={(e) => updateDeductee(actualIdx, 'name', e.target.value)} className="h-8 text-sm" />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={d.pan} onChange={(e) => updateDeductee(actualIdx, 'pan', e.target.value.toUpperCase())} className="h-8 text-sm font-mono" maxLength={10} />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={d.invoice_no} onChange={(e) => updateDeductee(actualIdx, 'invoice_no', e.target.value)} className="h-8 text-sm" />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={d.date} onChange={(e) => updateDeductee(actualIdx, 'date', e.target.value)} className="h-8 text-sm" />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" value={d.amount} onChange={(e) => updateDeductee(actualIdx, 'amount', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                              </td>
                              <td className="px-3 py-2 text-center text-slate-600">10%</td>
                              <td className="px-3 py-2 text-right font-semibold text-green-600">{fmt(calculateDeducteeTDS(d))}</td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => deleteDeductee(actualIdx)} className="text-red-500 hover:text-red-700">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-green-50 font-semibold">
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-right">Total 194I:</td>
                          <td className="px-3 py-2 text-right">{fmt(formData.deductees.filter(d => d.section === '194I').reduce((sum, d) => sum + d.amount, 0))}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right text-green-700">{fmt(formData.deductees.filter(d => d.section === '194I').reduce((sum, d) => sum + calculateDeducteeTDS(d), 0))}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Form 26Q Grand Total:</span>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">Total Payment: {fmt(formData.deductees.reduce((sum, d) => sum + d.amount, 0))}</div>
                      <div className="text-xl font-bold text-orange-600">Total TDS: {fmt(formData.deductees.reduce((sum, d) => sum + calculateDeducteeTDS(d), 0))}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form 24Q Content */}
            {activeTab === '24q' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-900">Employee Details ({formData.employees.length} employees)</h4>
                  <Button onClick={addEmployee} size="sm" variant="outline" className="text-green-600">
                    <Plus size={14} className="mr-1" /> Add Employee
                  </Button>
                </div>
                
                <div className="overflow-x-auto border rounded-lg mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left w-8">#</th>
                        <th className="px-3 py-2 text-left">Employee Name</th>
                        <th className="px-3 py-2 text-left">PAN</th>
                        <th className="px-3 py-2 text-left">Designation</th>
                        <th className="px-3 py-2 text-right">Monthly Salary</th>
                        <th className="px-3 py-2 text-right">80C</th>
                        <th className="px-3 py-2 text-right">80D</th>
                        <th className="px-3 py-2 text-right">HRA</th>
                        <th className="px-3 py-2 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.employees.map((e, idx) => (
                        <tr key={idx} className="border-t border-slate-100 hover:bg-green-50/50">
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <Input value={e.name} onChange={(ev) => updateEmployee(idx, 'name', ev.target.value)} className="h-8 text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <Input value={e.pan} onChange={(ev) => updateEmployee(idx, 'pan', ev.target.value.toUpperCase())} className="h-8 text-sm font-mono" maxLength={10} />
                          </td>
                          <td className="px-3 py-2">
                            <Input value={e.designation} onChange={(ev) => updateEmployee(idx, 'designation', ev.target.value)} className="h-8 text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" value={e.monthly_salary} onChange={(ev) => updateEmployee(idx, 'monthly_salary', parseFloat(ev.target.value) || 0)} className="h-8 text-sm text-right" />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" value={e.exemptions?.['80C'] || 0} onChange={(ev) => updateEmployee(idx, 'exemptions.80C', ev.target.value)} className="h-8 text-sm text-right" />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" value={e.exemptions?.['80D'] || 0} onChange={(ev) => updateEmployee(idx, 'exemptions.80D', ev.target.value)} className="h-8 text-sm text-right" />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" value={e.exemptions?.HRA || 0} onChange={(ev) => updateEmployee(idx, 'exemptions.HRA', ev.target.value)} className="h-8 text-sm text-right" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => deleteEmployee(idx)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-green-50 font-semibold">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right">Total Monthly Salary:</td>
                        <td className="px-3 py-2 text-right">{fmt(formData.employees.reduce((sum, e) => sum + e.monthly_salary, 0))}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Quarterly Summary */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-slate-600">Total Employees</div>
                      <div className="text-2xl font-bold text-slate-900">{formData.employees.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Quarterly Salary</div>
                      <div className="text-2xl font-bold text-slate-900">{fmt(formData.employees.reduce((sum, e) => sum + e.monthly_salary * 3, 0))}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Est. Quarterly TDS</div>
                      <div className="text-2xl font-bold text-green-600">Calculated on Submit</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500">
              {formData.deductees.length} deductees | {formData.employees.length} employees loaded
            </div>
            <Button onClick={calculateTDS} disabled={loading || (formData.deductees.length === 0 && formData.employees.length === 0)} className="bg-orange-600 hover:bg-orange-700 px-8">
              <Calculator size={18} className="mr-2" />
              {loading ? 'Calculating...' : 'Calculate TDS & Generate Reports'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Results */}
      {step === 5 && results && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <button onClick={resetAll} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Start New Return
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500 uppercase mb-1">Deductees (26Q)</p>
              <p className="text-2xl font-bold text-slate-900">{results.summary.total_deductees}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500 uppercase mb-1">Employees (24Q)</p>
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

          {/* Form 26Q Summary */}
          {results.form_26q && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Building size={20} className="text-blue-600" /> Form 26Q - Section-wise Summary
              </h3>
              <div className="overflow-x-auto">
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
                      <tr key={idx} className="border-t border-slate-100">
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
            </div>
          )}

          {/* PAN Validation */}
          {panValidation.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-600" /> PAN Validation Report
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{panValidation.filter(p => p.status === 'Valid').length}</div>
                  <div className="text-sm text-slate-600">Valid PANs</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{panValidation.filter(p => p.status === 'Mismatch').length}</div>
                  <div className="text-sm text-slate-600">Mismatches</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{panValidation.filter(p => p.status === 'Invalid' || p.status === 'Inactive').length}</div>
                  <div className="text-sm text-slate-600">Invalid/Inactive</div>
                </div>
              </div>
              {panValidation.filter(p => p.status !== 'Valid').length > 0 && (
                <div className="space-y-2">
                  {panValidation.filter(p => p.status !== 'Valid').map((p, idx) => (
                    <div key={idx} className={`p-3 rounded-lg text-sm flex items-center gap-3 ${p.status === 'Mismatch' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>
                      {p.status === 'Mismatch' ? <AlertTriangle size={16} /> : <X size={16} />}
                      <span className="font-mono">{p.pan}</span>
                      <span>-</span>
                      <span>{p.name}</span>
                      <span className="ml-auto">{p.remarks}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Download Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-orange-600" /> Download TDS Package
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button onClick={() => exportTracesJSON('26Q')} disabled={loading} className="bg-blue-600 hover:bg-blue-700 flex-col h-auto py-4">
                <FileText size={22} className="mb-2" />
                <span className="text-sm">Form 26Q JSON</span>
                <span className="text-[10px] opacity-75">TRACES Upload</span>
              </Button>
              <Button onClick={() => exportTracesJSON('24Q')} disabled={loading} className="bg-green-600 hover:bg-green-700 flex-col h-auto py-4">
                <FileText size={22} className="mb-2" />
                <span className="text-sm">Form 24Q JSON</span>
                <span className="text-[10px] opacity-75">TRACES Upload</span>
              </Button>
              <Button onClick={exportTallyXML} disabled={loading} className="bg-purple-600 hover:bg-purple-700 flex-col h-auto py-4">
                <FileSpreadsheet size={22} className="mb-2" />
                <span className="text-sm">Tally XML</span>
                <span className="text-[10px] opacity-75">Ready to Import</span>
              </Button>
              <Button onClick={() => { exportTracesJSON('26Q'); exportTracesJSON('24Q'); exportTallyXML(); }} disabled={loading} className="bg-orange-600 hover:bg-orange-700 flex-col h-auto py-4">
                <Download size={22} className="mb-2" />
                <span className="text-sm">Download All</span>
                <span className="text-[10px] opacity-75">Complete Package</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TDSFiling;
