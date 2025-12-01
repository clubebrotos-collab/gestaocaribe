

import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useNotification } from '../components/Notification';

interface LoginPageProps {
    onLogin: (email: string, pass: string) => boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('gestaocaribe@gmail.com');
    const [password, setPassword] = useState('gestaomichel10');
    const { addNotification } = useNotification();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const success = onLogin(email, password);
        if (!success) {
            addNotification('Email ou senha inválidos.', 'error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 font-sans p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-6">
                    <Briefcase className="w-12 h-12 text-brand-400" />
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight mt-2">
                        Caribé Factoring
                    </h1>
                    <p className="text-slate-400">Acesse sua conta para continuar</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                placeholder="ex: usuario@factoring.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-brand-600 text-white font-semibold py-2.5 rounded-md hover:bg-brand-700 transition duration-200"
                        >
                            Entrar
                        </button>
                    </form>
                </div>
                 <p className="text-center text-xs text-slate-500 mt-6">&copy; {new Date().getFullYear()} Caribé Factoring. Todos os direitos reservados.</p>
            </div>
        </div>
    );
};

export default LoginPage;