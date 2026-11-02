import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import {
  ArrowLeftRight,
  Phone,
  CreditCard,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Account, CurrencyCode } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { isValidBelarusPhone, isValidIban } from '@/utils/validators';

interface TransfersViewProps {
  account: Account | null;
  onTransferSuccess: () => Promise<void>;
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  account,
  onTransferSuccess,
}) => {
  const { success, error } = useToast();
  const { openAuthModal } = useAuth();

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(
    account?.balances[0]?.currency || 'BYN'
  );
  const [recipientType, setRecipientType] = useState<'phone' | 'account'>('phone');
  const [recipientValue, setRecipientValue] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<{
    amount: number;
    currency: CurrencyCode;
    recipient: string;
    id: string;
  } | null>(null);

  const activeWallet = account?.balances.find((b) => b.currency === selectedCurrency);
  const availableBalance = activeWallet?.balance || 0;
  const numericAmount = parseFloat(amountStr) || 0;

  const handlePercentageClick = (percentage: number) => {
    const calculated = (availableBalance * percentage) / 100;
    setAmountStr(calculated.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLastSuccess(null);

    // Validate recipient
    if (recipientType === 'phone') {
      if (!isValidBelarusPhone(recipientValue)) {
        error(
          'Неверный номер телефона',
          'Введите корректный белорусский номер: +375XXXXXXXXX (9 цифр)'
        );
        return;
      }
    } else {
      if (!isValidIban(recipientValue)) {
        error(
          'Неверный номер счета',
          'Номер счета должен начинаться с BY20 и содержать 28 символов'
        );
        return;
      }
    }

    // Validate amount
    if (numericAmount <= 0) {
      error('Недопустимая сумма', 'Сумма перевода должна быть больше нуля');
      return;
    }

    if (numericAmount > availableBalance) {
      error(
        'Недостаточно средств',
        `На балансе ${selectedCurrency} доступно ${formatCurrency(availableBalance, selectedCurrency)}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await api.transfer({
        currency: selectedCurrency,
        amount: numericAmount,
        recipientType,
        recipientValue,
        description: description || (recipientType === 'phone' ? `Перевод на ${recipientValue}` : `Перевод на счет ${recipientValue}`),
      });

      setLastSuccess({
        amount: numericAmount,
        currency: selectedCurrency,
        recipient: recipientValue,
        id: tx.id,
      });

      success(
        'Перевод выполнен!',
        `Списано ${formatCurrency(numericAmount, selectedCurrency)} в пользу ${recipientValue}`
      );

      // Reset fields
      setAmountStr('');
      setDescription('');
      await onTransferSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка при переводе';
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
          Для совершения переводов по номеру телефона или расчетному счету необходимо авторизоваться в системе.
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Info Banner */}
      <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-800 dark:text-slate-200">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-bold text-slate-900 dark:text-white">
            Мгновенные переводы внутри банковской сети
          </p>
          <p className="text-slate-600 dark:text-slate-400 mt-0.5">
            Операция проводится по принципу двойной записи с атомарной гарантией ACID и нулевой комиссией.
          </p>
        </div>
      </div>

      {lastSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Перевод успешно отправлен
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {formatCurrency(lastSuccess.amount, lastSuccess.currency)} → {lastSuccess.recipient}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            ID: {lastSuccess.id}
          </span>
        </div>
      )}

      {/* Main Transfer Card */}
      <Card className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Source Wallet */}
          <div className="space-y-2.5">
            <label className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Счет списания
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {account?.balances.map((w) => {
                const isSelected = selectedCurrency === w.currency;
                return (
                  <button
                    key={w.currency}
                    type="button"
                    onClick={() => setSelectedCurrency(w.currency)}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold font-mono">{w.currency}</span>
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                      {formatCurrency(w.balance, w.currency)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Recipient Type Toggle */}
          <div className="space-y-2.5">
            <label className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Способ перевода
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRecipientType('phone');
                  setRecipientValue('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  recipientType === 'phone'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>По номеру телефона</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecipientType('account');
                  setRecipientValue('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  recipientType === 'account'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" aria-hidden="true" />
                <span>По номеру счета IBAN</span>
              </button>
            </div>
          </div>

          {/* Step 3: Recipient Input */}
          <div>
            {recipientType === 'phone' ? (
              <Input
                label="Номер телефона получателя"
                type="tel"
                value={recipientValue}
                onChange={(e) => setRecipientValue(e.target.value)}
                placeholder="+375 (XX) XXX-XX-XX"
                leftIcon={<Phone className="w-5 h-5" aria-hidden="true" />}
                helperText="Белорусский номер любого оператора (+375 и 9 цифр)"
                required
              />
            ) : (
              <Input
                label="Номер счета IBAN"
                type="text"
                value={recipientValue}
                onChange={(e) => setRecipientValue(e.target.value.toUpperCase())}
                placeholder="BY20BNKG30120000000000000000"
                leftIcon={<CreditCard className="w-5 h-5" aria-hidden="true" />}
                helperText="28-значный банковский номер счета РБ (BY20...)"
                required
              />
            )}
          </div>

          {/* Step 4: Amount Input & Quick Percentage Buttons */}
          <div className="space-y-2.5">
            <Input
              label="Сумма перевода"
              type="number"
              step="any"
              min="0.01"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              rightElement={
                <span className="text-sm font-bold font-mono text-slate-500">
                  {selectedCurrency}
                </span>
              }
              helperText={`Доступно: ${formatCurrency(availableBalance, selectedCurrency)}`}
              required
            />

            <div className="flex items-center gap-2 pt-1">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageClick(pct)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {pct === 100 ? 'Весь остаток' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Step 5: Description */}
          <Input
            label="Назначение перевода / Сообщение (необязательно)"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Например: За аренду квартиры"
            leftIcon={<FileText className="w-5 h-5" aria-hidden="true" />}
          />

          {/* Calculation Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Сумма к отправке:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatCurrency(numericAmount, selectedCurrency)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Комиссия за перевод:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                0.00 {selectedCurrency} (0%)
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-extrabold text-slate-900 dark:text-white text-base">
              <span>Итого к списанию:</span>
              <span className="font-mono">
                {formatCurrency(numericAmount, selectedCurrency)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            disabled={numericAmount <= 0 || numericAmount > availableBalance}
            leftIcon={<ArrowLeftRight className="w-5 h-5" aria-hidden="true" />}
          >
            Перевести {numericAmount > 0 && formatCurrency(numericAmount, selectedCurrency)}
          </Button>
        </form>
      </Card>
    </div>
  );
};
