import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Calculator, AlertTriangle, Edit, Eye, Save, Sparkles, XCircle, User, Briefcase, FileSpreadsheet, Building2, TrendingDown, Download, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadForm16, calculateTax, generateITRPdf, processITRDocuments } from '@/services/api';

// ============ STATE MACHINE (GOLD STANDARD) ============
const ITR_STATES = {
  IDLE: 'idle',
  FILE_UPLOADED: 'file_uploaded',
  SCANNING: 'scanning',
  EXTRACTED: 'extracted',
  EDITING: 'editing',
  VALIDATED: 'validated',
  CALCULATED: 'calculated',
  ERROR: 'error'
};

// ============ MANDATORY SECTIONS ============
const MANDATORY_SECTIONS = [
  { id: 'personal', label: 'Personal Information', icon: User },
  { id: 'salary', label: 'Income - Salary', icon: Briefcase },
  { id: 'tds', label: 'TDS - Employer', icon: FileSpreadsheet },
  { id: 'regime', label: 'Tax Regime Selection', icon: TrendingDown },
  { id: 'bank', label: 'Bank Details', icon: Building2 }
];

const ITRFiling = () => {
  // ============ STATE MANAGEMENT ============
  const [itrState, setItrState] = useState(ITR_STATES.IDLE);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  
  const [editedData, setEditedData] = useState({
    personal: { pan: '', name: '', dob: '', financial_year: '2024-25' },
    salary: { gross_salary: '', employer_tan: '', employer_name: '' },
    tds: { tds_deducted: '' },
    regime: null,
    bank: { account_number: '', ifsc: '', bank_name: '' },
    deductions: { section_80c: 0, section_80d: 0, hra_claimed: 0 }
  });
  
  const [sectionCompletion, setSectionCompletion] = useState({
    personal: false,
    salary: false,
    tds: false,
    regime: false,
    bank: false
  });
  
  const [validationErrors, setValidationErrors] = useState([]);
  const [taxCalculation, setTaxCalculation] = useState(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(null);
  const [processing, setProcessing] = useState(false);

  // ============ CLEAR DATA ON MOUNT (FAILSAFE) ============
  useEffect(() => {
    setItrState(ITR_STATES.IDLE);
    setExtractedData(null);
    setTaxCalculation(null);
    setValidationErrors([]);
  }, []);

  // ============ FILE UPLOAD ============
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setError('Please upload Form-16 to continue');
      return;
    }

    if (file.size === 0) {
      setError('Uploaded file is empty');
      return;
    }

    setUploadedFile(file);
    setItrState(ITR_STATES.FILE_UPLOADED);
    setError('');
  };

  // ============ OCR SCAN (ASSISTIVE) ============
  const handleScan = async () => {
    if (!uploadedFile) {
      setError('No file to scan');
      return;
    }

    setItrState(ITR_STATES.SCANNING);
    setError('');

    try {
      const response = await uploadForm16(uploadedFile);
      
      if (!response.data.success) {
        setItrState(ITR_STATES.ERROR);
        setError(response.data.message || 'Scan failed');
        return;
      }

      const data = response.data.data;
      const hasMinimumData = data.gross_salary && data.employee_pan;
      
      if (!hasMinimumData) {
        setError('⚠️ Partial data extracted — please complete manually');
      }

      setItrState(ITR_STATES.EXTRACTED);
      setExtractedData(data);
      
      // Pre-fill from extraction
      setEditedData(prev => ({
        ...prev,
        personal: {
          ...prev.personal,
          pan: data.employee_pan || '',
          name: data.employee_name || '',
          financial_year: data.financial_year || '2024-25'
        },
        salary: {
          ...prev.salary,
          gross_salary: data.gross_salary || '',
          employer_tan: data.employer_tan || '',
          employer_name: data.employer_name || ''
        },
        tds: {
          tds_deducted: data.tds_deducted || ''
        },
        deductions: {
          section_80c: data.section_80c || 0,
          section_80d: data.section_80d || 0,
          hra_claimed: data.hra_claimed || 0
        }
      }));

    } catch (err) {
      setItrState(ITR_STATES.ERROR);
      setError(err.response?.data?.detail || 'Scan failed. Please enter manually.');
    }
  };

  // ============ UPDATE SECTION DATA ============
  const updateSectionData = (section, field, value) => {
    setEditedData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // ============ SAVE SECTION ============
  const handleSaveSection = (sectionId) => {
    // Basic validation
    let isValid = true;
    
    if (sectionId === 'personal') {
      if (!editedData.personal.pan || !editedData.personal.name) {
        setError('PAN and Name are mandatory');
        isValid = false;
      }
    } else if (sectionId === 'salary') {
      if (!editedData.salary.gross_salary || editedData.salary.gross_salary <= 0) {
        setError('Gross salary is mandatory');
        isValid = false;
      }
    } else if (sectionId === 'tds') {
      if (editedData.tds.tds_deducted === '' || editedData.tds.tds_deducted === undefined) {
        setError('TDS amount is mandatory (enter 0 if none)');
        isValid = false;
      }
    } else if (sectionId === 'regime') {
      if (!editedData.regime) {
        setError('Please select a tax regime');
        isValid = false;
      }
    } else if (sectionId === 'bank') {
      if (!editedData.bank.account_number || !editedData.bank.ifsc) {
        setError('Account number and IFSC are mandatory');
        isValid = false;
      }
    }

    if (!isValid) return;

    setSectionCompletion(prev => ({ ...prev, [sectionId]: true }));
    setActiveSection(null);
    setError('');
  };

  // ============ VALIDATION ENGINE ============
  const validateITR = () => {
    const errors = [];

    if (!editedData.personal.pan) errors.push({ section: 'personal', message: 'PAN is mandatory' });
    if (!editedData.personal.name) errors.push({ section: 'personal', message: 'Name is mandatory' });
    if (!editedData.salary.gross_salary || editedData.salary.gross_salary <= 0) {
      errors.push({ section: 'salary', message: 'Gross salary is mandatory' });
    }
    if (editedData.tds.tds_deducted === '' || editedData.tds.tds_deducted === undefined) {
      errors.push({ section: 'tds', message: 'TDS amount is mandatory' });
    }
    if (!editedData.regime) errors.push({ section: 'regime', message: 'Select tax regime' });
    if (!editedData.bank.account_number) errors.push({ section: 'bank', message: 'Bank account mandatory' });

    const incompleteSections = MANDATORY_SECTIONS.filter(s => !sectionCompletion[s.id]);
    if (incompleteSections.length > 0) {
      errors.push({
        section: 'general',
        message: `Complete and save: ${incompleteSections.map(s => s.label).join(', ')}`
      });
    }

    setValidationErrors(errors);
    return errors;
  };

  // ============ CALCULATE TAX ============
  const handleCalculateTax = async () => {
    const errors = validateITR();
    
    if (errors.length > 0) {
      setError('Please fix validation errors before calculating');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const calculationData = {
        financial_year: editedData.personal.financial_year,
        gross_salary: parseFloat(editedData.salary.gross_salary),
        section_80c: parseFloat(editedData.deductions.section_80c) || 0,
        section_80d: parseFloat(editedData.deductions.section_80d) || 0,
        hra_claimed: parseFloat(editedData.deductions.hra_claimed) || 0,
        tds_deducted: parseFloat(editedData.tds.tds_deducted) || 0,
        employee_pan: editedData.personal.pan,
        employee_name: editedData.personal.name,
        employer_tan: editedData.salary.employer_tan,
        employer_name: editedData.salary.employer_name
      };

      const response = await calculateTax(calculationData);

      if (!response.data.success) {
        setError(response.data.message || 'Calculation failed');
        if (response.data.errors) {
          setValidationErrors(response.data.errors.map(e => ({
            section: 'backend',
            message: e.message
          })));
        }
        return;
      }

      setItrState(ITR_STATES.CALCULATED);
      setTaxCalculation(response.data.calculation);

    } catch (err) {
      setError(err.response?.data?.detail || 'Tax calculation failed');
    } finally {
      setProcessing(false);
    }
  };

  const canCalculate = () => {
    return itrState === ITR_STATES.EXTRACTED && 
           Object.values(sectionCompletion).every(v => v === true);
  };

  // ============ RENDER ============
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white border border-slate-700">
        <h1 className="text-3xl font-bold mb-2">Income Tax Return (ITR) Filing</h1>
        <p className="text-slate-300 text-lg">Production-Grade • CA-Level Validation • Zero Silent Failures</p>
        
        <div className="mt-4 flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            itrState === ITR_STATES.ERROR ? 'bg-red-500' :
            itrState === ITR_STATES.CALCULATED ? 'bg-green-500' :
            'bg-yellow-500 animate-pulse'
          }`}></div>
          <span className="text-sm">Status: {itrState.replace(/_/g, ' ').toUpperCase()}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6">
          <h3 className="font-bold text-amber-900 mb-3 flex items-center">
            <XCircle size={20} className="mr-2" />
            Validation Errors ({validationErrors.length})
          </h3>
          <ul className="space-y-2">
            {validationErrors.map((err, idx) => (
              <li key={idx} className="text-sm text-amber-800 flex items-start">
                <span className="mr-2">•</span>
                <span><strong>{err.section}:</strong> {err.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 1: Upload */}
      {itrState === ITR_STATES.IDLE && (
        <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-dashed border-blue-300">
          <div className="text-center">
            <FileText size={48} className="mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Step 1: Upload Form-16</h3>
            <p className="text-slate-600 mb-4">AI will extract data, but you'll review everything</p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
              id="form16-upload"
            />
            <label htmlFor="form16-upload">
              <Button className="bg-blue-600 hover:bg-blue-700 cursor-pointer" asChild>
                <span>
                  <Upload size={18} className="mr-2" />
                  Upload Form-16
                </span>
              </Button>
            </label>
            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-700 mb-2">OR</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setItrState(ITR_STATES.EXTRACTED)}
              >
                <Edit size={18} className="mr-2" />
                Skip Upload, Enter Manually
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Scan */}
      {itrState === ITR_STATES.FILE_UPLOADED && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">File Uploaded</h3>
            <p className="text-slate-600 mb-4">{uploadedFile?.name}</p>
            <Button 
              onClick={handleScan}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3"
            >
              <Sparkles size={20} className="mr-2" />
              Scan Form-16 with AI
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Scanning */}
      {itrState === ITR_STATES.SCANNING && (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold">Scanning Form-16...</h3>
        </div>
      )}

      {/* Step 4: Manual Review (MANDATORY) */}
      {[ITR_STATES.EXTRACTED, ITR_STATES.EDITING].includes(itrState) && (
        <div className="space-y-4">
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
            <h3 className="font-bold text-blue-900 mb-2">⚠️ Manual Review Required</h3>
            <p className="text-blue-800 text-sm">Review and save each section before calculating tax</p>
          </div>

          {/* Section List */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Section Completion</h3>
            <div className="space-y-2">
              {MANDATORY_SECTIONS.map(section => {
                const Icon = section.icon;
                return (
                  <div key={section.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {sectionCompletion[section.id] ? (
                        <CheckCircle className="text-green-600" size={20} />
                      ) : (
                        <XCircle className="text-slate-400" size={20} />
                      )}
                      <Icon size={18} className="text-slate-600" />
                      <span className={sectionCompletion[section.id] ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                        {section.label}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveSection(section.id)}
                    >
                      {sectionCompletion[section.id] ? <Eye size={16} className="mr-1" /> : <Edit size={16} className="mr-1" />}
                      {sectionCompletion[section.id] ? 'View' : 'Edit'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calculate Button */}
          <div className="text-center">
            <Button
              onClick={handleCalculateTax}
              disabled={!canCalculate() || processing}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-12 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator size={24} className="mr-3" />
                  Calculate Tax
                </>
              )}
            </Button>
            {!canCalculate() && !processing && (
              <p className="text-sm text-amber-600 mt-2">Complete all mandatory sections first</p>
            )}
          </div>
        </div>
      )}

      {/* MODALS - Personal Info */}
      {activeSection === 'personal' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <User size={24} className="mr-2" />
              Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PAN *</label>
                <input
                  type="text"
                  value={editedData.personal.pan}
                  onChange={(e) => updateSectionData('personal', 'pan', e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="ABCDE1234F"
                  maxLength="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editedData.personal.name}
                  onChange={(e) => updateSectionData('personal', 'name', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={editedData.personal.dob}
                  onChange={(e) => updateSectionData('personal', 'dob', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button onClick={() => handleSaveSection('personal')} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Save size={16} className="mr-2" />
                  Save
                </Button>
                <Button onClick={() => setActiveSection(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS - Salary */}
      {activeSection === 'salary' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Briefcase size={24} className="mr-2" />
              Salary Income
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gross Salary *</label>
                <input
                  type="number"
                  value={editedData.salary.gross_salary}
                  onChange={(e) => updateSectionData('salary', 'gross_salary', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="1200000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employer Name</label>
                <input
                  type="text"
                  value={editedData.salary.employer_name}
                  onChange={(e) => updateSectionData('salary', 'employer_name', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employer TAN</label>
                <input
                  type="text"
                  value={editedData.salary.employer_tan}
                  onChange={(e) => updateSectionData('salary', 'employer_tan', e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  maxLength="10"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button onClick={() => handleSaveSection('salary')} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Save size={16} className="mr-2" />
                  Save
                </Button>
                <Button onClick={() => setActiveSection(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS - TDS */}
      {activeSection === 'tds' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <FileSpreadsheet size={24} className="mr-2" />
              TDS Deducted
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">TDS Deducted *</label>
                <input
                  type="number"
                  value={editedData.tds.tds_deducted}
                  onChange={(e) => updateSectionData('tds', 'tds_deducted', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">Enter 0 if no TDS was deducted</p>
              </div>
              <div className="flex space-x-3 pt-4">
                <Button onClick={() => handleSaveSection('tds')} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Save size={16} className="mr-2" />
                  Save
                </Button>
                <Button onClick={() => setActiveSection(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS - Regime */}
      {activeSection === 'regime' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <TrendingDown size={24} className="mr-2" />
              Tax Regime Selection
            </h3>
            <div className="space-y-4">
              <div 
                onClick={() => setEditedData(prev => ({ ...prev, regime: 'new' }))}
                className={`p-4 border-2 rounded-lg cursor-pointer ${editedData.regime === 'new' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">New Regime</h4>
                  {editedData.regime === 'new' && <CheckCircle className="text-blue-600" size={20} />}
                </div>
                <p className="text-sm text-slate-600">Higher exemption limit (₹3L), no deductions</p>
              </div>
              
              <div 
                onClick={() => setEditedData(prev => ({ ...prev, regime: 'old' }))}
                className={`p-4 border-2 rounded-lg cursor-pointer ${editedData.regime === 'old' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Old Regime</h4>
                  {editedData.regime === 'old' && <CheckCircle className="text-blue-600" size={20} />}
                </div>
                <p className="text-sm text-slate-600">Lower exemption (₹2.5L), but allows deductions</p>
              </div>

              {editedData.regime === 'old' && (
                <div className="mt-4 space-y-3 p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm font-semibold text-amber-900">Deductions (Optional)</p>
                  <div>
                    <label className="block text-xs text-amber-800 mb-1">Section 80C (max ₹1.5L)</label>
                    <input
                      type="number"
                      value={editedData.deductions.section_80c}
                      onChange={(e) => updateSectionData('deductions', 'section_80c', e.target.value)}
                      className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
                      max="150000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-amber-800 mb-1">Section 80D (max ₹25K)</label>
                    <input
                      type="number"
                      value={editedData.deductions.section_80d}
                      onChange={(e) => updateSectionData('deductions', 'section_80d', e.target.value)}
                      className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
                      max="25000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-amber-800 mb-1">HRA Claimed</label>
                    <input
                      type="number"
                      value={editedData.deductions.hra_claimed}
                      onChange={(e) => updateSectionData('deductions', 'hra_claimed', e.target.value)}
                      className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button onClick={() => handleSaveSection('regime')} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Save size={16} className="mr-2" />
                  Save
                </Button>
                <Button onClick={() => setActiveSection(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS - Bank */}
      {activeSection === 'bank' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Building2 size={24} className="mr-2" />
              Bank Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Number *</label>
                <input
                  type="text"
                  value={editedData.bank.account_number}
                  onChange={(e) => updateSectionData('bank', 'account_number', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code *</label>
                <input
                  type="text"
                  value={editedData.bank.ifsc}
                  onChange={(e) => updateSectionData('bank', 'ifsc', e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  maxLength="11"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={editedData.bank.bank_name}
                  onChange={(e) => updateSectionData('bank', 'bank_name', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <p className="text-xs text-slate-500">Required for refund processing</p>
              <div className="flex space-x-3 pt-4">
                <Button onClick={() => handleSaveSection('bank')} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Save size={16} className="mr-2" />
                  Save
                </Button>
                <Button onClick={() => setActiveSection(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Tax Calculation Result */}
      {itrState === ITR_STATES.CALCULATED && taxCalculation && (
        <div className="space-y-6">
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
            <h3 className="font-bold text-green-900 mb-4 flex items-center">
              <CheckCircle className="mr-2" size={24} />
              Tax Calculated Successfully!
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Old Regime */}
              <div className={`bg-white rounded-xl p-6 border-2 ${
                taxCalculation.suggested_regime === 'old' ? 'border-green-400' : 'border-slate-200'
              }`}>
                {taxCalculation.suggested_regime === 'old' && (
                  <div className="mb-3 bg-green-100 text-green-800 px-3 py-1 rounded text-center font-bold text-sm">
                    ⭐ RECOMMENDED
                  </div>
                )}
                <h4 className="font-semibold text-lg mb-4">Old Regime</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Gross Income:</span>
                    <span className="font-semibold">₹{taxCalculation.gross_income?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deductions:</span>
                    <span className="font-semibold text-green-600">-₹{taxCalculation.total_deductions?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Taxable Income:</span>
                    <span className="font-bold">₹{taxCalculation.taxable_income_old?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                    <span className="font-semibold">Tax:</span>
                    <span className="text-xl font-bold text-red-600">₹{Math.round(taxCalculation.old_regime_tax || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* New Regime */}
              <div className={`rounded-xl p-6 border-2 ${
                taxCalculation.suggested_regime === 'new' 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white border-green-400' 
                  : 'bg-white border-slate-200'
              }`}>
                {taxCalculation.suggested_regime === 'new' && (
                  <div className="mb-3 bg-white/90 text-green-800 px-3 py-1 rounded text-center font-bold text-sm">
                    ⭐ RECOMMENDED
                  </div>
                )}
                <h4 className={`font-semibold text-lg mb-4 ${taxCalculation.suggested_regime === 'new' ? 'text-white' : 'text-slate-900'}`}>
                  New Regime
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={taxCalculation.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Gross Income:</span>
                    <span className="font-semibold">₹{taxCalculation.gross_income?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={taxCalculation.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Standard Deduction:</span>
                    <span className="font-semibold">-₹{taxCalculation.standard_deduction?.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between border-t pt-2 ${taxCalculation.suggested_regime === 'new' ? 'border-green-400' : 'border-slate-200'}`}>
                    <span className={taxCalculation.suggested_regime === 'new' ? 'text-green-100' : 'text-slate-600'}>Taxable Income:</span>
                    <span className="font-bold">₹{taxCalculation.taxable_income_new?.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between items-center p-2 rounded ${
                    taxCalculation.suggested_regime === 'new' ? 'bg-white/20' : 'bg-slate-50'
                  }`}>
                    <span className="font-semibold">Tax:</span>
                    <span className={`text-xl font-bold ${taxCalculation.suggested_regime === 'new' ? 'text-white' : 'text-red-600'}`}>
                      ₹{Math.round(taxCalculation.new_regime_tax || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {taxCalculation.suggested_regime === 'new' && taxCalculation.savings > 0 && (
                  <div className="mt-4 bg-yellow-400 text-slate-900 p-3 rounded text-center font-bold">
                    💰 YOU SAVE: ₹{Math.round(taxCalculation.savings).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {taxCalculation.recommendations && taxCalculation.recommendations.length > 0 && (
              <div className="mt-6 bg-white rounded-xl p-6 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3">💡 Tax Saving Recommendations</h4>
                <ul className="space-y-2">
                  {taxCalculation.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start">
                      <CheckCircle className="text-green-600 mr-2 flex-shrink-0 mt-0.5" size={16} />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Start New ITR */}
          <div className="text-center">
            <Button 
              onClick={() => {
                setItrState(ITR_STATES.IDLE);
                setUploadedFile(null);
                setExtractedData(null);
                setTaxCalculation(null);
                setSectionCompletion({
                  personal: false,
                  salary: false,
                  tds: false,
                  regime: false,
                  bank: false
                });
              }}
              variant="outline"
            >
              Start New ITR Filing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITRFiling;
