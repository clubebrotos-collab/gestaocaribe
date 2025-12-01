import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import { Calculator, RefreshCw, TrendingUp, ChevronsRight } from 'lucide-react';
import type { Client, Operation } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

interface InterestCalculatorPageProps {
  clients: Client[];
  operations: Operation[];
}

const InterestCalculatorPage: React.FC<InterestCalculatorPageProps> = ({ clients, operations }) => {
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedOperationId, setSelectedOperationId] = useState('');
    
    const [capital, setCapital] = useState(10000);
    const [taxa, setTaxa] = useState(3);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    });

    const [isManualMode, setIsManualMode] = useState(true);
    const [resultKey, setResultKey] = useState(0);

    const availableOperations = useMemo(() => {
        if (!selectedClientId) return [];
        return operations.filter(op => op.clientId === parseInt(selectedClientId) && op.status !== 'pago');
    }, [selectedClientId, operations]);
    
    useEffect(() => {
        if (selectedOperationId) {
            const operation = operations.find(op => op.id === parseInt(selectedOperationId));
            if (operation) {
                setIsManualMode(false);
                setCapital(operation.netValue);
                setTaxa(operation.taxa);
                setStartDate(operation.issueDate);
                setEndDate(operation.dueDate);
            }
        } else {
             // When deselecting an operation, but a client is still selected
            if (selectedClientId) {
                const client = clients.find(c => c.id === parseInt(selectedClientId));
                if (client) {
                    setTaxa(client.taxa_juros_mensal || 0);
                }
            }
        }
    }, [selectedOperationId, operations, clients, selectedClientId]);

    useEffect(() => {
        setSelectedOperationId(''); // Reset operation when client changes
        if(selectedClientId) {
            const client = clients.find(c => c.id === parseInt(selectedClientId));
            if(client) setTaxa(client.taxa_juros_mensal);
        }
    }, [selectedClientId, clients]);


    const resultado = useMemo(() => {
        const C = capital;
        const taxaMensal = taxa / 100;
        const taxaDiaria = taxaMensal / 30; // Approximation for daily rate
        const dias = differenceInDays(parseISO(endDate), parseISO(startDate));

        if (C <= 0 || taxa < 0 || dias < 0) {
            return { dias: dias > 0 ? dias : 0, jurosSimples: 0, montanteSimples: C > 0 ? C : 0, jurosCompostos: 0, montanteComposto: C > 0 ? C : 0 };
        }
        
        // Juros Simples
        const jurosSimples = C * taxaDiaria * dias;
        const montanteSimples = C + jurosSimples;

        // Juros Compostos
        const montanteComposto = C * Math.pow((1 + taxaDiaria), dias);
        const jurosCompostos = montanteComposto - C;

        return { dias, jurosSimples, montanteSimples, jurosCompostos, montanteComposto };

    }, [capital, taxa, startDate, endDate]);

    useEffect(() => {
        setResultKey(k => k + 1);
    }, [resultado]);

    const handleReset = () => {
        setIsManualMode(true);
        setSelectedClientId('');
        setSelectedOperationId('');
        setCapital(10000);
        setTaxa(3);
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(nextMonth.toISOString().split('T')[0]);
    };
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Calculadora / Simulador</h1>
                <p className="text-slate-400 mt-1">Simule cenários ou analise os juros de operações existentes.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card 
                        title="Parâmetros de Cálculo" 
                        icon={<Calculator className="text-brand-400" />}
                        footer={
                            !isManualMode && (
                                <div className="flex justify-end">
                                    <button onClick={handleReset} className="flex items-center gap-2 bg-slate-600 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-slate-700 transition">
                                        <RefreshCw className="w-4 h-4"/>
                                        Limpar e Simular
                                    </button>
                                </div>
                            )
                        }
                    >
                         <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Cliente (Opcional)</label>
                                    <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} disabled={!isManualMode} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 disabled:bg-slate-800 disabled:text-slate-400">
                                        <option value="">Seleção Manual</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Operação (Opcional)</label>
                                    <select value={selectedOperationId} onChange={e => setSelectedOperationId(e.target.value)} disabled={!selectedClientId || !isManualMode} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 disabled:bg-slate-800 disabled:text-slate-400">
                                        <option value="">Nenhuma</option>
                                        {availableOperations.map(op => <option key={op.id} value={op.id}>{op.titleNumber} ({formatCurrency(op.nominalValue)})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-slate-700 my-4"></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Valor do Capital (R$)</label>
                                    <input type="number" value={capital} onChange={e => setCapital(parseFloat(e.target.value) || 0)} disabled={!isManualMode} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 disabled:bg-slate-800 disabled:text-slate-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Taxa de Juros (% ao mês)</label>
                                    <input type="number" value={taxa} onChange={e => setTaxa(parseFloat(e.target.value) || 0)} disabled={!isManualMode} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 disabled:bg-slate-800 disabled:text-slate-400" />
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Data Inicial</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={!isManualMode} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 disabled:bg-slate-800 disabled:text-slate-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Data Final</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!isManualMode} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 disabled:bg-slate-800 disabled:text-slate-400" />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card key={resultKey} title="Resultado da Simulação" className="sticky top-8 animate-flash-bg">
                        <div className="space-y-4">
                            <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                                <p className="text-sm text-slate-400">Resumo dos Parâmetros</p>
                                <div className="flex justify-around items-center mt-1 text-xs">
                                    <span>{formatCurrency(capital)}</span>
                                    <ChevronsRight className="w-4 h-4 text-slate-600"/>
                                    <span>{taxa.toFixed(2)}% a.m.</span>
                                    <ChevronsRight className="w-4 h-4 text-slate-600"/>
                                    <span className="font-bold">{resultado.dias} dias</span>
                                </div>
                            </div>

                           <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                    <h4 className="font-semibold text-slate-100 mb-2">Juros Simples</h4>
                                    <p className="text-xs text-slate-400">Valor dos Juros</p>
                                    <p className="text-lg font-bold text-amber-400 mb-2">{formatCurrency(resultado.jurosSimples)}</p>
                                    <p className="text-xs text-slate-400">Montante Final</p>
                                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(resultado.montanteSimples)}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                    <h4 className="font-semibold text-slate-100 mb-2">Juros Compostos</h4>
                                     <p className="text-xs text-slate-400">Valor dos Juros</p>
                                    <p className="text-lg font-bold text-amber-400 mb-2">{formatCurrency(resultado.jurosCompostos)}</p>
                                    <p className="text-xs text-slate-400">Montante Final</p>
                                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(resultado.montanteComposto)}</p>
                                </div>
                           </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default InterestCalculatorPage;