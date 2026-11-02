import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider, useToast } from '@/context/ToastContext';
import { AppLayout } from '@/components/layout/AppLayout';
import type { NavTab } from '@/components/layout/Sidebar';
import { DashboardView } from '@/views/DashboardView';
import { TransfersView } from '@/views/TransfersView';
import { ExchangeView } from '@/views/ExchangeView';
import { RatesView } from '@/views/RatesView';
import { AuthModal } from '@/components/modals/AuthModal';
import { api } from '@/services/api';
import type { Account } from '@/types';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { error } = useToast();
  const [account, setAccount] = useState<Account | null>(null);
  const [isAccountLoading, setIsAccountLoading] = useState<boolean>(false);

  // If not authenticated, default tab is 'rates' (Live NBRB exchange rates)
  const [currentTab, setCurrentTab] = useState<NavTab>(() =>
    isAuthenticated ? 'dashboard' : 'rates'
  );

  const fetchAccount = useCallback(async () => {
    if (!isAuthenticated) {
      setAccount(null);
      return;
    }
    setIsAccountLoading(true);
    try {
      const data = await api.getAccount();
      setAccount(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось загрузить счет';
      error('Ошибка загрузки счета', msg);
    } finally {
      setIsAccountLoading(false);
    }
  }, [isAuthenticated, error]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAccount();
      setCurrentTab('dashboard');
    } else {
      setAccount(null);
      setCurrentTab('rates');
    }
  }, [isAuthenticated, fetchAccount]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/30" />
          <p className="text-sm text-slate-500 font-semibold">Загрузка Banking Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppLayout account={account}>
        {(activeTab, setTab) => {
          // Sync with state if changed
          const tab = activeTab || currentTab;
          switch (tab) {
            case 'rates':
              return <RatesView />;
            case 'dashboard':
              return (
                <DashboardView
                  account={account}
                  onRefreshAccount={fetchAccount}
                  onNavigateTab={setTab}
                  isLoading={isAccountLoading}
                />
              );
            case 'transfers':
              return (
                <TransfersView
                  account={account}
                  onTransferSuccess={fetchAccount}
                />
              );
            case 'exchange':
              return (
                <ExchangeView
                  account={account}
                  onExchangeSuccess={fetchAccount}
                />
              );
            default:
              return <RatesView />;
          }
        }}
      </AppLayout>

      {/* Global Auth Modal for Login & Registration */}
      <AuthModal />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MainAppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
