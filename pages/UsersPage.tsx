
import React, { useState } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Users, UserPlus, Pencil, Trash2, Mail } from 'lucide-react';
import type { User, NewUser } from '../types';
import { useNotification } from '../components/Notification';
import EmptyState from '../components/EmptyState';

interface UsersPageProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: NewUser) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: number) => boolean;
}

const UserForm: React.FC<{
    user?: User | null;
    onSubmit: (data: NewUser | User) => void;
    onCancel: () => void;
}> = ({ user, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        nome: user?.nome || '',
        email: user?.email || '',
        papel: user?.papel || 'Operador',
        password: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof typeof formData, string>> = {};
        if (!formData.nome.trim()) newErrors.nome = 'O nome é obrigatório.';
        if (!formData.email.trim()) {
            newErrors.email = 'O email é obrigatório.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Formato de email inválido.';
        }
        if (!user && !formData.password) { // Password required only for new users
            newErrors.password = 'A senha é obrigatória para novos usuários.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof typeof errors]) {
             setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof typeof errors];
                return newErrors;
            });
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        const dataToSubmit = user ? { ...user, ...formData } : formData;
        onSubmit(dataToSubmit as NewUser | User);
    };
    
    const inputBaseClasses = "w-full bg-slate-700 border rounded-md py-2 px-3 text-slate-100 outline-none";
    const inputNormalClasses = "border-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500";
    const inputErrorClasses = "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500";

    return (
         <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
                    <input name="nome" value={formData.nome} onChange={handleChange} className={`${inputBaseClasses} ${errors.nome ? inputErrorClasses : inputNormalClasses}`} />
                     {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome}</p>}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputBaseClasses} ${errors.email ? inputErrorClasses : inputNormalClasses}`} />
                     {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Papel / Função</label>
                     <select name="papel" value={formData.papel} onChange={handleChange} className={`${inputBaseClasses} ${inputNormalClasses}`}>
                        <option value="Operador">Operador</option>
                        <option value="Analista">Analista</option>
                        <option value="Administrador">Administrador</option>
                    </select>
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} className={`${inputBaseClasses} ${errors.password ? inputErrorClasses : inputNormalClasses}`} placeholder={user ? "Deixe em branco para não alterar" : "••••••••"} />
                     {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="bg-slate-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-slate-700 w-full sm:w-auto">Cancelar</button>
                <button type="submit" className="bg-brand-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-700 w-full sm:w-auto">{user ? 'Salvar Alterações' : 'Cadastrar Usuário'}</button>
            </div>
        </form>
    );
};

const UsersPage: React.FC<UsersPageProps> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<number | null>(null);
    const { addNotification } = useNotification();

    const openAddModal = () => {
        setSelectedUser(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setIsFormModalOpen(true);
    };
    
    const closeModal = () => {
        setIsFormModalOpen(false);
        setSelectedUser(null);
    };

    const handleFormSubmit = (data: NewUser | User) => {
        if ('id' in data) {
            onUpdateUser(data);
            addNotification('Usuário atualizado com sucesso!', 'success');
        } else {
            onAddUser(data as NewUser);
            addNotification('Usuário cadastrado com sucesso!', 'success');
        }
        closeModal();
    };

    const openDeleteModal = (userId: number) => {
        setUserToDelete(userId);
        setIsConfirmModalOpen(true);
    };

    const handleDelete = () => {
        if (userToDelete) {
            const success = onDeleteUser(userToDelete);
            if (success) {
                addNotification('Usuário excluído com sucesso.', 'success');
            } else {
                addNotification('Você não pode excluir seu próprio usuário.', 'error');
            }
        }
        setIsConfirmModalOpen(false);
        setUserToDelete(null);
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">Usuários</h1>
                    <p className="text-slate-400 mt-1">Gerencie os usuários e permissões do sistema.</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-5 py-2 rounded-md hover:bg-brand-700 transition w-full sm:w-auto"
                >
                    <UserPlus className="w-5 h-5" />
                    <span>Novo Usuário</span>
                </button>
            </header>

            <Card padding="p-4 sm:p-6">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-700 text-sm text-slate-400">
                            <tr>
                                <th className="p-4">Nome</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Papel / Função</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? users.map(user => (
                                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 font-semibold text-slate-100">{user.nome}</td>
                                    <td className="p-4">{user.email}</td>
                                    <td className="p-4">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                            user.papel === 'Administrador' ? 'bg-amber-800 text-amber-300' :
                                            user.papel === 'Operador' ? 'bg-sky-800 text-sky-300' :
                                            'bg-slate-700 text-slate-300'
                                        }`}>
                                            {user.papel}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                             <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-amber-400 transition-all duration-200 hover:scale-110" aria-label="Editar"><Pencil className="w-5 h-5"/></button>
                                             <button 
                                                onClick={() => openDeleteModal(user.id)}
                                                disabled={user.id === currentUser.id}
                                                className="p-2 text-slate-400 hover:text-red-400 transition-all duration-200 hover:scale-110 disabled:text-slate-600 disabled:cursor-not-allowed disabled:hover:scale-100" 
                                                aria-label="Excluir"
                                             >
                                                <Trash2 className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4}>
                                        <EmptyState 
                                            icon={<Users className="w-8 h-8" />}
                                            title="Nenhum usuário encontrado"
                                            description="Cadastre novos usuários para conceder acesso ao sistema."
                                            actionText="Adicionar Usuário"
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
                    {users.length > 0 ? users.map(user => (
                        <div key={user.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-slate-100">{user.nome}</h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                                        <Mail className="w-3 h-3"/>
                                        <span>{user.email}</span>
                                    </div>
                                </div>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                    user.papel === 'Administrador' ? 'bg-amber-800 text-amber-300' :
                                    user.papel === 'Operador' ? 'bg-sky-800 text-sky-300' :
                                    'bg-slate-700 text-slate-300'
                                }`}>
                                    {user.papel}
                                </span>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
                                <button onClick={() => openEditModal(user)} className="p-2 bg-slate-700/50 rounded-lg text-amber-400">
                                    <Pencil className="w-4 h-4"/>
                                </button>
                                <button 
                                    onClick={() => openDeleteModal(user.id)}
                                    disabled={user.id === currentUser.id}
                                    className="p-2 bg-slate-700/50 rounded-lg text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    )) : (
                         <EmptyState 
                            icon={<Users className="w-8 h-8" />}
                            title="Nenhum usuário encontrado"
                            description="Cadastre novos usuários."
                            actionText="Adicionar Usuário"
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
                message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
            />

            <Modal isOpen={isFormModalOpen} onClose={closeModal} title={selectedUser ? 'Editar Usuário' : 'Novo Usuário'}>
                <UserForm user={selectedUser} onSubmit={handleFormSubmit} onCancel={closeModal} />
            </Modal>
        </div>
    );
};

export default UsersPage;
