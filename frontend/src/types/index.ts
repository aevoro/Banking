export type CurrencyCode = 'BYN' | 'USD' | 'EUR' | 'RUB';

export type UserRole = 'customer' | 'admin' | 'support';
export type UserStatus = 'active' | 'blocked';
export type AccountStatus = 'active' | 'frozen' | 'closed';

export interface User {
  id: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
}

export interface AccountBalance {
  currency: CurrencyCode;
  balance: number;
  createdAt: string;
}

export interface Account {
  id: string;
  accountNumber: string;
  status: AccountStatus;
  balances: AccountBalance[];
}

export type TransactionType = 'transfer' | 'exchange' | 'deposit';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: CurrencyCode;
  senderAccountNumber?: string;
  recipientAccountNumber?: string;
  recipientPhone?: string;
  description: string;
  targetCurrency?: CurrencyCode;
  targetAmount?: number;
  createdAt: string;
}

export interface ExchangeRate {
  curId: number;
  curAbbreviation: CurrencyCode;
  curScale: number;
  curName: string;
  curOfficialRate: number;
  date: string;
}

export interface TransferRequest {
  recipientType: 'phone' | 'account';
  recipientValue: string;
  currency: CurrencyCode;
  amount: number;
  description?: string;
}

export interface ExchangeRequest {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  amount: number;
}

export interface OpenBalanceRequest {
  currency: CurrencyCode;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface RegisterPayload {
  phone: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  currencies?: CurrencyCode[];
}
