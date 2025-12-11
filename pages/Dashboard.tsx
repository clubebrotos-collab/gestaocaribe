
import React, { useMemo } from 'react';
import Card from '../components/Card';
import { Banknote, TrendingUp, TriangleAlert, CalendarDays, PieChart as PieChartIcon, Layers } from 'lucide-react';
import type { Operation, OperationStatus, Recebimento } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { differenceInDays, parseISO, isToday, isThisWeek, isPast } from 'date-fns';
import PieChart from '../components/PieChart';

interface DashboardProps {
    operations: Operation[];
    receipts: Recebimento[];
}

const Dashboard: React.FC<DashboardProps> = ({ operations, receipts }) => {

    // Main Stats calculation - Lógica Refinada Item a Item
    const stats = useMemo(() => {
        let totalReceivables = 0; // Total Geral a Receber (Principal + Juros) de Títulos Ativos
        let interestToReceive = 0; // Apenas a fatia de Juros a Receber
        let delinquencyValue = 0; // Valor Total em Atraso (Principal + Juros)
        let activeCapital = 0; // Capital "Na Rua" (Principal Não Pago)

        // Filtra apenas operações que não foram totalmente quitadas
        const activeOperations = operations.filter(op => op.status === 'aberto' || op.status === 'atrasado');

        activeOperations.forEach(op => {
            // Soma os pagamentos específicos desta operação
            const opReceipts = receipts.filter(r => r.operationId === op.id);
            const paidPrincipal = opReceipts.reduce((sum, r) => sum + r.valor_principal_pago, 0);
            const paidInterest = opReceipts.reduce((sum, r) => sum + r.valor_juros_pago, 0);

            // Calcula os componentes originais
            const originalInterest = op.nominalValue - op.netValue;

            // Calcula o restante (Floor em 0 para evitar negativos se houver superpagamento ou ajustes manuais)
            const remainingPrincipal = Math.max(0, op.netValue - paidPrincipal);
            const remainingInterest = Math.max(0, originalInterest - paidInterest);
            
            const currentDebt = remainingPrincipal + remainingInterest;

            // Se a operação está ATRASADA, soma na Inadimplência
            // Se foi feito pagamento "Apenas Juros" (Prorrogação), o App.tsx muda o status para 'aberto', 
            // logo ele NÃO entrará neste if, satisfazendo a regra de negócio.
            if (op.status === 'atrasado') {
                delinquencyValue += currentDebt;
            }

            // Acumula nos totais gerais da carteira ativa
            totalReceivables += currentDebt;
            activeCapital += remainingPrincipal;
            interestToReceive += remainingInterest;
        });

        return { 
            activeCapital, // Substitui o antigo "Total Capital" estático
            totalReceivables, 
            interestToReceive, 
            delinquencyValue 
        };
    }, [operations, receipts]);

    const parcelamentoStats = useMemo(() => {
        const parcOps = operations.filter(op => op.type === 'parcelamento');
        const active = parcOps.filter(op => op.status === 'aberto' || op.status === 'atrasado');
        const totalActiveValue = active.reduce((sum, op) => sum + op.nominalValue, 0);
        const countActive = active.length;
        return { totalActiveValue, countActive, totalCount: parcOps.length };
    }, [operations]);

    const dueReminders = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return operations
            .filter(op => op.status === 'aberto' || op.status === 'atrasado')
            .map(op => ({ ...op, dueDateObj: parseISO(op.dueDate) }))
            .sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime())
            .map(op => {
                let category: 'today' | 'week' | 'overdue' | 'upcoming';
                const daysDiff = differenceInDays(op.dueDateObj, today);

                if (isPast(op.dueDateObj) && !isToday(op.dueDateObj)) {
                    category = 'overdue';
                } else if (isToday(op.dueDateObj)) {
                    category = 'today';
                } else if (isThisWeek(op.dueDateObj, { weekStartsOn: 1 }) && daysDiff > 0) {
                    category = 'week';
                } else {
                    category = 'upcoming';
                }
                return { ...op, category, daysDiff };
            })
            .slice(0, 5); 
    }, [operations]);

    const operationStatusData = useMemo(() => {
        const counts = operations.reduce((acc, op) => {
            acc[op.status] = (acc[op.status] || 0) + 1;
            return acc;
        }, {} as Record<OperationStatus, number>);

        return [
            { label: 'Aberto', value: counts.aberto || 0, color: '#38bdf8' },
            { label: 'Pago', value: counts.pago || 0, color: '#34d399' },
            { label: 'Atrasado', value: counts.atrasado || 0, color: '#f87171' },
        ];
    }, [operations]);

    const getStatusChip = (status: 'today' | 'week' | 'overdue' | 'upcoming', days: number) => {
        if (status === 'overdue') {
            return <span className="text-xs font-bold text-red-400 bg-red-900/50 px-2 py-1 rounded-full">Atrasado {Math.abs(days)}d</span>;
        }
        if (status === 'today') {
            return <span className="text-xs font-bold text-amber-400 bg-amber-900/50 px-2 py-1 rounded-full">Vence Hoje</span>;
        }
        if (status === 'week') {
            return <span className="text-xs font-bold text-sky-400 bg-sky-900/50 px-2 py-1 rounded-full">Vence em {days}d</span>;
        }
        return <span className="text-xs font-bold text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full">Vence em {days}d</span>;
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Painel de Controle</h1>
                <p className="text-slate-400 mt-1">Resumo financeiro e operacional do seu negócio.</p>
            </header>

            <div key={operations.length} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-flash-bg">
                <Card padding="p-4">
                    <div className="flex items-center">
                        <div className="p-3 bg-brand-600/20 rounded-lg">
                           <Banknote className="w-6 h-6 text-brand-400" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400">Capital Ativo (Na Rua)</p>
                            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.activeCapital)}</p>
                        </div>
                    </div>
                </Card>
                <Card padding="p-4">
                    <div className="flex items-center">
                        <div className="p-3 bg-cyan-600/20 rounded-lg">
                           <CalendarDays className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400">Total a Receber</p>
                            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.totalReceivables)}</p>
                        </div>
                    </div>
                </Card>
                 <Card padding="p-4">
                    <div className="flex items-center">
                        <div className="p-3 bg-emerald-600/20 rounded-lg">
                           <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400">Juros a Receber</p>
                            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.interestToReceive)}</p>
                        </div>
                    </div>
                </Card>
                 <Card padding="p-4">
                    <div className="flex items-center">
                        <div className="p-3 bg-red-600/20 rounded-lg">
                           <TriangleAlert className="w-6 h-6 text-red-400" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400">Inadimplência</p>
                            <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.delinquencyValue)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Seção Específica para Parcelamentos */}
            {parcelamentoStats.totalCount > 0 && (
                <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-900/30 rounded-lg">
                             <Layers className="w-5 h-5 text-purple-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-100">Controle de Parcelamentos</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="bg-slate-900/50 p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-sm text-slate-400">Saldo de Parcelas a Receber</p>
                                <p className="text-xl font-bold text-slate-100">{formatCurrency(parcelamentoStats.totalActiveValue)}</p>
                            </div>
                            <Layers className="w-8 h-8 text-slate-700" />
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-sm text-slate-400">Parcelas em Aberto</p>
                                <p className="text-xl font-bold text-purple-400">{parcelamentoStats.countActive} <span className="text-sm text-slate-500 font-normal">/ {parcelamentoStats.totalCount}</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Status da Carteira" icon={<PieChartIcon className="text-brand-400" />}>
                    <div className="flex justify-center items-center h-full p-4">
                        <PieChart data={operationStatusData} />
                    </div>
                </Card>

                <Card title="Lembretes de Vencimento" icon={<CalendarDays className="text-brand-400" />}>
                    {dueReminders.length > 0 ? (
                        <ul className="space-y-3">
                            {dueReminders.map(op => (
                                <li key={op.id} className="bg-slate-900/50 p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-white">{op.clientName}</p>
                                            {op.type === 'parcelamento' && <span className="text-[10px] bg-purple-900/50 text-purple-300 px-1.5 rounded">Parc.</span>}
                                        </div>
                                        <p className="text-sm text-slate-400 font-mono capitalize">{op.type} - {op.titleNumber} ({formatDate(op.dueDate)})</p>
                                    </div>
                                    <div className="mt-2 sm:mt-0 flex items-center gap-4">
                                        <span className="font-mono text-slate-300">{formatCurrency(op.nominalValue)}</span>
                                        {getStatusChip(op.category, op.daysDiff)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-400 text-center py-4">Nenhum vencimento próximo.</p>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
