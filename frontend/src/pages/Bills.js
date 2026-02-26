import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, DollarSign } from 'lucide-react';
import {
  getBills,
  getVendors,
  createBill,
  updateBill,
  deleteBill,
  payBill,
} from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const Bills = () => {
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [payingBill, setPayingBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [formData, setFormData] = useState({
    bill_number: '',
    vendor_id: '',
    amount: 0,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'sent',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billsRes, vendorsRes] = await Promise.all([
        getBills(),
        getVendors(),
      ]);
      setBills(billsRes.data);
      setVendors(vendorsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedVendor = vendors.find((v) => v.id === formData.vendor_id);
      const billData = {
        ...formData,
        vendor_name: selectedVendor?.name || '',
        due_date: new Date(formData.due_date).toISOString(),
        amount: parseFloat(formData.amount),
      };

      if (editingBill) {
        await updateBill(editingBill.id, billData);
      } else {
        await createBill(billData);
      }

      await fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await payBill(payingBill.id, parseFloat(paymentAmount));
      await fetchData();
      setIsPayDialogOpen(false);
      setPayingBill(null);
      setPaymentAmount(0);
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const handleEdit = (bill) => {
    setEditingBill(bill);
    setFormData({
      bill_number: bill.bill_number,
      vendor_id: bill.vendor_id,
      amount: bill.amount,
      due_date: new Date(bill.due_date).toISOString().split('T')[0],
      status: bill.status,
      notes: bill.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        await deleteBill(id);
        await fetchData();
      } catch (error) {
        console.error('Error deleting bill:', error);
      }
    }
  };

  const openPayDialog = (bill) => {
    setPayingBill(bill);
    setPaymentAmount(bill.amount - (bill.paid_amount || 0));
    setIsPayDialogOpen(true);
  };

  const resetForm = () => {
    setEditingBill(null);
    setFormData({
      bill_number: '',
      vendor_id: '',
      amount: 0,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'sent',
      notes: '',
    });
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || bill.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="bills-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bills (Accounts Payable)</h1>
          <p className="text-slate-600 mt-1">Manage bills and vendor payments</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="create-bill-btn"
              onClick={() => resetForm()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus size={20} className="mr-2" />
              Create Bill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBill ? 'Edit Bill' : 'Create New Bill'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bill_number">Bill Number</Label>
                  <Input
                    id="bill_number"
                    value={formData.bill_number}
                    onChange={(e) =>
                      setFormData({ ...formData, bill_number: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vendor_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  {editingBill ? 'Update' : 'Create'} Bill
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment for {payingBill?.bill_number}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <Label>Bill Amount</Label>
              <p className="text-lg font-semibold">${payingBill?.amount?.toFixed(2)}</p>
            </div>

            <div>
              <Label>Already Paid</Label>
              <p className="text-lg font-semibold text-green-600">
                ${(payingBill?.paid_amount || 0).toFixed(2)}
              </p>
            </div>

            <div>
              <Label>Remaining</Label>
              <p className="text-lg font-semibold text-red-600">
                ${((payingBill?.amount || 0) - (payingBill?.paid_amount || 0)).toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="payment_amount">Payment Amount</Label>
              <Input
                id="payment_amount"
                type="number"
                step="0.01"
                min="0"
                max={(payingBill?.amount || 0) - (payingBill?.paid_amount || 0)}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPayDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search bills..."
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Bill #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {bill.bill_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {bill.vendor_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                    ${bill.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    ${(bill.paid_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[bill.status]
                      }`}
                    >
                      {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {new Date(bill.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(bill)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(bill.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                    {bill.status !== 'paid' && (
                      <button
                        onClick={() => openPayDialog(bill)}
                        className="text-green-600 hover:text-green-900"
                        title="Pay Bill"
                      >
                        <DollarSign size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBills.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No bills found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bills;
