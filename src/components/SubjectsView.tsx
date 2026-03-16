import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Revision } from '../types';
import { format } from 'date-fns';
import { BookOpen, ChevronRight, Calendar, CheckCircle2, Clock, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SubjectsView() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

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
      handleFirestoreError(error, OperationType.LIST, 'revisions');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Group data
  const subjects = Array.from(new Set(revisions.map(r => r.subject))).sort();
  
  const topicsForSubject = selectedSubject 
    ? Array.from(new Set(revisions.filter(r => r.subject === selectedSubject).map(r => r.topic))).sort()
    : [];

  const revisionsForTopic = (selectedSubject && selectedTopic)
    ? revisions.filter(r => r.subject === selectedSubject && r.topic === selectedTopic)
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    : [];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Minhas Matérias</h2>
        <p className="text-slate-500">Acompanhe seu progresso por matéria e assunto.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subjects List */}
        <div className={cn(
          "bg-white border border-slate-200 rounded-3xl p-4 shadow-sm h-[500px] lg:h-[600px] overflow-y-auto transition-all",
          selectedSubject && "hidden lg:block"
        )}>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-4 mb-4">Matérias</h3>
          <div className="space-y-1">
            {subjects.map(subject => (
              <button
                key={subject}
                onClick={() => {
                  setSelectedSubject(subject);
                  setSelectedTopic(null);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedSubject === subject 
                    ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className={`w-4 h-4 ${selectedSubject === subject ? "text-indigo-600" : "text-slate-400"}`} />
                  {subject}
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedSubject === subject ? "rotate-90" : ""}`} />
              </button>
            ))}
            {subjects.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm italic">Nenhuma matéria registrada.</p>
            )}
          </div>
        </div>

        {/* Topics List */}
        <div className={cn(
          "bg-white border border-slate-200 rounded-3xl p-4 shadow-sm h-[500px] lg:h-[600px] overflow-y-auto transition-all",
          (!selectedSubject || selectedTopic) && "hidden lg:block"
        )}>
          <div className="flex items-center justify-between px-4 mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Assuntos</h3>
            <button 
              onClick={() => setSelectedSubject(null)}
              className="lg:hidden text-xs font-bold text-indigo-600"
            >
              Voltar
            </button>
          </div>
          <AnimatePresence mode="wait">
            {!selectedSubject ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Book className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-slate-400 text-sm italic">Selecione uma matéria para ver os assuntos.</p>
              </div>
            ) : (
              <motion.div
                key={selectedSubject}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-1"
              >
                {topicsForSubject.map(topic => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      selectedTopic === topic 
                        ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate">{topic}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedTopic === topic ? "rotate-90" : ""}`} />
                  </button>
                ))}
                {topicsForSubject.length === 0 && (
                  <p className="text-center text-slate-400 py-8 text-sm italic">Nenhum assunto encontrado.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Details */}
        <div className={cn(
          "bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-[500px] lg:h-[600px] overflow-y-auto transition-all",
          !selectedTopic && "hidden lg:block"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Detalhes da Revisão</h3>
            <button 
              onClick={() => setSelectedTopic(null)}
              className="lg:hidden text-xs font-bold text-indigo-600"
            >
              Voltar
            </button>
          </div>
          <AnimatePresence mode="wait">
            {!selectedTopic ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Calendar className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-slate-400 text-sm italic">Selecione um assunto para ver o cronograma de revisões.</p>
              </div>
            ) : (
              <motion.div
                key={selectedTopic}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedTopic}</h4>
                  <p className="text-sm text-slate-500">{selectedSubject}</p>
                </div>

                <div className="space-y-4">
                  {revisionsForTopic.map((rev) => (
                    <div 
                      key={rev.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        rev.status === 'Concluída' 
                          ? "bg-emerald-50 border-emerald-100" 
                          : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase tracking-widest ${
                          rev.status === 'Concluída' ? "text-emerald-600" : "text-indigo-600"
                        }`}>
                          Revisão {rev.type}
                        </span>
                        {rev.status === 'Concluída' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Prevista:</span>
                          <span className="font-semibold text-slate-700">
                            {format(new Date(rev.scheduledDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        {rev.completedDate && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Realizada:</span>
                            <span className="font-semibold text-emerald-700">
                              {format(new Date(rev.completedDate), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Status:</span>
                          <span className={`font-bold ${
                            rev.status === 'Concluída' ? "text-emerald-600" : "text-slate-600"
                          }`}>
                            {rev.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
