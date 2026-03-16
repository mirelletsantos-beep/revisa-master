import React from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase';
import { LogOut, BookOpen } from 'lucide-react';

interface MobileHeaderProps {
  user: User;
}

export default function MobileHeader({ user }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-100">
          <BookOpen className="text-white w-5 h-5" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Revisa Master</h1>
      </div>

      <div className="flex items-center gap-3">
        <img
          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=6366f1&color=fff`}
          alt="User"
          className="w-8 h-8 rounded-full border border-slate-100"
          referrerPolicy="no-referrer"
        />
        <button
          onClick={() => auth.signOut()}
          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
