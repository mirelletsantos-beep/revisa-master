import React from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase';
import { Home, PlusCircle, History, Calendar, LogOut, BookOpen, LayoutDashboard } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  user: User;
}

export default function Sidebar({ activeTab, setActiveTab, user }: SidebarProps) {
  const menuItems = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'novo', label: 'Novo Estudo', icon: PlusCircle },
    { id: 'painel', label: 'Painel de Controle', icon: LayoutDashboard },
    { id: 'materias', label: 'Matérias', icon: BookOpen },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'calendario', label: 'Calendário', icon: Calendar },
  ];

  return (
    <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <BookOpen className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Revisa Master</h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
              activeTab === item.id
                ? "bg-indigo-50 text-indigo-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              activeTab === item.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
            )} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 mb-4">
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=6366f1&color=fff`}
            alt="User"
            className="w-10 h-10 rounded-full border-2 border-slate-100"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {user.displayName || 'Estudante'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
