import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import {
  RefreshCw,
  ArrowUpDown,
  TrendingUp,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Account, CurrencyCode } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface ExchangeViewProps {
  account: Account | null;
  onExchangeSuccess: () => Promise<void>;
}

const SUPPORTED_CURRENCIES: CurrencyCode[] = ['BYN', 'USD', 'EUR', 'RUB'];

export const ExchangeView: React.FC<ExchangeViewProps> = ({
  account,
  onExchangeSuccess,
}) => {
  const { success, error } = useToast();
  const { openAuthModal } = useAuth();

  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('BYN');
  const [amountStr, setAmountStr] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastExchange, setLastExchange] = useState<{
    fromAmount: number;
    fromCurrency: CurrencyCode;
    toAmount: number;
    toCurrency: CurrencyCode;
  } | null>(null);

  const numericAmount = parseFloat(amountStr) || 0;

  // Source wallet balance
  const sourceWallet = account?.balances.find((b) => b.currency === fromCurrency);
  const availableBalance = sourceWallet?.balance || 0;

  // Calculate target conversion
  const targetAmount = useMemo(() => {
    if (numericAmount <= 0) return 0;
    return api.calculateConversion(fromCurrency, toCurrency, numericAmount);
  }, [fromCurrency, toCurrency, numericAmount]);

  // Unit rate (1 fromCurrency in toCurrency)
  const unitRate = useMemo(() => {
    return api.calculateConversion(fromCurrency, toCurrency, 1);
  }, [fromCurrency, toCurrency]);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handlePercentageClick = (percentage: number) => {
    const calculated = (availableBalance * percentage) / 100;
    setAmountStr(calculated.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLastExchange(null);

    if (fromCurrency === toCurrency) {
      error('Ошибка', 'Валюты списания и зачисления должны различаться');
      return;
    }

    if (numericAmount <= 0) {
      error('Недопустимая сумма', 'Введите сумму для обмена');
      return;
    }

    if (numericAmount > availableBalance) {
      error(
        'Недостаточно средств',
        `На балансе ${fromCurrency} доступно ${formatCurrency(availableBalance, fromCurrency)}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.exchange({
        fromCurrency,
        toCurrency,
        amount: numericAmount,
      });

      setLastExchange({
        fromAmount: numericAmount,
        fromCurrency,
        toAmount: res.targetAmount,
        toCurrency,
      });

      success(
        'Обмен завершен!',
        `Списано ${formatCurrency(numericAmount, fromCurrency)}, зачислено ${formatCurrency(res.targetAmount, toCurrency)}`
      );

      setAmountStr('');
      await onExchangeSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка при обмене валюты';
      error('Ошибка операции', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) {
    return (
      <Card className="max-w-2xl mx-auto p-12 text-center space-y-4 my-8 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Lock className="w-8 h-8" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          Требуется авторизация
        </h2>
        <p className="text-base text-slate-500 max-w-md mx-auto">
          Для совершения валютно-обменных операций между счетами необходимо войти в личный кабинет.
        </p>
        <div className="pt-2">
          <Button size="lg" variant="primary" onClick={() => openAuthModal('login')}>
            Войти в аккаунт
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-800 dark:text-slate-200">
        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-bold text-slate-900 dark:text-white">
            Мгновенная конвертация по курсу НБРБ
          </p>
          <p className="text-slate-600 dark:text-slate-400 mt-0.5">
            Конвертация рассчитывается напрямую или через транзитный курс BYN в соответствии с регламентом Национального Банка РБ.
          </p>
        </div>
      </div>

      {lastExchange && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Конвертация выполнена
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {formatCurrency(lastExchange.fromAmount, lastExchange.fromCurrency)} ➔ {formatCurrency(lastExchange.toAmount, lastExchange.toCurrency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Exchange Card */}
      <Card className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Box 1: You Send */}
          <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Отдаете
              </span>
              <span className="text-slate-500 font-medium">
                Доступно: {formatCurrency(availableBalance, fromCurrency)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Input
                type="number"
                step="any"
                min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="text-xl font-bold"
                required
              />

              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value as CurrencyCode)}
                className="h-12 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageClick(pct)}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                >
                  {pct === 100 ? 'Весь остаток' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              type="button"
              onClick={handleSwapCurrencies}
              className="p-3 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 hover:text-emerald-500 dark:text-slate-200 dark:hover:text-emerald-400 shadow-sm hover:shadow-md hover:rotate-180 transition-all duration-300"
              title="Поменять валюты местами"
              aria-label="Поменять валюты местами"
            >
              <ArrowUpDown className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Box 2: You Receive */}
          <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Получаете (расчет)
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Без скрытых комиссий
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-12 px-4 flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {targetAmount.toFixed(2)}
              </div>

              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value as CurrencyCode)}
                className="h-12 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Exchange Rate Quote Banner */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
            <span>Официальный курс:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              1 {fromCurrency} = {unitRate.toFixed(4)} {toCurrency}
            </span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            disabled={
              numericAmount <= 0 ||
              numericAmount > availableBalance ||
              fromCurrency === toCurrency
            }
            leftIcon={<RefreshCw className="w-5 h-5" aria-hidden="true" />}
          >
            Обменять на {formatCurrency(targetAmount, toCurrency)}
          </Button>
        </form>
      </Card>
    </div>
  );
};
