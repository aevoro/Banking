import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { OpenWalletModal } from '@/components/modals/OpenWalletModal';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Eye,
  EyeOff,
  Wallet,
  ArrowLeftRight,
  Receipt,
  TrendingUp,
  LogIn,
  UserPlus,
} from 'lucide-react';
import type { Account, CurrencyCode, Transaction } from '@/types';
import type { NavTab } from '@/components/layout/Sidebar';
import { api } from '@/services/api';
import { formatCurrency, formatDate, maskAccountNumber } from '@/utils/formatters';
import { useAuth } from '@/context/AuthContext';

interface DashboardViewProps {
  account: Account | null;
  onRefreshAccount: () => Promise<void>;
  onNavigateTab: (tab: NavTab) => void;
  isLoading: boolean;
}

const CURRENCY_THEMES: Record<
  CurrencyCode,
  { bg: string; text: string; border: string; badge: string; symbol: string }
> = {
  BYN: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/30',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 dark:border dark:border-blue-800/60',
    symbol: 'BYN',
  },
  USD: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border dark:border-emerald-800/60',
    symbol: '$',
  },
  EUR: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-500/30',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300 dark:border dark:border-cyan-800/60',
    symbol: '€',
  },
  RUB: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-500/30',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 dark:border dark:border-purple-800/60',
    symbol: '₽',
  },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  account,
  onRefreshAccount,
  onNavigateTab,
  isLoading,
}) => {
  const { openAuthModal } = useAuth();
  const [isHideBalances, setIsHideBalances] = useState(false);
  const [showFullHeroIban, setShowFullHeroIban] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txFilter, setTxFilter] = useState<'all' | 'transfer' | 'exchange' | 'deposit'>('all');
  const [isTxLoading, setIsTxLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    setIsTxLoading(true);
    try {
      const data = await api.getTransactions();
      setTransactions(data);
    } catch {
      setTransactions([]);
    } finally {
      setIsTxLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Calculate total net worth in BYN equivalent
  const totalBynEquivalent = useMemo(() => {
    if (!account?.balances) return 0;
    return account.balances.reduce((total, wallet) => {
      if (wallet.currency === 'BYN') {
        return total + wallet.balance;
      }
      const converted = api.calculateConversion(wallet.currency, 'BYN', wallet.balance);
      return total + converted;
    }, 0);
  }, [account]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (txFilter === 'all') return transactions;
    return transactions.filter((t) => t.type === txFilter);
  }, [transactions, txFilter]);

  const openedCurrencies = new Set(account?.balances.map((b) => b.currency) || []);
  const hasUnopenedCurrencies = openedCurrencies.size < 4;

  if (isLoading && !account) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-52 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-9">
        {/* Guest Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#0f172a] to-[#04241a] p-8 md:p-14 text-white shadow-2xl border border-slate-800/80">
          <div className="pointer-events-none absolute -right-12 -top-12 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-48 h-64 w-64 rounded-full bg-teal-500/10 blur-2xl" />

          <div className="relative z-10 max-w-3xl space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-full border border-emerald-800/60">
              Личный кабинет Banking Ledger
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Мультивалютный банкинг с точностью двойной записи
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Откройте расчетный счет и управляйте кошельками в BYN, USD, EUR и RUB. Внутренние переводы без комиссии, официальные курсы НБРБ и полная безопасность ваших средств.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => openAuthModal('login')}
                leftIcon={<LogIn className="w-5 h-5" aria-hidden="true" />}
              >
                Войти в личный кабинет
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border-0"
                onClick={() => openAuthModal('register')}
                leftIcon={<UserPlus className="w-5 h-5" aria-hidden="true" />}
              >
                Открыть счет
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-7 space-y-3 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Мультивалютные счета
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Хранение и управление средствами в белорусских рублях (BYN), долларах (USD), евро (EUR) и российских рублях (RUB).
            </p>
          </Card>

          <Card className="p-7 space-y-3 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowLeftRight className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Переводы 0% комиссии
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Мгновенные переводы внутри сети банка по номеру телефона любого белорусского оператора или расчетному счету IBAN.
            </p>
          </Card>

          <Card className="p-7 space-y-3 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Официальные курсы НБРБ
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Прямая синхронизация с Национальным банком РБ, калькулятор конвертации и выгодный обмен валют.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-9">
      {/* Total Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#0f172a] to-[#04241a] p-8 md:p-12 text-white shadow-2xl border border-slate-800/80">
        <div className="pointer-events-none absolute -right-12 -top-12 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-48 h-64 w-64 rounded-full bg-teal-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                Совокупный баланс портфеля
              </span>
              <button
                type="button"
                onClick={() => setIsHideBalances(!isHideBalances)}
                className="text-slate-400 hover:text-white transition-colors p-1"
                title={isHideBalances ? 'Показать баланс' : 'Скрыть баланс'}
                aria-label="Скрыть или показать баланс"
              >
                {isHideBalances ? (
                  <EyeOff className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="flex items-baseline gap-3.5">
              <span className="text-5xl md:text-6xl font-black tracking-tight">
                {isHideBalances ? '••••••••' : formatCurrency(totalBynEquivalent, 'BYN')}
              </span>
              <span className="text-base font-semibold text-slate-400">эквивалент</span>
            </div>

            <div className="flex items-center gap-2.5 text-base text-slate-300">
              <span>Основной счет:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {account ? maskAccountNumber(account.accountNumber, showFullHeroIban) : '••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowFullHeroIban(!showFullHeroIban)}
                className="text-slate-400 hover:text-white transition-colors p-1"
                title={showFullHeroIban ? 'Скрыть номер счета' : 'Показать полный номер счета'}
                aria-label="Скрыть или показать номер счета"
              >
                {showFullHeroIban ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3.5">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigateTab('transfers')}
              leftIcon={<ArrowLeftRight className="w-5 h-5" aria-hidden="true" />}
            >
              Перевести
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => onNavigateTab('exchange')}
              leftIcon={<RefreshCw className="w-5 h-5" aria-hidden="true" />}
            >
              Обменять
            </Button>
            {hasUnopenedCurrencies && (
              <Button
                variant="secondary"
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border-0"
                onClick={() => setIsWalletModalOpen(true)}
                leftIcon={<Plus className="w-5 h-5" aria-hidden="true" />}
              >
                Новый кошелек
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Currency Wallets Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Валютные кошельки
            </h2>
          </div>
          <span className="text-base text-slate-500 font-medium">
            Открыто: {account?.balances.length || 0} из 4 валют
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {account?.balances.map((wallet) => {
            const theme = CURRENCY_THEMES[wallet.currency] || CURRENCY_THEMES.BYN;
            return (
              <Card
                key={wallet.currency}
                hoverable
                className={`relative overflow-hidden border-2 ${theme.border} p-6 md:p-7 min-h-[180px] rounded-3xl flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${theme.bg} ${theme.text}`}
                  >
                    {theme.symbol}
                  </div>
                  <span className={`text-sm font-mono font-bold px-3 py-1 rounded-lg ${theme.badge}`}>
                    {wallet.currency}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Остаток на кошельке</p>
                  <p className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                    {isHideBalances
                      ? '••••••'
                      : formatCurrency(wallet.balance, wallet.currency)}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Статус</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Активен
                  </span>
                </div>
              </Card>
            );
          })}

          {/* Plus Add New Wallet Card */}
          {hasUnopenedCurrencies && (
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="flex flex-col items-center justify-center p-6 md:p-7 rounded-3xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 dark:border-slate-700 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/20 transition-all text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 group min-h-[180px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950 flex items-center justify-center text-slate-600 group-hover:text-emerald-600 transition-colors mb-2.5">
                <Plus className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-base font-bold">Открыть валюту</span>
              <span className="text-xs text-slate-400 mt-1">USD, EUR или RUB</span>
            </button>
          )}
        </div>
      </div>

      {/* Recent Transactions Section */}
      <Card className="p-6 md:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              История операций
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Все' },
              { id: 'transfer', label: 'Переводы' },
              { id: 'exchange', label: 'Обмен' },
              { id: 'deposit', label: 'Пополнения' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTxFilter(f.id as typeof txFilter)}
                className={`text-sm px-3.5 py-1.5 rounded-xl font-semibold transition-colors ${
                  txFilter === f.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Feed */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
          {isTxLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Receipt className="w-7 h-7" aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                Операций пока нет
              </p>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Совершите перевод по номеру телефона или обмен валют, и проводка отобразится здесь.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigateTab('transfers')}
                leftIcon={<ArrowLeftRight className="w-4 h-4" aria-hidden="true" />}
              >
                Сделать перевод
              </Button>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isDeposit = tx.type === 'deposit';
              const isExchange = tx.type === 'exchange';

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDeposit
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : isExchange
                          ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownLeft className="w-5 h-5" aria-hidden="true" />
                      ) : isExchange ? (
                        <RefreshCw className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" aria-hidden="true" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{formatDate(tx.createdAt)}</span>
                        {tx.recipientPhone && <span>• {tx.recipientPhone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-base font-extrabold font-mono ${
                        isDeposit
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isExchange
                          ? 'text-teal-600 dark:text-teal-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {isDeposit ? '+' : isExchange ? '⇄ ' : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </p>
                    {isExchange && tx.targetCurrency && tx.targetAmount && (
                      <p className="text-xs text-emerald-600 font-mono font-medium">
                        +{formatCurrency(tx.targetAmount, tx.targetCurrency)}
                      </p>
                    )}
                    <span className="text-xs text-slate-400 uppercase font-medium">
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Modal */}
      <OpenWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        account={account}
        onSuccess={async () => {
          await onRefreshAccount();
          await loadTransactions();
        }}
      />
    </div>
  );
};
