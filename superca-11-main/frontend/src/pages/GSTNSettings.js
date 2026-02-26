import { useState, useEffect } from 'react';
import { 
  Settings, Shield, Key, Building2, CheckCircle, AlertCircle, 
  Eye, EyeOff, Save, RefreshCw, Link2, Lock, Unlock, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const GSTNSettings = () => {
  // Configuration State
  const [config, setConfig] = useState({
    gsp_provider: '',
    gsp_username: '',
    gsp_password: '',
    api_key: '',
    api_secret: '',
    gstin_linked: '',
    environment: 'sandbox', // sandbox or production
    otp_preference: 'sms', // sms or email
    dsc_enabled: false,
    auto_fetch_2b: false
  });
  
  const [showSecrets, setShowSecrets] = useState({
    gsp_password: false,
    api_key: false,
    api_secret: false
  });
  
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  
  // GSP Providers (Government Service Providers)
  const GSP_PROVIDERS = [
    { value: '', label: 'Select GSP Provider' },
    { value: 'cleartax', label: 'ClearTax' },
    { value: 'tally', label: 'Tally Solutions' },
    { value: 'zoho', label: 'Zoho GST' },
    { value: 'mastersindia', label: 'Masters India' },
    { value: 'iris', label: 'IRIS Business Services' },
    { value: 'cygnet', label: 'Cygnet Infotech' },
    { value: 'custom', label: 'Custom / Direct API' }
  ];

  // Load existing config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/settings/gstn');
      if (response.data) {
        setConfig(prev => ({ ...prev, ...response.data }));
        if (response.data.api_key) {
          setConnectionStatus('configured');
        }
      }
    } catch (error) {
      // No existing config - that's ok
      console.log('No GSTN config found');
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    setErrors([]);
    setSuccess('');
    
    try {
      // Validate required fields if enabling
      if (config.gsp_provider && config.gsp_provider !== '') {
        if (!config.api_key) {
          setErrors(['API Key is required']);
          setLoading(false);
          return;
        }
      }
      
      await api.post('/settings/gstn', config);
      setSuccess('GSTN configuration saved successfully');
      setConnectionStatus(config.api_key ? 'configured' : null);
    } catch (error) {
      setErrors([error.response?.data?.detail || 'Failed to save configuration']);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.api_key || !config.gsp_provider) {
      setErrors(['Configure GSP provider and API key first']);
      return;
    }
    
    setTestingConnection(true);
    setConnectionStatus('testing');
    setErrors([]);
    
    try {
      const response = await api.post('/settings/gstn/test-connection', {
        gsp_provider: config.gsp_provider,
        api_key: config.api_key,
        gstin: config.gstin_linked
      });
      
      if (response.data.success) {
        setConnectionStatus('connected');
        setSuccess('Connection successful! GSTN API is accessible.');
      } else {
        setConnectionStatus('failed');
        setErrors([response.data.message || 'Connection test failed']);
      }
    } catch (error) {
      setConnectionStatus('failed');
      setErrors([error.response?.data?.detail || 'Connection test failed']);
    } finally {
      setTestingConnection(false);
    }
  };

  const toggleSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const isConfigured = config.gsp_provider && config.api_key;

  return (
    <div className="space-y-6" data-testid="gstn-settings-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-8 text-white border border-purple-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <Settings className="mr-3" size={32} />
              GSTN API Integration
            </h1>
            <p className="text-purple-200 text-lg">
              Configure direct filing via Government Service Provider (GSP)
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            connectionStatus === 'connected' ? 'bg-green-500/20 text-green-300' :
            connectionStatus === 'configured' ? 'bg-yellow-500/20 text-yellow-300' :
            connectionStatus === 'failed' ? 'bg-red-500/20 text-red-300' :
            'bg-slate-500/20 text-slate-300'
          }`}>
            {connectionStatus === 'connected' ? <CheckCircle size={20} /> :
             connectionStatus === 'testing' ? <RefreshCw size={20} className="animate-spin" /> :
             connectionStatus === 'failed' ? <AlertCircle size={20} /> :
             <Lock size={20} />}
            <span className="font-medium">
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'testing' ? 'Testing...' :
               connectionStatus === 'configured' ? 'Configured (Not Tested)' :
               connectionStatus === 'failed' ? 'Connection Failed' :
               'Not Configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
          <div>
            <h4 className="font-semibold text-blue-800">About GSTN API Filing</h4>
            <p className="text-sm text-blue-700 mt-1">
              GSTN API allows direct filing of GST returns without manual upload to the portal. 
              You need to register with a Government Service Provider (GSP) to get API credentials. 
              <strong className="block mt-2">Manual filing is always available as a fallback.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="text-red-600 mt-0.5 mr-3" size={20} />
            <div>
              <h4 className="font-semibold text-red-800">Configuration Errors</h4>
              <ul className="mt-2 space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx} className="text-red-700 text-sm">{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="text-green-600 mr-3" size={20} />
            <span className="text-green-800 font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Key className="mr-2 text-purple-600" size={24} />
          API Credentials
        </h2>

        <div className="space-y-6">
          {/* GSP Provider Selection */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                GSP Provider *
              </label>
              <select
                value={config.gsp_provider}
                onChange={(e) => setConfig({ ...config, gsp_provider: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                data-testid="gsp-provider-select"
              >
                {GSP_PROVIDERS.map(gsp => (
                  <option key={gsp.value} value={gsp.value}>{gsp.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Select your registered GSP provider
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Environment
              </label>
              <select
                value={config.environment}
                onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                data-testid="environment-select"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Use Sandbox for testing before going live
              </p>
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              API Key *
            </label>
            <div className="relative">
              <input
                type={showSecrets.api_key ? 'text' : 'password'}
                value={config.api_key}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 pr-10"
                placeholder="Enter your GSP API key"
                data-testid="api-key-input"
              />
              <button
                type="button"
                onClick={() => toggleSecret('api_key')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecrets.api_key ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              API Secret
            </label>
            <div className="relative">
              <input
                type={showSecrets.api_secret ? 'text' : 'password'}
                value={config.api_secret}
                onChange={(e) => setConfig({ ...config, api_secret: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 pr-10"
                placeholder="Enter your GSP API secret (if required)"
                data-testid="api-secret-input"
              />
              <button
                type="button"
                onClick={() => toggleSecret('api_secret')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecrets.api_secret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* GSP Username & Password */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                GSP Username
              </label>
              <input
                type="text"
                value={config.gsp_username}
                onChange={(e) => setConfig({ ...config, gsp_username: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="GSP portal username"
                data-testid="gsp-username-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                GSP Password
              </label>
              <div className="relative">
                <input
                  type={showSecrets.gsp_password ? 'text' : 'password'}
                  value={config.gsp_password}
                  onChange={(e) => setConfig({ ...config, gsp_password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 pr-10"
                  placeholder="GSP portal password"
                  data-testid="gsp-password-input"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('gsp_password')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.gsp_password ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* GSTIN Linked */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              GSTIN to Link
            </label>
            <input
              type="text"
              value={config.gstin_linked}
              onChange={(e) => setConfig({ ...config, gstin_linked: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="27AABCU9603R1ZM"
              maxLength={15}
              data-testid="gstin-linked-input"
            />
            <p className="text-xs text-slate-500 mt-1">
              The GSTIN that will be used for API filing
            </p>
          </div>
        </div>
      </div>

      {/* Filing Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Shield className="mr-2 text-purple-600" size={24} />
          Filing Preferences
        </h2>

        <div className="space-y-4">
          {/* OTP Preference */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              OTP Delivery Preference
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="otp_preference"
                  value="sms"
                  checked={config.otp_preference === 'sms'}
                  onChange={(e) => setConfig({ ...config, otp_preference: e.target.value })}
                  className="w-4 h-4 text-purple-600"
                />
                <span className="ml-2 text-slate-700">SMS</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="otp_preference"
                  value="email"
                  checked={config.otp_preference === 'email'}
                  onChange={(e) => setConfig({ ...config, otp_preference: e.target.value })}
                  className="w-4 h-4 text-purple-600"
                />
                <span className="ml-2 text-slate-700">Email</span>
              </label>
            </div>
          </div>

          {/* DSC Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <h4 className="font-medium text-slate-800">Digital Signature Certificate (DSC)</h4>
              <p className="text-sm text-slate-600">Enable DSC-based signing instead of OTP</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.dsc_enabled}
                onChange={(e) => setConfig({ ...config, dsc_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Auto-fetch GSTR-2B */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <h4 className="font-medium text-slate-800">Auto-fetch GSTR-2B</h4>
              <p className="text-sm text-slate-600">Automatically fetch GSTR-2B data for reconciliation</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_fetch_2b}
                onChange={(e) => setConfig({ ...config, auto_fetch_2b: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleTestConnection}
          variant="outline"
          disabled={!isConfigured || testingConnection}
          className="border-purple-300 text-purple-700 hover:bg-purple-50"
          data-testid="test-connection-btn"
        >
          {testingConnection ? (
            <><RefreshCw size={18} className="mr-2 animate-spin" /> Testing...</>
          ) : (
            <><Link2 size={18} className="mr-2" /> Test Connection</>
          )}
        </Button>

        <Button
          onClick={handleSaveConfig}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="save-config-btn"
        >
          {loading ? (
            <><RefreshCw size={18} className="mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save size={18} className="mr-2" /> Save Configuration</>
          )}
        </Button>
      </div>

      {/* How to Get Credentials */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
          <Info size={20} className="mr-2" />
          How to Get GSTN API Credentials
        </h3>
        <ol className="space-y-3 text-sm text-slate-600">
          <li className="flex items-start">
            <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 text-xs font-bold">1</span>
            <span>Register with a GSP (Government Service Provider) like ClearTax, Tally, or Zoho</span>
          </li>
          <li className="flex items-start">
            <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 text-xs font-bold">2</span>
            <span>Complete KYC verification with your GSTIN</span>
          </li>
          <li className="flex items-start">
            <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 text-xs font-bold">3</span>
            <span>Generate API credentials from the GSP dashboard</span>
          </li>
          <li className="flex items-start">
            <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 text-xs font-bold">4</span>
            <span>Start with Sandbox environment for testing</span>
          </li>
          <li className="flex items-start">
            <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 text-xs font-bold">5</span>
            <span>Switch to Production when ready for live filing</span>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default GSTNSettings;
