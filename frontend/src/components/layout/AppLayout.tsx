import React, { useState, useEffect } from 'react';
import { Sidebar, type NavTab } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import type { Account } from '@/types';

interface AppLayoutProps {
  children: (tab: NavTab, setTab: (tab: NavTab) => void) => React.ReactNode;
  account: Account | null;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, account }) => {
  const [currentTab, setCurrentTab] = useState<NavTab>(() => (!account ? 'rates' : 'dashboard'));

  useEffect(() => {
    if (account) {
      setCurrentTab('dashboard');
    }
  }, [account]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f19] overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar (Wide & Comfortable) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        account={account}
      />

      {/* Main Body */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header currentTab={currentTab} />

        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 pb-28 md:pb-14">
          <div className="max-w-[1480px] w-full mx-auto space-y-9">
            {children(currentTab, setCurrentTab)}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
      </div>
    </div>
  );
};
