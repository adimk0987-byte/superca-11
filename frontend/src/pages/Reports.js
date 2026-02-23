import { useState, useEffect } from 'react';
import { Download, FileText, TrendingUp, DollarSign } from 'lucide-react';
import { getDashboardStats, getInvoices, getBills, getPayments } from '@/services/api';

const Reports = () => {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('summary');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, invoicesRes, billsRes, paymentsRes] = await Promise.all([
        getDashboardStats(),
        getInvoices(),
        getBills(),
        getPayments(),
      ]);
      setStats(statsRes.data);
      setInvoices(invoicesRes.data);
      setBills(billsRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const netProfit = (stats?.total_revenue || 0) - (stats?.total_expenses || 0);
  const profitMargin = stats?.total_revenue > 0
    ? ((netProfit / stats.total_revenue) * 100).toFixed(1)
    : 0;

  return (
    <div data-testid="reports-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-600 mt-1">Financial insights and summaries</p>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <div className="flex items-center space-x-4">
          <label className="font-medium text-slate-700">Report Type:</label>
          <select
            className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="summary">Financial Summary</option>
            <option value="invoices">Invoices Report</option>
            <option value="bills">Bills Report</option>
            <option value="payments">Payments Report</option>
          </select>
        </div>
      </div>

      {/* Summary Report */}
      {reportType === 'summary' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm opacity-90">Total Revenue</p>
                <DollarSign size={24} />
              </div>
              <h3 className="text-3xl font-bold">
                ${(stats?.total_revenue || 0).toLocaleString()}
              </h3>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm opacity-90">Total Expenses</p>
                <TrendingUp size={24} />
              </div>
              <h3 className="text-3xl font-bold">
                ${(stats?.total_expenses || 0).toLocaleString()}
              </h3>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm opacity-90">Net Profit</p>
                <TrendingUp size={24} />
              </div>
              <h3 className="text-3xl font-bold">${netProfit.toLocaleString()}</h3>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm opacity-90">Profit Margin</p>
                <FileText size={24} />
              </div>
              <h3 className="text-3xl font-bold">{profitMargin}%</h3>
            </div>
          </div>

          {/* Detailed Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receivables */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Accounts Receivable
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Outstanding</span>
                  <span className="font-semibold text-slate-900">
                    ${(stats?.outstanding_receivables || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Invoices</span>
                  <span className="font-semibold text-slate-900">
                    {stats?.total_invoices || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Paid Invoices</span>
                  <span className="font-semibold text-green-600">
                    {stats?.paid_invoices || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Overdue Invoices</span>
                  <span className="font-semibold text-red-600">
                    {stats?.overdue_invoices || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Payables */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Accounts Payable
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Outstanding</span>
                  <span className="font-semibold text-slate-900">
                    ${(stats?.outstanding_payables || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Customers</span>
                  <span className="font-semibold text-slate-900">
                    {stats?.total_customers || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Vendors</span>
                  <span className="font-semibold text-slate-900">
                    {stats?.total_vendors || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Report */}
      {reportType === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Invoices Report</h3>
            <button
              onClick={() =>
                exportToCSV(
                  invoices.map((inv) => ({
                    invoice_number: inv.invoice_number,
                    customer: inv.customer_name,
                    amount: inv.total,
                    status: inv.status,
                    due_date: new Date(inv.due_date).toLocaleDateString(),
                  })),
                  'invoices-report.csv'
                )
              }
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Download size={18} className="mr-2" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 text-sm font-medium">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm">{invoice.customer_name}</td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      ${invoice.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 rounded text-xs font-medium">
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bills Report */}
      {reportType === 'bills' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Bills Report</h3>
            <button
              onClick={() =>
                exportToCSV(
                  bills.map((bill) => ({
                    bill_number: bill.bill_number,
                    vendor: bill.vendor_name,
                    amount: bill.amount,
                    paid: bill.paid_amount || 0,
                    status: bill.status,
                    due_date: new Date(bill.due_date).toLocaleDateString(),
                  })),
                  'bills-report.csv'
                )
              }
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Download size={18} className="mr-2" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Bill #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="px-6 py-4 text-sm font-medium">{bill.bill_number}</td>
                    <td className="px-6 py-4 text-sm">{bill.vendor_name}</td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      ${bill.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600">
                      ${(bill.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">{bill.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments Report */}
      {reportType === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Payments Report</h3>
            <button
              onClick={() =>
                exportToCSV(
                  payments.map((payment) => ({
                    payment_number: payment.payment_number,
                    customer: payment.customer_name,
                    amount: payment.amount,
                    method: payment.payment_method,
                    date: new Date(payment.payment_date).toLocaleDateString(),
                    status: payment.status,
                  })),
                  'payments-report.csv'
                )
              }
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Download size={18} className="mr-2" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Payment #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 text-sm font-medium">
                      {payment.payment_number}
                    </td>
                    <td className="px-6 py-4 text-sm">{payment.customer_name}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {payment.payment_method.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
