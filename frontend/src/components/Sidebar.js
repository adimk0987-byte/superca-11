import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Newspaper,
  GitCompare,
  Calculator,
  FileSpreadsheet,
  Wallet,
  Receipt,
  BarChart3,
  UserCog,
  BookOpen,
  Crown,
  Sparkles,
  Zap,
  TrendingDown,
  Plug,
  Bell,
  Settings,
} from 'lucide-react';

const menuSections = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]
  },
  {
    title: 'Killer Features',
    badge: 'NEW',
    badgeColor: 'bg-pink-500',
    items: [
      { name: 'Startup Tax Savings', icon: TrendingDown, path: '/startup-tax-savings', badge: '💰', highlight: true },
      { name: 'Integration Hub', icon: Plug, path: '/integrations', badge: '🔌', highlight: true },
      { name: 'Smart Alerts', icon: Bell, path: '/smart-alerts', badge: '⚡', highlight: true },
    ]
  },
  {
    title: 'AI Automation',
    badge: 'Full AI',
    badgeColor: 'bg-emerald-500',
    items: [
      { name: 'ITR Filing', icon: Calculator, path: '/itr-filing', badge: '✨' },
      { name: 'ITR PDF Generator', icon: FileSpreadsheet, path: '/itr-generator', badge: '🔥', highlight: true },
      { name: 'GST Returns', icon: FileSpreadsheet, path: '/gst-filing', badge: '✨' },
      { name: 'Tally Entry', icon: Wallet, path: '/tally-entry', badge: '✨' },
      { name: 'TDS Filing', icon: Receipt, path: '/tds-filing', badge: '✨' },
      { name: 'Financial Statements', icon: BarChart3, path: '/financial-statements', badge: '✨' },
    ]
  },
  {
    title: 'AI-Assisted',
    badge: 'Hybrid',
    badgeColor: 'bg-amber-500',
    items: [
      { name: 'Payroll', icon: UserCog, path: '/payroll', badge: '⚡' },
      { name: 'Bookkeeping', icon: BookOpen, path: '/bookkeeping', badge: '⚡' },
    ]
  },
  {
    title: 'Management',
    items: [
      { name: 'Reconciliation', icon: GitCompare, path: '/reconciliation' },
      { name: 'Customers', icon: Users, path: '/customers' },
      { name: 'News', icon: Newspaper, path: '/news' },
    ]
  },
  {
    title: 'Account',
    items: [
      { name: 'Subscription', icon: Crown, path: '/subscription' },
      { name: 'GSTN Settings', icon: Settings, path: '/settings/gstn' },
    ]
  },
];

const Sidebar = ({ isOpen }) => {
  const location = useLocation();

  return (
    <aside
      data-testid="sidebar"
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out flex flex-col border-r border-slate-800`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`
      }}
    >
      {/* Logo */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        {isOpen && (
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              CA AutoPilot
            </h1>
            <p className="text-xs text-slate-400 mt-1">Complete Automation</p>
          </div>
        )}
        {!isOpen && (
          <div className="text-xl font-bold mx-auto">CA</div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
        {menuSections.map((section, idx) => (
          <div key={idx}>
            {isOpen && (
              <div className="flex items-center space-x-2 px-3 mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </h3>
                {section.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${section.badgeColor} text-white font-bold`}>
                    {section.badge}
                  </span>
                )}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : item.highlight
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.5} />
                    {isOpen && (
                      <div className="flex items-center justify-between flex-1">
                        <span className="font-medium text-sm">{item.name}</span>
                        {item.badge && (
                          <span className="text-xs">{item.badge}</span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        {isOpen && (
          <div className="text-xs text-slate-400 text-center">
            <p>© 2025 CA AutoPilot</p>
            <p className="mt-1">Powered by Emergent AI</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
