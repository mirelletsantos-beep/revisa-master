import React from 'react';
import { Home, PlusCircle, History, Calendar, BookOpen, LayoutDashboard } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export default function MobileNav({ activeTab, setActiveTab }: MobileNavProps) {
  const menuItems = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'novo', label: 'Novo', icon: PlusCircle },
    { id: 'painel', label: 'Painel', icon: LayoutDashboard },
    { id: 'materias', label: 'Matérias', icon: BookOpen },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'calendario', label: 'Agenda', icon: Calendar },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 z-50 flex justify-around items-center">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[60px]",
            activeTab === item.id
              ? "text-indigo-600"
              : "text-slate-400"
          )}
        >
          <item.icon className={cn(
            "w-5 h-5",
            activeTab === item.id ? "text-indigo-600" : "text-slate-400"
          )} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
