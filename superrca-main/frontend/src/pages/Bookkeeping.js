import { useState } from 'react';
import { BookOpen, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Bookkeeping = () => {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Accounting & Bookkeeping</h1>
            <p className="text-amber-100 text-lg">AI codes 80% of transactions • Human reviews unusual entries • Maintains accuracy</p>
            <div className="flex items-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <Zap size={20} />
                <span>80% auto-coded</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle size={20} />
                <span>Exception flagging</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} />
                <span>Human review</span>
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
            <p className="text-amber-700 text-sm">AI automatically codes routine transactions, but unusual expenses or complex entries require human verification for accuracy.</p>
          </div>
        </div>
      </div>

      {/* Feature Placeholder */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h3 className="text-xl font-semibold text-amber-900 mb-2">Coming Soon</h3>
        <p className="text-amber-700">AI-assisted bookkeeping feature is under development. Will be available in the next update.</p>
      </div>
    </div>
  );
};

export default Bookkeeping;