import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  RefreshCw,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Copy,
  Check,
  Eye,
  EyeOff,
  UserCheck,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { maskAccountNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import type { Account } from '@/types';

export type NavTab = 'dashboard' | 'transfers' | 'exchange' | 'rates';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  account: Account | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  account,
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const [showFullIban, setShowFullIban] = React.useState(false);

  const handleCopyIban = () => {
    if (account?.accountNumber) {
      navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    requiresAuth?: boolean;
  }> = [
    {
      id: 'rates',
      label: 'Курсы НБРБ',
      icon: TrendingUp,
      requiresAuth: false,
    },
    {
      id: 'dashboard',
      label: 'Обзор счетов',
      icon: LayoutDashboard,
      requiresAuth: true,
    },
    {
      id: 'transfers',
      label: 'Переводы',
      icon: ArrowLeftRight,
      requiresAuth: true,
    },
    {
      id: 'exchange',
      label: 'Обмен валют',
      icon: RefreshCw,
      requiresAuth: true,
    },
  ];

  const handleTabClick = (item: typeof navItems[0]) => {
    if (item.requiresAuth && !isAuthenticated) {
      openAuthModal('login');
      return;
    }
    onSelectTab(item.id);
  };

  return (
    <aside className="hidden md:flex flex-col w-80 border-r border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#0e1322]/95 backdrop-blur-md shrink-0 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-4 px-8 h-24 border-b border-slate-100 dark:border-slate-800/80">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25">
          <svg
            className="w-7 h-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        </div>
        <div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            BNKG Ledger
          </span>
          <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            Банковский сервис
          </span>
        </div>
      </div>

      {/* User Status Card */}
      <div className="p-5 mx-6 my-6 rounded-2xl bg-slate-50 dark:bg-[#131b2e]/90 border border-slate-200/80 dark:border-slate-800/80">
        {isAuthenticated && user ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/60">
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Клиент</span>
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span
                className="font-mono font-medium truncate max-w-[170px]"
                title={showFullIban ? 'Скрыть номер счета' : 'Показать полный номер счета'}
              >
                {account ? maskAccountNumber(account.accountNumber, showFullIban) : '••••'}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFullIban(!showFullIban)}
                  className="p-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  title={showFullIban ? 'Скрыть номер счета' : 'Показать полный номер счета'}
                  aria-label="Переключить видимость номера счета"
                >
                  {showFullIban ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopyIban}
                  className="p-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  title="Скопировать полный IBAN"
                  aria-label="Скопировать полный IBAN"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                Гостевой доступ
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Доступен просмотр курсов валют
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              className="w-full"
              onClick={() => openAuthModal('login')}
              leftIcon={<LogIn className="w-4 h-4" aria-hidden="true" />}
            >
              Войти в аккаунт
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isLocked = item.requiresAuth && !isAuthenticated;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item)}
              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-base font-bold transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border dark:border-emerald-800/50'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {isLocked && (
                <Lock className="w-4 h-4 text-slate-500" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Theme & Auth Footer */}
      <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-5 h-5 text-amber-400" aria-hidden="true" />
              <span>Светлая тема</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 text-slate-600" aria-hidden="true" />
              <span>Тёмная тема</span>
            </>
          )}
        </button>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={logout}
            className="flex items-center justify-center p-3 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Выйти из аккаунта"
            aria-label="Выйти из аккаунта"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="flex items-center justify-center p-3 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            title="Войти"
            aria-label="Войти"
          >
            <LogIn className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
};
