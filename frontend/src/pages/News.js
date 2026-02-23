import { useState } from 'react';
import NewsFeed from '@/components/NewsFeed';
import { Newspaper, TrendingUp } from 'lucide-react';

const News = () => {
  return (
    <div data-testid="news-page" className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Newspaper size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Daily Business Updates</h1>
            <p className="text-indigo-100 text-lg">
              Stay ahead with latest news on taxes, grants, auctions, and important alerts
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-2xl">📅</span>
              <span className="text-sm text-indigo-100">Taxes</span>
            </div>
            <p className="text-2xl font-bold">3 New</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-2xl">💰</span>
              <span className="text-sm text-indigo-100">Grants</span>
            </div>
            <p className="text-2xl font-bold">2 Active</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-2xl">⚠️</span>
              <span className="text-sm text-indigo-100">Alerts</span>
            </div>
            <p className="text-2xl font-bold">1 Critical</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-2xl">🏢</span>
              <span className="text-sm text-indigo-100">Auctions</span>
            </div>
            <p className="text-2xl font-bold">5 Upcoming</p>
          </div>
        </div>
      </div>

      {/* News Feed */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <NewsFeed />
      </div>
    </div>
  );
};

export default News;
