
export type OperationStatus = 'aberto' | 'pago' | 'atrasado';
export type FormaPagamento = 'pix' | 'boleto' | 'transferencia';

export interface Client {
  id: number;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  limite_credito: number;
  taxa_juros_mensal: number;
  data_cadastro: string;
}

export type NewClient = Omit<Client, 'id' | 'data_cadastro'>;

export interface ClientWithOperationCount extends Client {
  operationCount: number;
}

export interface Operation {
  id: number;
  clientId: number;
  clientName: string;
  type: 'duplicata' | 'cheque';
  titleNumber: string;
  nominalValue: number;
  netValue: number;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  taxa: number;
  status: OperationStatus;
}

export type NewOperation = Omit<Operation, 'id' | 'clientName' | 'netValue' | 'status'>;

export interface Recebimento {
  id: number;
  operationId: number;
  data_recebimento: string; // YYYY-MM-DD
  valor_total_recebido: number;
  valor_principal_pago: number;
  valor_juros_pago: number;
  forma_pagamento: FormaPagamento;
}

export type NewRecebimento = Omit<Recebimento, 'id'>;

export interface User {
  id: number;
  nome: string;
  email: string;
  papel: 'Administrador' | 'Operador' | 'Analista';
  password: string;
}

export type NewUser = Omit<User, 'id'>;

export interface Reminder {
  id: number;
  operationId: number;
  clientName: string;
  dueDate: string;
  nominalValue: number;
}