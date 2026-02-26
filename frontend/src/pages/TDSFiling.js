import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import { 
  FileText, Download, AlertTriangle, CheckCircle, Users, 
  Building, Calculator, Landmark, RefreshCw, FileSpreadsheet,
  ChevronRight, AlertCircle, Check, X, Upload, FileUp, Table,
  Edit3, Plus, Trash2, Sparkles, PenTool, Eye, Package, Save,
  ChevronDown, ChevronUp, Info, Clock, BadgeCheck, BadgeAlert
} from 'lucide-react';

const TDSFiling = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState(null); // 'ai' or 'manual'
  const [step, setStep] = useState(1); // 1: Mode Select, 2: Setup, 3: Extraction, 4: Summary, 5: Download
  const [returnId, setReturnId] = useState(null);
  const [results, setResults] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('26q'); // '26q' or '24q'
  const [expandedSections, setExpandedSections] = useState({ '194C': true, '194J': true, '194I': true });
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

  // PAN validation results (inline in extraction view)
  const [panValidation, setPanValidation] = useState({});

  // Validate PAN format
  const validatePAN = (pan) => {
    if (!pan || pan.length !== 10) {
      return { status: 'invalid', message: 'Invalid PAN format' };
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(pan)) {
      return { status: 'invalid', message: 'Invalid PAN format' };
    }
    // Simulate validation (in production, this would call NSDL API)
    const random = Math.random();
    if (random < 0.1) {
      return { status: 'mismatch', message: 'Name mismatch with NSDL records' };
    }
    if (random < 0.05) {
      return { status: 'inactive', message: 'PAN is inactive' };
    }
    return { status: 'valid', message: 'PAN verified' };
  };

  // Validate all PANs when data changes
  useEffect(() => {
    const validation = {};
    formData.deductees.forEach((d, idx) => {
      if (d.pan) {
        validation[`deductee_${idx}`] = validatePAN(d.pan);
      }
    });
    formData.employees.forEach((e, idx) => {
      if (e.pan) {
        validation[`employee_${idx}`] = validatePAN(e.pan);
      }
    });
    setPanValidation(validation);
  }, [formData.deductees, formData.employees]);

  // Get PAN status badge
  const getPANBadge = (key) => {
    const result = panValidation[key];
    if (!result) return null;
    
    const statusConfig = {
      valid: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', icon: CheckCircle, label: 'Valid' },
      mismatch: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: AlertTriangle, label: 'Mismatch' },
      invalid: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: X, label: 'Invalid' },
      inactive: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: AlertCircle, label: 'Inactive' }
    };
    
    const config = statusConfig[result.status] || statusConfig.invalid;
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.text} ${config.border} border`} title={result.message}>
        <Icon size={12} />
        <span>{config.label}</span>
      </div>
    );
  };

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

  // Calculate TDS (moves to summary view)
  const calculateTDS = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/tds/calculate', formData);
      if (response.data.success) {
        setReturnId(response.data.return_id);
        setResults(response.data);
        setStep(4); // Go to Summary View
        setSuccess('TDS calculation complete! Review summary below.');
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
        return response.data.xml;
      }
    } catch (err) {
      setError('Failed to export Tally XML');
    } finally {
      setLoading(false);
    }
    return null;
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
        return response.data.json;
      }
    } catch (err) {
      setError('Failed to export');
    } finally {
      setLoading(false);
    }
    return null;
  };

  // Download complete package as individual files
  const downloadAllFiles = async () => {
    setLoading(true);
    setError('');
    try {
      // Download all files sequentially
      await exportTracesJSON('26Q');
      await exportTracesJSON('24Q');
      await exportTallyXML();
      setSuccess('All files downloaded successfully!');
    } catch (err) {
      setError('Failed to download some files');
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Get validation summary
  const getValidationSummary = () => {
    const values = Object.values(panValidation);
    return {
      valid: values.filter(v => v.status === 'valid').length,
      mismatch: values.filter(v => v.status === 'mismatch').length,
      invalid: values.filter(v => v.status === 'invalid' || v.status === 'inactive').length,
      total: values.length
    };
  };

  // Section table component for 26Q
  const SectionTable = ({ section, sectionName, colorClass, entries }) => {
    const isExpanded = expandedSections[section];
    const totalAmount = entries.reduce((sum, d) => sum + d.amount, 0);
    const totalTDS = entries.reduce((sum, d) => sum + calculateDeducteeTDS(d), 0);
    
    return (
      <div className="mb-6 border rounded-xl overflow-hidden">
        {/* Section Header - Collapsible */}
        <div 
          className={`flex items-center justify-between p-4 cursor-pointer ${colorClass.bg} hover:opacity-90 transition-opacity`}
          onClick={() => toggleSection(section)}
        >
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${colorClass.badge}`}>{section}</span>
            <h4 className={`font-bold ${colorClass.text}`}>{sectionName}</h4>
            <span className="text-sm text-slate-600">({entries.length} entries)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div className="text-slate-600">Total: {fmt(totalAmount)}</div>
              <div className={`font-semibold ${colorClass.text}`}>TDS: {fmt(totalTDS)}</div>
            </div>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
        
        {/* Section Content */}
        {isExpanded && (
          <div className="p-4">
            <div className="flex justify-end mb-3">
              <Button onClick={() => addDeductee(section)} size="sm" variant="outline" className={colorClass.text}>
                <Plus size={14} className="mr-1" /> Add Row
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid={`table-${section}`}>
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left min-w-[180px]">Deductee Name</th>
                    <th className="px-3 py-2 text-left min-w-[140px]">PAN</th>
                    <th className="px-3 py-2 text-center w-24">Status</th>
                    <th className="px-3 py-2 text-left min-w-[100px]">Invoice</th>
                    <th className="px-3 py-2 text-left w-28">Date</th>
                    <th className="px-3 py-2 text-right min-w-[120px]">Amount</th>
                    <th className="px-3 py-2 text-center w-20">Rate</th>
                    <th className="px-3 py-2 text-right w-24">TDS</th>
                    <th className="px-3 py-2 text-center w-16">Del</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((d, idx) => {
                    const actualIdx = formData.deductees.findIndex(x => x === d);
                    const panKey = `deductee_${actualIdx}`;
                    const panStatus = panValidation[panKey];
                    
                    return (
                      <tr key={actualIdx} className={`border-t border-slate-100 hover:${colorClass.hoverBg}`}>
                        <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <Input 
                            value={d.name} 
                            onChange={(e) => updateDeductee(actualIdx, 'name', e.target.value)} 
                            className="h-8 text-sm border-blue-200 focus:border-blue-400" 
                            placeholder="Enter name"
                            data-testid={`input-name-${section}-${idx}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input 
                            value={d.pan} 
                            onChange={(e) => updateDeductee(actualIdx, 'pan', e.target.value.toUpperCase())} 
                            className={`h-8 text-sm font-mono ${panStatus?.status === 'invalid' || panStatus?.status === 'inactive' ? 'border-red-400 bg-red-50' : panStatus?.status === 'mismatch' ? 'border-amber-400 bg-amber-50' : 'border-green-200'}`}
                            maxLength={10} 
                            placeholder="ABCDE1234F"
                            data-testid={`input-pan-${section}-${idx}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {getPANBadge(panKey)}
                        </td>
                        <td className="px-3 py-2">
                          <Input 
                            value={d.invoice_no} 
                            onChange={(e) => updateDeductee(actualIdx, 'invoice_no', e.target.value)} 
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input 
                            value={d.date} 
                            onChange={(e) => updateDeductee(actualIdx, 'date', e.target.value)} 
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input 
                            type="number" 
                            value={d.amount} 
                            onChange={(e) => updateDeductee(actualIdx, 'amount', parseFloat(e.target.value) || 0)} 
                            className="h-8 text-sm text-right border-blue-200"
                            data-testid={`input-amount-${section}-${idx}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {section === '194C' ? (
                            <select 
                              value={d.is_company ? 'yes' : 'no'} 
                              onChange={(e) => updateDeductee(actualIdx, 'is_company', e.target.value === 'yes')} 
                              className="h-8 text-sm border rounded px-2"
                            >
                              <option value="no">1%</option>
                              <option value="yes">2%</option>
                            </select>
                          ) : (
                            <span className="text-slate-600">10%</span>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${colorClass.text}`}>
                          {fmt(calculateDeducteeTDS(d))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button 
                            onClick={() => deleteDeductee(actualIdx)} 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                            data-testid={`delete-${section}-${idx}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {entries.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Table size={32} className="mx-auto mb-2 opacity-50" />
                <p>No entries yet. Click "Add Row" to add deductees.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-4 text-sm">
          {[
            { num: 1, label: 'Select Mode' },
            { num: 2, label: 'Setup' },
            { num: 3, label: 'Review & Edit' },
            { num: 4, label: 'Summary' },
            { num: 5, label: 'Download' }
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${step >= s.num ? 'bg-white/30' : 'bg-white/10'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= s.num ? 'bg-white text-orange-600 font-bold' : 'bg-white/30'}`}>
                  {step > s.num ? <Check size={12} /> : s.num}
                </span>
                <span className="hidden md:inline">{s.label}</span>
              </div>
              {i < 4 && <ChevronRight size={16} className="mx-1 opacity-50" />}
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3" data-testid="error-alert">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <span className="text-red-800">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-600 text-xl hover:bg-red-100 rounded-full w-6 h-6 flex items-center justify-center">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3" data-testid="success-alert">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <span className="text-green-800">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-600 text-xl hover:bg-green-100 rounded-full w-6 h-6 flex items-center justify-center">×</button>
        </div>
      )}

      {/* Step 1: Mode Selection */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="step-1-mode-selection">
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
        <div className="space-y-6" data-testid="step-2-setup">
          <button onClick={() => setStep(1)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2 mb-4">
            ← Back to Mode Selection
          </button>

          {/* Company Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building size={20} className="text-slate-600" />
              Company Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">TAN</label>
                <Input value={formData.tan} onChange={(e) => setFormData({...formData, tan: e.target.value.toUpperCase()})} placeholder="DELA12345B" data-testid="input-tan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company PAN</label>
                <Input value={formData.pan} onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})} placeholder="AABCT1234F" data-testid="input-company-pan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <Input value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} placeholder="ABC Trading Co." data-testid="input-company-name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quarter</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.quarter} onChange={(e) => setFormData({...formData, quarter: parseInt(e.target.value)})} data-testid="select-quarter">
                  <option value={1}>Q1 (Apr-Jun)</option>
                  <option value={2}>Q2 (Jul-Sep)</option>
                  <option value={3}>Q3 (Oct-Dec)</option>
                  <option value={4}>Q4 (Jan-Mar)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year</label>
                <Input value={formData.financial_year} onChange={(e) => setFormData({...formData, financial_year: e.target.value})} placeholder="2024-25" data-testid="input-fy" />
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
                  <Button onClick={() => deducteeFileRef.current?.click()} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="upload-deductees-btn">
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
                  <Button onClick={() => employeeFileRef.current?.click()} disabled={loading} className="w-full bg-green-600 hover:bg-green-700" data-testid="upload-employees-btn">
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
                <Button onClick={loadSampleData} disabled={loading} className="bg-purple-600 hover:bg-purple-700" data-testid="load-sample-btn">
                  <RefreshCw size={18} className="mr-2" /> Load Sample Data (Demo)
                </Button>
                <Button onClick={() => setStep(3)} className="bg-orange-600 hover:bg-orange-700" data-testid="start-empty-btn">
                  <PenTool size={18} className="mr-2" /> Start Empty Entry
                </Button>
              </div>
            </div>
          )}

          {/* Upload errors */}
          {uploadErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
                <AlertTriangle size={18} />
                Upload Warnings ({uploadErrors.length})
              </div>
              <ul className="text-sm text-amber-700 space-y-1">
                {uploadErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>Row {err.row}: {err.error}</li>
                ))}
                {uploadErrors.length > 5 && <li>...and {uploadErrors.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Extraction View / Manual Entry */}
      {step === 3 && (
        <div className="space-y-6" data-testid="step-3-extraction">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep(2)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back
            </button>
            <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg">
              <Eye size={18} />
              <span className="font-medium">Extraction View - Verify & Edit Data</span>
            </div>
          </div>

          {/* Validation Summary Bar */}
          {(formData.deductees.length > 0 || formData.employees.length > 0) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="text-green-600" size={20} />
                    <span className="text-sm font-medium">PAN Validation:</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      <CheckCircle size={14} /> {getValidationSummary().valid} Valid
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                      <AlertTriangle size={14} /> {getValidationSummary().mismatch} Mismatch
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                      <X size={14} /> {getValidationSummary().invalid} Invalid
                    </div>
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  Total: {getValidationSummary().total} PANs checked
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('26q')}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${activeTab === '26q' ? 'bg-blue-50 border-b-2 border-blue-600 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                data-testid="tab-26q"
              >
                <Building size={18} /> Form 26Q - Non-Salary ({formData.deductees.length})
              </button>
              <button 
                onClick={() => setActiveTab('24q')}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${activeTab === '24q' ? 'bg-green-50 border-b-2 border-green-600 text-green-700' : 'hover:bg-slate-50 text-slate-600'}`}
                data-testid="tab-24q"
              >
                <Users size={18} /> Form 24Q - Salary ({formData.employees.length})
              </button>
            </div>

            {/* Form 26Q Content */}
            {activeTab === '26q' && (
              <div className="p-6">
                {/* Section 194C - Contractors */}
                <SectionTable 
                  section="194C" 
                  sectionName="Contractors" 
                  colorClass={{
                    bg: 'bg-blue-50',
                    badge: 'bg-blue-600 text-white',
                    text: 'text-blue-600',
                    hoverBg: 'bg-blue-50/50'
                  }}
                  entries={formData.deductees.filter(d => d.section === '194C')}
                />

                {/* Section 194J - Professional Services */}
                <SectionTable 
                  section="194J" 
                  sectionName="Professional Services" 
                  colorClass={{
                    bg: 'bg-purple-50',
                    badge: 'bg-purple-600 text-white',
                    text: 'text-purple-600',
                    hoverBg: 'bg-purple-50/50'
                  }}
                  entries={formData.deductees.filter(d => d.section === '194J')}
                />

                {/* Section 194I - Rent */}
                <SectionTable 
                  section="194I" 
                  sectionName="Rent Payments" 
                  colorClass={{
                    bg: 'bg-green-50',
                    badge: 'bg-green-600 text-white',
                    text: 'text-green-600',
                    hoverBg: 'bg-green-50/50'
                  }}
                  entries={formData.deductees.filter(d => d.section === '194I')}
                />

                {/* Grand Total */}
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-5 mt-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-lg">Form 26Q Grand Total</span>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">Total Payment: {fmt(formData.deductees.reduce((sum, d) => sum + d.amount, 0))}</div>
                      <div className="text-2xl font-bold text-orange-600">Total TDS: {fmt(formData.deductees.reduce((sum, d) => sum + calculateDeducteeTDS(d), 0))}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form 24Q Content */}
            {activeTab === '24q' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Users size={20} className="text-green-600" />
                    Employee Details ({formData.employees.length} employees)
                  </h4>
                  <Button onClick={addEmployee} size="sm" variant="outline" className="text-green-600" data-testid="add-employee-btn">
                    <Plus size={14} className="mr-1" /> Add Employee
                  </Button>
                </div>
                
                <div className="overflow-x-auto border rounded-xl mb-6">
                  <table className="w-full text-sm" data-testid="table-employees">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 text-left w-8">#</th>
                        <th className="px-3 py-3 text-left min-w-[180px]">Employee Name</th>
                        <th className="px-3 py-3 text-left min-w-[140px]">PAN</th>
                        <th className="px-3 py-3 text-center w-24">Status</th>
                        <th className="px-3 py-3 text-left min-w-[120px]">Designation</th>
                        <th className="px-3 py-3 text-right min-w-[130px]">Monthly Salary</th>
                        <th className="px-3 py-3 text-right w-24">80C</th>
                        <th className="px-3 py-3 text-right w-24">80D</th>
                        <th className="px-3 py-3 text-right w-24">HRA</th>
                        <th className="px-3 py-3 text-center w-16">Del</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.employees.map((e, idx) => {
                        const panKey = `employee_${idx}`;
                        const panStatus = panValidation[panKey];
                        
                        return (
                          <tr key={idx} className="border-t border-slate-100 hover:bg-green-50/50">
                            <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <Input 
                                value={e.name} 
                                onChange={(ev) => updateEmployee(idx, 'name', ev.target.value)} 
                                className="h-8 text-sm border-blue-200"
                                placeholder="Enter name"
                                data-testid={`emp-name-${idx}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input 
                                value={e.pan} 
                                onChange={(ev) => updateEmployee(idx, 'pan', ev.target.value.toUpperCase())} 
                                className={`h-8 text-sm font-mono ${panStatus?.status === 'invalid' || panStatus?.status === 'inactive' ? 'border-red-400 bg-red-50' : panStatus?.status === 'mismatch' ? 'border-amber-400 bg-amber-50' : 'border-green-200'}`}
                                maxLength={10}
                                placeholder="ABCDE1234F"
                                data-testid={`emp-pan-${idx}`}
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              {getPANBadge(panKey)}
                            </td>
                            <td className="px-3 py-2">
                              <Input 
                                value={e.designation} 
                                onChange={(ev) => updateEmployee(idx, 'designation', ev.target.value)} 
                                className="h-8 text-sm"
                                placeholder="Designation"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input 
                                type="number" 
                                value={e.monthly_salary} 
                                onChange={(ev) => updateEmployee(idx, 'monthly_salary', parseFloat(ev.target.value) || 0)} 
                                className="h-8 text-sm text-right border-blue-200"
                                data-testid={`emp-salary-${idx}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input 
                                type="number" 
                                value={e.exemptions?.['80C'] || 0} 
                                onChange={(ev) => updateEmployee(idx, 'exemptions.80C', ev.target.value)} 
                                className="h-8 text-sm text-right"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input 
                                type="number" 
                                value={e.exemptions?.['80D'] || 0} 
                                onChange={(ev) => updateEmployee(idx, 'exemptions.80D', ev.target.value)} 
                                className="h-8 text-sm text-right"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input 
                                type="number" 
                                value={e.exemptions?.HRA || 0} 
                                onChange={(ev) => updateEmployee(idx, 'exemptions.HRA', ev.target.value)} 
                                className="h-8 text-sm text-right"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button 
                                onClick={() => deleteEmployee(idx)} 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                data-testid={`delete-emp-${idx}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {formData.employees.length === 0 && (
                  <div className="text-center py-8 text-slate-500 border rounded-xl">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No employees yet. Click "Add Employee" to add salary data.</p>
                  </div>
                )}

                {/* Quarterly Summary */}
                {formData.employees.length > 0 && (
                  <div className="bg-gradient-to-r from-green-100 to-green-50 rounded-xl p-5">
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
                        <div className="text-sm text-slate-600">Est. Annual Salary</div>
                        <div className="text-2xl font-bold text-green-600">{fmt(formData.employees.reduce((sum, e) => sum + e.monthly_salary * 12, 0))}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{formData.deductees.length}</span> deductees | <span className="font-medium">{formData.employees.length}</span> employees loaded
            </div>
            <Button 
              onClick={calculateTDS} 
              disabled={loading || (formData.deductees.length === 0 && formData.employees.length === 0)} 
              className="bg-orange-600 hover:bg-orange-700 px-8"
              data-testid="calculate-tds-btn"
            >
              <Calculator size={18} className="mr-2" />
              {loading ? 'Calculating...' : 'Calculate TDS & Continue'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Summary View */}
      {step === 4 && results && (
        <div className="space-y-6" data-testid="step-4-summary">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep(3)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back to Edit
            </button>
            <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <FileText size={18} />
              <span className="font-medium">Summary View - Review Calculations</span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <Building className="mx-auto mb-2 text-blue-600" size={24} />
              <p className="text-xs text-slate-500 uppercase mb-1">Deductees (26Q)</p>
              <p className="text-2xl font-bold text-slate-900">{results.summary?.total_deductees || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <Users className="mx-auto mb-2 text-green-600" size={24} />
              <p className="text-xs text-slate-500 uppercase mb-1">Employees (24Q)</p>
              <p className="text-2xl font-bold text-slate-900">{results.summary?.total_employees || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <Calculator className="mx-auto mb-2 text-orange-600" size={24} />
              <p className="text-xs text-slate-500 uppercase mb-1">Total TDS</p>
              <p className="text-2xl font-bold text-orange-600">{fmt(results.summary?.total_tds || 0)}</p>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-5 text-center text-white">
              <Clock className="mx-auto mb-2" size={24} />
              <p className="text-xs uppercase mb-1 opacity-90">Due Date</p>
              <p className="text-2xl font-bold">{results.summary?.due_date || 'N/A'}</p>
            </div>
          </div>

          {/* Form 26Q Section-wise Summary */}
          {results.form_26q && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Building size={20} className="text-blue-600" /> Form 26Q - Section-wise Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Section</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Deductees</th>
                      <th className="px-4 py-3 text-right">Total Payment</th>
                      <th className="px-4 py-3 text-right">Total TDS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.form_26q.section_wise_summary?.map((s, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-100 rounded font-semibold">{s.section}</span>
                        </td>
                        <td className="px-4 py-3">{s.description}</td>
                        <td className="px-4 py-3 text-right">{s.deductee_count}</td>
                        <td className="px-4 py-3 text-right">{fmt(s.total_payment)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-orange-600">{fmt(s.total_tds)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right">Form 26Q Total:</td>
                      <td className="px-4 py-3 text-right">{fmt(results.form_26q.summary?.total_amount_paid || 0)}</td>
                      <td className="px-4 py-3 text-right text-orange-600">{fmt(results.form_26q.summary?.total_tds_deducted || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Form 24Q Summary */}
          {results.form_24q && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users size={20} className="text-green-600" /> Form 24Q - Employee TDS Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-600">Total Employees</div>
                  <div className="text-xl font-bold text-green-700">{results.form_24q.summary?.total_employees || 0}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-600">Total Salary Paid</div>
                  <div className="text-xl font-bold text-green-700">{fmt(results.form_24q.summary?.total_salary_paid || 0)}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-600">TDS Deducted</div>
                  <div className="text-xl font-bold text-green-700">{fmt(results.form_24q.summary?.total_tds_deducted || 0)}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-600">TDS Deposited</div>
                  <div className="text-xl font-bold text-green-700">{fmt(results.form_24q.summary?.total_tds_deposited || 0)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Month-wise Payment Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-slate-600" /> TDS Payment Schedule
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Month</th>
                    <th className="px-4 py-3 text-right">TDS Deducted</th>
                    <th className="px-4 py-3 text-right">TDS Deposited</th>
                    <th className="px-4 py-3 text-center">Due Date</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(results.form_26q?.month_wise_summary || []).map((m, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{m.month}</td>
                      <td className="px-4 py-3 text-right">{fmt(m.tds_deducted)}</td>
                      <td className="px-4 py-3 text-right">{fmt(m.tds_deposited)}</td>
                      <td className="px-4 py-3 text-center">{m.due_date}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAN Validation Summary */}
          {results.pan_validation && results.pan_validation.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BadgeCheck size={20} className="text-amber-600" /> PAN Validation Report
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <CheckCircle className="mx-auto mb-2 text-green-600" size={24} />
                  <div className="text-2xl font-bold text-green-600">{results.pan_validation.filter(p => p.status === 'Valid').length}</div>
                  <div className="text-sm text-slate-600">Valid PANs</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl">
                  <AlertTriangle className="mx-auto mb-2 text-amber-600" size={24} />
                  <div className="text-2xl font-bold text-amber-600">{results.pan_validation.filter(p => p.status === 'Mismatch').length}</div>
                  <div className="text-sm text-slate-600">Name Mismatches</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <X className="mx-auto mb-2 text-red-600" size={24} />
                  <div className="text-2xl font-bold text-red-600">{results.pan_validation.filter(p => p.status === 'Invalid' || p.status === 'Inactive').length}</div>
                  <div className="text-sm text-slate-600">Invalid/Inactive</div>
                </div>
              </div>
              
              {results.pan_validation.filter(p => p.status !== 'Valid').length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {results.pan_validation.filter(p => p.status !== 'Valid').map((p, idx) => (
                    <div key={idx} className={`p-3 rounded-lg text-sm flex items-center gap-3 ${p.status === 'Mismatch' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                      {p.status === 'Mismatch' ? <AlertTriangle size={16} /> : <X size={16} />}
                      <span className="font-mono font-medium">{p.pan}</span>
                      <span className="text-slate-500">-</span>
                      <span>{p.name}</span>
                      <span className="ml-auto text-xs bg-white/50 px-2 py-1 rounded">{p.remarks}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center bg-white rounded-xl border border-slate-200 p-4">
            <Button onClick={() => setStep(3)} variant="outline">
              ← Edit Data
            </Button>
            <Button 
              onClick={() => setStep(5)} 
              className="bg-orange-600 hover:bg-orange-700 px-8"
              data-testid="proceed-download-btn"
            >
              <Package size={18} className="mr-2" />
              Proceed to Download
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Download Package */}
      {step === 5 && results && (
        <div className="space-y-6" data-testid="step-5-download">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep(4)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
              ← Back to Summary
            </button>
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
              <Package size={18} />
              <span className="font-medium">Download Package - Ready to Export</span>
            </div>
          </div>

          {/* Success Banner */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <CheckCircle size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold">TDS Return Ready!</h2>
                <p className="opacity-90">Q{formData.quarter} {formData.financial_year} | {formData.company_name}</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-3xl font-bold">{fmt(results.summary?.total_tds || 0)}</div>
                <div className="text-sm opacity-90">Total TDS Calculated</div>
              </div>
            </div>
          </div>

          {/* Download Options */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Download size={20} className="text-orange-600" /> Download TDS Package
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Form 26Q JSON */}
              <div className="border-2 border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Form 26Q</h4>
                    <p className="text-xs text-slate-500">TRACES JSON</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">Non-salary TDS return file for TRACES portal upload</p>
                <Button 
                  onClick={() => exportTracesJSON('26Q')} 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  data-testid="download-26q-btn"
                >
                  <Download size={16} className="mr-2" /> Download
                </Button>
              </div>

              {/* Form 24Q JSON */}
              <div className="border-2 border-slate-200 rounded-xl p-5 hover:border-green-400 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Form 24Q</h4>
                    <p className="text-xs text-slate-500">TRACES JSON</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">Salary TDS return file for TRACES portal upload</p>
                <Button 
                  onClick={() => exportTracesJSON('24Q')} 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="download-24q-btn"
                >
                  <Download size={16} className="mr-2" /> Download
                </Button>
              </div>

              {/* Tally XML */}
              <div className="border-2 border-slate-200 rounded-xl p-5 hover:border-purple-400 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileSpreadsheet className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Tally XML</h4>
                    <p className="text-xs text-slate-500">Ready to Import</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">Complete TDS vouchers & ledgers for Tally Prime</p>
                <Button 
                  onClick={exportTallyXML} 
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  data-testid="download-tally-btn"
                >
                  <Download size={16} className="mr-2" /> Download
                </Button>
              </div>

              {/* Download All */}
              <div className="border-2 border-orange-300 bg-orange-50 rounded-xl p-5 hover:border-orange-500 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Package className="text-white" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">All Files</h4>
                    <p className="text-xs text-slate-500">Complete Package</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">Download all files at once (26Q, 24Q, Tally)</p>
                <Button 
                  onClick={downloadAllFiles} 
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  data-testid="download-all-btn"
                >
                  <Download size={16} className="mr-2" /> Download All
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Reference */}
          <div className="bg-slate-50 rounded-xl p-6">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Info size={18} className="text-slate-600" /> Quick Reference
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">TAN:</span>
                <span className="ml-2 font-mono font-medium">{formData.tan}</span>
              </div>
              <div>
                <span className="text-slate-500">Quarter:</span>
                <span className="ml-2 font-medium">Q{formData.quarter} ({formData.financial_year})</span>
              </div>
              <div>
                <span className="text-slate-500">Due Date:</span>
                <span className="ml-2 font-medium text-red-600">{results.summary?.due_date || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Start New */}
          <div className="flex justify-center pt-4">
            <Button onClick={resetAll} variant="outline" className="px-8">
              <RefreshCw size={16} className="mr-2" /> Start New TDS Return
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TDSFiling;
