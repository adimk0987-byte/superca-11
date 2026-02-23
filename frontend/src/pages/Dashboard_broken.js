import { Link } from 'react-router-dom';
import { 
  Calculator, FileSpreadsheet, Wallet, Receipt, BarChart3, 
  UserCog, BookOpen, TrendingUp, CheckCircle, Clock, AlertCircle,
  Sparkles, Zap, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const aiFeatures = [
    { 
      name: 'ITR Filing', 
      icon: Calculator, 
      path: '/itr-filing', 
      status: 'active',
      description: 'AI scans Form-16, suggests best regime',
      color: 'from-blue-500 to-indigo-600',
      badge: '✨'
    },
    { 
      name: 'GST Returns', 
      icon: FileSpreadsheet, 
      path: '/gst-filing', 
      status: 'coming_soon',
      description: 'Auto-populate GSTR-2B, find mismatches',
      color: 'from-emerald-500 to-green-600',
      badge: '✨'
    },
    { 
      name: 'Tally Entry', 
      icon: Wallet, 
      path: '/tally-entry', 
      status: 'coming_soon',
      description: 'OCR reads statements, creates vouchers',
      color: 'from-purple-500 to-pink-600',
      badge: '✨'
    },
    { 
      name: 'TDS Filing', 
      icon: Receipt, 
      path: '/tds-filing', 
      status: 'coming_soon',
      description: 'Auto-calculate TDS, generate JSON',
      color: 'from-orange-500 to-red-600',
      badge: '✨'
    },
    { 
      name: 'Financial Statements', 
      icon: BarChart3, 
      path: '/financial-statements', 
      status: 'coming_soon',
      description: 'Generate Balance Sheet & P&L instantly',
      color: 'from-cyan-500 to-blue-600',
      badge: '✨'
    },
    { 
      name: 'Payroll', 
      icon: UserCog, 
      path: '/payroll', 
      status: 'coming_soon',
      description: 'AI calculates, human handles exceptions',
      color: 'from-amber-500 to-orange-600',
      badge: '⚡',
      assisted: true
    },
    { 
      name: 'Bookkeeping', 
      icon: BookOpen, 
      path: '/bookkeeping', 
      status: 'coming_soon',
      description: 'AI codes 80% of transactions',
      color: 'from-yellow-500 to-amber-600',
      badge: '⚡',
      assisted: true
    },
  ];

  const stats = [
    { label: 'ITR Filings', value: '0', change: '+0%', icon: Calculator, color: 'text-blue-600' },
    { label: 'GST Returns', value: '0', change: '+0%', icon: FileSpreadsheet, color: 'text-emerald-600' },
    { label: 'TDS Calculations', value: '0', change: '+0%', icon: Receipt, color: 'text-orange-600' },
    { label: 'Hours Saved', value: '0', change: '+0h', icon: Clock, color: 'text-purple-600' },
  ];

  return (
    <div space-y-6">
      {/* Hero Section */}
      <div bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white border border-slate-700" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`
      }}>
        <div flex items-center justify-between">
          <div>
            <h1 text-4xl font-bold mb-3" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Welcome to CA AutoPilot
            </h1>
            <p text-slate-300 text-lg mb-6">
              Complete CA automation powered by AI. File taxes, reconcile GST, manage payroll - all in one place.
            </p>
            <div flex items-center space-x-4">
              <Link to="/itr-filing">
                <Button bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 shadow-lg">
                  <Sparkles size={20} mr-2" />
                  File ITR Now
                </Button>
              </Link>
              <Link to="/news">
                <Button bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-3 border border-white/20">
                  View Tax Deadlines
                </Button>
              </Link>
            </div>
          </div>
          <div hidden lg:block">
            <div w-32 h-32 bg-orange-500/20 rounded-full flex items-center justify-center border-4 border-orange-500/30">
              <Sparkles size={64} text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Bento Style */}
      <div grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div flex items-center justify-between mb-4">
                <Icon className={stat.color} size={24} strokeWidth={1.5} />
                <span text-sm text-green-600 font-medium">{stat.change}</span>
              </div>
              <div text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stat.value}
              </div>
              <div text-sm text-slate-600">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* AI Features Grid - Bento Style */}
      <div>
        <div flex items-center justify-between mb-4">
          <h2 text-2xl font-bold text-slate-900" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            CA Automation Features
          </h2>
          <div flex items-center space-x-4 text-sm">
            <div flex items-center space-x-1">
              <span text-2xl">✨</span>
              <span text-slate-600">Full AI</span>
            </div>
            <div flex items-center space-x-1">
              <span text-2xl">⚡</span>
              <span text-slate-600">AI-Assisted</span>
            </div>
          </div>
        </div>

        <div grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            const isActive = feature.status === 'active';
            
            return (
              <Link 
                key={idx} 
                to={feature.path}
                className={`group relative bg-white rounded-xl p-6 border-2 transition-all duration-200 ${
                  isActive 
                    ? 'border-orange-200 hover:border-orange-400 hover:shadow-lg cursor-pointer' 
                    : 'border-slate-200 hover:border-slate-300 opacity-75'
                }`}
              >
                {/* Badge */}
                <div absolute top-4 right-4 text-3xl">
                  {feature.badge}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={28} text-white" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <h3 text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {feature.name}
                </h3>
                <p text-sm text-slate-600 mb-4">{feature.description}</p>

                {/* Status */}
                <div flex items-center justify-between">
                  {isActive ? (
                    <span text-sm font-medium text-emerald-600 flex items-center">
                      <CheckCircle size={16} mr-1" />
                      Active
                    </span>
                  ) : (
                    <span text-sm font-medium text-amber-600 flex items-center">
                      <Clock size={16} mr-1" />
                      Coming Soon
                    </span>
                  )}
                  {isActive && (
                    <ArrowRight size={18} text-orange-500 group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Action Required Section */}
      <div grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Actions */}
        <div bg-white rounded-xl p-6 border border-slate-200">
          <h3 text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <AlertCircle text-orange-500 mr-2" size={20} />
            Action Required
          </h3>
          <div text-center py-8 text-slate-500">
            <Clock size={40} mx-auto mb-3 text-slate-400" />
            <p>No pending actions</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div bg-white rounded-xl p-6 border border-slate-200">
          <h3 text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <TrendingUp text-blue-500 mr-2" size={20} />
            Recent Activity
          </h3>
          <div text-center py-8 text-slate-500">
            <BarChart3 size={40} mx-auto mb-3 text-slate-400" />
            <p>No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
