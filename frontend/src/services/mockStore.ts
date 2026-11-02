import type {
  Account,
  CurrencyCode,
  ExchangeRate,
  Transaction,
  User,
} from '@/types';

interface MockDatabase {
  user: User;
  account: Account;
  transactions: Transaction[];
  rates: ExchangeRate[];
}

const STORAGE_KEY = 'bnkg_mock_ledger_v4';

const INITIAL_RATES: ExchangeRate[] = [
  {
    curId: 431,
    curAbbreviation: 'USD',
    curScale: 1,
    curName: 'Доллар США',
    curOfficialRate: 2.946,
    date: new Date().toISOString(),
  },
  {
    curId: 451,
    curAbbreviation: 'EUR',
    curScale: 1,
    curName: 'Евро',
    curOfficialRate: 3.2992,
    date: new Date().toISOString(),
  },
  {
    curId: 456,
    curAbbreviation: 'RUB',
    curScale: 100,
    curName: 'Российских рублей',
    curOfficialRate: 3.6635,
    date: new Date().toISOString(),
  },
];

const INITIAL_DATABASE: MockDatabase = {
  user: {
    id: 'usr_demo_01',
    phone: '',
    email: 'demo@bank.local',
    firstName: 'Demo',
    lastName: 'User',
    role: 'customer',
    status: 'active',
  },
  account: {
    id: 'acc_demo_01',
    accountNumber: 'BY20BNKG30120000000000004892',
    status: 'active',
    balances: [
      {
        currency: 'BYN',
        balance: 15000.0,
        createdAt: new Date().toISOString(),
      },
      {
        currency: 'USD',
        balance: 2500.0,
        createdAt: new Date().toISOString(),
      },
      {
        currency: 'EUR',
        balance: 1500.0,
        createdAt: new Date().toISOString(),
      },
      {
        currency: 'RUB',
        balance: 80000.0,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  transactions: [],
  rates: INITIAL_RATES,
};

class MockStore {
  private db: MockDatabase;

  constructor() {
    this.db = this.load();
  }

  private load(): MockDatabase {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        return JSON.parse(serialized);
      }
    } catch {
      // Fallback
    }
    return JSON.parse(JSON.stringify(INITIAL_DATABASE));
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      // Ignore quota errors
    }
  }

  public reset(): void {
    this.db = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    this.persist();
  }

  public getUser(): User {
    return this.db.user;
  }

  public setUser(user: User): void {
    this.db.user = user;
    this.persist();
  }

  public getAccount(): Account {
    return this.db.account;
  }

  public getTransactions(): Transaction[] {
    return this.db.transactions;
  }

  public getRates(): ExchangeRate[] {
    return this.db.rates;
  }

  public updateRates(rates: ExchangeRate[]): void {
    this.db.rates = rates;
    this.persist();
  }

  public openBalance(currency: CurrencyCode): Account {
    const existing = this.db.account.balances.find((b) => b.currency === currency);
    if (existing) {
      throw new Error(`Кошелек в валюте ${currency} уже открыт`);
    }

    this.db.account.balances.push({
      currency,
      balance: 0,
      createdAt: new Date().toISOString(),
    });

    this.persist();
    return this.db.account;
  }

  public transfer(params: {
    recipientType: 'phone' | 'account';
    recipientValue: string;
    currency: CurrencyCode;
    amount: number;
    description?: string;
  }): Transaction {
    const balanceItem = this.db.account.balances.find((b) => b.currency === params.currency);
    if (!balanceItem || balanceItem.balance < params.amount) {
      throw new Error(
        `Недостаточно средств. Доступно: ${balanceItem ? balanceItem.balance.toFixed(2) : '0.00'} ${params.currency}`
      );
    }

    balanceItem.balance -= params.amount;

    const newTx: Transaction = {
      id: `tx_${Date.now().toString().slice(-6)}`,
      type: 'transfer',
      status: 'completed',
      amount: params.amount,
      currency: params.currency,
      recipientPhone: params.recipientType === 'phone' ? params.recipientValue : undefined,
      recipientAccountNumber: params.recipientType === 'account' ? params.recipientValue : undefined,
      description: params.description || `Перевод ${params.recipientValue}`,
      createdAt: new Date().toISOString(),
    };

    this.db.transactions.unshift(newTx);
    this.persist();
    return newTx;
  }

  public exchange(params: {
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
    amount: number;
  }): { transaction: Transaction; targetAmount: number } {
    if (params.fromCurrency === params.toCurrency) {
      throw new Error('Валюты списания и зачисления должны различаться');
    }

    const sourceWallet = this.db.account.balances.find((b) => b.currency === params.fromCurrency);
    if (!sourceWallet || sourceWallet.balance < params.amount) {
      throw new Error(
        `Недостаточно средств. Доступно: ${sourceWallet ? sourceWallet.balance.toFixed(2) : '0.00'} ${params.fromCurrency}`
      );
    }

    const targetAmount = this.calculateExchange(
      params.fromCurrency,
      params.toCurrency,
      params.amount
    );

    let targetWallet = this.db.account.balances.find((b) => b.currency === params.toCurrency);
    if (!targetWallet) {
      targetWallet = {
        currency: params.toCurrency,
        balance: 0,
        createdAt: new Date().toISOString(),
      };
      this.db.account.balances.push(targetWallet);
    }

    sourceWallet.balance -= params.amount;
    targetWallet.balance += targetAmount;

    const tx: Transaction = {
      id: `tx_${Date.now().toString().slice(-6)}`,
      type: 'exchange',
      status: 'completed',
      amount: params.amount,
      currency: params.fromCurrency,
      targetCurrency: params.toCurrency,
      targetAmount,
      description: `Конвертация ${params.fromCurrency} → ${params.toCurrency}`,
      createdAt: new Date().toISOString(),
    };

    this.db.transactions.unshift(tx);
    this.persist();
    return { transaction: tx, targetAmount };
  }

  public addExternalTransaction(tx: Transaction): void {
    this.db.transactions.unshift(tx);
    this.persist();
  }

  public calculateExchange(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    amount: number
  ): number {
    if (fromCurrency === toCurrency) return amount;

    const getRateToByn = (code: CurrencyCode): number => {
      if (code === 'BYN') return 1;
      const rate = this.db.rates.find((r) => r.curAbbreviation === code);
      if (!rate) return 1;
      return rate.curOfficialRate / rate.curScale;
    };

    const fromRate = getRateToByn(fromCurrency);
    const toRate = getRateToByn(toCurrency);

    const amountInByn = amount * fromRate;
    const result = amountInByn / toRate;
    return Number(result.toFixed(4));
  }
}

export const mockStore = new MockStore();
