export interface StatementSummary {
  name: string;
  statementDate: string;
  dueDate: string;
  newBalance: number;
  minimumPayment: number;
  creditLimit: number;
}

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
}

export interface StatementData {
  summary: StatementSummary;
  transactions: Transaction[];
}

