import React, { useState } from 'react';
import type { Account, CurrencyCode } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { Check, Plus } from 'lucide-react';

interface OpenWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onSuccess: () => void;
}

const ALL_CURRENCIES: Array<{
  code: CurrencyCode;
  name: string;
  symbol: string;
  description: string;
}> = [
  {
    code: 'BYN',
    name: 'Белорусский рубль',
    symbol: 'BYN',
    description: 'Основная валюта расчетов в Республике Беларусь',
  },
  {
    code: 'USD',
    name: 'Доллар США',
    symbol: '$',
    description: 'Международная расчетная валюта (США)',
  },
  {
    code: 'EUR',
    name: 'Евро',
    symbol: '€',
    description: 'Официальная валюта стран Еврозоны',
  },
  {
    code: 'RUB',
    name: 'Российский рубль',
    symbol: '₽',
    description: 'Валюта Российской Федерации',
  },
];

export const OpenWalletModal: React.FC<OpenWalletModalProps> = ({
  isOpen,
  onClose,
  account,
  onSuccess,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const openedCurrencies = new Set(account?.balances.map((b) => b.currency) || []);

  const handleOpen = async () => {
    if (!selectedCurrency) return;

    setIsLoading(true);
    try {
      await api.openBalance({ currency: selectedCurrency });
      success('Кошелек открыт', `Валютный счет ${selectedCurrency} успешно добавлен к вашему счету.`);
      onSuccess();
      onClose();
      setSelectedCurrency(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось открыть кошелек';
      error('Ошибка открытия', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Открыть валютный кошелек"
      description="Выберите валюту, в которой хотите хранить средства и совершать операции"
    >
      <div className="mt-4 space-y-3">
        {ALL_CURRENCIES.map((curr) => {
          const isOpened = openedCurrencies.has(curr.code);
          const isSelected = selectedCurrency === curr.code;

          return (
            <div
              key={curr.code}
              onClick={() => {
                if (!isOpened) setSelectedCurrency(curr.code);
              }}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                isOpened
                  ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/40'
                  : isSelected
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ${
                    isSelected
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {curr.symbol}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                      {curr.name}
                    </span>
                    <span className="text-xs text-slate-500 font-mono font-semibold">
                      ({curr.code})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {curr.description}
                  </p>
                </div>
              </div>

              <div>
                {isOpened ? (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    Уже открыт
                  </span>
                ) : isSelected ? (
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <Check className="w-4 h-4" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Отмена
        </Button>
        <Button
          onClick={handleOpen}
          disabled={!selectedCurrency || isLoading}
          isLoading={isLoading}
        >
          Открыть кошелек
        </Button>
      </div>
    </Modal>
  );
};
