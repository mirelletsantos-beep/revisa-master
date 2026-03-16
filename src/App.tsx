import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NewStudy from './components/NewStudy';
import History from './components/History';
import CalendarView from './components/CalendarView';
import ControlPanel from './components/ControlPanel';
import SubjectsView from './components/SubjectsView';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'inicio' | 'novo' | 'painel' | 'materias' | 'historico' | 'calendario';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('inicio');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'inicio' && <Dashboard />}
              {activeTab === 'novo' && <NewStudy setActiveTab={setActiveTab} />}
              {activeTab === 'painel' && <ControlPanel />}
              {activeTab === 'materias' && <SubjectsView />}
              {activeTab === 'historico' && <History />}
              {activeTab === 'calendario' && <CalendarView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
