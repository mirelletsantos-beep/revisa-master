import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Revision } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';
import { startOfDay, endOfDay, isBefore, isAfter, isSameDay } from 'date-fns';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ControlPanel() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [totalStudies, setTotalStudies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch all active revisions for calculations
    const qRevisions = query(
      collection(db, 'revisions'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeRevisions = onSnapshot(qRevisions, (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Revision));
      setRevisions(revs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'revisions');
    });

    // Fetch total studies count
    const qStudies = query(
      collection(db, 'studies'),
      where('userId', '==', auth.currentUser.uid)
    );
    
    getCountFromServer(qStudies).then(snapshot => {
      setTotalStudies(snapshot.data().count);
    }).catch(err => handleFirestoreError(err, OperationType.GET, 'studies-count'));

    return () => {
      unsubscribeRevisions();
    };
  }, []);

  const today = startOfDay(new Date());
  
  const todayRevisions = revisions.filter(r => 
    isSameDay(new Date(r.scheduledDate), today) && r.status !== 'Concluída'
  );

  const pendingTasks = revisions.filter(r => 
    (isBefore(new Date(r.scheduledDate), today) || r.status === 'Pendente') && r.status !== 'Concluída'
  );

  const upcomingRevisions = revisions.filter(r => 
    isAfter(new Date(r.scheduledDate), today) && r.status !== 'Concluída'
  ).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  // Group all non-completed revisions by subject and then by topic for the hierarchical view
  const allActiveRevisions = revisions.filter(r => r.status !== 'Concluída');
  
  const groupedRevisions = allActiveRevisions.reduce((acc, rev) => {
    if (!acc[rev.subject]) {
      acc[rev.subject] = {};
    }
    if (!acc[rev.subject][rev.topic]) {
      acc[rev.subject][rev.topic] = [];
    }
    acc[rev.subject][rev.topic].push(rev);
    return acc;
  }, {} as Record<string, Record<string, Revision[]>>);

  // Sort revisions within each topic by type order
  Object.keys(groupedRevisions).forEach(subject => {
    Object.keys(groupedRevisions[subject]).forEach(topic => {
      groupedRevisions[subject][topic].sort((a, b) => {
        const order = { '24h': 1, '7d': 2, '15d': 3, '30d': 4, '60d': 5, '120d': 6, '180d': 7 };
        return (order[a.type as keyof typeof order] || 0) - (order[b.type as keyof typeof order] || 0);
      });
    });
  });

  const subjects = Object.keys(groupedRevisions).sort();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="text-indigo-600 w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Painel de Controle Inteligente</h2>
        </div>
        <p className="text-slate-500">Visão geral do seu progresso e tarefas pendentes.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Hoje</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Revisões para Hoje</h3>
          <p className="text-3xl font-black text-slate-900 mt-1">{todayRevisions.length}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Total</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Tópicos Estudados</h3>
          <p className="text-3xl font-black text-slate-900 mt-1">{totalStudies}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Futuro</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Próximas Revisões</h3>
          <p className="text-3xl font-black text-slate-900 mt-1">{upcomingRevisions.length}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Tasks */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Tarefas Pendentes
            </h3>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
              {pendingTasks.length} pendentes
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {pendingTasks.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Tudo em dia! Nenhuma tarefa pendente.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{task.topic}</h4>
                        <p className="text-xs text-slate-500">{task.subject} • {task.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-rose-500 uppercase">Atrasado</p>
                    </div>
                  </div>
                ))}
                {pendingTasks.length > 5 && (
                  <div className="p-3 text-center bg-slate-50">
                    <p className="text-xs text-slate-500 font-medium">E mais {pendingTasks.length - 5} tarefas...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Schedule */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            Cronograma de revisões
          </h3>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {subjects.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhuma revisão futura agendada.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {subjects.map((subject) => (
                  <div key={subject} className="flex flex-col">
                    <button 
                      onClick={() => {
                        setExpandedSubject(expandedSubject === subject ? null : subject);
                        setExpandedTopic(null);
                      }}
                      className="w-full p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-bold text-slate-900">{subject}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">
                            {Object.keys(groupedRevisions[subject]).length} {Object.keys(groupedRevisions[subject]).length === 1 ? 'assunto' : 'assuntos'}
                          </p>
                        </div>
                      </div>
                      {expandedSubject === subject ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {expandedSubject === subject && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-slate-50/50"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {Object.keys(groupedRevisions[subject]).sort().map((topic) => (
                              <div key={topic} className="flex flex-col space-y-1">
                                <button
                                  onClick={() => setExpandedTopic(expandedTopic === `${subject}:${topic}` ? null : `${subject}:${topic}`)}
                                  className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-200 transition-colors group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                                    <p className="text-xs font-bold text-slate-800">{topic}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                      {groupedRevisions[subject][topic].length} datas
                                    </span>
                                    {expandedTopic === `${subject}:${topic}` ? (
                                      <ChevronDown className="w-3 h-3 text-slate-300" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-slate-300" />
                                    )}
                                  </div>
                                </button>

                                <AnimatePresence>
                                  {expandedTopic === `${subject}:${topic}` && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden pl-6 pr-2 space-y-1"
                                    >
                                      {groupedRevisions[subject][topic].map((rev) => (
                                        <div key={rev.id} className={`flex items-center justify-between p-2 rounded-lg border ${
                                          rev.status === 'Pendente' ? 'bg-rose-50/30 border-rose-100/50' : 'bg-indigo-50/30 border-indigo-50/50'
                                        }`}>
                                          <div className="flex items-center gap-2">
                                            <Clock className={`w-3 h-3 ${rev.status === 'Pendente' ? 'text-rose-400' : 'text-indigo-400'}`} />
                                            <span className="text-[10px] font-medium text-slate-600">
                                              {rev.type}
                                            </span>
                                            {rev.status === 'Pendente' && (
                                              <span className="text-[8px] font-bold text-rose-500 uppercase px-1 bg-rose-50 rounded">Atrasado</span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold ${rev.status === 'Pendente' ? 'text-rose-600' : 'text-indigo-600'}`}>
                                              {new Date(rev.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
