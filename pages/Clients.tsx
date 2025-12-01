
import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Users, UserPlus, Eye, Pencil, Trash2, Search, TrendingUp, CircleDollarSign, TriangleAlert, CreditCard, Phone, Mail, MapPin } from 'lucide-react';
import type { ClientWithOperationCount, NewClient, Client, Operation, Recebimento } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import { differenceInDays, parseISO, isToday, isPast } from 'date-fns';
import { useNotification } from '../components/Notification';
import EmptyState from '../components/EmptyState';

interface ClientsPageProps {
  clients: ClientWithOperationCount[];
  operations: Operation[];
  receipts: Recebimento[];
  onAddClient: (client: NewClient) => Client;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: number) => void;
  setActivePage: (page: string) => void;
  setPreselectedClientId: (id: number | null) => void;
}

const ClientForm: React.FC<{ client?: Client | null; onSubmit: (data: NewClient | Client) => void; onCancel: () => void; }> = ({ client, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        nome: client?.nome || '',
        cpf_cnpj: client?.cpf_cnpj || '',
        email: client?.email || '',
        telefone: client?.telefone || '',
        endereco: client?.endereco || '',
        limite_credito: client?.limite_credito !== undefined ? client.limite_credito.toString() : '',
        taxa_juros_mensal: client?.taxa_juros_mensal !== undefined ? client.taxa_juros_mensal.toString() : '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

    const maskCpfCnpj = (value: string) => {
        value = value.replace(/\D/g, ''); 
        if (value.length <= 11) { // CPF
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else { // CNPJ
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        return value.slice(0, 18); // Limit length
    };

    const validate = (): Partial<Record<keyof typeof formData, string>> => {
        const newErrors: Partial<Record<keyof typeof formData, string>> = {};
        const unmaskedCpfCnpj = formData.cpf_cnpj.replace(/\D/g, '');
        
        if (!formData.nome.trim()) {
            newErrors.nome = 'O nome é obrigatório.';
        }

        if (!unmaskedCpfCnpj) {
            newErrors.cpf_cnpj = 'O CPF/CNPJ é obrigatório.';
        } else if (unmaskedCpfCnpj.length !== 11 && unmaskedCpfCnpj.length !== 14) {
            newErrors.cpf_cnpj = 'CPF/CNPJ inválido. Deve conter 11 (CPF) ou 14 (CNPJ) dígitos.';
        }

        if (formData.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
            newErrors.email = 'Formato de email inválido.';
        }
        
        const limite = parseFloat(formData.limite_credito.toString());
        if (formData.limite_credito !== '' && (isNaN(limite) || limite < 0)) {
            newErrors.limite_credito = 'O limite de crédito não pode ser negativo.';
        }

        const taxa = parseFloat(formData.taxa_juros_mensal.toString());
        if (formData.taxa_juros_mensal !== '' && (isNaN(taxa) || taxa < 0)) {
            newErrors.taxa_juros_mensal = 'A taxa de juros não pode ser negativa.';
        }

        return newErrors;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof typeof errors];
                return newErrors;
            });
        }
        
        if (name === 'cpf_cnpj') {
            setFormData({ ...formData, [name]: maskCpfCnpj(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const preparedData = {
            ...formData,
            limite_credito: formData.limite_credito === '' ? 0 : parseFloat(formData.limite_credito.toString()),
            taxa_juros_mensal: formData.taxa_juros_mensal === '' ? 0 : parseFloat(formData.taxa_juros_mensal.toString()),
        };

        const dataToSubmit = client ? { ...client, ...preparedData } : preparedData;
        onSubmit(dataToSubmit as NewClient | Client);
    };

    const inputBaseClasses = "w-full bg-slate-700 border rounded-md py-2 px-3 text-slate-100 outline-none";
    const inputNormalClasses = "border-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500";
    const inputErrorClasses = "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nome / Razão Social</label>
                    <input name="nome" value={formData.nome} onChange={handleChange} className={`${inputBaseClasses} ${errors.nome ? inputErrorClasses : inputNormalClasses}`} required />
                    {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">CPF / CNPJ</label>
                    <input name="cpf_cnpj" value={formData.cpf_cnpj} onChange={handleChange} className={`${inputBaseClasses} ${errors.cpf_cnpj ? inputErrorClasses : inputNormalClasses}`} required />
                    {errors.cpf_cnpj && <p className="text-red-400 text-xs mt-1">{errors.cpf_cnpj}</p>}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputBaseClasses} ${errors.email ? inputErrorClasses : inputNormalClasses}`} />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Telefone</label>
                    <input type="tel" name="telefone" value={formData.telefone} onChange={handleChange} className={`${inputBaseClasses} ${inputNormalClasses}`} />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Endereço</label>
                    <input name="endereco" value={formData.endereco} onChange={handleChange} className={`${inputBaseClasses} ${inputNormalClasses}`} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Limite de Crédito (R$)</label>
                    <input type="number" step="0.01" min="0" name="limite_credito" value={formData.limite_credito} onChange={handleChange} className={`${inputBaseClasses} ${errors.limite_credito ? inputErrorClasses : inputNormalClasses}`} />
                     {errors.limite_credito && <p className="text-red-400 text-xs mt-1">{errors.limite_credito}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Taxa de Juros Padrão (%)</label>
                    <input type="number" step="0.01" min="0" name="taxa_juros_mensal" value={formData.taxa_juros_mensal} onChange={handleChange} className={`${inputBaseClasses} ${errors.taxa_juros_mensal ? inputErrorClasses : inputNormalClasses}`} />
                    {errors.taxa_juros_mensal && <p className="text-red-400 text-xs mt-1">{errors.taxa_juros_mensal}</p>}
                </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="bg-slate-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-slate-700 w-full sm:w-auto">Cancelar</button>
                <button type="submit" className="bg-brand-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-700 w-full sm:w-auto">{client ? 'Salvar Alterações' : 'Cadastrar Cliente'}</button>
            </div>
        </form>
    );
};


const ClientsPage: React.FC<ClientsPageProps> = ({ clients, operations, receipts, onAddClient, onUpdateClient, onDeleteClient }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { addNotification } = useNotification();

    const filteredClients = useMemo(() => {
        if (!searchTerm) return clients;
        const lowercasedFilter = searchTerm.toLowerCase();
        return clients.filter(client =>
            client.nome.toLowerCase().includes(lowercasedFilter) ||
            client.cpf_cnpj.toLowerCase().includes(lowercasedFilter) ||
            client.email.toLowerCase().includes(lowercasedFilter)
        );
    }, [clients, searchTerm]);

    const openAddModal = () => {
        setSelectedClient(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (client: Client) => {
        setSelectedClient(client);
        setIsFormModalOpen(true);
    };

    const openViewModal = (client: Client) => {
        setSelectedClient(client);
        setIsViewModalOpen(true);
    };

    const closeModal = () => {
        setIsFormModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedClient(null);
    };

    const handleFormSubmit = (data: NewClient | Client) => {
        if ('id' in data) {
            onUpdateClient(data);
            addNotification('Cliente atualizado com sucesso!', 'success');
        } else {
            onAddClient(data as NewClient);
            addNotification('Cliente cadastrado com sucesso!', 'success');
        }
        closeModal();
    };

    const openDeleteModal = (clientId: number) => {
        setClientToDelete(clientId);
        setIsConfirmModalOpen(true);
    };

    const handleDelete = () => {
        if (clientToDelete) {
            onDeleteClient(clientToDelete);
            addNotification('Cliente excluído com sucesso.', 'success');
        }
        setIsConfirmModalOpen(false);
        if (selectedClient && selectedClient.id === clientToDelete) {
            closeModal();
        }
        setClientToDelete(null);
    };
    
    const clientOperations = selectedClient ? operations.filter(op => op.clientId === selectedClient.id) : [];

     const clientStats = useMemo(() => {
        if (!selectedClient) return null;
        const clientOps = operations.filter(op => op.clientId === selectedClient.id);
        const openOps = clientOps.filter(op => op.status === 'aberto' || op.status === 'atrasado');
        
        const totalAplicado = clientOps.reduce((sum, op) => sum + op.netValue, 0);
        const totalDivida = openOps.reduce((sum, op) => sum + op.nominalValue, 0);
        const totalAtrasado = clientOps.filter(op => op.status === 'atrasado').reduce((sum, op) => sum + op.nominalValue, 0);

        return { totalAplicado, totalDivida, totalAtrasado };
    }, [selectedClient, operations]);

    const clientReceipts = useMemo(() => {
        if (!selectedClient) return [];
        const clientOpIds = new Set(operations.filter(op => op.clientId === selectedClient.id).map(op => op.id));
        return receipts
            .filter(r => clientOpIds.has(r.operationId))
            .sort((a, b) => parseISO(b.data_recebimento).getTime() - parseISO(a.data_recebimento).getTime());
    }, [selectedClient, operations, receipts]);

    const getDueDateStatus = (op: Operation): { text: string; color: string } => {
        if (op.status === 'pago') {
            return { text: formatDate(op.dueDate), color: 'text-emerald-400' };
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = parseISO(op.dueDate);
        const daysDiff = differenceInDays(dueDate, today);

        if (isPast(dueDate) && !isToday(dueDate)) {
             return { text: `Vencido há ${Math.abs(daysDiff)}d`, color: 'text-red-400 font-semibold' };
        }
        if (isToday(dueDate)) {
            return { text: 'Vence Hoje', color: 'text-amber-400 font-semibold' };
        }
        if (daysDiff <= 7 && daysDiff > 0) {
            return { text: `Vence em ${daysDiff}d`, color: 'text-sky-400' };
        }
        return { text: formatDate(op.dueDate), color: 'text-slate-300' };
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">Clientes</h1>
                    <p className="text-slate-400 mt-1">Gerencie sua carteira de clientes.</p>
                </div>
                <button onClick={openAddModal} className="flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-5 py-2 rounded-md hover:bg-brand-700 transition w-full sm:w-auto">
                    <UserPlus className="w-5 h-5" />
                    <span>Novo Cliente</span>
                </button>
            </header>
            
            <Card padding="p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, CPF/CNPJ, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-slate-100 placeholder-slate-500"
                        />
                    </div>
                </div>
                
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-700 text-sm text-slate-400">
                            <tr>
                                <th className="p-4">Nome / Razão Social</th>
                                <th className="p-4">Contato</th>
                                <th className="p-4 text-center">Operações</th>
                                <th className="p-4 text-center">Taxa Padrão (%)</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length > 0 ? filteredClients.map(client => (
                                <tr key={client.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-semibold text-slate-100">{client.nome}</div>
                                        <div className="text-xs text-slate-400 font-mono">{client.cpf_cnpj}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">{client.email}</div>
                                        <div className="text-xs text-slate-400">{client.telefone}</div>
                                    </td>
                                    <td className="p-4 text-center font-mono">{client.operationCount}</td>
                                    <td className="p-4 text-center font-mono">{client.taxa_juros_mensal.toFixed(2)}%</td>
                                    <td className="p-4">
                                        <div className="flex justify-end items-center gap-2">
                                            <button onClick={() => openViewModal(client)} className="p-2 text-slate-400 hover:text-brand-400 transition-all duration-200 hover:scale-110" aria-label="Visualizar"><Eye className="w-5 h-5"/></button>
                                            <button onClick={() => openEditModal(client)} className="p-2 text-slate-400 hover:text-amber-400 transition-all duration-200 hover:scale-110" aria-label="Editar"><Pencil className="w-5 h-5"/></button>
                                            <button onClick={() => openDeleteModal(client.id)} className="p-2 text-slate-400 hover:text-red-400 transition-all duration-200 hover:scale-110" aria-label="Excluir"><Trash2 className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState
                                            icon={<Users className="w-8 h-8"/>}
                                            title="Nenhum cliente encontrado"
                                            description="Parece que você ainda não tem clientes cadastrados."
                                            actionText="Adicionar Primeiro Cliente"
                                            onActionClick={openAddModal}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden space-y-4">
                    {filteredClients.length > 0 ? filteredClients.map(client => (
                        <div key={client.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-slate-100 text-lg">{client.nome}</h3>
                                    <p className="text-sm text-slate-400 font-mono">{client.cpf_cnpj}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openViewModal(client)} className="p-2 bg-slate-700/50 rounded-lg text-brand-400"><Eye className="w-4 h-4"/></button>
                                    <button onClick={() => openEditModal(client)} className="p-2 bg-slate-700/50 rounded-lg text-amber-400"><Pencil className="w-4 h-4"/></button>
                                    <button onClick={() => openDeleteModal(client.id)} className="p-2 bg-slate-700/50 rounded-lg text-red-400"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-slate-500" />
                                    <span>{client.operationCount} Operações</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-slate-500" />
                                    <span>Taxa: {client.taxa_juros_mensal.toFixed(2)}%</span>
                                </div>
                            </div>

                            {(client.email || client.telefone) && (
                                <div className="pt-2 border-t border-slate-700/50 flex flex-col gap-1 text-sm text-slate-400">
                                    {client.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3"/> {client.email}</div>}
                                    {client.telefone && <div className="flex items-center gap-2"><Phone className="w-3 h-3"/> {client.telefone}</div>}
                                </div>
                            )}
                        </div>
                    )) : (
                        <EmptyState
                            icon={<Users className="w-8 h-8"/>}
                            title="Nenhum cliente encontrado"
                            description="Tente buscar por outro termo ou cadastre um novo cliente."
                            actionText="Adicionar Cliente"
                            onActionClick={openAddModal}
                        />
                    )}
                </div>
            </Card>

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleDelete}
                title="Confirmar Exclusão"
                message={<p>Tem certeza que deseja excluir este cliente? Todas as suas operações e recebimentos associados também serão removidos permanentemente. <strong className="text-amber-400">Esta ação não pode ser desfeita.</strong></p>}
            />

            <Modal isOpen={isFormModalOpen} onClose={closeModal} title={selectedClient ? 'Editar Cliente' : 'Novo Cliente'}>
                <ClientForm client={selectedClient} onSubmit={handleFormSubmit} onCancel={closeModal} />
            </Modal>
            
            {selectedClient && (
                 <Modal isOpen={isViewModalOpen} onClose={closeModal} title={selectedClient.nome}>
                   <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg text-brand-400 mb-2">Detalhes do Cliente</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-900/50 p-4 rounded-lg">
                                <p><strong className="text-slate-400 block">CPF/CNPJ:</strong> {selectedClient.cpf_cnpj}</p>
                                <p><strong className="text-slate-400 block">Cadastro:</strong> {formatDate(selectedClient.data_cadastro)}</p>
                                <p><strong className="text-slate-400 block">Email:</strong> {selectedClient.email || 'N/A'}</p>
                                <p><strong className="text-slate-400 block">Telefone:</strong> {selectedClient.telefone || 'N/A'}</p>
                                <p className="sm:col-span-2"><strong className="text-slate-400 block">Endereço:</strong> {selectedClient.endereco || 'N/A'}</p>
                                <p><strong className="text-slate-400 block">Limite de Crédito:</strong> {formatCurrency(selectedClient.limite_credito)}</p>
                                <p><strong className="text-slate-400 block">Taxa Padrão:</strong> {selectedClient.taxa_juros_mensal.toFixed(2)}%</p>
                            </div>
                        </div>

                         {clientStats && (
                            <div>
                                <h3 className="font-semibold text-lg text-brand-400 mb-2">Resumo Financeiro</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center bg-slate-900/50 p-4 rounded-lg">
                                    <div className="p-2 sm:p-0 border-b sm:border-b-0 border-slate-700/50 last:border-0">
                                        <p className="flex items-center justify-center gap-2 text-sm text-slate-400"><TrendingUp className="w-4 h-4" /> Capital Aplicado</p>
                                        <p className="font-bold text-lg text-slate-100">{formatCurrency(clientStats.totalAplicado)}</p>
                                    </div>
                                    <div className="p-2 sm:p-0 border-b sm:border-b-0 border-slate-700/50 last:border-0">
                                        <p className="flex items-center justify-center gap-2 text-sm text-slate-400"><CircleDollarSign className="w-4 h-4" /> Saldo Devedor</p>
                                        <p className="font-bold text-lg text-amber-400">{formatCurrency(clientStats.totalDivida)}</p>
                                    </div>
                                    <div className="p-2 sm:p-0">
                                        <p className="flex items-center justify-center gap-2 text-sm text-slate-400"><TriangleAlert className="w-4 h-4" /> Valor Atrasado</p>
                                        <p className="font-bold text-lg text-red-400">{formatCurrency(clientStats.totalAtrasado)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="font-semibold text-lg text-brand-400 mb-2">Histórico de Operações</h3>
                             <div className="overflow-x-auto max-h-60 bg-slate-900/50 p-2 rounded-lg">
                                {clientOperations.length > 0 ? (
                                    <table className="w-full text-sm min-w-[600px]">
                                        <thead className="text-slate-400">
                                            <tr>
                                                <th className="p-2 text-left">Título</th>
                                                <th className="p-2 text-right">Capital Aplicado</th>
                                                <th className="p-2 text-right">Juros</th>
                                                <th className="p-2 text-right">Total a Receber</th>
                                                <th className="p-2 text-left">Vencimento</th>
                                                <th className="p-2 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {clientOperations.map(op => {
                                                const juros = op.nominalValue - op.netValue;
                                                const vencimento = getDueDateStatus(op);
                                                return (
                                                <tr key={op.id} className="border-t border-slate-700">
                                                    <td className="p-2 font-mono">{op.titleNumber}</td>
                                                    <td className="p-2 text-right font-mono text-slate-300">{formatCurrency(op.netValue)}</td>
                                                    <td className="p-2 text-right font-mono text-amber-400">{formatCurrency(juros)}</td>
                                                    <td className="p-2 text-right font-mono text-emerald-400 font-semibold">{formatCurrency(op.nominalValue)}</td>
                                                    <td className={`p-2 ${vencimento.color}`}>{vencimento.text}</td>
                                                    <td className="p-2 text-center capitalize">{op.status}</td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-center py-4 text-slate-500">Nenhuma operação registrada.</p>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-lg text-brand-400 mb-2">Histórico de Recebimentos</h3>
                             <div className="overflow-x-auto max-h-60 bg-slate-900/50 p-2 rounded-lg">
                                {clientReceipts.length > 0 ? (
                                    <table className="w-full text-sm min-w-[500px]">
                                        <thead className="text-slate-400">
                                            <tr>
                                                <th className="p-2 text-left">Data</th>
                                                <th className="p-2 text-left">Nº do Título</th>
                                                <th className="p-2 text-right">Valor Recebido</th>
                                                <th className="p-2 text-center">Forma de Pagto.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {clientReceipts.map(receipt => {
                                                const operation = operations.find(op => op.id === receipt.operationId);
                                                return (
                                                    <tr key={receipt.id} className="border-t border-slate-700">
                                                        <td className="p-2">{formatDate(receipt.data_recebimento)}</td>
                                                        <td className="p-2 font-mono">{operation?.titleNumber || 'N/A'}</td>
                                                        <td className="p-2 text-right font-mono text-emerald-400">{formatCurrency(receipt.valor_total_recebido)}</td>
                                                        <td className="p-2 text-center capitalize">{receipt.forma_pagamento}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-center py-4 text-slate-500">Nenhum recebimento registrado para este cliente.</p>
                                )}
                            </div>
                        </div>
                   </div>
                </Modal>
            )}
        </div>
    );
};

export default ClientsPage;
