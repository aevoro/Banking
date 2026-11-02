import React from 'react';
import { LayoutDashboard, ArrowLeftRight, TrendingUp, RefreshCw, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { NavTab } from './Sidebar';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { isAuthenticated, openAuthModal } = useAuth();

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    requiresAuth?: boolean;
  }> = [
    {
      id: 'rates',
      label: 'Курсы',
      icon: TrendingUp,
      requiresAuth: false,
    },
    {
      id: 'dashboard',
      label: 'Счета',
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
      label: 'Обмен',
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
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0e1322]/95 pb-safe shadow-lg"
      aria-label="Основная мобильная навигация"
    >
      <div className="flex items-center justify-around h-18 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isLocked = item.requiresAuth && !isAuthenticated;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-colors relative ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all relative ${
                  isActive ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                {isLocked && (
                  <Lock className="w-2.5 h-2.5 text-slate-400 absolute top-1 right-1" aria-hidden="true" />
                )}
              </div>
              <span className="text-xs mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
