import type {
  Account,
  AccountStatus,
  AuthResponse,
  CurrencyCode,
  ExchangeRate,
  ExchangeRequest,
  LoginPayload,
  OpenBalanceRequest,
  RegisterPayload,
  Transaction,
  TransferRequest,
  User,
} from '@/types';
import { mockStore } from './mockStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'bnkg_auth_token_v3';

class ApiService {
  private isLiveAvailable: boolean | null = null;
  private forceMockMode: boolean = false;

  constructor() {
    this.forceMockMode = localStorage.getItem('bnkg_force_mock') === 'true';
  }

  public setForceMock(enabled: boolean): void {
    this.forceMockMode = enabled;
    localStorage.setItem('bnkg_force_mock', String(enabled));
  }

  public isMockMode(): boolean {
    return this.forceMockMode || this.isLiveAvailable === false;
  }

  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  public clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('bnkg_active_user');
  }

  public async checkHealth(): Promise<boolean> {
    if (this.forceMockMode) {
      this.isLiveAvailable = false;
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const response = await fetch(`${BASE_URL}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        this.isLiveAvailable = false;
        return false;
      }

      const data = await response.json();
      this.isLiveAvailable = Boolean(data && (data.status === 'ok' || data.status === 'healthy'));
      return this.isLiveAvailable;
    } catch {
      this.isLiveAvailable = false;
      return false;
    }
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async parseErrorMessage(response: Response, defaultMessage: string): Promise<string> {
    try {
      const text = await response.text();
      let cleanMsg = text.trim();
      try {
        const json = JSON.parse(text);
        cleanMsg = json.error || json.message || cleanMsg;
      } catch {
        // Plain text error from Go http.Error
      }

      if (cleanMsg.includes('invalid phone or password')) {
        return 'Неверный номер телефона или пароль';
      }
      if (cleanMsg.includes('user already exists')) {
        return 'Пользователь с таким номером телефона уже зарегистрирован в базе данных';
      }
      if (cleanMsg.includes('account is blocked')) {
        return 'Учетная запись заблокирована службой безопасности';
      }
      if (cleanMsg.includes('invalid phone')) {
        return 'Неверный формат номера телефона. Ожидается: +375XXXXXXXXX (9 цифр)';
      }
      if (cleanMsg.includes('insufficient funds')) {
        return 'Недостаточно средств на счете для совершения операции';
      }
      if (cleanMsg.includes('self transfer') || cleanMsg.includes('cannot transfer to yourself')) {
        return 'Нельзя перевести средства на свой же счет';
      }
      if (cleanMsg.includes('account not found') || cleanMsg.includes('user not found')) {
        return 'Получатель не найден в банковской системе';
      }
      if (cleanMsg.includes('balance pocket for this currency already exists')) {
        return 'Кошелек в этой валюте уже открыт';
      }
      if (cleanMsg.includes('currency balance pocket not found') || cleanMsg.includes('balance not found')) {
        return 'Кошелек в требуемой валюте не найден. Сначала откройте его.';
      }

      return cleanMsg || `${defaultMessage}: HTTP ${response.status}`;
    } catch {
      return `${defaultMessage}: HTTP ${response.status}`;
    }
  }

  public async login(payload: LoginPayload): Promise<AuthResponse> {
    const isLive = await this.checkHealth();

    if (!isLive && this.forceMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const existing = mockStore.getUser();
      const user: User = {
        ...existing,
        phone: payload.phone,
        firstName: existing.firstName === 'Demo' ? 'Клиент' : existing.firstName,
        lastName: existing.lastName === 'User' ? 'Банка' : existing.lastName,
      };
      mockStore.setUser(user);
      const token = 'mock_jwt_token_' + Date.now();
      this.setToken(token);
      return { token, user };
    }

    const cleanPhone = payload.phone.replace(/[\s-]/g, '');
    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        phone: cleanPhone,
        password: payload.password,
      }),
    });

    if (!response.ok) {
      const errMsg = await this.parseErrorMessage(response, 'Ошибка авторизации');
      throw new Error(errMsg);
    }

    const data = await response.json();
    const user: User = {
      id: data.user.id,
      phone: data.user.phone,
      firstName: data.user.first_name || 'Клиент',
      lastName: data.user.last_name || '',
      email: data.user.email || '',
      role: data.user.role || 'customer',
      status: data.user.status || 'active',
    };

    this.setToken(data.token);
    return { token: data.token, user };
  }

  public async register(payload: RegisterPayload): Promise<AuthResponse> {
    const isLive = await this.checkHealth();

    if (!isLive && this.forceMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const user: User = {
        ...mockStore.getUser(),
        phone: payload.phone,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
      };
      mockStore.setUser(user);
      const token = 'mock_jwt_token_' + Date.now();
      this.setToken(token);
      return { token, user };
    }

    const cleanPhone = payload.phone.replace(/[\s-]/g, '');
    const registerBody = {
      phone: cleanPhone,
      password: payload.password,
      first_name: payload.firstName.trim(),
      last_name: payload.lastName.trim(),
      email: payload.email?.trim() ? payload.email.trim() : null,
      currencies: payload.currencies && payload.currencies.length > 0 ? payload.currencies : ['BYN'],
    };

    const response = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(registerBody),
    });

    if (!response.ok) {
      const errMsg = await this.parseErrorMessage(response, 'Ошибка регистрации');
      throw new Error(errMsg);
    }

    // Backend creates the user, account and balance in PostgreSQL.
    // Now perform real login to retrieve the authentic JWT token
    return this.login({
      phone: cleanPhone,
      password: payload.password,
    });
  }

  public async getAccount(): Promise<Account> {
    if (this.isMockMode() && this.forceMockMode) {
      return mockStore.getAccount();
    }

    const response = await fetch(`${BASE_URL}/api/v1/accounts`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
      }
      const errMsg = await this.parseErrorMessage(response, 'Не удалось загрузить данные счета');
      throw new Error(errMsg);
    }

    const raw = await response.json();
    const account: Account = {
      id: raw.account_id || raw.id,
      accountNumber: raw.account_number || raw.accountNumber,
      status: (raw.status as AccountStatus) || 'active',
      balances: Array.isArray(raw.balances)
        ? raw.balances.map((b: any) => ({
            currency: b.currency as CurrencyCode,
            balance: typeof b.balance === 'number' ? b.balance : parseFloat(b.balance) || 0,
            createdAt: b.created_at,
          }))
        : [],
    };
    return account;
  }

  public async openBalance(payload: OpenBalanceRequest): Promise<Account> {
    if (this.isMockMode() && this.forceMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return mockStore.openBalance(payload.currency);
    }

    const response = await fetch(`${BASE_URL}/api/v1/accounts/balances`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currency: payload.currency }),
    });

    if (!response.ok) {
      const errMsg = await this.parseErrorMessage(response, 'Не удалось открыть валютный кошелек');
      throw new Error(errMsg);
    }

    return this.getAccount();
  }

  public async transfer(payload: TransferRequest): Promise<Transaction> {
    if (this.isMockMode() && this.forceMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return mockStore.transfer({
        recipientType: payload.recipientType,
        recipientValue: payload.recipientValue,
        currency: payload.currency,
        amount: payload.amount,
        description: payload.description,
      });
    }

    const cleanRecipient = payload.recipientType === 'phone'
      ? payload.recipientValue.replace(/[\s-]/g, '')
      : payload.recipientValue.replace(/\s/g, '');

    const reqBody = {
      recipient_type: payload.recipientType === 'phone' ? 'phone' : 'account_number',
      recipient: cleanRecipient,
      currency: payload.currency,
      amount: payload.amount,
      description: payload.description || 'Банковский перевод',
    };

    const response = await fetch(`${BASE_URL}/api/v1/transfers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(reqBody),
    });

    if (!response.ok) {
      const errMsg = await this.parseErrorMessage(response, 'Ошибка перевода средств');
      throw new Error(errMsg);
    }

    const result = await response.json();
    const tx: Transaction = {
      id: result.transaction_id || `tx_${Date.now()}`,
      type: 'transfer',
      status: 'completed',
      amount: payload.amount,
      currency: payload.currency,
      recipientPhone: payload.recipientType === 'phone' ? payload.recipientValue : undefined,
      recipientAccountNumber: payload.recipientType === 'account' ? payload.recipientValue : undefined,
      description: payload.description || `Перевод ${payload.recipientValue}`,
      createdAt: new Date().toISOString(),
    };
    mockStore.addExternalTransaction(tx);
    return tx;
  }

  public async exchange(
    payload: ExchangeRequest
  ): Promise<{ transaction: Transaction; targetAmount: number }> {
    if (this.isMockMode() && this.forceMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockStore.exchange(payload);
    }

    const reqBody = {
      from_currency: payload.fromCurrency,
      to_currency: payload.toCurrency,
      amount: payload.amount,
    };

    const response = await fetch(`${BASE_URL}/api/v1/exchange`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(reqBody),
    });

    if (!response.ok) {
      const errMsg = await this.parseErrorMessage(response, 'Ошибка обмена валюты');
      throw new Error(errMsg);
    }

    const result = await response.json();
    const targetAmount = typeof result.converted_amount === 'number'
      ? result.converted_amount
      : parseFloat(result.converted_amount) || 0;

    const tx: Transaction = {
      id: result.transaction_id || `ex_${Date.now()}`,
      type: 'exchange',
      status: 'completed',
      amount: payload.amount,
      currency: payload.fromCurrency,
      targetCurrency: payload.toCurrency,
      targetAmount,
      description: `Конвертация ${payload.fromCurrency} → ${payload.toCurrency}`,
      createdAt: new Date().toISOString(),
    };
    mockStore.addExternalTransaction(tx);
    return { transaction: tx, targetAmount };
  }

  public async getRates(): Promise<ExchangeRate[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const [usdRes, eurRes, rubRes] = await Promise.all([
        fetch('https://api.nbrb.by/exrates/rates/431', { signal: controller.signal }).then((r) =>
          r.json()
        ),
        fetch('https://api.nbrb.by/exrates/rates/451', { signal: controller.signal }).then((r) =>
          r.json()
        ),
        fetch('https://api.nbrb.by/exrates/rates/456', { signal: controller.signal }).then((r) =>
          r.json()
        ),
      ]);
      clearTimeout(timeoutId);

      const liveRates: ExchangeRate[] = [
        {
          curId: usdRes.Cur_ID,
          curAbbreviation: 'USD',
          curScale: usdRes.Cur_Scale,
          curName: usdRes.Cur_Name,
          curOfficialRate: usdRes.Cur_OfficialRate,
          date: usdRes.Date,
        },
        {
          curId: eurRes.Cur_ID,
          curAbbreviation: 'EUR',
          curScale: eurRes.Cur_Scale,
          curName: eurRes.Cur_Name,
          curOfficialRate: eurRes.Cur_OfficialRate,
          date: eurRes.Date,
        },
        {
          curId: rubRes.Cur_ID,
          curAbbreviation: 'RUB',
          curScale: rubRes.Cur_Scale,
          curName: rubRes.Cur_Name,
          curOfficialRate: rubRes.Cur_OfficialRate,
          date: rubRes.Date,
        },
      ];

      mockStore.updateRates(liveRates);
      return liveRates;
    } catch {
      return mockStore.getRates();
    }
  }

  public async getTransactions(): Promise<Transaction[]> {
    return mockStore.getTransactions();
  }

  public calculateConversion(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    amount: number
  ): number {
    return mockStore.calculateExchange(fromCurrency, toCurrency, amount);
  }
}

export const api = new ApiService();
