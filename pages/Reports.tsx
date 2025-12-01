import React, { useMemo, useState } from 'react';
import Card from '../components/Card';
import { FileText, Download, TrendingUp, Users, TriangleAlert, BarChart, Calendar, PieChart as PieChartIcon, Info, Clock, Wallet } from 'lucide-react';
import type { Operation, Client, Recebimento, FormaPagamento } from '../types';
import { formatCurrency } from '../lib/utils';
import { differenceInDays, parseISO, isWithinInterval, startOfToday, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import PieChart from '../components/PieChart';

const BarChartVisualizer: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    if (data.every(d => d.value === 0)) {
        return <p className="text-slate-500 text-center py-10">Nenhum dado para exibir.</p>;
    }
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="w-full h-48 bg-slate-900/50 rounded-lg flex items-end justify-around p-4 gap-4">
            {data.map((item, index) => (
                <div key={index} className="w-full h-full flex flex-col items-center justify-end group">
                    <div 
                        className="w-full bg-brand-600 hover:bg-brand-500 rounded-t-sm transition-all duration-300" 
                        style={{ height: `${(item.value / maxValue) * 100}%` }}
                    >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-900 text-white text-xs rounded-md p-1 -mt-8 -ml-2 absolute">
                            {formatCurrency(item.value)}
                        </div>
                    </div>
                    <span className="text-xs text-slate-400 mt-1 text-center">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

interface ReportsPageProps {
    operations: Operation[];
    clients: Client[];
    receipts: Recebimento[];
}

const DateRangePreset: React.FC<{ label: string; onClick: () => void; isActive: boolean }> = ({ label, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-sm rounded-md transition-colors ${
      isActive
        ? 'bg-brand-600 text-white font-semibold'
        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
    }`}
  >
    {label}
  </button>
);


const ReportsPage: React.FC<ReportsPageProps> = ({ operations, clients, receipts }) => {
    
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [activePreset, setActivePreset] = useState<string>('Últimos 30 dias');
    
    const setDateRange = (start: Date, end: Date, presetLabel: string) => {
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
        setActivePreset(presetLabel);
    };
    
    const handleExport = (reportName: string) => {
        alert(`Simulando exportação do relatório "${reportName}" para PDF/Excel...`);
    };
    
    const { 
        filteredOperations, 
        filteredReceipts 
    } = useMemo(() => {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        end.setHours(23, 59, 59, 999); 

        const fOps = operations.filter(op => isWithinInterval(parseISO(op.issueDate), { start, end }));
        const fReceipts = receipts.filter(r => isWithinInterval(parseISO(r.data_recebimento), { start, end }));
        
        return { filteredOperations: fOps, filteredReceipts: fReceipts };
    }, [operations, receipts, startDate, endDate]);


    const financialSummary = useMemo(() => {
        const capitalAplicado = filteredOperations.reduce((sum, op) => sum + op.netValue, 0);
        const valorAReceber = filteredOperations.reduce((sum, op) => sum + op.nominalValue, 0);
        const totalRecebido = filteredReceipts.reduce((sum, r) => sum + r.valor_total_recebido, 0);
        const jurosRealizados = totalRecebido - filteredReceipts.reduce((sum, r) => sum + r.valor_principal_pago, 0);
        const taxaRetorno = capitalAplicado > 0 ? (jurosRealizados / capitalAplicado) * 100 : 0;

        return { capitalAplicado, valorAReceber, totalRecebido, jurosRealizados, taxaRetorno };
    }, [filteredOperations, filteredReceipts]);

    const cashflowProjection = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const openOps = operations.filter(op => op.status === 'aberto' || op.status === 'atrasado');

        return openOps.reduce((acc, op) => {
            const dueDate = parseISO(op.dueDate);
            const daysDiff = differenceInDays(dueDate, today);

            if (daysDiff <= 7 && daysDiff >= 0) acc['7d'] += op.nominalValue;
            else if (daysDiff <= 30) acc['8-30d'] += op.nominalValue;
            else acc['>30d'] += op.nominalValue;
            
            return acc;

        }, { '7d': 0, '8-30d': 0, '>30d': 0 });

    }, [operations]);
    
    const projectionData = [
        { label: 'Próx. 7d', value: cashflowProjection['7d'] },
        { label: '8-30d', value: cashflowProjection['8-30d'] },
        { label: '> 30d', value: cashflowProjection['>30d'] },
    ];

    type ClientRankingData = {name: string, totalValue: number, opCount: number};
    const clientRanking: ClientRankingData[] = useMemo(() => {
        const clientData = filteredOperations.reduce((acc, op) => {
            const client = acc[op.clientId] || { name: op.clientName, totalValue: 0, opCount: 0 };
            client.totalValue += op.nominalValue;
            client.opCount += 1;
            acc[op.clientId] = client;
            return acc;
        }, {} as Record<number, ClientRankingData>);

        return (Object.values(clientData) as ClientRankingData[]).sort((a,b) => b.totalValue - a.totalValue).slice(0, 5);
    }, [filteredOperations]);

    const delinquencyData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueOps = operations.filter(op => op.status === 'atrasado');
        const totalOverdue = overdueOps.reduce((sum, op) => sum + op.nominalValue, 0);
        const uniqueClients = new Set(overdueOps.map(op => op.clientId)).size;
        const totalDaysOverdue = overdueOps.reduce((sum, op) => {
             const dueDate = parseISO(op.dueDate);
             const days = differenceInDays(today, dueDate);
             return sum + (days > 0 ? days : 0);
        }, 0);
        const avgDaysOverdue = overdueOps.length > 0 ? totalDaysOverdue / overdueOps.length : 0;

        return { totalOverdue, uniqueClients, avgDaysOverdue, ops: overdueOps };
    }, [operations]);
    
    const performanceByType = useMemo(() => {
        const byType = filteredOperations.reduce((acc, op) => {
            const current = acc[op.type] || { value: 0, count: 0 };
            current.value += op.nominalValue;
            current.count += 1;
            acc[op.type] = current;
            return acc;
        }, {} as Record<'duplicata' | 'cheque', { value: number; count: number }>);

        return [
            { label: `Duplicata (${byType.duplicata?.count || 0})`, value: byType.duplicata?.value || 0, color: '#38bdf8' },
            { label: `Cheque (${byType.cheque?.count || 0})`, value: byType.cheque?.value || 0, color: '#34d399' },
        ];
    }, [filteredOperations]);
    
    const receiptsAnalysis = useMemo(() => {
        if(filteredReceipts.length === 0) {
            return { totalRecebido: 0, avgPaymentTime: 0, paymentMethods: [] };
        }
        
        const totalRecebido = filteredReceipts.reduce((sum, r) => sum + r.valor_total_recebido, 0);

        const paymentTimes: number[] = [];
        filteredReceipts.forEach(r => {
            const operation = operations.find(op => op.id === r.operationId);
            if (operation) {
                const days = differenceInDays(parseISO(r.data_recebimento), parseISO(operation.issueDate));
                if (days >= 0) paymentTimes.push(days);
            }
        });
        const avgPaymentTime = paymentTimes.length > 0 ? paymentTimes.reduce((a, b) => a + b, 0) / paymentTimes.length : 0;

        const paymentMethodsData = filteredReceipts.reduce((acc, r) => {
            acc[r.forma_pagamento] = (acc[r.forma_pagamento] || 0) + 1;
            return acc;
        }, {} as Record<FormaPagamento, number>);
        
        const paymentMethods = Object.entries(paymentMethodsData).map(([key, value]) => ({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value
        }));

        return { totalRecebido, avgPaymentTime, paymentMethods };
    }, [filteredReceipts, operations]);


    const maxRankedValue = clientRanking.length > 0 ? clientRanking[0].totalValue : 1;
    const maxPaymentMethodValue = receiptsAnalysis.paymentMethods.length > 0 ? Math.max(...receiptsAnalysis.paymentMethods.map(p => p.value)) : 1;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Relatórios</h1>
                <p className="text-slate-400 mt-1">Análise financeira e operacional do seu negócio.</p>
            </header>

            <Card>
                <div className="p-6 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-brand-400" />
                        <h3 className="font-semibold text-slate-100 text-lg">Selecione o Período de Análise</h3>
                    </div>
                    
                    <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => { setStartDate(e.target.value); setActivePreset(''); }} 
                            className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-slate-100" 
                        />
                        <span className="text-slate-400">até</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => { setEndDate(e.target.value); setActivePreset(''); }} 
                            className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-slate-100" 
                        />
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-2 pt-2">
                        <DateRangePreset label="Últimos 7 dias" onClick={() => setDateRange(subDays(today, 7), today, "Últimos 7 dias")} isActive={activePreset === "Últimos 7 dias"} />
                        <DateRangePreset label="Últimos 30 dias" onClick={() => setDateRange(subDays(today, 30), today, "Últimos 30 dias")} isActive={activePreset === "Últimos 30 dias"} />
                        <DateRangePreset label="Este Mês" onClick={() => setDateRange(startOfMonth(today), endOfMonth(today), "Este Mês")} isActive={activePreset === "Este Mês"} />
                        <DateRangePreset label="Mês Passado" onClick={() => setDateRange(startOfMonth(subMonths(today, 1)), endOfMonth(subMonths(today, 1)), "Mês Passado")} isActive={activePreset === "Mês Passado"} />
                    </div>
                </div>
            </Card>

            <Card title="Resumo Financeiro do Período" icon={<PieChartIcon className="text-brand-400"/>}>
                <div className="flex flex-col md:flex-row justify-around items-stretch gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-slate-700">
                    <div className="flex-1 px-4 pt-4 md:pt-0">
                        <p className="text-sm text-slate-400">Capital Aplicado</p>
                        <p className="text-2xl font-bold text-slate-100">{formatCurrency(financialSummary.capitalAplicado)}</p>
                    </div>
                     <div className="flex-1 px-4 pt-4 md:pt-0">
                        <p className="text-sm text-slate-400">Valor a Receber</p>
                        <p className="text-2xl font-bold text-slate-100">{formatCurrency(financialSummary.valorAReceber)}</p>
                    </div>
                    <div className="flex-1 px-4 pt-4 md:pt-0">
                        <p className="text-sm text-slate-400">Total Recebido</p>
                        <p className="text-2xl font-bold text-cyan-400">{formatCurrency(financialSummary.totalRecebido)}</p>
                    </div>
                     <div className="flex-1 px-4 pt-4 md:pt-0">
                        <p className="text-sm text-slate-400">Juros Realizados</p>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(financialSummary.jurosRealizados)}</p>
                    </div>
                     <div className="flex-1 px-4 pt-4 md:pt-0">
                        <p className="text-sm text-slate-400">Retorno Médio</p>
                        <p className="text-2xl font-bold text-emerald-400">{financialSummary.taxaRetorno.toFixed(2)}%</p>
                    </div>
                </div>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Projeção de Fluxo de Caixa" icon={<BarChart className="text-brand-400"/>}>
                    <div className="flex items-start justify-between text-sm mb-4">
                        <p className="text-slate-400 max-w-xs">Valores a receber de <strong className="text-slate-300">todas</strong> as operações em aberto.</p>
                        <div className="relative group">
                            <Info className="w-4 h-4 text-slate-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                Este gráfico não é afetado pelo filtro de período.
                            </div>
                        </div>
                    </div>
                    <BarChartVisualizer data={projectionData} />
                </Card>
                
                <Card title="Análise de Recebimentos" icon={<Wallet className="text-brand-400"/>}>
                    <div className="space-y-4">
                         <div className="flex justify-around text-center">
                            <div>
                                <p className="text-sm text-slate-400 flex items-center gap-1 justify-center"><Clock className="w-4 h-4"/> Tempo Médio Pagto.</p>
                                <p className="text-2xl font-bold text-slate-100">{receiptsAnalysis.avgPaymentTime.toFixed(0)} <span className="text-base font-normal">dias</span></p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-300 mb-2 text-center">Formas de Pagamento (por qtde.)</p>
                            <div className="space-y-2">
                               {receiptsAnalysis.paymentMethods.length > 0 ? receiptsAnalysis.paymentMethods.map(item => (
                                   <div key={item.label} className="flex items-center gap-2 text-xs">
                                       <span className="w-20 text-slate-400">{item.label}</span>
                                       <div className="flex-grow bg-slate-700 rounded-full h-4">
                                           <div className="bg-cyan-600 h-4 rounded-full flex items-center justify-end px-2" style={{width: `${(item.value / maxPaymentMethodValue) * 100}%`}}>
                                                <span className="font-bold text-white">{item.value}</span>
                                           </div>
                                       </div>
                                   </div>
                               )) : <p className="text-center text-sm py-4 text-slate-500">Nenhum recebimento no período.</p>}
                            </div>
                        </div>
                    </div>
                </Card>
                
                <Card title="Desempenho por Tipo de Título" icon={<FileText className="text-brand-400"/>}>
                    <div className="flex justify-center items-center h-full">
                        {/* FIX: Use the custom PieChart component instead of the lucide-react icon. */}
                        <PieChart data={performanceByType} />
                    </div>
                </Card>
            </div>
            
            <Card title="Clientes em Destaque no Período" icon={<Users className="text-brand-400"/>}>
                    <div className="space-y-3">
                        {clientRanking.length > 0 ? clientRanking.map((client, index) => (
                            <div key={client.name} className="flex items-center gap-4 text-sm">
                                <span className="font-bold text-slate-400">#{index+1}</span>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-semibold text-slate-200">{client.name}</span>
                                        <span className="text-xs text-slate-500">{client.opCount} {client.opCount > 1 ? 'operações' : 'operação'}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                                        <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${(client.totalValue / maxRankedValue) * 100}%`}}></div>
                                    </div>
                                </div>
                                <span className="font-mono text-slate-300 w-32 text-right">{formatCurrency(client.totalValue)}</span>
                            </div>
                        )) : (
                            <p className="text-center py-6 text-slate-500">Nenhuma operação no período selecionado.</p>
                        )}
                    </div>
                </Card>


            <Card 
                title="Relatório de Inadimplência" 
                icon={<TriangleAlert className="text-red-400" />}
                footer={
                    <div className="flex justify-end">
                         <button onClick={() => handleExport('Inadimplência')} className="flex items-center gap-2 bg-slate-600 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-slate-700 transition">
                            <Download className="w-4 h-4"/>
                            Exportar
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center bg-slate-900/50 p-3 rounded-lg">
                         <div>
                            <p className="text-xs text-slate-400">Valor Total Atrasado</p>
                            <p className="text-lg font-bold text-red-400">{formatCurrency(delinquencyData.totalOverdue)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Clientes Inadimplentes</p>
                            <p className="text-lg font-bold text-red-400">{delinquencyData.uniqueClients}</p>
                        </div>
                         <div>
                            <p className="text-xs text-slate-400">Média de Dias em Atraso</p>
                            <p className="text-lg font-bold text-red-400">{delinquencyData.avgDaysOverdue.toFixed(0)}</p>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto pr-2">
                    {delinquencyData.ops.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="text-slate-400">
                                <tr>
                                    <th className="p-2 text-left">Cliente</th>
                                    <th className="p-2 text-left">Título</th>
                                    <th className="p-2 text-center">Dias Atraso</th>
                                    <th className="p-2 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {delinquencyData.ops.map(op => (
                                    <tr key={op.id} className="border-t border-slate-800">
                                        <td className="p-2 font-semibold text-slate-200">{op.clientName}</td>
                                        <td className="p-2 font-mono">{op.titleNumber}</td>
                                        <td className="p-2 text-center font-bold text-red-400">{differenceInDays(today, parseISO(op.dueDate))}</td>
                                        <td className="p-2 text-right font-mono">{formatCurrency(op.nominalValue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                         <div className="text-center py-6">
                            <p className="text-slate-400">Nenhum título em atraso.</p>
                        </div>
                    )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ReportsPage;