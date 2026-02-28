import { useState } from 'react';
import { Plug, CheckCircle, CreditCard, ShoppingCart, Wallet, BarChart3, Building2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Integrations = () => {
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);

  const integrationCategories = [
    {
      category: 'Payment Gateways',
      icon: CreditCard,
      color: 'from-blue-500 to-indigo-600',
      integrations: [
        { id: 'razorpay', name: 'Razorpay', logo: '💳', feature: 'Auto-reconciliation of payments', status: 'available' },
        { id: 'stripe', name: 'Stripe', logo: '💰', feature: 'Direct GST on international sales', status: 'available' },
        { id: 'paytm', name: 'Paytm', logo: '💵', feature: 'UPI transaction tracking', status: 'coming_soon' }
      ]
    },
    {
      category: 'E-commerce Platforms',
      icon: ShoppingCart,
      color: 'from-emerald-500 to-green-600',
      integrations: [
        { id: 'shopify', name: 'Shopify', logo: '🛍️', feature: 'Direct GST on sales', status: 'available' },
        { id: 'amazon', name: 'Amazon Seller', logo: '📦', feature: 'Order & tax sync', status: 'available' },
        { id: 'flipkart', name: 'Flipkart Seller', logo: '🛒', feature: 'Sales reconciliation', status: 'coming_soon' }
      ]
    },
    {
      category: 'Subscription Management',
      icon: BarChart3,
      color: 'from-purple-500 to-pink-600',
      integrations: [
        { id: 'chargebee', name: 'Chargebee', logo: '📊', feature: 'Revenue recognition automation', status: 'available' },
        { id: 'zoho', name: 'Zoho Subscriptions', logo: '💼', feature: 'Recurring billing sync', status: 'coming_soon' }
      ]
    },
    {
      category: 'Bank Accounts',
      icon: Building2,
      color: 'from-orange-500 to-red-600',
      integrations: [
        { id: 'rbi_aa', name: 'RBI Account Aggregator', logo: '🏦', feature: 'Direct bank statement import', status: 'available' },
        { id: 'icici', name: 'ICICI Bank', logo: '🏛️', feature: 'Real-time transaction feed', status: 'coming_soon' },
        { id: 'hdfc', name: 'HDFC Bank', logo: '🏦', feature: 'Auto-categorization', status: 'coming_soon' }
      ]
    }
  ];

  const toggleIntegration = (integrationId) => {
    if (connectedIntegrations.includes(integrationId)) {
      setConnectedIntegrations(connectedIntegrations.filter(id => id !== integrationId));
    } else {
      setConnectedIntegrations([...connectedIntegrations, integrationId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Integration Hub
            </h1>
            <p className="text-slate-300 text-lg">Connect all your business tools • Auto-sync transactions • Real-time reconciliation</p>
            <div className="flex items-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <Plug size={20} />
                <span>One-click connect</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>Auto-reconciliation</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wallet size={20} />
                <span>Real-time sync</span>
              </div>
            </div>
          </div>
          <div className="text-center bg-orange-500/20 backdrop-blur-sm rounded-xl p-6 border border-orange-500/30">
            <div className="text-5xl font-bold mb-2">🔌</div>
            <div className="text-slate-200">Connect All</div>
          </div>
        </div>
      </div>

      {/* Connected Count */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle size={24} />
            <span className="text-lg font-semibold">{connectedIntegrations.length} Integrations Connected</span>
          </div>
          <Button className="bg-white text-green-600 hover:bg-green-50">
            View All Connected
          </Button>
        </div>
      </div>

      {/* Integration Categories */}
      {integrationCategories.map((category, catIdx) => {
        const CategoryIcon = category.icon;
        
        return (
          <div key={catIdx} className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                <CategoryIcon size={20} className="text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                {category.category}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {category.integrations.map((integration) => {
                const isConnected = connectedIntegrations.includes(integration.id);
                const isAvailable = integration.status === 'available';
                
                return (
                  <div key={integration.id} className={`bg-white rounded-xl p-6 border-2 transition-all ${
                    isConnected ? 'border-green-400 shadow-lg' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-4xl">{integration.logo}</div>
                        <div>
                          <h3 className="font-bold text-slate-900">{integration.name}</h3>
                          {isConnected && (
                            <span className="text-xs text-green-600 flex items-center mt-1">
                              <CheckCircle size={12} className="mr-1" />
                              Connected
                            </span>
                          )}
                        </div>
                      </div>
                      {!isAvailable && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Soon</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4">{integration.feature}</p>
                    
                    <Button 
                      onClick={() => toggleIntegration(integration.id)}
                      disabled={!isAvailable}
                      className={`w-full ${
                        isConnected 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isConnected ? 'Disconnect' : isAvailable ? 'Connect' : 'Coming Soon'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Benefits Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Why Connect Integrations?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <CheckCircle className="text-green-600 mb-2" size={24} />
            <h4 className="font-semibold text-slate-900 mb-1">Auto-Reconciliation</h4>
            <p className="text-sm text-slate-600">Match payments with invoices automatically</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <CheckCircle className="text-green-600 mb-2" size={24} />
            <h4 className="font-semibold text-slate-900 mb-1">Real-time Sync</h4>
            <p className="text-sm text-slate-600">Always up-to-date financial data</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <CheckCircle className="text-green-600 mb-2" size={24} />
            <h4 className="font-semibold text-slate-900 mb-1">Error-Free GST</h4>
            <p className="text-sm text-slate-600">Direct import for accurate filing</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;