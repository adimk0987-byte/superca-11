import { useState, useEffect } from 'react';
import { getNewsFeed, getNewsCategories } from '@/services/api';
import { Clock, ExternalLink, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react';

const NewsFeed = () => {
  const [news, setNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchNews();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await getNewsCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchNews = async () => {
    try {
      setLoading(true);
      const params = selectedCategory ? { category: selectedCategory } : {};
      const response = await getNewsFeed(params);
      setNews(response.data);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const urgencyColors = {
    low: 'border-l-slate-400 bg-slate-50',
    medium: 'border-l-blue-500 bg-blue-50',
    high: 'border-l-orange-500 bg-orange-50',
    critical: 'border-l-red-500 bg-red-50'
  };

  const urgencyIcons = {
    low: <Info size={18} className="text-slate-600" />,
    medium: <AlertCircle size={18} className="text-blue-600" />,
    high: <AlertTriangle size={18} className="text-orange-600" />,
    critical: <XCircle size={18} className="text-red-600" />
  };

  const urgencyLabels = {
    low: '',
    medium: 'Important',
    high: 'Urgent',
    critical: 'Critical'
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filters */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            !selectedCategory
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All News
        </button>
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center space-x-2 ${
              selectedCategory === cat.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* News Feed */}
      <div className="space-y-3">
        {news.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">No news available at the moment</p>
          </div>
        ) : (
          news.map((item) => {
            const isExpanded = expandedId === item.id;
            
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border-l-4 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  urgencyColors[item.urgency]
                }`}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center space-x-2 mb-2">
                      {urgencyIcons[item.urgency]}
                      {urgencyLabels[item.urgency] && (
                        <span className={`text-xs font-semibold uppercase ${
                          item.urgency === 'critical' ? 'text-red-600' :
                          item.urgency === 'high' ? 'text-orange-600' :
                          'text-blue-600'
                        }`}>
                          {urgencyLabels[item.urgency]}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center">
                        <Clock size={12} className="mr-1" />
                        {formatDate(item.published_date)}
                      </span>
                      {item.city && (
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                          📍 {item.city}
                        </span>
                      )}
                    </div>

                    {/* Headline */}
                    <h3 className="font-semibold text-slate-900 mb-1">
                      {item.headline}
                    </h3>

                    {/* Impact */}
                    <p className="text-sm text-slate-600 mb-2">
                      💡 {item.impact}
                    </p>

                    {/* Expanded Details */}
                    {isExpanded && item.full_details && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-sm text-slate-700 whitespace-pre-line">
                          {item.full_details}
                        </p>
                      </div>
                    )}

                    {/* External Link */}
                    {item.external_link && (
                      <a
                        href={item.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 mt-2"
                      >
                        <ExternalLink size={14} className="mr-1" />
                        Read more
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NewsFeed;
