'use client';

import { useState, useEffect } from 'react';
import { Landmark, Plus, CreditCard, FileText, ArrowUpRight, ArrowDownRight, Wallet, AlertTriangle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  cbu: string | null;
  alias: string | null;
  accountType: string;
  currency: string;
  balance: number;
  isActive: boolean;
  movements: BankMovement[];
}

interface BankMovement {
  id: string;
  type: string;
  concept: string;
  description: string | null;
  amount: number;
  balance: number;
  date: string;
}

interface Check {
  id: string;
  type: string;
  checkNumber: string;
  bankName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  payee: string | null;
  drawer: string | null;
  status: string;
}

export default function TesoreriaClient() {
  const [activeTab, setActiveTab] = useState<'banks' | 'checks'>('banks');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [checks, setChecks] = useState<Check[]>([]);
  const [checkStats, setCheckStats] = useState({ totalReceived: 0, totalIssued: 0, inPortfolioCount: 0, inPortfolioAmount: 0, upcomingDue: 0 });
  const [loading, setLoading] = useState(true);
  const [showNewBankModal, setShowNewBankModal] = useState(false);
  const [showNewCheckModal, setShowNewCheckModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  
  // Bank form
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', cbu: '', alias: '', accountType: 'checking', balance: 0 });
  
  // Check form
  const [checkForm, setCheckForm] = useState({ type: 'received', checkNumber: '', bankName: '', amount: 0, issueDate: '', dueDate: '', drawer: '', payee: '' });
  
  // Movement form
  const [movementForm, setMovementForm] = useState({ type: 'deposit', concept: '', amount: 0 });

  useEffect(() => {
    fetchBankAccounts();
    fetchChecks();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/bank-accounts');
      const data = await res.json();
      const accounts = Array.isArray(data) ? data : data.accounts || [];
      setBankAccounts(accounts);
      setTotalBalance(
        data.totalBalance ??
          accounts.reduce((sum: number, a: BankAccount) => sum + (a.balance || 0), 0),
      );
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChecks = async () => {
    try {
      const res = await fetch('/api/checks');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.checks || [];
      setChecks(list);
      const inPortfolio = list.filter((c: Check) => c.status === 'in_portfolio' || c.status === 'portfolio');
      const upcomingDue = list.filter((c: Check) => {
        const due = new Date(c.dueDate);
        const limit = new Date();
        limit.setDate(limit.getDate() + 7);
        return due <= limit && due >= new Date() && c.status !== 'deposited';
      });
      setCheckStats({
        totalReceived: list.filter((c: Check) => c.type === 'received').reduce((s: number, c: Check) => s + c.amount, 0),
        totalIssued: list.filter((c: Check) => c.type === 'issued').reduce((s: number, c: Check) => s + c.amount, 0),
        inPortfolioCount: inPortfolio.length,
        inPortfolioAmount: inPortfolio.reduce((s: number, c: Check) => s + c.amount, 0),
        upcomingDue: upcomingDue.length,
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateBank = async () => {
    try {
      const res = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankForm),
      });
      if (res.ok) {
        toast.success('Cuenta creada exitosamente');
        setShowNewBankModal(false);
        setBankForm({ bankName: '', accountNumber: '', cbu: '', alias: '', accountType: 'checking', balance: 0 });
        fetchBankAccounts();
      } else {
        toast.error('Error al crear cuenta');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear cuenta');
    }
  };

  const handleCreateCheck = async () => {
    try {
      const res = await fetch('/api/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkForm),
      });
      if (res.ok) {
        toast.success('Cheque registrado exitosamente');
        setShowNewCheckModal(false);
        setCheckForm({ type: 'received', checkNumber: '', bankName: '', amount: 0, issueDate: '', dueDate: '', drawer: '', payee: '' });
        fetchChecks();
      } else {
        toast.error('Error al registrar cheque');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al registrar cheque');
    }
  };

  const handleCreateMovement = async () => {
    if (!selectedBank) return;
    try {
      const res = await fetch(`/api/bank-accounts/${selectedBank.id}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementForm),
      });
      if (res.ok) {
        toast.success('Movimiento registrado');
        setShowMovementModal(false);
        setMovementForm({ type: 'deposit', concept: '', amount: 0 });
        fetchBankAccounts();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al registrar movimiento');
    }
  };

  const handleUpdateCheckStatus = async (checkId: string, status: string) => {
    try {
      const res = await fetch(`/api/checks/${checkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success('Estado actualizado');
        fetchChecks();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR');
  };

  const getCheckStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      in_portfolio: 'bg-blue-100 text-blue-700',
      deposited: 'bg-green-100 text-green-700',
      cashed: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      endorsed: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      in_portfolio: 'En Cartera',
      deposited: 'Depositado',
      cashed: 'Cobrado',
      rejected: 'Rechazado',
      endorsed: 'Endosado',
      cancelled: 'Anulado',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
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
              <Landmark className="w-7 h-7 text-blue-600" />
              Tesorería
            </h1>
            <p className="text-gray-500">Gestiona cuentas bancarias, cheques y flujo de caja</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('banks')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'banks' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <CreditCard className="w-4 h-4" />
            Cuentas Bancarias
          </button>
          <button
            onClick={() => setActiveTab('checks')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'checks' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText className="w-4 h-4" />
            Cheques
          </button>
        </div>

        {/* Banks Tab */}
        {activeTab === 'banks' && (
          <>
            {/* Stats */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-100">Saldo Total en Bancos</p>
                  <p className="text-4xl font-bold">{formatCurrency(totalBalance)}</p>
                </div>
                <button
                  onClick={() => setShowNewBankModal(true)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nueva Cuenta
                </button>
              </div>
            </div>

            {/* Bank Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map((account) => (
                <div key={account.id} className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{account.bankName}</h3>
                      <p className="text-sm text-gray-500">{account.accountType === 'checking' ? 'Cuenta Corriente' : 'Caja de Ahorro'}</p>
                    </div>
                    <span className="text-2xl">🏦</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-4">{formatCurrency(account.balance)}</p>
                  <div className="text-sm text-gray-500 space-y-1 mb-4">
                    <p>N°: {account.accountNumber}</p>
                    {account.cbu && <p>CBU: {account.cbu}</p>}
                    {account.alias && <p>Alias: {account.alias}</p>}
                  </div>
                  <button
                    onClick={() => { setSelectedBank(account); setShowMovementModal(true); }}
                    className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                  >
                    Registrar Movimiento
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Checks Tab */}
        {activeTab === 'checks' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">En Cartera</p>
                    <p className="text-xl font-bold">{checkStats.inPortfolioCount}</p>
                    <p className="text-sm text-blue-600">{formatCurrency(checkStats.inPortfolioAmount)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ArrowDownRight className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Recibidos</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(checkStats.totalReceived)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Emitidos</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(checkStats.totalIssued)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vencen en 7 días</p>
                    <p className="text-xl font-bold text-orange-600">{checkStats.upcomingDue}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowNewCheckModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuevo Cheque
              </button>
            </div>

            {/* Checks Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Banco</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {checks.map((check) => (
                    <tr key={check.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${check.type === 'received' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {check.type === 'received' ? 'Recibido' : 'Emitido'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{check.checkNumber}</td>
                      <td className="px-6 py-4">{check.bankName}</td>
                      <td className="px-6 py-4 font-semibold">{formatCurrency(check.amount)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(check.dueDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getCheckStatusBadge(check.status)}</td>
                      <td className="px-6 py-4">
                        {check.status === 'in_portfolio' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateCheckStatus(check.id, 'deposited')}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Depositar
                            </button>
                            <button
                              onClick={() => handleUpdateCheckStatus(check.id, 'endorsed')}
                              className="text-purple-600 hover:text-purple-800 text-sm"
                            >
                              Endosar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Nueva Cuenta Bancaria */}
      {showNewBankModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Nueva Cuenta Bancaria</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                <input
                  type="text"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Ej: Banco Galicia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta</label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CBU</label>
                <input
                  type="text"
                  value={bankForm.cbu}
                  onChange={(e) => setBankForm({ ...bankForm, cbu: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alias</label>
                <input
                  type="text"
                  value={bankForm.alias}
                  onChange={(e) => setBankForm({ ...bankForm, alias: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={bankForm.accountType}
                  onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="checking">Cuenta Corriente</option>
                  <option value="savings">Caja de Ahorro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Inicial</label>
                <input
                  type="number"
                  value={bankForm.balance}
                  onChange={(e) => setBankForm({ ...bankForm, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => setShowNewBankModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleCreateBank} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Cheque */}
      {showNewCheckModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Nuevo Cheque</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={checkForm.type}
                  onChange={(e) => setCheckForm({ ...checkForm, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="received">Recibido</option>
                  <option value="issued">Emitido</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                  <input
                    type="text"
                    value={checkForm.checkNumber}
                    onChange={(e) => setCheckForm({ ...checkForm, checkNumber: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                  <input
                    type="text"
                    value={checkForm.bankName}
                    onChange={(e) => setCheckForm({ ...checkForm, bankName: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input
                  type="number"
                  value={checkForm.amount}
                  onChange={(e) => setCheckForm({ ...checkForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={checkForm.issueDate}
                    onChange={(e) => setCheckForm({ ...checkForm, issueDate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                  <input
                    type="date"
                    value={checkForm.dueDate}
                    onChange={(e) => setCheckForm({ ...checkForm, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {checkForm.type === 'received' ? 'Librador (quien emite)' : 'Beneficiario'}
                </label>
                <input
                  type="text"
                  value={checkForm.type === 'received' ? checkForm.drawer : checkForm.payee}
                  onChange={(e) => setCheckForm({ 
                    ...checkForm, 
                    ...(checkForm.type === 'received' ? { drawer: e.target.value } : { payee: e.target.value })
                  })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => setShowNewCheckModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleCreateCheck} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Movimiento */}
      {showMovementModal && selectedBank && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Nuevo Movimiento</h2>
              <p className="text-gray-500">{selectedBank.bankName} - {selectedBank.accountNumber}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={movementForm.type}
                  onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="deposit">Depósito</option>
                  <option value="withdrawal">Extracción</option>
                  <option value="transfer_in">Transferencia Entrada</option>
                  <option value="transfer_out">Transferencia Salida</option>
                  <option value="fee">Comisión/Gasto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input
                  type="text"
                  value={movementForm.concept}
                  onChange={(e) => setMovementForm({ ...movementForm, concept: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Ej: Depósito en efectivo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input
                  type="number"
                  value={movementForm.amount}
                  onChange={(e) => setMovementForm({ ...movementForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => setShowMovementModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleCreateMovement} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
