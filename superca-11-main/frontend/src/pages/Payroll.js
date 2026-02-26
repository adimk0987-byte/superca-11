import { useState } from 'react';
import { UserCog, Calculator, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Payroll = () => {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Payroll Processing</h1>
            <p className="text-amber-100 text-lg">AI calculates salaries • Human handles exceptions • Generates pay slips</p>
            <div className="flex items-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <Calculator size={20} />
                <span>Auto-calculate</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle size={20} />
                <span>Exception alerts</span>
              </div>
              <div className="flex items-center space-x-2">
                <Download size={20} />
                <span>Pay slips</span>
              </div>
            </div>
          </div>
          <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <div className="text-5xl font-bold mb-2">
              <Zap size={48} />
            </div>
            <div className="text-amber-100">AI-Assisted</div>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Partial Automation</h3>
            <p className="text-amber-700 text-sm">AI calculates standard payroll, but human review is required for employee joinings, exits, reimbursements, and special cases.</p>
          </div>
        </div>
      </div>

      {/* Feature Placeholder */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h3 className="text-xl font-semibold text-amber-900 mb-2">Coming Soon</h3>
        <p className="text-amber-700">Payroll processing feature is under development. Will be available in the next update.</p>
      </div>
    </div>
  );
};

export default Payroll;