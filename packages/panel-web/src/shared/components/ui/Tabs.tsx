import { useState, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface TabsProps {
  tabs: Array<{ id: string; label: string; icon?: ReactNode }>;
  activeTab: string;
  onTabChange: (id: string) => void;
  children: (tabId: string) => ReactNode;
}

export function Tabs({ tabs, activeTab, onTabChange, children }: TabsProps) {
  return (
    <div>
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-atlas-600 text-atlas-600 dark:text-atlas-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-4">{children(activeTab)}</div>
    </div>
  );
}