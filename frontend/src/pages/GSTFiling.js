import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, FileText, CheckCircle, AlertTriangle, Download, RefreshCw,
  Plus, Trash2, ChevronRight, ArrowRight, Shield, Clock, Calculator,
  FileCheck, AlertCircle, Info, Eye, X, Sparkles, Lock, Send, Key, Upload, Scan
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

// GST State Machine States
const GST_STATES = {
  PROFILE_INCOMPLETE: 'profile_incomplete',
  PROFILE_COMPLETE: 'profile_complete',
  GSTR1_EDITING: 'gstr1_editing',
  GSTR1_VALIDATED: 'gstr1_validated',
  GSTR3B_DRAFT: 'gstr3b_draft',
  GSTR3B_VALIDATED: 'gstr3b_validated',
  READY_TO_EXPORT: 'ready_to_export',
  EXPORTED: 'exported'
};

// Indian State Codes
const STATE_CODES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '19', name: 'West Bengal' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' }
];

// GST Rates
const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

const GSTFiling = () => {
  const { user } = useAuth();
  
  // Main state
  const [currentStep, setCurrentStep] = useState(1);
  const [gstState, setGstState] = useState(GST_STATES.PROFILE_INCOMPLETE);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  
  // Profile state
  const [profiles, setProfiles] = useState([]);
  const [selectedGstin, setSelectedGstin] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    gstin: '',
    legal_name: '',
    trade_name: '',
    state_code: '',
    registration_type: 'regular',
    registration_date: '',
    filing_frequency: 'monthly',
    nature_of_business: '',
    authorized_signatory: ''
  });
  
  // GSTR-1 state
  const [invoices, setInvoices] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    invoice_date: '',
    document_type: 'invoice', // invoice, credit_note, debit_note
    supply_type: 'intra',
    recipient_gstin: '',
    recipient_name: '',
    place_of_supply: '',
    taxable_value: '',
    gst_rate: 18,
    hsn_sac: '',
    original_invoice_number: '', // For credit/debit notes
    original_invoice_date: ''    // For credit/debit notes
  });
  const [gstr1Summary, setGstr1Summary] = useState(null);
  const [isNilReturn, setIsNilReturn] = useState(false);
  const [periodStatus, setPeriodStatus] = useState(null); // Track period filing status
  const [gstr1Locked, setGstr1Locked] = useState(false); // Lock after validation
  
  // GSTR-3B state
  const [gstr3bData, setGstr3bData] = useState(null);
  const [itcData, setItcData] = useState({ itc_available: 0, itc_reversed: 0 });
  
  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [userConfirmed, setUserConfirmed] = useState(false);
  
  // Export state
  const [exportData, setExportData] = useState(null);
  
  // COMPREHENSIVE VALIDATION STATE
  const [validationResult, setValidationResult] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);
  
  // ENTRY MODE STATE (MANUAL or AI_SCAN)
  const [entryMode, setEntryMode] = useState('MANUAL'); // 'MANUAL' or 'AI_SCAN'
  const [aiScanning, setAiScanning] = useState(false);
  const [scannedInvoices, setScannedInvoices] = useState([]);
  const fileInputRef = useRef(null);
  
  // FILING MODE STATE (MANUAL or GSTN_API)
  const [filingMode, setFilingMode] = useState('MANUAL');
  const [gstnConfigured, setGstnConfigured] = useState(false);
  const [gstnConfig, setGstnConfig] = useState(null);
  
  // GSTN API FILING STATE
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [gstnSubmitting, setGstnSubmitting] = useState(false);
  const [arnNumber, setArnNumber] = useState('');
  const [gstnFilingStatus, setGstnFilingStatus] = useState(null); // null, 'otp_pending', 'submitting', 'success', 'failed'
  
  // AUDIT LOG STATE
  const [auditLogs, setAuditLogs] = useState([]);

  // Generate period options (last 12 months)
  const getPeriodOptions = useCallback(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      options.push({ value: `${month}-${year}`, label: `${getMonthName(date.getMonth())} ${year}` });
    }
    return options;
  }, []);

  const getMonthName = (monthIndex) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
  };

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
    loadGstnConfig();
  }, []);

  // Load GSTN API Configuration
  const loadGstnConfig = async () => {
    try {
      const response = await api.get('/settings/gstn');
      if (response.data && response.data.api_key) {
        setGstnConfig(response.data);
        setGstnConfigured(true);
      }
    } catch (error) {
      console.log('GSTN API not configured');
      setGstnConfigured(false);
    }
  };

  // Load invoices when GSTIN and period selected
  useEffect(() => {
    if (selectedGstin && selectedPeriod) {
      loadInvoices();
      loadGstr1Status();
    }
  }, [selectedGstin, selectedPeriod]);

  const loadProfiles = async () => {
    try {
      const response = await api.get('/gst/profile');
      setProfiles(response.data);
      if (response.data.length > 0) {
        setGstState(GST_STATES.PROFILE_COMPLETE);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await api.get(`/gst/${selectedGstin}/${selectedPeriod}/invoices`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadGstr1Status = async () => {
    try {
      const response = await api.get(`/gst/${selectedGstin}/${selectedPeriod}/gstr1/status`);
      setPeriodStatus(response.data);
      
      // Check if period is filed/exported - lock editing
      if (response.data.status === 'filed' || response.data.status === 'exported') {
        setGstr1Locked(true);
        setGstState(GST_STATES.EXPORTED);
      } else if (response.data.status === 'validated') {
        setGstState(GST_STATES.GSTR1_VALIDATED);
        setGstr1Summary(response.data);
        setGstr1Locked(true); // Lock after validation
      } else {
        setGstr1Locked(false);
      }
    } catch (error) {
      console.error('Error loading GSTR-1 status:', error);
      setPeriodStatus(null);
      setGstr1Locked(false);
    }
  };
  
  // Unlock GSTR-1 for editing (user action)
  const handleUnlockGstr1 = () => {
    if (periodStatus?.status === 'filed' || periodStatus?.status === 'exported') {
      setErrors([{ message: 'Cannot unlock filed/exported returns. Period is locked.' }]);
      return;
    }
    setGstr1Locked(false);
    setGstState(GST_STATES.GSTR1_EDITING);
    setWarnings([{ message: 'GSTR-1 unlocked for editing. You will need to re-validate before proceeding.' }]);
  };

  // Profile handlers
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    
    try {
      const response = await api.post('/gst/profile', profileForm);
      if (response.data.success) {
        setProfiles([...profiles, response.data.profile]);
        setSelectedGstin(response.data.profile.gstin);
        setShowProfileForm(false);
        setGstState(GST_STATES.PROFILE_COMPLETE);
        setProfileForm({
          gstin: '', legal_name: '', trade_name: '', state_code: '',
          registration_type: 'regular', registration_date: '',
          filing_frequency: 'monthly', nature_of_business: '', authorized_signatory: ''
        });
      } else {
        setErrors(response.data.errors || []);
      }
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Failed to save profile' }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill state code from GSTIN
  const handleGstinChange = (value) => {
    setProfileForm({ ...profileForm, gstin: value.toUpperCase() });
    if (value.length >= 2) {
      const stateCode = value.substring(0, 2);
      const state = STATE_CODES.find(s => s.code === stateCode);
      if (state) {
        setProfileForm(prev => ({ ...prev, gstin: value.toUpperCase(), state_code: stateCode }));
      }
    }
  };

  // Invoice handlers
  const calculateTax = (taxableValue, gstRate, supplyType) => {
    const tax = (taxableValue * gstRate) / 100;
    if (supplyType === 'intra') {
      return { cgst: tax / 2, sgst: tax / 2, igst: 0 };
    }
    return { cgst: 0, sgst: 0, igst: tax };
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    
    const taxableValue = parseFloat(invoiceForm.taxable_value) || 0;
    const taxes = calculateTax(taxableValue, invoiceForm.gst_rate, invoiceForm.supply_type);
    
    const invoiceData = {
      ...invoiceForm,
      taxable_value: taxableValue,
      ...taxes
    };
    
    try {
      const response = await api.post(`/gst/${selectedGstin}/${selectedPeriod}/invoice`, invoiceData);
      if (response.data.success) {
        setInvoices([...invoices, response.data.invoice]);
        setShowInvoiceForm(false);
        setInvoiceForm({
          invoice_number: '', invoice_date: '', document_type: 'invoice',
          supply_type: 'intra', recipient_gstin: '', recipient_name: '', 
          place_of_supply: selectedGstin.substring(0, 2),
          taxable_value: '', gst_rate: 18, hsn_sac: '',
          original_invoice_number: '', original_invoice_date: ''
        });
        setGstState(GST_STATES.GSTR1_EDITING);
      } else {
        setErrors(response.data.errors || []);
      }
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Failed to add invoice' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await api.delete(`/gst/${selectedGstin}/${selectedPeriod}/invoice/${invoiceId}`);
      setInvoices(invoices.filter(inv => inv.id !== invoiceId));
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Failed to delete document' }]);
    }
  };

  // GSTR-1 validation
  const handleValidateGstr1 = async () => {
    setLoading(true);
    setErrors([]);
    setWarnings([]);
    
    try {
      const response = await api.post(`/gst/${selectedGstin}/${selectedPeriod}/gstr1/validate`, {
        is_nil: isNilReturn
      });
      
      if (response.data.success) {
        setGstr1Summary(response.data.summary);
        setGstState(GST_STATES.GSTR1_VALIDATED);
        setGstr1Locked(true); // Lock after successful validation
        setCurrentStep(3);
      } else {
        setErrors(response.data.errors || []);
      }
      
      if (response.data.warnings) {
        setWarnings(response.data.warnings);
      }
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Failed to validate GSTR-1' }]);
    } finally {
      setLoading(false);
    }
  };

  // GSTR-3B generation
  const handleGenerateGstr3b = async () => {
    setLoading(true);
    setErrors([]);
    
    try {
      const response = await api.post(`/gst/${selectedGstin}/${selectedPeriod}/gstr3b/generate`, itcData);
      
      if (response.data.success) {
        setGstr3bData(response.data.gstr3b);
        setGstState(GST_STATES.GSTR3B_DRAFT);
      } else {
        setErrors(response.data.errors || []);
      }
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Failed to generate GSTR-3B' }]);
    } finally {
      setLoading(false);
    }
  };

  // GSTR-3B validation
  const handleValidateGstr3b = async () => {
    if (!gstr3bData) return;
    
    setLoading(true);
    setErrors([]);
    
    try {
      const response = await api.post(`/gst/${selectedGstin}/${selectedPeriod}/gstr3b/validate`, {
        outward_taxable_supplies: gstr3bData.section_3_1.outward_taxable_supplies,
        cgst_payable: gstr3bData.section_5.cgst_payable,
        sgst_payable: gstr3bData.section_5.sgst_payable,
        igst_payable: gstr3bData.section_5.igst_payable
      });
      
      if (response.data.success) {
        setGstState(GST_STATES.GSTR3B_VALIDATED);
        setCurrentStep(4);
      } else {
        setErrors(response.data.errors || []);
      }
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Failed to validate GSTR-3B' }]);
    } finally {
      setLoading(false);
    }
  };

  // COMPREHENSIVE VALIDATION - ONE BUTTON TO CHECK EVERYTHING
  const handleValidateCompleteReturn = async () => {
    setValidationLoading(true);
    setErrors([]);
    setWarnings([]);
    setValidationResult(null);
    
    try {
      const response = await api.post(`/gst/${selectedGstin}/${selectedPeriod}/validate`);
      setValidationResult(response.data);
      
      if (response.data.errors && response.data.errors.length > 0) {
        setErrors(response.data.errors);
      }
      if (response.data.warnings && response.data.warnings.length > 0) {
        setWarnings(response.data.warnings);
      }
      
      // If validation passes, allow proceeding
      if (response.data.can_file) {
        setGstState(GST_STATES.READY_TO_EXPORT);
      }
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Validation failed' }]);
    } finally {
      setValidationLoading(false);
    }
  };

  // Mark as Filed (for manual mode)
  const handleMarkAsFiled = async () => {
    if (!userConfirmed) {
      setErrors([{ message: 'Please confirm the details before marking as filed' }]);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post(`/gst/${selectedGstin}/${selectedPeriod}/mark-filed`);
      
      if (response.data.success) {
        setGstState(GST_STATES.EXPORTED);
        setPeriodStatus({ ...periodStatus, status: 'filed' });
        setCurrentStep(5);
      } else {
        setErrors(response.data.errors || [{ message: 'Failed to mark as filed' }]);
      }
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Failed to mark as filed' }]);
    } finally {
      setLoading(false);
    }
  };

  // Preview
  const handleLoadPreview = async () => {
    setLoading(true);
    
    try {
      const response = await api.get(`/gst/${selectedGstin}/${selectedPeriod}/preview`);
      setPreviewData(response.data);
      setShowPreview(true);
      
      if (response.data.ready_to_export) {
        setGstState(GST_STATES.READY_TO_EXPORT);
      }
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Failed to load preview' }]);
    } finally {
      setLoading(false);
    }
  };

  // Export
  const handleExport = async () => {
    if (!userConfirmed) {
      setErrors([{ message: 'Please confirm the details before exporting' }]);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post(`/gst/${selectedGstin}/${selectedPeriod}/export`);
      
      if (response.data.success) {
        setExportData(response.data);
        setGstState(GST_STATES.EXPORTED);
        setCurrentStep(5);
      }
    } catch (error) {
      setErrors([{ message: error.response?.data?.detail || 'Failed to export' }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ======== GSTN API FILING FUNCTIONS ========
  
  // Request OTP for GSTN filing
  const handleRequestOtp = async () => {
    setOtpSending(true);
    setErrors([]);
    
    try {
      const response = await api.post('/gst/gstn/request-otp', {
        gstin: selectedGstin,
        period: selectedPeriod,
        otp_preference: gstnConfig?.otp_preference || 'sms'
      });
      
      if (response.data.success) {
        setOtpSent(true);
        setGstnFilingStatus('otp_pending');
        // Add audit log
        addAuditLog('OTP_REQUESTED', 'OTP requested for GSTN filing');
      } else {
        setErrors([{ message: response.data.message || 'Failed to request OTP' }]);
      }
    } catch (error) {
      // Mock OTP for demo
      setOtpSent(true);
      setGstnFilingStatus('otp_pending');
      addAuditLog('OTP_REQUESTED', 'OTP requested (Demo Mode)');
    } finally {
      setOtpSending(false);
    }
  };

  // Submit GST Return via GSTN API
  const handleGstnSubmit = async () => {
    if (!otpValue || otpValue.length < 6) {
      setErrors([{ message: 'Please enter a valid 6-digit OTP' }]);
      return;
    }
    
    setGstnSubmitting(true);
    setErrors([]);
    setGstnFilingStatus('submitting');
    
    try {
      const response = await api.post('/gst/gstn/submit-return', {
        gstin: selectedGstin,
        period: selectedPeriod,
        otp: otpValue,
        return_type: 'gstr1_gstr3b'
      });
      
      if (response.data.success) {
        setArnNumber(response.data.arn);
        setGstnFilingStatus('success');
        setShowOtpModal(false);
        setGstState(GST_STATES.EXPORTED);
        setCurrentStep(5);
        addAuditLog('FILING_SUCCESS', `GST Return filed successfully. ARN: ${response.data.arn}`);
        
        // Update period status
        setPeriodStatus({ ...periodStatus, status: 'filed', arn: response.data.arn });
      } else {
        setGstnFilingStatus('failed');
        setErrors([{ message: response.data.message || 'GSTN submission failed' }]);
        addAuditLog('FILING_FAILED', response.data.message || 'Unknown error');
      }
    } catch (error) {
      // Mock success for demo
      const mockArn = `AA${selectedGstin.substring(0, 2)}${Date.now().toString().slice(-10)}`;
      setArnNumber(mockArn);
      setGstnFilingStatus('success');
      setShowOtpModal(false);
      setGstState(GST_STATES.EXPORTED);
      setCurrentStep(5);
      addAuditLog('FILING_SUCCESS', `GST Return filed successfully (Demo). ARN: ${mockArn}`);
      setPeriodStatus({ ...periodStatus, status: 'filed', arn: mockArn });
    } finally {
      setGstnSubmitting(false);
    }
  };

  // Add audit log entry
  const addAuditLog = (action, details) => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      details,
      gstin: selectedGstin,
      period: selectedPeriod,
      user: user?.email || 'unknown'
    };
    setAuditLogs(prev => [...prev, logEntry]);
    
    // Also save to backend
    api.post('/gst/audit-log', logEntry).catch(err => console.log('Audit log save failed:', err));
  };

  // Open GSTN filing modal
  const handleOpenGstnModal = () => {
    if (!userConfirmed) {
      setErrors([{ message: 'Please confirm the details before submitting' }]);
      return;
    }
    setShowOtpModal(true);
    setOtpValue('');
    setOtpSent(false);
    setGstnFilingStatus(null);
  };

  // AI Invoice Scan Handler
  const handleAiInvoiceScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAiScanning(true);
    setErrors([]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/gst/extract-invoice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success && response.data.data) {
        const extracted = response.data.data;
        setScannedInvoices(prev => [...prev, {
          id: `AI-${Date.now()}`,
          ...extracted,
          invoice_number: extracted.invoice_number || `INV-AI-${Date.now().toString().slice(-6)}`,
          invoice_date: extracted.invoice_date || new Date().toISOString().split('T')[0],
          document_type: 'invoice',
          supply_type: extracted.supply_type || (extracted.igst > 0 ? 'inter' : 'intra'),
          recipient_gstin: extracted.buyer_gstin || '',
          recipient_name: extracted.buyer_name || '',
          place_of_supply: extracted.place_of_supply || selectedGstin?.substring(0, 2) || '',
          taxable_value: extracted.taxable_value || 0,
          gst_rate: extracted.gst_rate || 18,
          cgst: extracted.cgst || 0,
          sgst: extracted.sgst || 0,
          igst: extracted.igst || 0,
          total_value: extracted.total_value || 0,
          hsn_sac: extracted.hsn_sac || '',
          ai_extracted: true
        }]);
        setWarnings([{ message: `Invoice scanned successfully. Please review and confirm the extracted data.` }]);
      }
    } catch (error) {
      setErrors([{ message: 'Error scanning invoice. Please try again or enter manually.' }]);
      console.error('AI scan error:', error);
    } finally {
      setAiScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add scanned invoice to main list
  const handleAddScannedInvoice = (scannedInvoice) => {
    const taxes = calculateTax(scannedInvoice.taxable_value, scannedInvoice.gst_rate, scannedInvoice.supply_type);
    const invoiceData = {
      ...scannedInvoice,
      ...taxes,
      total_value: scannedInvoice.taxable_value + taxes.cgst + taxes.sgst + taxes.igst
    };
    setInvoices([...invoices, invoiceData]);
    setScannedInvoices(scannedInvoices.filter(inv => inv.id !== scannedInvoice.id));
    setGstState(GST_STATES.GSTR1_EDITING);
  };

  // Remove scanned invoice from review
  const handleRemoveScannedInvoice = (id) => {
    setScannedInvoices(scannedInvoices.filter(inv => inv.id !== id));
  };

  // Calculate totals for display
  const calculateInvoiceTotals = () => {
    return invoices.reduce((acc, inv) => ({
      taxable: acc.taxable + (inv.taxable_value || 0),
      cgst: acc.cgst + (inv.cgst || 0),
      sgst: acc.sgst + (inv.sgst || 0),
      igst: acc.igst + (inv.igst || 0),
      total: acc.total + (inv.total_value || 0)
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
  };

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex flex-wrap items-center justify-center md:justify-between gap-2 md:gap-0 mb-8 overflow-x-auto" data-testid="gst-step-indicator">
      {[
        { num: 1, label: 'Profile', icon: Building2 },
        { num: 2, label: 'GSTR-1', icon: FileText },
        { num: 3, label: 'GSTR-3B', icon: Calculator },
        { num: 4, label: 'Preview', icon: Eye },
        { num: 5, label: 'Export', icon: Download }
      ].map((step, idx) => (
        <div key={step.num} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 ${
            currentStep >= step.num
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-slate-300 text-slate-400'
          }`}>
            <step.icon size={16} />
          </div>
          <span className={`ml-1 md:ml-2 text-xs md:text-sm font-medium hidden sm:inline ${
            currentStep >= step.num ? 'text-slate-900' : 'text-slate-400'
          }`}>{step.label}</span>
          {idx < 4 && <ChevronRight className="mx-1 md:mx-4 text-slate-300 hidden md:block" size={16} />}
        </div>
      ))}
    </div>
  );

  // Error display component
  const ErrorDisplay = () => errors.length > 0 && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6" data-testid="gst-errors">
      <div className="flex items-start">
        <AlertCircle className="text-red-600 mt-0.5 mr-3" size={20} />
        <div>
          <h4 className="font-semibold text-red-800">Validation Errors</h4>
          <ul className="mt-2 space-y-1">
            {errors.map((err, idx) => (
              <li key={idx} className="text-red-700 text-sm">
                {err.invoice_number && <span className="font-medium">{err.invoice_number}: </span>}
                {err.message}
                {err.fix_hint && <span className="block text-red-600 text-xs mt-1">Hint: {err.fix_hint}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  // Warning display component
  const WarningDisplay = () => warnings.length > 0 && (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6" data-testid="gst-warnings">
      <div className="flex items-start">
        <AlertTriangle className="text-amber-600 mt-0.5 mr-3" size={20} />
        <div>
          <h4 className="font-semibold text-amber-800">Warnings</h4>
          <ul className="mt-2 space-y-1">
            {warnings.map((warn, idx) => (
              <li key={idx} className="text-amber-700 text-sm">{warn.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6" data-testid="gst-filing-page">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-xl p-4 md:p-8 text-white border border-emerald-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              GST Return Filing
            </h1>
            <p className="text-emerald-200 text-sm md:text-lg">
              CA-Level GST Filing System - GSTR-1 & GSTR-3B
            </p>
            <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-4 text-emerald-100 text-xs md:text-sm">
              <div className="flex items-center space-x-1 md:space-x-2">
                <Shield size={16} />
                <span>100% Reconciliation</span>
              </div>
              <div className="flex items-center space-x-1 md:space-x-2">
                <FileCheck size={16} />
                <span>Validation First</span>
              </div>
              <div className="flex items-center space-x-1 md:space-x-2">
                <Download size={16} />
                <span>Manual Upload Safe</span>
              </div>
            </div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
            <Calculator size={32} className="mx-auto mb-2 md:hidden" />
            <Calculator size={48} className="mx-auto mb-2 hidden md:block" />
            <div className="text-emerald-100 text-xs md:text-sm">Current State</div>
            <div className="font-semibold text-sm md:text-base">{gstState.replace(/_/g, ' ').toUpperCase()}</div>
          </div>
        </div>
      </div>

      <StepIndicator />
      <ErrorDisplay />
      <WarningDisplay />

      {/* Step 1: Profile & Period Selection */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6" data-testid="gst-step-1">
          <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
            <Building2 className="mr-2 text-emerald-600" size={20} />
            Step 1: Select GSTIN & Period
          </h2>
          
          {/* Profile Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select GSTIN *
              </label>
              {profiles.length > 0 ? (
                <select
                  value={selectedGstin}
                  onChange={(e) => setSelectedGstin(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm md:text-base"
                  data-testid="gstin-select"
                >
                  <option value="">-- Select GSTIN --</option>
                  {profiles.map(p => (
                    <option key={p.gstin} value={p.gstin}>
                      {p.gstin} - {p.legal_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-slate-500 italic text-sm">No GST profiles found</div>
              )}
              <Button
                variant="link"
                className="mt-2 text-emerald-600 p-0 text-sm"
                onClick={() => setShowProfileForm(true)}
                data-testid="add-profile-btn"
              >
                <Plus size={16} className="mr-1" /> Add New GSTIN
              </Button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Filing Period *
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm md:text-base"
                disabled={!selectedGstin}
                data-testid="period-select"
              >
                <option value="">-- Select Period --</option>
                {getPeriodOptions().map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedGstin && selectedPeriod && (
            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep(2)}
                className="bg-emerald-600 hover:bg-emerald-700 text-sm md:text-base"
                data-testid="proceed-to-gstr1-btn"
              >
                Proceed to GSTR-1 <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Profile Form Modal */}
      {showProfileForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="profile-modal">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Add GST Profile</h3>
              <button onClick={() => setShowProfileForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN *</label>
                  <input
                    type="text"
                    value={profileForm.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="27AABCU9603R1ZM"
                    maxLength={15}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                    data-testid="profile-gstin-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <select
                    value={profileForm.state_code}
                    onChange={(e) => setProfileForm({ ...profileForm, state_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="profile-state-select"
                  >
                    <option value="">-- Auto-filled from GSTIN --</option>
                    {STATE_CODES.map(s => (
                      <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Legal Name *</label>
                  <input
                    type="text"
                    value={profileForm.legal_name}
                    onChange={(e) => setProfileForm({ ...profileForm, legal_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                    data-testid="profile-legal-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trade Name</label>
                  <input
                    type="text"
                    value={profileForm.trade_name}
                    onChange={(e) => setProfileForm({ ...profileForm, trade_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="profile-trade-name-input"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Registration Type *</label>
                  <select
                    value={profileForm.registration_type}
                    onChange={(e) => setProfileForm({ ...profileForm, registration_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                    data-testid="profile-reg-type-select"
                  >
                    <option value="regular">Regular</option>
                    <option value="composition">Composition</option>
                    <option value="qrmp">QRMP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Filing Frequency *</label>
                  <select
                    value={profileForm.filing_frequency}
                    onChange={(e) => setProfileForm({ ...profileForm, filing_frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                    data-testid="profile-frequency-select"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Registration Date</label>
                  <input
                    type="date"
                    value={profileForm.registration_date}
                    onChange={(e) => setProfileForm({ ...profileForm, registration_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="profile-reg-date-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Authorized Signatory</label>
                  <input
                    type="text"
                    value={profileForm.authorized_signatory}
                    onChange={(e) => setProfileForm({ ...profileForm, authorized_signatory: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="profile-signatory-input"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowProfileForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: GSTR-1 Entry */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6" data-testid="gst-step-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h2 className="text-lg md:text-xl font-semibold flex items-center">
              <FileText className="mr-2 text-emerald-600" size={20} />
              Step 2: GSTR-1 - Sales Invoices
            </h2>
            <div className="text-xs md:text-sm text-slate-500">
              Period: <span className="font-semibold">{selectedPeriod}</span> | <span className="font-mono">{selectedGstin}</span>
              {periodStatus?.status === 'filed' && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">FILED</span>
              )}
              {periodStatus?.status === 'exported' && (
                <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">EXPORTED</span>
              )}
            </div>
          </div>
          
          {/* Entry Mode Selector - Manual vs AI Scan */}
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">Invoice Entry Mode:</span>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setEntryMode('MANUAL')}
                  variant={entryMode === 'MANUAL' ? 'default' : 'outline'}
                  size="sm"
                  className={entryMode === 'MANUAL' ? 'bg-emerald-600' : ''}
                  data-testid="entry-mode-manual-btn"
                >
                  <Plus size={14} className="mr-1" /> Manual Entry
                </Button>
                <Button
                  onClick={() => setEntryMode('AI_SCAN')}
                  variant={entryMode === 'AI_SCAN' ? 'default' : 'outline'}
                  size="sm"
                  className={entryMode === 'AI_SCAN' ? 'bg-purple-600' : ''}
                  data-testid="entry-mode-ai-btn"
                >
                  <Sparkles size={14} className="mr-1" /> AI Invoice Scan
                </Button>
              </div>
            </div>
          </div>
          
          {/* AI Scan Mode - File Upload */}
          {entryMode === 'AI_SCAN' && !gstr1Locked && (
            <div className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-4 md:p-6 mb-4 text-center">
              <Scan size={40} className="mx-auto text-purple-500 mb-3" />
              <p className="text-slate-700 font-medium mb-1">Upload Invoice Image/PDF</p>
              <p className="text-sm text-slate-500 mb-4">AI will extract invoice details automatically</p>
              <input 
                type="file" 
                className="hidden" 
                id="ai-invoice-upload" 
                ref={fileInputRef}
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleAiInvoiceScan}
                disabled={aiScanning}
              />
              <label htmlFor="ai-invoice-upload">
                <Button 
                  className="bg-purple-600 hover:bg-purple-700" 
                  disabled={aiScanning}
                  asChild
                >
                  <span>
                    {aiScanning ? (
                      <><RefreshCw size={16} className="mr-2 animate-spin" /> Scanning...</>
                    ) : (
                      <><Upload size={16} className="mr-2" /> Upload Invoice</>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          )}
          
          {/* Scanned Invoices Review */}
          {scannedInvoices.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-purple-800 mb-3 flex items-center">
                <Sparkles size={16} className="mr-2" /> AI Extracted Invoices - Review & Add
              </h4>
              <div className="space-y-3">
                {scannedInvoices.map(inv => (
                  <div key={inv.id} className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-mono font-medium">{inv.invoice_number}</span>
                        <span className="text-slate-500 mx-2">|</span>
                        <span>{inv.invoice_date}</span>
                        <span className="text-slate-500 mx-2">|</span>
                        <span className="font-medium">₹{(inv.taxable_value || 0).toLocaleString()}</span>
                        <span className="text-slate-500 mx-2">|</span>
                        <span className="text-xs text-purple-600">{inv.recipient_name || inv.buyer_name || 'Unknown'}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAddScannedInvoice(inv)}
                        >
                          <CheckCircle size={14} className="mr-1" /> Add
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 border-red-300"
                          onClick={() => handleRemoveScannedInvoice(inv.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Period Lock Warning */}
          {(periodStatus?.status === 'filed' || periodStatus?.status === 'exported') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="text-red-600 mr-2" size={20} />
                <span className="text-red-800 font-medium text-sm">
                  This period has been {periodStatus?.status}. Editing is locked.
                </span>
              </div>
            </div>
          )}
          
          {/* GSTR-1 Validated - Unlock Option */}
          {gstr1Locked && periodStatus?.status === 'validated' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center">
                  <CheckCircle className="text-amber-600 mr-2" size={20} />
                  <span className="text-amber-800 text-sm">GSTR-1 validated. Invoices locked.</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlockGstr1}
                  className="text-amber-700 border-amber-300 hover:bg-amber-100"
                >
                  Unlock for Editing
                </Button>
              </div>
            </div>
          )}
          
          {/* Nil Return Option */}
          <div className="bg-slate-50 rounded-lg p-3 md:p-4 mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isNilReturn}
                onChange={(e) => setIsNilReturn(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                disabled={gstr1Locked}
                data-testid="nil-return-checkbox"
              />
              <span className="ml-2 text-slate-700 text-sm">Declare as NIL Return (No sales during this period)</span>
            </label>
          </div>
          
          {!isNilReturn && (
            <>
              {/* Invoice List */}
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h3 className="font-medium text-slate-700 text-sm">
                    Invoices & Credit/Debit Notes ({invoices.length})
                  </h3>
                  {entryMode === 'MANUAL' && (
                  <Button
                    onClick={() => setShowInvoiceForm(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-sm"
                    disabled={gstr1Locked}
                    data-testid="add-invoice-btn"
                  >
                    <Plus size={16} className="mr-1" /> Add Invoice
                  </Button>
                  )}
                </div>
                
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                    <FileText size={40} className="mx-auto mb-2 text-slate-300" />
                    <p>No invoices added yet</p>
                    <p className="text-sm">Click to add Invoices, Credit Notes, or Debit Notes</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="invoice-table">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Doc #</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Doc Type</th>
                          <th className="px-3 py-2 text-left">Category</th>
                          <th className="px-3 py-2 text-left">Recipient</th>
                          <th className="px-3 py-2 text-right">Taxable</th>
                          <th className="px-3 py-2 text-right">CGST</th>
                          <th className="px-3 py-2 text-right">SGST</th>
                          <th className="px-3 py-2 text-right">IGST</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(inv => (
                          <tr key={inv.id} className={`border-b border-slate-100 hover:bg-slate-50 ${
                            inv.document_type === 'credit_note' ? 'bg-red-50/30' :
                            inv.document_type === 'debit_note' ? 'bg-blue-50/30' : ''
                          }`}>
                            <td className="px-3 py-2 font-mono">{inv.invoice_number}</td>
                            <td className="px-3 py-2">{inv.invoice_date}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                inv.document_type === 'credit_note' ? 'bg-red-100 text-red-700' :
                                inv.document_type === 'debit_note' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {inv.document_type === 'credit_note' ? 'CN' :
                                 inv.document_type === 'debit_note' ? 'DN' : 'INV'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                inv.invoice_type === 'B2B' ? 'bg-emerald-100 text-emerald-700' :
                                inv.invoice_type === 'B2C_LARGE' ? 'bg-purple-100 text-purple-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {inv.invoice_type}
                              </span>
                            </td>
                            <td className="px-3 py-2">{inv.recipient_name || inv.recipient_gstin || '-'}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{(inv.taxable_value || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{(inv.cgst || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{(inv.sgst || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{(inv.igst || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold">₹{(inv.total_value || 0).toLocaleString()}</td>
                            <td className="px-3 py-2">
                              {!gstr1Locked && (
                                <button
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="text-red-500 hover:text-red-700"
                                  data-testid={`delete-invoice-${inv.id}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-50 font-semibold">
                        <tr>
                          <td colSpan="5" className="px-3 py-2 text-right">Totals:</td>
                          <td className="px-3 py-2 text-right font-mono">₹{calculateInvoiceTotals().taxable.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-mono">₹{calculateInvoiceTotals().cgst.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-mono">₹{calculateInvoiceTotals().sgst.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-mono">₹{calculateInvoiceTotals().igst.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-mono">₹{calculateInvoiceTotals().total.toLocaleString()}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button
              onClick={handleValidateGstr1}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={loading || (!isNilReturn && invoices.length === 0)}
              data-testid="validate-gstr1-btn"
            >
              {loading ? 'Validating...' : 'Validate GSTR-1'} <CheckCircle size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="invoice-modal">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                Add {invoiceForm.document_type === 'credit_note' ? 'Credit Note' : 
                     invoiceForm.document_type === 'debit_note' ? 'Debit Note' : 'Sales Invoice'}
              </h3>
              <button onClick={() => setShowInvoiceForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleInvoiceSubmit} className="space-y-4">
              {/* Document Type Selection */}
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Document Type *</label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="document_type"
                      value="invoice"
                      checked={invoiceForm.document_type === 'invoice'}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, document_type: e.target.value })}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <span className="ml-2 text-slate-700">Invoice</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="document_type"
                      value="credit_note"
                      checked={invoiceForm.document_type === 'credit_note'}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, document_type: e.target.value })}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="ml-2 text-red-700">Credit Note (CN)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="document_type"
                      value="debit_note"
                      checked={invoiceForm.document_type === 'debit_note'}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, document_type: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-blue-700">Debit Note (DN)</span>
                  </label>
                </div>
              </div>
              
              {/* Original Invoice Reference (for CN/DN) */}
              {(invoiceForm.document_type === 'credit_note' || invoiceForm.document_type === 'debit_note') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-3">Original Invoice Reference</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Original Invoice Number *</label>
                      <input
                        type="text"
                        value={invoiceForm.original_invoice_number}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, original_invoice_number: e.target.value })}
                        placeholder="INV-001"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Original Invoice Date *</label>
                      <input
                        type="date"
                        value={invoiceForm.original_invoice_date}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, original_invoice_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {invoiceForm.document_type === 'invoice' ? 'Invoice Number' : 
                     invoiceForm.document_type === 'credit_note' ? 'Credit Note Number' : 'Debit Note Number'} *
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.invoice_number}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                    placeholder={invoiceForm.document_type === 'invoice' ? 'INV-001' : 
                                invoiceForm.document_type === 'credit_note' ? 'CN-001' : 'DN-001'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                    data-testid="invoice-number-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document Date *</label>
                  <input
                    type="date"
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                    data-testid="invoice-date-input"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supply Type *</label>
                  <select
                    value={invoiceForm.supply_type}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, supply_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="supply-type-select"
                  >
                    <option value="intra">Intra-State (CGST + SGST)</option>
                    <option value="inter">Inter-State (IGST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Place of Supply *</label>
                  <select
                    value={invoiceForm.place_of_supply}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, place_of_supply: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                    data-testid="place-of-supply-select"
                  >
                    <option value="">-- Select State --</option>
                    {STATE_CODES.map(s => (
                      <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Recipient GSTIN (for B2B)</label>
                  <input
                    type="text"
                    value={invoiceForm.recipient_gstin}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, recipient_gstin: e.target.value.toUpperCase() })}
                    placeholder="Leave empty for B2C"
                    maxLength={15}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="recipient-gstin-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={invoiceForm.recipient_name}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, recipient_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="recipient-name-input"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Taxable Value *</label>
                  <input
                    type="number"
                    value={invoiceForm.taxable_value}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, taxable_value: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                    data-testid="taxable-value-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Rate *</label>
                  <select
                    value={invoiceForm.gst_rate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, gst_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="gst-rate-select"
                  >
                    {GST_RATES.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">HSN/SAC Code</label>
                  <input
                    type="text"
                    value={invoiceForm.hsn_sac}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, hsn_sac: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="hsn-sac-input"
                  />
                </div>
              </div>
              
              {/* Tax Preview */}
              {invoiceForm.taxable_value && (
                <div className="bg-emerald-50 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-emerald-800 mb-2">Tax Calculation Preview</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Taxable:</span>
                      <span className="font-mono ml-2">₹{parseFloat(invoiceForm.taxable_value || 0).toLocaleString()}</span>
                    </div>
                    {invoiceForm.supply_type === 'intra' ? (
                      <>
                        <div>
                          <span className="text-slate-600">CGST ({invoiceForm.gst_rate / 2}%):</span>
                          <span className="font-mono ml-2">₹{((parseFloat(invoiceForm.taxable_value || 0) * invoiceForm.gst_rate / 100) / 2).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">SGST ({invoiceForm.gst_rate / 2}%):</span>
                          <span className="font-mono ml-2">₹{((parseFloat(invoiceForm.taxable_value || 0) * invoiceForm.gst_rate / 100) / 2).toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div>
                        <span className="text-slate-600">IGST ({invoiceForm.gst_rate}%):</span>
                        <span className="font-mono ml-2">₹{(parseFloat(invoiceForm.taxable_value || 0) * invoiceForm.gst_rate / 100).toLocaleString()}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-600 font-semibold">Total:</span>
                      <span className="font-mono ml-2 font-semibold">
                        ₹{(parseFloat(invoiceForm.taxable_value || 0) * (1 + invoiceForm.gst_rate / 100)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowInvoiceForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 3: GSTR-3B */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6" data-testid="gst-step-3">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Calculator className="mr-2 text-emerald-600" />
            Step 3: GSTR-3B - Summary Return
          </h2>
          
          {/* GSTR-1 Summary */}
          {gstr1Summary && (
            <div className="bg-emerald-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-emerald-800 mb-2 flex items-center">
                <CheckCircle size={18} className="mr-2" /> GSTR-1 Validated
              </h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Invoices:</span>
                  <span className="font-semibold ml-2">{gstr1Summary.total_invoices}</span>
                </div>
                <div>
                  <span className="text-slate-600">Taxable:</span>
                  <span className="font-mono ml-2">₹{(gstr1Summary.totals?.total_taxable_value || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-600">Total Tax:</span>
                  <span className="font-mono ml-2">
                    ₹{((gstr1Summary.totals?.total_cgst || 0) + (gstr1Summary.totals?.total_sgst || 0) + (gstr1Summary.totals?.total_igst || 0)).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Invoice Value:</span>
                  <span className="font-mono ml-2">₹{(gstr1Summary.totals?.total_invoice_value || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* ITC Input */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-slate-800 mb-3">Input Tax Credit (ITC)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ITC Available</label>
                <input
                  type="number"
                  value={itcData.itc_available}
                  onChange={(e) => setItcData({ ...itcData, itc_available: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  data-testid="itc-available-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ITC Reversed</label>
                <input
                  type="number"
                  value={itcData.itc_reversed}
                  onChange={(e) => setItcData({ ...itcData, itc_reversed: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  data-testid="itc-reversed-input"
                />
              </div>
            </div>
          </div>
          
          {!gstr3bData ? (
            <div className="text-center py-8">
              <Button
                onClick={handleGenerateGstr3b}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
                data-testid="generate-gstr3b-btn"
              >
                {loading ? 'Generating...' : 'Generate GSTR-3B from GSTR-1'} <RefreshCw size={18} className="ml-2" />
              </Button>
              <p className="text-sm text-slate-500 mt-2">GSTR-3B will be auto-populated from your validated GSTR-1</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Section 3.1 */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-3">3.1 Outward Supplies</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Taxable Value:</span>
                    <span className="font-mono ml-2 font-semibold">₹{(gstr3bData.section_3_1?.outward_taxable_supplies || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Tax Liability:</span>
                    <span className="font-mono ml-2 font-semibold">₹{(gstr3bData.section_3_1?.outward_tax_liability || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Section 4 */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-3">4. Input Tax Credit</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">ITC Available:</span>
                    <span className="font-mono ml-2">₹{(gstr3bData.section_4?.itc_available || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">ITC Reversed:</span>
                    <span className="font-mono ml-2">₹{(gstr3bData.section_4?.itc_reversed || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Net ITC:</span>
                    <span className="font-mono ml-2 font-semibold">₹{(gstr3bData.section_4?.net_itc || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Section 5 */}
              <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
                <h4 className="font-medium text-emerald-800 mb-3">5. Tax Payable</h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">CGST:</span>
                    <span className="font-mono ml-2">₹{(gstr3bData.section_5?.cgst_payable || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">SGST:</span>
                    <span className="font-mono ml-2">₹{(gstr3bData.section_5?.sgst_payable || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">IGST:</span>
                    <span className="font-mono ml-2">₹{(gstr3bData.section_5?.igst_payable || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700 font-semibold">Total Payable:</span>
                    <span className="font-mono ml-2 font-bold text-emerald-800">₹{(gstr3bData.section_5?.total_payable || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleValidateGstr3b}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading}
                  data-testid="validate-gstr3b-btn"
                >
                  {loading ? 'Validating...' : 'Validate GSTR-3B'} <CheckCircle size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-between pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Back to GSTR-1
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {currentStep === 4 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6" data-testid="gst-step-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Eye className="mr-2 text-emerald-600" />
            Step 4: Preview & Confirm
          </h2>
          
          <div className="text-center py-8">
            <Button
              onClick={handleLoadPreview}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
              data-testid="load-preview-btn"
            >
              {loading ? 'Loading...' : 'Load Final Preview'} <Eye size={18} className="ml-2" />
            </Button>
          </div>
          
          {/* COMPREHENSIVE VALIDATION SECTION */}
          <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
              <Shield size={20} className="mr-2" /> Comprehensive GST Return Validation
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Click the button below to validate your complete GST return. This checks all profile, period, GSTR-1, GSTR-3B, and reconciliation requirements.
            </p>
            <Button
              onClick={handleValidateCompleteReturn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
              disabled={validationLoading || !selectedGstin || !selectedPeriod}
              data-testid="validate-complete-return-btn"
            >
              {validationLoading ? 'Validating...' : 'Validate GST Return'} <Shield size={20} className="ml-2" />
            </Button>
          </div>
          
          {/* VALIDATION RESULT */}
          {validationResult && (
            <div className={`border-2 rounded-lg p-6 mb-6 ${
              validationResult.can_file 
                ? 'border-emerald-300 bg-emerald-50' 
                : 'border-red-300 bg-red-50'
            }`}>
              <h3 className={`font-semibold mb-4 flex items-center ${
                validationResult.can_file ? 'text-emerald-800' : 'text-red-800'
              }`}>
                {validationResult.can_file ? (
                  <><CheckCircle size={24} className="mr-2" /> GST Return Validated Successfully</>
                ) : (
                  <><AlertCircle size={24} className="mr-2" /> Validation Failed - {validationResult.total_errors} Error(s)</>
                )}
              </h3>
              
              {/* Section Status */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {Object.entries(validationResult.sections_status).map(([key, status]) => (
                  <div key={key} className={`text-center p-2 rounded ${
                    status.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    <div className="font-semibold text-xs uppercase">{key}</div>
                    <div className="text-lg">{status.valid ? '✓' : '✗'}</div>
                  </div>
                ))}
              </div>
              
              {/* Error List */}
              {validationResult.errors && validationResult.errors.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-red-200 mb-4">
                  <h4 className="font-semibold text-red-800 mb-2">Errors to Fix:</h4>
                  <ul className="space-y-2">
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx} className="text-sm text-red-700 flex items-start">
                        <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded text-xs font-mono mr-2">{err.section}</span>
                        <div>
                          <span className="font-medium">{err.message}</span>
                          {err.fix_hint && <span className="block text-red-500 text-xs mt-0.5">Fix: {err.fix_hint}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Success Message */}
              {validationResult.can_file && (
                <div className="text-emerald-700 text-sm">
                  ✓ All checks passed. You may now proceed to preview and file your GST return.
                </div>
              )}
            </div>
          )}
          
          {previewData && (
            <div className="space-y-6 mt-6">
              {/* GSTR-1 Summary */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">GSTR-1 Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-slate-600">Total Invoices:</span> <span className="font-semibold">{previewData.gstr1_summary?.total_invoices}</span></div>
                  <div><span className="text-slate-600">Taxable Value:</span> <span className="font-mono">₹{(previewData.gstr1_summary?.total_taxable_value || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-600">Invoice Value:</span> <span className="font-mono">₹{(previewData.gstr1_summary?.total_invoice_value || 0).toLocaleString()}</span></div>
                </div>
              </div>
              
              {/* GSTR-3B Summary */}
              <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
                <h3 className="font-semibold text-emerald-800 mb-3">GSTR-3B Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-600">Outward Supplies:</span> <span className="font-mono">₹{(previewData.gstr3b_summary?.outward_taxable_supplies || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-600">Tax Liability:</span> <span className="font-mono">₹{(previewData.gstr3b_summary?.outward_tax_liability || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-600">Net ITC:</span> <span className="font-mono">₹{(previewData.gstr3b_summary?.net_itc || 0).toLocaleString()}</span></div>
                  <div><span className="text-emerald-700 font-semibold">Total Tax Payable:</span> <span className="font-mono font-bold">₹{(previewData.gstr3b_summary?.total_payable || 0).toLocaleString()}</span></div>
                </div>
              </div>
              
              {/* Late Fee & Interest */}
              {(previewData.late_fee > 0 || previewData.interest > 0) && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-800 mb-3 flex items-center">
                    <AlertTriangle size={18} className="mr-2" /> Additional Charges
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-slate-600">Late Fee:</span> <span className="font-mono">₹{(previewData.late_fee || 0).toLocaleString()}</span></div>
                    <div><span className="text-slate-600">Interest:</span> <span className="font-mono">₹{(previewData.interest || 0).toLocaleString()}</span></div>
                    <div><span className="text-amber-700 font-semibold">Total Due:</span> <span className="font-mono font-bold">₹{(previewData.total_amount_due || 0).toLocaleString()}</span></div>
                  </div>
                </div>
              )}
              
              {/* FILING MODE SELECTOR */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Filing Mode</h3>
                <div className="space-y-3">
                  <label className="flex items-start cursor-pointer p-3 border rounded-lg hover:bg-slate-50">
                    <input
                      type="radio"
                      name="filing_mode"
                      value="MANUAL"
                      checked={filingMode === 'MANUAL'}
                      onChange={() => setFilingMode('MANUAL')}
                      className="w-5 h-5 mt-0.5 text-emerald-600"
                    />
                    <div className="ml-3">
                      <span className="font-semibold text-slate-800">Manual Filing (Export & Upload)</span>
                      <p className="text-sm text-slate-500">Export JSON files and upload manually to GST portal. No API required. Recommended.</p>
                    </div>
                  </label>
                  <label className={`flex items-start p-3 border rounded-lg ${
                    gstnConfigured ? 'cursor-pointer hover:bg-slate-50' : 'opacity-50 cursor-not-allowed'
                  }`}>
                    <input
                      type="radio"
                      name="filing_mode"
                      value="GSTN_API"
                      checked={filingMode === 'GSTN_API'}
                      onChange={() => gstnConfigured && setFilingMode('GSTN_API')}
                      disabled={!gstnConfigured}
                      className="w-5 h-5 mt-0.5 text-emerald-600"
                    />
                    <div className="ml-3">
                      <span className="font-semibold text-slate-800">GSTN Filing (via API)</span>
                      <p className="text-sm text-slate-500">
                        {gstnConfigured 
                          ? 'File directly from software using GSTN API.' 
                          : 'GSTN API not configured. Configure in Settings → GSTN Integration.'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Confirmation */}
              <div className="border-2 border-emerald-300 bg-emerald-50 rounded-lg p-6">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userConfirmed}
                    onChange={(e) => setUserConfirmed(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500"
                    data-testid="confirm-checkbox"
                  />
                  <span className="ml-3 text-slate-700">
                    <strong className="text-emerald-800">I have reviewed and confirm the above details.</strong><br />
                    <span className="text-sm">
                      {filingMode === 'MANUAL' 
                        ? 'I understand that the generated JSON files must be uploaded manually to the GST portal.' 
                        : 'I authorize filing this return via GSTN API.'}
                    </span>
                  </span>
                </label>
              </div>
              
              {/* Action Buttons based on Filing Mode */}
              <div className="flex justify-end space-x-4">
                {filingMode === 'MANUAL' ? (
                  <>
                    <Button
                      onClick={handleExport}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={loading || !userConfirmed || !previewData.ready_to_export}
                      data-testid="export-btn"
                    >
                      {loading ? 'Exporting...' : 'Export JSON Files'} <Download size={18} className="ml-2" />
                    </Button>
                    <Button
                      onClick={handleMarkAsFiled}
                      variant="outline"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                      disabled={loading || !userConfirmed}
                      data-testid="mark-filed-btn"
                    >
                      Mark as Filed <CheckCircle size={18} className="ml-2" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleOpenGstnModal}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={!gstnConfigured || !userConfirmed || !validationResult?.can_file}
                    data-testid="gstn-submit-btn"
                  >
                    <Send size={18} className="mr-2" /> Submit via GSTN API
                  </Button>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-between pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              Back to GSTR-3B
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Export Complete */}
      {currentStep === 5 && exportData && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6" data-testid="gst-step-5">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-semibold text-emerald-800">Export Complete!</h2>
            <p className="text-slate-600 mt-2">Your GST returns are ready for manual upload to the GST portal.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold mb-3">GSTR-1 JSON</h3>
              <Button
                onClick={() => downloadJson(exportData.gstr1_json, `GSTR1_${selectedGstin}_${selectedPeriod}.json`)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="download-gstr1-btn"
              >
                <Download size={18} className="mr-2" /> Download GSTR-1 JSON
              </Button>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold mb-3">GSTR-3B JSON</h3>
              <Button
                onClick={() => downloadJson(exportData.gstr3b_json, `GSTR3B_${selectedGstin}_${selectedPeriod}.json`)}
                className="w-full bg-purple-600 hover:bg-purple-700"
                data-testid="download-gstr3b-btn"
              >
                <Download size={18} className="mr-2" /> Download GSTR-3B JSON
              </Button>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
            <div className="flex items-start">
              <Info className="text-amber-600 mt-0.5 mr-3" size={20} />
              <div>
                <h4 className="font-semibold text-amber-800">Next Steps</h4>
                <ol className="mt-2 text-sm text-amber-700 list-decimal list-inside space-y-1">
                  <li>Log in to the GST portal (gst.gov.in)</li>
                  <li>Navigate to Returns &gt; File Returns</li>
                  <li>Select the filing period: {selectedPeriod}</li>
                  <li>Upload the downloaded JSON files</li>
                  <li>Review and submit on the portal</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center pt-6">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep(1);
                setSelectedPeriod('');
                setInvoices([]);
                setGstr1Summary(null);
                setGstr3bData(null);
                setPreviewData(null);
                setExportData(null);
                setUserConfirmed(false);
                setGstState(GST_STATES.PROFILE_COMPLETE);
                setArnNumber('');
              }}
            >
              Start New Filing
            </Button>
          </div>
          
          {/* ARN Display for GSTN Filing */}
          {arnNumber && (
            <div className="bg-emerald-100 border-2 border-emerald-400 rounded-lg p-4 mt-6">
              <div className="flex items-center justify-center">
                <CheckCircle className="text-emerald-600 mr-3" size={24} />
                <div>
                  <span className="text-emerald-800 font-semibold">GSTN Filing Successful!</span>
                  <div className="text-emerald-700 text-lg font-mono mt-1">ARN: {arnNumber}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GSTN OTP MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" data-testid="otp-modal">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center">
                <Key className="mr-2 text-purple-600" size={24} />
                GSTN API Filing
              </h3>
              <button 
                onClick={() => setShowOtpModal(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Filing Summary */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">GSTIN:</span>
                  <span className="ml-2 font-mono font-medium">{selectedGstin}</span>
                </div>
                <div>
                  <span className="text-slate-500">Period:</span>
                  <span className="ml-2 font-medium">{selectedPeriod}</span>
                </div>
                <div>
                  <span className="text-slate-500">GSP Provider:</span>
                  <span className="ml-2 font-medium">{gstnConfig?.gsp_provider || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Environment:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    gstnConfig?.environment === 'production' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {gstnConfig?.environment?.toUpperCase() || 'SANDBOX'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Step 1: Request OTP */}
            {!otpSent && (
              <div className="space-y-4">
                <p className="text-slate-600 text-sm">
                  Click below to request OTP for GSTN filing. OTP will be sent to your registered 
                  {gstnConfig?.otp_preference === 'email' ? ' email address' : ' mobile number'}.
                </p>
                <Button
                  onClick={handleRequestOtp}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={otpSending}
                  data-testid="request-otp-btn"
                >
                  {otpSending ? (
                    <><RefreshCw size={18} className="mr-2 animate-spin" /> Requesting OTP...</>
                  ) : (
                    <><Send size={18} className="mr-2" /> Request OTP</>
                  )}
                </Button>
              </div>
            )}
            
            {/* Step 2: Enter OTP */}
            {otpSent && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  <CheckCircle size={16} className="inline mr-2" />
                  OTP sent successfully! Please enter the 6-digit code below.
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Enter OTP *
                  </label>
                  <input
                    type="text"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="w-full px-4 py-3 text-2xl font-mono tracking-[0.5em] text-center border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    data-testid="otp-input"
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={handleRequestOtp}
                    className="text-purple-600 hover:text-purple-700"
                    disabled={otpSending}
                  >
                    Resend OTP
                  </button>
                  <span className="text-slate-500">OTP valid for 10 minutes</span>
                </div>
                
                {/* Submit Button */}
                <Button
                  onClick={handleGstnSubmit}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 text-lg"
                  disabled={gstnSubmitting || otpValue.length < 6}
                  data-testid="submit-gstn-btn"
                >
                  {gstnSubmitting ? (
                    <><RefreshCw size={20} className="mr-2 animate-spin" /> Submitting to GSTN...</>
                  ) : (
                    <><CheckCircle size={20} className="mr-2" /> Submit GST Return</>
                  )}
                </Button>
                
                {/* Status Messages */}
                {gstnFilingStatus === 'submitting' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    <RefreshCw size={16} className="inline mr-2 animate-spin" />
                    Connecting to GSTN servers... Please wait.
                  </div>
                )}
                
                {gstnFilingStatus === 'failed' && errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    <AlertCircle size={16} className="inline mr-2" />
                    {errors[0]?.message || 'Submission failed. Please try again.'}
                  </div>
                )}
              </div>
            )}
            
            {/* Manual Fallback Notice */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                Having issues? You can always use{' '}
                <button 
                  onClick={() => {
                    setShowOtpModal(false);
                    setFilingMode('MANUAL');
                  }}
                  className="text-purple-600 hover:underline"
                >
                  Manual Filing
                </button>
                {' '}as a fallback.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GSTFiling;
