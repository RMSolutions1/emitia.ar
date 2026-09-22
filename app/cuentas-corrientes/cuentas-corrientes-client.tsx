'use client';

import { useState, useEffect } from 'react';
import { Wallet, Users, Building2, Search, Plus, Eye, ArrowUpRight, ArrowDownRight, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CustomerAccount {
  id: string;
  customerId: string;
  creditLimit: number;
  balance: number;
  status: string;
  lastMovementAt: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    document: string | null;
  };
  movements: AccountMovement[];
}

interface AccountMovement {
  id: string;
  type: string;
  concept: string;
  description: string;
  amount: number;
  balance: number;
  dueDate: string | null;
  createdAt: string;
}

export default function CuentasCorrientesClient() {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [stats, setStats] = useState({ totalAccounts: 0, totalDebt: 0, totalCredit: 0, accountsWithDebt: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<CustomerAccount | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState('cash');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts/customers');
      const data = await res.json();
      setAccounts(data.accounts || []);
      setStats(data.stats || { totalAccounts: 0, totalDebt: 0, totalCredit: 0, accountsWithDebt: 0 });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountDetails = async (customerId: string) => {
    try {
      const res = await fetch(`/api/accounts/customers/${customerId}`);
      const data = await res.json();
      setSelectedAccount(data);
      setShowModal(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar detalle');
    }
  };

  const handleCreateReceipt = async () => {
    if (!selectedAccount || !receiptAmount) return;

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedAccount.customerId,
          customerName: selectedAccount.customer.name,
          items: [{
            paymentMethod: receiptPaymentMethod,
            amount: parseFloat(receiptAmount),
          }],
        }),
      });

      if (res.ok) {
        toast.success('Recibo creado exitosamente');
        setShowReceiptModal(false);
        setReceiptAmount('');
        fetchAccounts();
        fetchAccountDetails(selectedAccount.customerId);
      } else {
        toast.error('Error al crear recibo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear recibo');
    }
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.customer.document?.includes(searchTerm)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Wallet className="w-7 h-7 text-blue-600" />
              Cuentas Corrientes
            </h1>
            <p className="text-gray-500">Gestiona los saldos de clientes y proveedores</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cuentas</p>
                <p className="text-xl font-bold">{stats.totalAccounts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Deuda</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalDebt)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowDownRight className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Saldo a Favor</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalCredit)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Con Deuda</p>
                <p className="text-xl font-bold">{stats.accountsWithDebt}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Límite Crédito</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No hay cuentas corrientes registradas
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{account.customer.name}</div>
                      <div className="text-sm text-gray-500">{account.customer.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{account.customer.document || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{formatCurrency(account.creditLimit)}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${account.balance > 0 ? 'text-red-600' : account.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatCurrency(Math.abs(account.balance))}
                        {account.balance > 0 ? ' (Debe)' : account.balance < 0 ? ' (A favor)' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        account.status === 'active' ? 'bg-green-100 text-green-700' :
                        account.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {account.status === 'active' ? 'Activa' : account.status === 'suspended' ? 'Suspendida' : 'Bloqueada'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => fetchAccountDetails(account.customerId)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle */}
      {showModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Cuenta Corriente</h2>
                <p className="text-gray-500">{selectedAccount.customer.name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Cobro
                </button>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Saldo Actual</p>
                  <p className={`text-2xl font-bold ${selectedAccount.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(selectedAccount.balance))}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedAccount.balance > 0 ? 'Debe' : selectedAccount.balance < 0 ? 'A favor' : 'Sin saldo'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Límite de Crédito</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedAccount.creditLimit)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Disponible</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(Math.max(0, selectedAccount.creditLimit - selectedAccount.balance))}
                  </p>
                </div>
              </div>

              <h3 className="font-semibold mb-3">Últimos Movimientos</h3>
              <div className="space-y-2">
                {selectedAccount.movements?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay movimientos</p>
                ) : (
                  selectedAccount.movements?.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${mov.type === 'debit' ? 'bg-red-100' : 'bg-green-100'}`}>
                          {mov.type === 'debit' ? (
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{mov.description}</p>
                          <p className="text-sm text-gray-500">{formatDate(mov.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${mov.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                          {mov.type === 'debit' ? '+' : '-'}{formatCurrency(mov.amount)}
                        </p>
                        <p className="text-sm text-gray-500">Saldo: {formatCurrency(mov.balance)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recibo */}
      {showReceiptModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Registrar Cobro</h2>
              <p className="text-gray-500">{selectedAccount.customer.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
                <select
                  value={receiptPaymentMethod}
                  onChange={(e) => setReceiptPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="check">Cheque</option>
                  <option value="card">Tarjeta</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateReceipt}
                disabled={!receiptAmount}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Crear Recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
