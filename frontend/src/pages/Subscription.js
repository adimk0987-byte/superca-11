import { useState, useEffect } from 'react';
import { Check, Crown, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSubscription } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const Subscription = () => {
  const { company } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await getSubscription();
      setSubscriptionInfo(response.data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (tier) => {
    // TODO: Integrate Stripe checkout
    alert(`Upgrading to ${tier} tier. Stripe integration coming soon!`);
  };

  const plans = [
    {
      name: 'Free',
      tier: 'free',
      price: 0,
      trial: '2 months FREE trial',
      features: [
        '5 invoices per month',
        '1 user account',
        'Basic reports',
        'Email support',
        'Mobile app access',
      ],
      limitations: [
        'No AI features',
        'No reconciliation',
        'No priority support',
      ],
      cta: 'Current Plan',
      highlight: false,
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: 2499,
      popular: true,
      trial: '2 months FREE • Then ₹2,499/mo',
      features: [
        '100 invoices per month',
        '5 user accounts',
        '🤖 AI-powered invoice intelligence',
        '📊 Invoice reconciliation & tally',
        'Duplicate detection',
        'Anomaly alerts',
        'GST & TDS verification',
        'Advanced reports & analytics',
        'Priority email support',
        'Mobile app access',
        'API access',
      ],
      limitations: [],
      cta: 'Upgrade to Pro',
      highlight: true,
      savings: 'Save ₹10k-1L/month in errors',
    },
    {
      name: 'Enterprise',
      tier: 'enterprise',
      price: 8499,
      trial: '2 months FREE • Then ₹8,499/mo',
      features: [
        '✨ Everything in Pro',
        'Unlimited invoices',
        'Unlimited users',
        'Dedicated account manager',
        'Phone support',
        'Custom integrations',
        'Tally integration',
        'Multi-company management',
        'White-label reports',
        'SLA guarantee',
        'Training sessions',
      ],
      limitations: [],
      cta: 'Upgrade to Enterprise',
      highlight: false,
      savings: 'Replace your CA completely',
    },
  ];

  const currentTier = company?.subscription_tier || 'free';
  const onTrial = company?.subscription_status === 'trial';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="subscription-page" className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Choose Your Plan</h1>
        <p className="text-xl text-slate-600 mb-6">
          Start with 2 months FREE • No credit card required
        </p>
        
        {onTrial && subscriptionInfo?.trial_days_left && (
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-3 rounded-full text-white font-semibold">
            <Sparkles size={20} />
            <span>{subscriptionInfo.trial_days_left} days left in your FREE trial!</span>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = plan.tier === currentTier;
          const isTrial = onTrial && plan.tier === 'pro';
          
          return (
            <div
              key={plan.tier}
              className={`relative rounded-2xl p-8 ${
                plan.highlight
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl scale-105'
                  : 'bg-white border-2 border-slate-200'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-1 rounded-full text-sm font-bold text-slate-900">
                    🔥 MOST POPULAR
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center space-x-2 mb-2">
                  <span className={`text-5xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                    ₹{plan.price.toLocaleString()}
                  </span>
                  <span className={`text-lg ${plan.highlight ? 'text-indigo-100' : 'text-slate-600'}`}>
                    /month
                  </span>
                </div>
                <p className={`text-sm ${plan.highlight ? 'text-indigo-100' : 'text-slate-600'}`}>
                  {plan.trial}
                </p>
                {plan.savings && (
                  <p className={`text-sm font-semibold mt-2 ${plan.highlight ? 'text-yellow-300' : 'text-green-600'}`}>
                    💡 {plan.savings}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check size={20} className={`flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-green-300' : 'text-green-600'}`} />
                    <span className={`text-sm ${plan.highlight ? 'text-white' : 'text-slate-700'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                onClick={() => handleUpgrade(plan.tier)}
                disabled={isCurrentPlan && !isTrial}
                className={`w-full py-6 text-lg font-semibold ${
                  plan.highlight
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                    : isCurrentPlan
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isCurrentPlan && !isTrial ? (
                  <>
                    <Check size={20} className="mr-2" />
                    Current Plan
                  </>
                ) : isTrial ? (
                  <>
                    <Zap size={20} className="mr-2" />
                    On FREE Trial
                  </>
                ) : (
                  <>
                    <Crown size={20} className="mr-2" />
                    {plan.cta}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-200">
        <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">Feature Comparison</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-4 px-4 text-slate-700 font-semibold">Feature</th>
                <th className="text-center py-4 px-4 text-slate-700 font-semibold">Free</th>
                <th className="text-center py-4 px-4 text-indigo-600 font-semibold">Pro</th>
                <th className="text-center py-4 px-4 text-purple-600 font-semibold">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-4 px-4 text-slate-700">Invoices per month</td>
                <td className="text-center py-4 px-4">5</td>
                <td className="text-center py-4 px-4 font-semibold text-indigo-600">100</td>
                <td className="text-center py-4 px-4 font-semibold text-purple-600">Unlimited</td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-slate-700">User accounts</td>
                <td className="text-center py-4 px-4">1</td>
                <td className="text-center py-4 px-4 font-semibold text-indigo-600">5</td>
                <td className="text-center py-4 px-4 font-semibold text-purple-600">Unlimited</td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-slate-700">AI-powered features</td>
                <td className="text-center py-4 px-4 text-red-500">✗</td>
                <td className="text-center py-4 px-4 text-green-500">✓</td>
                <td className="text-center py-4 px-4 text-green-500">✓</td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-slate-700">Invoice reconciliation</td>
                <td className="text-center py-4 px-4 text-red-500">✗</td>
                <td className="text-center py-4 px-4 text-green-500">✓</td>
                <td className="text-center py-4 px-4 text-green-500">✓</td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-slate-700">GST/TDS verification</td>
                <td className="text-center py-4 px-4 text-red-500">✗</td>
                <td className="text-center py-4 px-4 text-green-500">✓</td>
                <td className="text-center py-4 px-4 text-green-500">✓</td>
              </tr>
              <tr>
                <td className="py-4 px-4 text-slate-700">Priority support</td>
                <td className="text-center py-4 px-4 text-red-500">✗</td>
                <td className="text-center py-4 px-4">Email</td>
                <td className="text-center py-4 px-4 font-semibold text-purple-600">Phone + Dedicated Manager</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-slate-50 rounded-xl p-8">
        <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">Frequently Asked Questions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Is the trial really free?</h4>
            <p className="text-sm text-slate-600">
              Yes! No credit card required. Get full Pro features for 60 days absolutely free.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Can I cancel anytime?</h4>
            <p className="text-sm text-slate-600">
              Yes, cancel anytime. No questions asked. Data export available before cancellation.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">What payment methods do you accept?</h4>
            <p className="text-sm text-slate-600">
              UPI, Cards (Credit/Debit), Net Banking, and International cards via Stripe.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Do you offer refunds?</h4>
            <p className="text-sm text-slate-600">
              7-day money-back guarantee. If you're not satisfied, we'll refund 100%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
