import { useState } from 'react';
import { Bell, CheckCircle, Clock, AlertTriangle, TrendingUp, FileText, Receipt, Calendar, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SmartAlerts = () => {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'urgent',
      icon: AlertTriangle,
      title: 'GST Return Due in 3 Days',
      message: "We've auto-filled your GSTR-3B return based on your sales data.",
      action: 'Review & File',
      actionUrl: '/gst-filing',
      time: '2 hours ago',
      status: 'pending'
    },
    {
      id: 2,
      type: 'warning',
      icon: Receipt,
      title: 'TDS on Rent Not Paid',
      message: "We've calculated ₹4,200 TDS due on your office rent. Avoid penalties by paying now.",
      action: 'Pay TDS Now',
      actionUrl: '/tds-filing',
      time: '5 hours ago',
      status: 'pending'
    },
    {
      id: 3,
      type: 'info',
      icon: FileText,
      title: 'Startup India Annual Report Due',
      message: "We've pre-filled 80% of your annual report. Just review and submit.",
      action: 'Complete Report',
      actionUrl: '/startup-tax-savings',
      time: '1 day ago',
      status: 'pending'
    },
    {
      id: 4,
      type: 'success',
      icon: CheckCircle,
      title: 'ITR Filed Successfully',
      message: 'Your Income Tax Return for AY 2024-25 has been filed. Acknowledgement number: 123456789',
      time: '2 days ago',
      status: 'completed'
    },
    {
      id: 5,
      type: 'info',
      icon: Calendar,
      title: 'Upcoming: Q2 TDS Return',
      message: 'TDS return for Q2 FY 2024-25 is due on Jan 31, 2025. Start preparing now.',
      action: 'Start Preparation',
      actionUrl: '/tds-filing',
      time: '3 days ago',
      status: 'pending'
    }
  ]);

  const handleAction = (alertId) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, status: 'completed' } : alert
    ));
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case 'urgent':
        return 'border-red-300 bg-red-50';
      case 'warning':
        return 'border-amber-300 bg-amber-50';
      case 'info':
        return 'border-blue-300 bg-blue-50';
      case 'success':
        return 'border-green-300 bg-green-50';
      default:
        return 'border-slate-300 bg-slate-50';
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'urgent':
        return 'text-red-600';
      case 'warning':
        return 'text-amber-600';
      case 'info':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      default:
        return 'text-slate-600';
    }
  };

  const pendingAlerts = alerts.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Smart Alerts & Actions
            </h1>
            <p className="text-purple-100 text-lg">Proactive notifications • One-click fixes • Never miss a deadline</p>
            <div className="flex items-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <Zap size={20} />
                <span>AI-powered alerts</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock size={20} />
                <span>Real-time updates</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>One-click actions</span>
              </div>
            </div>
          </div>
          <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <div className="text-5xl font-bold mb-2">{pendingAlerts}</div>
            <div className="text-purple-100">Pending</div>
          </div>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center space-x-3 mb-2">
            <Bell className="text-purple-600" size={24} />
            <span className="text-2xl font-bold text-slate-900">{alerts.length}</span>
          </div>
          <p className="text-sm text-slate-600">Total Alerts</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center space-x-3 mb-2">
            <AlertTriangle className="text-amber-600" size={24} />
            <span className="text-2xl font-bold text-slate-900">{pendingAlerts}</span>
          </div>
          <p className="text-sm text-slate-600">Action Required</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle className="text-green-600" size={24} />
            <span className="text-2xl font-bold text-slate-900">{alerts.filter(a => a.status === 'completed').length}</span>
          </div>
          <p className="text-sm text-slate-600">Completed</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingUp className="text-blue-600" size={24} />
            <span className="text-2xl font-bold text-slate-900">95%</span>
          </div>
          <p className="text-sm text-slate-600">On-time Rate</p>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
          Recent Alerts
        </h2>
        
        {alerts.map((alert) => {
          const AlertIcon = alert.icon;
          const isPending = alert.status === 'pending';
          
          return (
            <div key={alert.id} className={`rounded-xl p-6 border-2 transition-all ${getAlertStyle(alert.type)} ${
              isPending ? '' : 'opacity-60'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0 ${getIconColor(alert.type)}`}>
                    <AlertIcon size={24} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{alert.title}</h3>
                      {!isPending && (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-semibold">Completed</span>
                      )}
                    </div>
                    <p className="text-slate-700 mb-3">{alert.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{alert.time}</span>
                      {isPending && alert.action && (
                        <Button 
                          onClick={() => handleAction(alert.id)}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                        >
                          {alert.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">How Smart Alerts Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <span className="text-xl font-bold text-blue-600">1</span>
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">AI Monitors</h4>
            <p className="text-sm text-slate-600">Our AI tracks all your deadlines, transactions, and compliance requirements 24/7</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <span className="text-xl font-bold text-blue-600">2</span>
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Smart Notification</h4>
            <p className="text-sm text-slate-600">Get alerts with pre-filled data and clear actions - no manual work required</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <span className="text-xl font-bold text-blue-600">3</span>
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">One-Click Fix</h4>
            <p className="text-sm text-slate-600">Review and complete the action in seconds. We do the heavy lifting!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartAlerts;