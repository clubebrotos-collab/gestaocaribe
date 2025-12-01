

import type { Client, Operation, Recebimento, User } from '../types';

export const MOCK_USERS: User[] = [
    { id: 1, nome: 'Michel Caribé', email: 'gestaocaribe@gmail.com', papel: 'Administrador', password: 'gestaomichel10' },
    { id: 2, nome: 'Bruno Operador', email: 'operador@factoring.com', papel: 'Operador', password: 'operador' },
    { id: 3, nome: 'Carla Analista', email: 'analista@factoring.com', papel: 'Analista', password: 'analista' },
];

export const MOCK_CLIENTS: Client[] = [];

export const MOCK_OPERATIONS: Operation[] = [];

export const MOCK_RECEBIMENTOS: Recebimento[] = [];