import { useState } from 'react';
import { TrendingDown, CheckCircle, DollarSign, Award, Lightbulb, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StartupTaxSavings = () => {
  const [selectedSection, setSelectedSection] = useState(null);

  const taxSavingsModules = [
    {
      id: '80iac',
      title: 'Section 80-IAC',
      subtitle: 'Startup India Tax Holiday',
      icon: Award,
      color: 'from-blue-500 to-indigo-600',
      savings: 'Up to 100% tax exemption for 3 years',
      eligibility: [
        'Incorporated as a private limited company or registered as a partnership firm or a limited liability partnership',
        'Turnover less than ₹100 crore in any financial year',
        'Recognized by DPIIT (Department for Promotion of Industry and Internal Trade)',
        'Engaged in innovation, development or improvement of products or processes or services'
      ],
      documents: ['DPIIT Recognition Certificate', 'Certificate of Incorporation', 'Audited Financial Statements', 'Declaration of eligible business']
    },
    {
      id: 'angel_tax',
      title: 'Angel Tax Exemption',
      subtitle: 'Section 56(2)(viib) Relief',
      icon: Users,
      color: 'from-emerald-500 to-green-600',
      savings: 'Save up to 30% on angel funding',
      eligibility: [
        'DPIIT recognized startup',
        'Angel investor must have net worth > ₹2 crore or avg income > ₹50 lakh',
        'Fair market valuation by merchant banker',
        'Total paid-up capital after funding ≤ ₹25 crore'
      ],
      documents: ['DPIIT Certificate', 'Valuation Report', 'Investor Net Worth Certificate', 'Share Allotment Documents']
    },
    {
      id: 'rd_credit',
      title: 'R&D Tax Credits',
      subtitle: 'Section 35(2AB) Weighted Deduction',
      icon: Lightbulb,
      color: 'from-purple-500 to-pink-600',
      savings: '150% weighted deduction on R&D spend',
      eligibility: [
        'In-house R&D facility approved by DSIR',
        'Scientific research expenditure',
        'Payment must be made in non-cash mode',
        'Maintain separate books for R&D expenses'
      ],
      documents: ['DSIR Approval Letter', 'R&D Expense Register', 'Project Reports', 'Payment Receipts']
    },
    {
      id: 'esop',
      title: 'ESOP Tax Deferment',
      subtitle: 'Section 80QQB - Defer tax on ESOPs',
      icon: DollarSign,
      color: 'from-orange-500 to-red-600',
      savings: 'Defer tax payment up to 4 years or exit',
      eligibility: [
        'Eligible startup as per DPIIT',
        'ESOPs issued to employees',
        'Employee holds shares for at least 5 years or sells earlier',
        'Tax deferred till sale or 48 months, whichever is earlier'
      ],
      documents: ['ESOP Scheme Document', 'Board Resolution', 'Allotment Letters', 'Fair Market Value Certificate']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Founder-Focused Tax Savings Engine
            </h1>
            <p className="text-indigo-100 text-lg">Unlock startup-specific tax breaks • Save lakhs in taxes • AI-powered eligibility check</p>
            <div className="flex items-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <TrendingDown size={20} />
                <span>AI Eligibility Check</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>Auto-filing assistance</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign size={20} />
                <span>Max savings guarantee</span>
              </div>
            </div>
          </div>
          <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <div className="text-5xl font-bold mb-2">💰</div>
            <div className="text-indigo-100">Save Lakhs</div>
          </div>
        </div>
      </div>

      {/* Tax Savings Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {taxSavingsModules.map((module) => {
          const Icon = module.icon;
          const isSelected = selectedSection === module.id;
          
          return (
            <div key={module.id} className={`bg-white rounded-xl p-6 border-2 transition-all cursor-pointer ${
              isSelected ? 'border-indigo-400 shadow-lg' : 'border-slate-200 hover:border-indigo-200'
            }`} onClick={() => setSelectedSection(module.id)}>
              <div className="flex items-start space-x-4">
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={32} className="text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {module.title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">{module.subtitle}</p>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold inline-block">
                    {module.savings}
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="mt-6 space-y-4 animate-slide-in">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center">
                      <CheckCircle size={18} className="mr-2 text-green-600" />
                      Eligibility Criteria
                    </h4>
                    <ul className="space-y-2 ml-7">
                      {module.eligibility.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center">
                      <AlertCircle size={18} className="mr-2 text-blue-600" />
                      Required Documents
                    </h4>
                    <div className="flex flex-wrap gap-2 ml-7">
                      {module.documents.map((doc, idx) => (
                        <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{doc}</span>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white mt-4">
                    Check Eligibility & Start Filing
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h3 className="text-xl font-semibold text-amber-900 mb-2">Automated Filing Coming Soon</h3>
        <p className="text-amber-700">AI-powered eligibility check and auto-filing for all startup tax breaks will be available soon. Click on any card above to see what you'll need!</p>
      </div>
    </div>
  );
};

export default StartupTaxSavings;