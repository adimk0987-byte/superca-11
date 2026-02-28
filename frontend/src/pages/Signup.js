import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signup(
      formData.name,
      formData.email,
      formData.password,
      formData.companyName
    );

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">FinanceOps</h1>
          <p className="text-indigo-200">Start managing your finances like a pro</p>
        </div>

        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-2 rounded-full mb-4">
              <Sparkles className="text-white" size={20} />
              <span className="text-white font-bold">🎉 First 2 Months FREE!</span>
            </div>
            
            <div className="space-y-3 ml-2">
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-green-300" size={20} />
                <span className="text-white">100 invoices/month (Worth ₹2,499)</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-green-300" size={20} />
                <span className="text-white">AI-powered invoice intelligence</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-green-300" size={20} />
                <span className="text-white">5 user accounts</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-green-300" size={20} />
                <span className="text-white">Unlimited customers & vendors</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-green-300" size={20} />
                <span className="text-white">GST & compliance ready</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-green-300" size={20} />
                <span className="text-white">Advanced reports & analytics</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-sm rounded-xl p-6 border-2 border-yellow-400/50">
            <h3 className="text-white font-semibold mb-3 flex items-center">
              <span className="text-2xl mr-2">⚡</span> Perfect for CAs & SMEs
            </h3>
            <div className="space-y-2 text-sm text-white">
              <p>• <strong>For CAs:</strong> Manage 50-500 clients</p>
              <p>• <strong>For SMEs:</strong> Auto invoice matching</p>
              <p>• <strong>Save:</strong> 80% less manual work</p>
              <p>• <strong>Worth:</strong> ₹10k-1L in error prevention</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-white font-semibold mb-3">After 2 Months</h3>
            <div className="space-y-2 text-sm text-indigo-100">
              <p><strong className="text-white">Pro (₹2,499/mo):</strong> 100 invoices, 5 users, AI</p>
              <p><strong className="text-white">Enterprise (₹8,499/mo):</strong> Unlimited all</p>
              <p className="text-xs mt-3 text-indigo-200">No credit card for trial ✨</p>
            </div>
          </div>
        </div>

        <div className="text-indigo-200 text-sm">
          <p>&copy; 2025 FinanceOps. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Start Your Free Trial</h2>
              <p className="text-slate-600">Get 2 months of Pro features absolutely free. No credit card required!</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="mt-1"
                  data-testid="signup-name-input"
                />
              </div>

              <div>
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Acme Inc."
                  required
                  className="mt-1"
                  data-testid="signup-company-input"
                />
              </div>

              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@company.com"
                  required
                  className="mt-1"
                  data-testid="signup-email-input"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="mt-1"
                  data-testid="signup-password-input"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-base"
                data-testid="signup-submit-btn"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>

            <p className="text-xs text-center text-slate-500 mt-6">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
