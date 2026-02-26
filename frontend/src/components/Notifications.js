import { useState } from 'react';
import { Bell, X, Check, AlertTriangle, Info } from 'lucide-react';

const Notifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'critical',
      title: 'GST Return Due Tomorrow',
      message: 'File your GST return by 20th Feb to avoid ₹5,000 penalty',
      time: '2h ago',
      read: false,
    },
    {
      id: 2,
      type: 'success',
      title: 'Invoice #INV-2025-045 Paid',
      message: 'Payment of ₹45,000 received from Acme Corp',
      time: '5h ago',
      read: false,
    },
    {
      id: 3,
      type: 'warning',
      title: 'Trial Ending Soon',
      message: '10 days left in your FREE trial. Upgrade to continue using AI features.',
      time: '1d ago',
      read: true,
    },
    {
      id: 4,
      type: 'info',
      title: 'New Solar Subsidy Available',
      message: 'Government offering ₹78,000 subsidy for rooftop solar',
      time: '2d ago',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const iconMap = {
    critical: <AlertTriangle size={18} className="text-red-500" />,
    warning: <AlertTriangle size={18} className="text-orange-500" />,
    success: <Check size={18} className="text-green-500" />,
    info: <Info size={18} className="text-blue-500" />,
  };

  const bgMap = {
    critical: 'bg-red-50 border-red-200',
    warning: 'bg-orange-50 border-orange-200',
    success: 'bg-green-50 border-green-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[600px] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Notifications</h3>
                <p className="text-xs text-slate-500">{unreadCount} unread</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Mark all read
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X size={18} className="text-slate-600" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[500px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Bell size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${
                      !notification.read ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg border ${bgMap[notification.type]}`}>
                        {iconMap[notification.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-sm font-semibold text-slate-900 ${
                            !notification.read ? 'font-bold' : ''
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1.5 ml-2" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-xs text-slate-400 mt-1 block">
                          {notification.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium w-full text-center">
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Notifications;
