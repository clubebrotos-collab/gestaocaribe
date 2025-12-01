
import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { CreditCard, Trash2, Calendar, Banknote } from 'lucide-react';
import type { Recebimento, NewRecebimento, Operation, FormaPagamento } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import { useNotification } from '../components/Notification';
import EmptyState from '../components/EmptyState';

interface ReceiptsPageProps {
  receipts: Recebimento[];
  operations: Operation[];
  onAddReceipt: (receipt: NewRecebimento) => void;
  onDeleteReceipt: (receiptId: number) => void;
}

const ReceiptForm: React.FC<{
    operations: Operation[];
    receipts: Recebimento[];
    onSubmit: (data: NewRecebimento) => void;
    onCancel: () => void;
}> = ({ operations, receipts, onSubmit, onCancel }) => {
    const [operationId, setOperationId] = useState<string>('');
    const [totalRecebido, setTotalRecebido] = useState<number>(0);
    const [principalPago, setPrincipalPago] = useState<number>(0);
    const [jurosPago, setJurosPago] = useState<number>(0);
    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
    const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);
    const [summaryKey, setSummaryKey] = useState(0);
    const [isInterestOnly, setIsInterestOnly] = useState(false);
    const { addNotification } = useNotification();
    
    const selectedOperation = operations.find(op => op.id === parseInt(operationId));

    const outstandingBalance = useMemo(() => {
        if (!selectedOperation) return { total: 0, principal: 0, juros: 0 };

        const previousReceipts = receipts.filter(r => r.operationId === selectedOperation.id);
        const principalAlreadyPaid = previousReceipts.reduce((sum, r) => sum + r.valor_principal_pago, 0);
        const jurosAlreadyPaid = previousReceipts.reduce((sum, r) => sum + r.valor_juros_pago, 0);

        const totalInterest = selectedOperation.nominalValue - selectedOperation.netValue;

        const outstandingPrincipal = selectedOperation.netValue - principalAlreadyPaid;
        const outstandingJuros = totalInterest - jurosAlreadyPaid;
        const outstandingTotal = outstandingPrincipal + outstandingJuros;

        return { total: outstandingTotal, principal: outstandingPrincipal, juros: outstandingJuros };
    }, [selectedOperation, receipts]);
    
    React.useEffect(() => {
        if (selectedOperation) {
            setSummaryKey(k => k + 1);
            // Set default values to the full outstanding amount
            const total = parseFloat(outstandingBalance.total.toFixed(2));
            setTotalRecebido(total);
            setPrincipalPago(parseFloat(outstandingBalance.principal.toFixed(2)));
            setJurosPago(parseFloat(outstandingBalance.juros.toFixed(2)));
            setIsInterestOnly(false); // Reset check on op change
        } else {
            // Reset form when no operation is selected
            setTotalRecebido(0);
            setPrincipalPago(0);
            setJurosPago(0);
        }
    }, [selectedOperation, outstandingBalance]);
    
    // Watch for checkbox change
    React.useEffect(() => {
        if (isInterestOnly) {
            setPrincipalPago(0);
            setJurosPago(totalRecebido);
        } else if (selectedOperation) {
             // Recalculate default split if unchecked
             // Logic mirrors handleTotalChange
            if (outstandingBalance.total > 0) {
                const cappedValue = Math.min(totalRecebido, outstandingBalance.total);
                const jurosRatio = outstandingBalance.juros / outstandingBalance.total;
                const allocatedJuros = parseFloat((cappedValue * jurosRatio).toFixed(2));
                const allocatedPrincipal = parseFloat((cappedValue - allocatedJuros).toFixed(2));
                setJurosPago(allocatedJuros);
                setPrincipalPago(allocatedPrincipal);
            }
        }
    }, [isInterestOnly, totalRecebido, outstandingBalance, selectedOperation]);

    const handleTotalChange = (value: number) => {
        // If Interest Only is checked, we don't cap against total balance necessarily, 
        // as users might pay extra interest (fees). 
        // But for consistency let's stick to the flow, maybe capping is still good UI but 
        // usually interest only means paying the 'cost' without reducing principal.
        
        // For standard flow:
        const cappedValue = isInterestOnly ? value : Math.min(value, outstandingBalance.total);
        setTotalRecebido(cappedValue);

        if (isInterestOnly) {
            setPrincipalPago(0);
            setJurosPago(cappedValue);
        } else {
            if (outstandingBalance.total > 0) {
                const jurosRatio = outstandingBalance.juros / outstandingBalance.total;
                const allocatedJuros = parseFloat((cappedValue * jurosRatio).toFixed(2));
                // The rest is principal to avoid rounding errors
                const allocatedPrincipal = parseFloat((cappedValue - allocatedJuros).toFixed(2));
                setJurosPago(allocatedJuros);
                setPrincipalPago(allocatedPrincipal);
            } else {
                setJurosPago(0);
                setPrincipalPago(0);
            }
        }
    };
    
    const handlePrincipalChange = (value: number) => {
        if (isInterestOnly) return; // Locked
        const cappedValue = Math.min(value, outstandingBalance.principal);
        setPrincipalPago(cappedValue);
        setTotalRecebido(parseFloat((cappedValue + jurosPago).toFixed(2)));
    }

    const handleJurosChange = (value: number) => {
        // We allow editing Juros manually. 
        // If InterestOnly is checked, Juros = Total, so changing Juros changes Total.
        if (isInterestOnly) {
            setJurosPago(value);
            setTotalRecebido(value);
        } else {
            const cappedValue = Math.min(value, outstandingBalance.juros);
            setJurosPago(cappedValue);
            setTotalRecebido(parseFloat((principalPago + cappedValue).toFixed(2)));
        }
    }


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!operationId) {
            addNotification('Por favor, selecione uma operação.', 'error');
            return;
        }
        if (totalRecebido <= 0) {
            addNotification('O valor recebido deve ser maior que zero.', 'error');
            return;
        }
        onSubmit({
            operationId: parseInt(operationId),
            data_recebimento: dataRecebimento,
            valor_total_recebido: totalRecebido,
            valor_principal_pago: principalPago,
            valor_juros_pago: jurosPago,
            forma_pagamento: formaPagamento
        });
    };

    const availableOperations = operations.filter(op => op.status !== 'pago');

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Operação</label>
                    <select value={operationId} onChange={(e) => setOperationId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" required>
                        <option value="" disabled>Selecione a operação para dar baixa</option>
                        {availableOperations.map(op => <option key={op.id} value={op.id}>{op.titleNumber} - {op.clientName} ({formatCurrency(op.nominalValue)})</option>)}
                    </select>
                </div>
                
                {selectedOperation && (
                    <div key={summaryKey} className="md:col-span-2 bg-slate-900/50 p-3 rounded-lg text-sm animate-flash-bg">
                        <h4 className="font-semibold text-slate-200 mb-2">Resumo da Operação</h4>
                        <div className="flex justify-around text-center">
                            <div>
                                <p className="text-xs text-slate-400">Valor em Aberto</p>
                                <p className="font-bold text-brand-400">{formatCurrency(outstandingBalance.total)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Principal Restante</p>
                                <p className="font-mono text-slate-300">{formatCurrency(outstandingBalance.principal)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Juros Restante</p>
                                <p className="font-mono text-slate-300">{formatCurrency(outstandingBalance.juros)}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Valor Total Recebido (R$)</label>
                    <input type="number" step="0.01" value={totalRecebido} onChange={e => handleTotalChange(parseFloat(e.target.value) || 0)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Forma de Pagamento</label>
                    <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value as FormaPagamento)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100">
                        <option value="pix">PIX</option>
                        <option value="boleto">Boleto</option>
                        <option value="transferencia">Transferência</option>
                    </select>
                </div>
                
                {/* Interest Only Checkbox */}
                 <div className="md:col-span-2 flex items-center gap-2 bg-slate-800/50 p-3 rounded-md border border-slate-700/50">
                    <input 
                        type="checkbox" 
                        id="interestOnly" 
                        checked={isInterestOnly} 
                        onChange={(e) => setIsInterestOnly(e.target.checked)}
                        className="w-4 h-4 text-brand-600 bg-slate-700 border-slate-600 rounded focus:ring-brand-500 focus:ring-2"
                    />
                    <label htmlFor="interestOnly" className="text-sm font-medium text-slate-200 cursor-pointer select-none">
                        Amortizar apenas Juros (Não abater do Principal)
                    </label>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg md:col-span-2">
                    <h4 className="font-semibold text-slate-200 mb-2">Alocação de Valores (Ajuste se necessário)</h4>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Principal Pago (R$)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={principalPago} 
                                onChange={e => handlePrincipalChange(parseFloat(e.target.value) || 0)} 
                                disabled={isInterestOnly}
                                className={`w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 ${isInterestOnly ? 'opacity-50 cursor-not-allowed' : ''}`} 
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Juros Pagos (R$)</label>
                            <input type="number" step="0.01" value={jurosPago} onChange={e => handleJurosChange(parseFloat(e.target.value) || 0)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" />
                        </div>
                    </div>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Data de Recebimento</label>
                    <input type="date" value={dataRecebimento} onChange={e => setDataRecebimento(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" />
                </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="bg-slate-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-slate-700 w-full sm:w-auto">Cancelar</button>
                <button type="submit" className="bg-brand-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-700 w-full sm:w-auto">Registrar Recebimento</button>
            </div>
        </form>
    )
}


const ReceiptsPage: React.FC<ReceiptsPageProps> = ({ receipts, operations, onAddReceipt, onDeleteReceipt }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [receiptToDelete, setReceiptToDelete] = useState<number | null>(null);
    const { addNotification } = useNotification();

    const handleFormSubmit = (data: NewRecebimento) => {
        onAddReceipt(data);
        addNotification('Recebimento registrado com sucesso!', 'success');
        setIsFormModalOpen(false);
    };

    const openConfirmDeleteModal = (receiptId: number) => {
        setReceiptToDelete(receiptId);
        setIsConfirmModalOpen(true);
    };

    const handleDelete = () => {
        if (receiptToDelete) {
            onDeleteReceipt(receiptToDelete);
            addNotification('Recebimento excluído com sucesso.', 'success');
        }
        setIsConfirmModalOpen(false);
        setReceiptToDelete(null);
    };

    const getOperationInfo = (operationId: number) => {
        return operations.find(op => op.id === operationId);
    }

    return (
        <div className="space-y-6 sm:space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">Recebimentos</h1>
                    <p className="text-slate-400 mt-1">Registre e consulte os pagamentos recebidos.</p>
                </div>
                <button onClick={() => setIsFormModalOpen(true)} className="flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-5 py-2 rounded-md hover:bg-brand-700 transition w-full sm:w-auto">
                    <CreditCard className="w-5 h-5" />
                    <span>Novo Recebimento</span>
                </button>
            </header>

            <Card padding="p-4 sm:p-6">
                 {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-700 text-sm text-slate-400">
                            <tr>
                                <th className="p-4">Operação / Cliente</th>
                                <th className="p-4">Data Recebimento</th>
                                <th className="p-4 text-right">Principal Pago</th>
                                <th className="p-4 text-right">Juros Pago</th>
                                <th className="p-4 text-right">Total Recebido</th>
                                <th className="p-4">Forma Pagto.</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipts.length > 0 ? receipts.map(receipt => {
                                const opInfo = getOperationInfo(receipt.operationId);
                                return (
                                    <tr key={receipt.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-semibold text-slate-100">{opInfo?.titleNumber}</div>
                                            <div className="text-xs text-slate-400">{opInfo?.clientName}</div>
                                        </td>
                                        <td className="p-4">{formatDate(receipt.data_recebimento)}</td>
                                        <td className="p-4 text-right font-mono">{formatCurrency(receipt.valor_principal_pago)}</td>
                                        <td className="p-4 text-right font-mono">{formatCurrency(receipt.valor_juros_pago)}</td>
                                        <td className="p-4 text-right font-mono text-emerald-400">{formatCurrency(receipt.valor_total_recebido)}</td>
                                        <td className="p-4 capitalize">{receipt.forma_pagamento}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => openConfirmDeleteModal(receipt.id)} className="p-2 text-slate-400 hover:text-red-400 transition-all duration-200 hover:scale-110" aria-label="Excluir Recebimento">
                                                <Trash2 className="w-5 h-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={7}>
                                      <EmptyState 
                                        icon={<CreditCard className="w-8 h-8" />}
                                        title="Nenhum recebimento registrado"
                                        description="Você ainda não registrou nenhum pagamento."
                                        actionText="Registrar Novo Recebimento"
                                        onActionClick={() => setIsFormModalOpen(true)}
                                      />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden space-y-4">
                    {receipts.length > 0 ? receipts.map(receipt => {
                        const opInfo = getOperationInfo(receipt.operationId);
                        return (
                            <div key={receipt.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-slate-100">{opInfo?.clientName}</h3>
                                        <p className="text-sm text-slate-400 font-mono">Op. {opInfo?.titleNumber}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-slate-500">{formatDate(receipt.data_recebimento)}</span>
                                        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-300 capitalize mt-1">{receipt.forma_pagamento}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-900/30 p-3 rounded-md grid grid-cols-2 gap-3 text-sm">
                                     <div>
                                        <p className="text-xs text-slate-500">Total Recebido</p>
                                        <p className="font-mono text-emerald-400 font-bold">{formatCurrency(receipt.valor_total_recebido)}</p>
                                    </div>
                                    <div className="text-right">
                                        <button onClick={() => openConfirmDeleteModal(receipt.id)} className="p-2 bg-slate-800 rounded text-red-400 hover:text-red-300">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="col-span-2 flex justify-between text-xs border-t border-slate-800 pt-2 mt-1">
                                        <span>Principal: {formatCurrency(receipt.valor_principal_pago)}</span>
                                        <span>Juros: {formatCurrency(receipt.valor_juros_pago)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    }) : (
                        <EmptyState 
                            icon={<CreditCard className="w-8 h-8" />}
                            title="Nenhum recebimento"
                            description="Nenhum pagamento registrado."
                            actionText="Novo Recebimento"
                            onActionClick={() => setIsFormModalOpen(true)}
                        />
                    )}
                </div>
            </Card>

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleDelete}
                title="Confirmar Exclusão"
                message="Tem certeza que deseja excluir este recebimento? Esta ação pode alterar o status da operação associada."
            />

            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title="Registrar Novo Recebimento">
                <ReceiptForm 
                    operations={operations} 
                    receipts={receipts}
                    onSubmit={handleFormSubmit} 
                    onCancel={() => setIsFormModalOpen(false)} 
                />
            </Modal>
        </div>
    );
};

export default ReceiptsPage;
