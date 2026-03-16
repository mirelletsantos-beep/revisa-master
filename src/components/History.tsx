import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Revision } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';
import { format, startOfDay, endOfDay, isBefore } from 'date-fns';
import { ChevronRight, ChevronDown, BookOpen, FileText, Calendar, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GroupedRevisions {
  [subject: string]: {
    [topic: string]: Revision[];
  };
}

export default function History() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [activeSubTab, setActiveSubTab] = useState<'hoje' | 'pendentes' | 'todas'>('todas');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'revisions'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Revision));
      setRevisions(revs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'revisions');
    });

    return unsubscribe;
  }, []);

  const toggleSubject = (subject: string) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(subject)) newSet.delete(subject);
    else newSet.add(subject);
    setExpandedSubjects(newSet);
  };

  const toggleTopic = (topicKey: string) => {
    const newSet = new Set(expandedTopics);
    if (newSet.has(topicKey)) newSet.delete(topicKey);
    else newSet.add(topicKey);
    setExpandedTopics(newSet);
  };

  const handleDeleteAll = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Tudo',
      message: 'Tem certeza que deseja apagar TODO o seu histórico? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        const batch = writeBatch(db);
        
        // Delete all revisions
        revisions.forEach(rev => {
          if (rev.id) batch.delete(doc(db, 'revisions', rev.id));
        });

        // Delete all studies for the user
        try {
          const studiesQuery = query(
            collection(db, 'studies'),
            where('userId', '==', auth.currentUser?.uid)
          );
          const studiesSnapshot = await getDocs(studiesQuery).catch(err => handleFirestoreError(err, OperationType.GET, 'studies'));
          studiesSnapshot.forEach(studyDoc => {
            batch.delete(doc(db, 'studies', studyDoc.id));
          });

          await batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, 'batch-delete-all'));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error("Erro ao apagar histórico:", error);
        }
      }
    });
  };

  const handleDeleteTopic = async (e: React.MouseEvent, topic: string, topicRevisions: Revision[]) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Assunto',
      message: `Tem certeza que deseja apagar o assunto "${topic}" e todas as suas revisões?`,
      onConfirm: async () => {
        const batch = writeBatch(db);
        
        // Delete revisions
        topicRevisions.forEach(rev => {
          if (rev.id) batch.delete(doc(db, 'revisions', rev.id));
        });

        // Delete associated study document if studyId exists
        const studyId = topicRevisions[0]?.studyId;
        if (studyId) {
          batch.delete(doc(db, 'studies', studyId));
        }

        try {
          await batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, 'batch-delete-topic'));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error("Erro ao apagar assunto:", error);
        }
      }
    });
  };

  const today = startOfDay(new Date());
  const endOfToday = endOfDay(new Date());

  const filteredRevisions = revisions.filter(r => {
    if (activeSubTab === 'todas') return true;
    
    const scheduled = new Date(r.scheduledDate);
    if (activeSubTab === 'hoje') {
      return scheduled >= today && scheduled <= endOfToday && r.status === 'Agendada';
    }
    if (activeSubTab === 'pendentes') {
      return isBefore(startOfDay(scheduled), today) && r.status !== 'Concluída';
    }
    return true;
  });

  const grouped: GroupedRevisions = filteredRevisions.reduce((acc, rev) => {
    if (!acc[rev.subject]) acc[rev.subject] = {};
    if (!acc[rev.subject][rev.topic]) acc[rev.subject][rev.topic] = [];
    acc[rev.subject][rev.topic].push(rev);
    return acc;
  }, {} as GroupedRevisions);

  const sortedSubjects = Object.keys(grouped).sort();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Histórico de Revisões</h2>
          <p className="text-slate-500">Organizado por matéria e assunto para facilitar sua consulta.</p>
        </div>
        {revisions.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-sm font-bold"
          >
            <Trash2 className="w-4 h-4" />
            Apagar Tudo
          </button>
        )}
      </header>

      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('hoje')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'hoje' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Hoje
        </button>
        <button
          onClick={() => setActiveSubTab('pendentes')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'pendentes' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Pendentes
        </button>
        <button
          onClick={() => setActiveSubTab('todas')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'todas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Todas
        </button>
      </div>

      {sortedSubjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500">
            {activeSubTab === 'hoje' ? 'Nenhuma revisão para hoje.' : 
             activeSubTab === 'pendentes' ? 'Nenhuma revisão pendente.' : 
             'Você ainda não registrou nenhum estudo.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSubjects.map(subject => {
            const subjectRevisions = Object.values(grouped[subject]).flat();
            return (
              <div key={subject} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="flex items-center group">
                  <button
                    onClick={() => toggleSubject(subject)}
                    className="flex-1 flex items-center justify-between p-6 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{subject}</h3>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                          {Object.keys(grouped[subject]).length} {Object.keys(grouped[subject]).length === 1 ? 'Assunto' : 'Assuntos'}
                        </p>
                      </div>
                    </div>
                    {expandedSubjects.has(subject) ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {expandedSubjects.has(subject) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 bg-slate-50/50"
                    >
                      <div className="p-4 space-y-2">
                        {Object.keys(grouped[subject]).sort().map(topic => {
                          const topicKey = `${subject}-${topic}`;
                          const topicRevisions = grouped[subject][topic];
                          const sortedRevs = [...topicRevisions].sort((a, b) => {
                            const order = { '24h': 1, '7d': 2, '15d': 3, '30d': 4, '60d': 5, '120d': 6, '180d': 7 };
                            return (order[a.type as keyof typeof order] || 0) - (order[b.type as keyof typeof order] || 0);
                          });
                          
                          const studyDate = topicRevisions[0]?.studyDate 
                            ? new Date(topicRevisions[0].studyDate) 
                            : null;

                          return (
                            <div key={topic} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                              <div className="flex items-center group/topic">
                                <button
                                  onClick={() => toggleTopic(topicKey)}
                                  className="flex-1 flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <span className="font-bold text-slate-700">{topic}</span>
                                  </div>
                                  {expandedTopics.has(topicKey) ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => handleDeleteTopic(e, topic, topicRevisions)}
                                  className="p-3 mr-1 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/topic:opacity-100"
                                  title="Apagar Assunto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <AnimatePresence>
                                {expandedTopics.has(topicKey) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-slate-100 bg-white"
                                  >
                                    <div className="p-4 space-y-4">
                                      {studyDate && (
                                        <div className="flex items-center gap-3 text-sm">
                                          <Calendar className="w-4 h-4 text-indigo-500" />
                                          <span className="text-slate-500">Data de Estudo:</span>
                                          <span className="font-bold text-slate-700">{format(studyDate, 'dd/MM/yyyy')}</span>
                                        </div>
                                      )}
                                      
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {sortedRevs.map(rev => (
                                          <div key={rev.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-[10px] font-bold uppercase tracking-tighter text-indigo-600">{rev.type}</span>
                                              {rev.status === 'Concluída' && (
                                                <div className="flex items-center gap-1">
                                                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Realizada</span>
                                                  <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                              <Clock className="w-3 h-3" />
                                              <span>{format(new Date(rev.scheduledDate), 'dd/MM/yy')}</span>
                                            </div>
                                            {rev.status === 'Concluída' && rev.completedDate && (
                                              <div className="mt-1 text-[10px] text-emerald-600 font-medium">
                                                Feito em {format(new Date(rev.completedDate), 'dd/MM')}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
