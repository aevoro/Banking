import React from 'react';
import { Sun, Moon, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import type { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Обзор счетов',
    subtitle: 'Мультивалютные балансы и операционная активность',
  },
  transfers: {
    title: 'Перевод средств',
    subtitle: 'Внутренние расчеты по номеру телефона или счету IBAN',
  },
  exchange: {
    title: 'Обмен валют',
    subtitle: 'Мгновенная конвертация между вашими валютными счетами',
  },
  rates: {
    title: 'Курсы валют',
    subtitle: 'Официальные котировки Нацбанка РБ (НБРБ) и калькулятор',
  },
};

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const tabInfo = TAB_TITLES[currentTab];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-24 px-6 md:px-12 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0e1322]/85">
      {/* Mobile brand & Desktop title */}
      <div>
        <div className="md:hidden flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-sm">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
            BNKG Ledger
          </span>
        </div>

        <div className="hidden md:block">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {tabInfo.title}
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
            {tabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="md:hidden p-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Сменить тему"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" aria-hidden="true" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" aria-hidden="true" />
          )}
        </button>

        {isAuthenticated && user ? (
          <>
            {/* Mobile Logout */}
            <button
              type="button"
              onClick={logout}
              className="md:hidden p-3 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              aria-label="Выйти"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* User initials badge */}
            <div className="flex items-center gap-3 pl-2">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800/60 flex items-center justify-center font-bold text-base uppercase shadow-xs">
                {user.firstName?.[0] || 'U'}
                {user.lastName?.[0] || ''}
              </div>
              <span className="text-base font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">
                {user.firstName} {user.lastName}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openAuthModal('login')}
              leftIcon={<LogIn className="w-4 h-4" aria-hidden="true" />}
            >
              Войти
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="hidden sm:inline-flex"
              onClick={() => openAuthModal('register')}
              leftIcon={<UserPlus className="w-4 h-4" aria-hidden="true" />}
            >
              Регистрация
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
