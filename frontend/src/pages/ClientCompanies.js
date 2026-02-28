import { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Edit3, Trash2, Eye, ChevronRight,
  FileText, Calculator, Receipt, Users, Phone, Mail, MapPin,
  Calendar, CheckCircle, AlertCircle, X, Save, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const companyTypes = [
  { value: 'private_limited', label: 'Private Limited' },
  { value: 'public_limited', label: 'Public Limited' },
  { value: 'llp', label: 'LLP' },
  { value: 'partnership', label: 'Partnership Firm' },
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'trust', label: 'Trust' },
  { value: 'society', label: 'Society' }
];

const industries = [
  'Manufacturing', 'Trading', 'Services', 'IT/Software', 'Healthcare',
  'Education', 'Real Estate', 'Construction', 'Retail', 'Agriculture',
  'Finance', 'Hospitality', 'Transport', 'Others'
];

const ClientCompanies = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    pan: '',
    gstin: '',
    cin: '',
    tan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    financial_year_start: '04',
    industry: '',
    company_type: 'private_limited'
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/client-companies');
      setClients(response.data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load client companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingClient) {
        await api.put(`/client-companies/${editingClient.id}`, formData);
        setSuccess('Client company updated successfully!');
      } else {
        await api.post('/client-companies', formData);
        setSuccess('Client company created successfully!');
      }
      setShowModal(false);
      setEditingClient(null);
      resetForm();
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save client company');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      legal_name: client.legal_name || '',
      pan: client.pan || '',
      gstin: client.gstin || '',
      cin: client.cin || '',
      tan: client.tan || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      pincode: client.pincode || '',
      contact_person: client.contact_person || '',
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      financial_year_start: client.financial_year_start || '04',
      industry: client.industry || '',
      company_type: client.company_type || 'private_limited'
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client company?')) return;
    
    try {
      await api.delete(`/client-companies/${clientId}`);
      setSuccess('Client company deleted');
      fetchClients();
    } catch (err) {
      setError('Failed to delete client company');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      legal_name: '',
      pan: '',
      gstin: '',
      cin: '',
      tan: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      financial_year_start: '04',
      industry: '',
      company_type: 'private_limited'
    });
  };

  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.pan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.gstin?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div data-testid="client-companies-page" className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Client Companies
            </h1>
            <p className="text-indigo-100">Manage all your client companies in one place</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <div className="text-3xl font-bold">{clients.length}</div>
              <div className="text-indigo-100 text-sm">Total Clients</div>
            </div>
            <Button 
              onClick={() => { resetForm(); setEditingClient(null); setShowModal(true); }}
              className="bg-white text-indigo-600 hover:bg-indigo-50"
            >
              <Plus size={18} className="mr-2" /> Add Client
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="text-green-600 mr-3" size={20} />
          <span className="text-green-800">{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="text-red-600 mr-3" size={20} />
          <span className="text-red-800">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, PAN, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="animate-spin mx-auto text-indigo-600" size={32} />
          <p className="text-slate-600 mt-2">Loading clients...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-slate-200 text-center">
          <Building2 className="mx-auto text-slate-400" size={48} />
          <h3 className="text-xl font-semibold text-slate-800 mt-4">No client companies yet</h3>
          <p className="text-slate-600 mt-2">Add your first client company to get started</p>
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus size={18} className="mr-2" /> Add Client Company
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Building2 size={24} className="text-indigo-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-slate-900">{client.name}</h3>
                    <p className="text-sm text-slate-500">{companyTypes.find(t => t.value === client.company_type)?.label}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(client)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(client.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {client.pan && (
                  <div className="flex items-center text-slate-600">
                    <FileText size={14} className="mr-2 text-slate-400" />
                    PAN: <span className="font-mono ml-1">{client.pan}</span>
                  </div>
                )}
                {client.gstin && (
                  <div className="flex items-center text-slate-600">
                    <Receipt size={14} className="mr-2 text-slate-400" />
                    GSTIN: <span className="font-mono ml-1">{client.gstin}</span>
                  </div>
                )}
                {client.contact_person && (
                  <div className="flex items-center text-slate-600">
                    <Users size={14} className="mr-2 text-slate-400" />
                    {client.contact_person}
                  </div>
                )}
                {client.contact_phone && (
                  <div className="flex items-center text-slate-600">
                    <Phone size={14} className="mr-2 text-slate-400" />
                    {client.contact_phone}
                  </div>
                )}
                {client.city && (
                  <div className="flex items-center text-slate-600">
                    <MapPin size={14} className="mr-2 text-slate-400" />
                    {client.city}{client.state ? `, ${client.state}` : ''}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  {client.industry || 'No industry'}
                </span>
                <Button variant="outline" size="sm" className="text-xs">
                  <Eye size={14} className="mr-1" /> View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingClient ? 'Edit Client Company' : 'Add New Client Company'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                  <Building2 size={16} className="mr-2" /> Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="ABC Pvt Ltd"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Legal Name</label>
                    <input
                      type="text"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="ABC Private Limited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Type</label>
                    <select
                      value={formData.company_type}
                      onChange={(e) => setFormData({...formData, company_type: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {companyTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Industry</option>
                      {industries.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tax IDs */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                  <FileText size={16} className="mr-2" /> Tax & Registration Numbers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PAN</label>
                    <input
                      type="text"
                      value={formData.pan}
                      onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})}
                      maxLength={10}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                      placeholder="ABCDE1234F"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})}
                      maxLength={15}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                      placeholder="22ABCDE1234F1Z5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CIN</label>
                    <input
                      type="text"
                      value={formData.cin}
                      onChange={(e) => setFormData({...formData, cin: e.target.value.toUpperCase()})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                      placeholder="U12345MH2020PTC123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">TAN</label>
                    <input
                      type="text"
                      value={formData.tan}
                      onChange={(e) => setFormData({...formData, tan: e.target.value.toUpperCase()})}
                      maxLength={10}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                      placeholder="MUMA12345B"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                  <Users size={16} className="mr-2" /> Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                  <MapPin size={16} className="mr-2" /> Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="123 Business Park, Main Road"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                      maxLength={6}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="400001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">FY Start Month</label>
                    <select
                      value={formData.financial_year_start}
                      onChange={(e) => setFormData({...formData, financial_year_start: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="04">April (Standard)</option>
                      <option value="01">January</option>
                      <option value="07">July</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                  {saving ? (
                    <><RefreshCw size={16} className="mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={16} className="mr-2" /> {editingClient ? 'Update' : 'Create'} Client</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCompanies;
