import { Menu, Bell, Search, LogOut, Crown, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { getSubscription } from '@/services/api';
import Notifications from '@/components/Notifications';

const Header = ({ toggleSidebar }) => {
  const { user, company, logout } = useAuth();
  const [trialInfo, setTrialInfo] = useState(null);

  useEffect(() => {
    if (company?.subscription_status === 'trial') {
      fetchTrialInfo();
    }
  }, [company]);

  const fetchTrialInfo = async () => {
    try {
      const response = await getSubscription();
      setTrialInfo(response.data);
    } catch (error) {
      console.error('Error fetching trial info:', error);
    }
  };

  const tierBadge = {
    free: { text: 'Free', color: 'bg-slate-100 text-slate-700' },
    pro: { text: 'Pro', color: 'bg-indigo-100 text-indigo-700' },
    enterprise: { text: 'Enterprise', color: 'bg-purple-100 text-purple-700' },
  };

  const currentTier = tierBadge[company?.subscription_tier] || tierBadge.free;
  const isOnTrial = company?.subscription_status === 'trial';
  const trialDaysLeft = trialInfo?.trial_days_left;

  return (
    <header data-testid="header" className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            data-testid="toggle-sidebar-btn"
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} className="text-slate-600" />
          </button>

          {/* Search bar */}
          <div className="relative hidden md:block">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search invoices, customers..."
              className="pl-10 pr-4 py-2 w-96 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Trial Badge */}
          {isOnTrial && trialDaysLeft !== null && (
            <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-400 to-emerald-500 text-white flex items-center space-x-1">
              <Clock size={14} />
              <span>{trialDaysLeft} days left in trial</span>
            </div>
          )}

          {/* Subscription Badge */}
          {company && !isOnTrial && (
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-1 ${currentTier.color}`}>
              {company.subscription_tier !== 'free' && <Crown size={14} />}
              <span>{currentTier.text}</span>
            </div>
          )}

          <Notifications />

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500">{company?.name || 'Company'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
