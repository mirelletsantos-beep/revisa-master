import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';
import { Revision } from '../types';
import { format, startOfDay, endOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { getStatusColor, calculateRevisionDate } from '../utils';

export default function Dashboard() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'revisions'),
      where('userId', '==', auth.currentUser.uid),
      where('status', 'in', ['Agendada', 'Pendente'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Revision));
      setRevisions(revs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'revisions');
    });

    return unsubscribe;
  }, []);

  const today = startOfDay(new Date());
  
  const todayRevisions = revisions.filter(r => {
    const scheduled = startOfDay(new Date(r.scheduledDate));
    return scheduled.getTime() === today.getTime() && r.status === 'Agendada';
  });

  const pendingRevisions = revisions.filter(r => {
    const scheduled = startOfDay(new Date(r.scheduledDate));
    return isBefore(scheduled, today) || r.status === 'Pendente';
  });

  const handleMarkAsRevised = async (revision: Revision, isPending: boolean = false) => {
    if (!revision.id) return;
    
    const now = new Date();
    const nowISO = now.toISOString();

    try {
      // 1. Update current revision
      try {
        await updateDoc(doc(db, 'revisions', revision.id), {
          status: 'Concluída',
          completedDate: nowISO,
          // If it was pending, we might want to store the real date vs original
          ...(isPending ? { realDate: nowISO } : {})
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `revisions/${revision.id}`);
      }

      // 2. Recalculate all future revisions for this study
      const q = query(
        collection(db, 'revisions'),
        where('userId', '==', auth.currentUser.uid),
        where('studyId', '==', revision.studyId),
        where('status', '==', 'Agendada')
      );
      
      let futureRevsSnapshot;
      try {
        futureRevsSnapshot = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'revisions');
        return;
      }

      const updatePromises = futureRevsSnapshot.docs.map(revDoc => {
        const revData = revDoc.data() as Revision;
        const nextDate = calculateRevisionDate(now, revData.type);
        return updateDoc(doc(db, 'revisions', revDoc.id), {
          scheduledDate: nextDate.toISOString()
        }).catch(error => handleFirestoreError(error, OperationType.UPDATE, `revisions/${revDoc.id}`));
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Erro ao atualizar revisão:", error);
    }
  };

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
        <h2 className="text-2xl font-bold text-slate-900">Bom dia, {auth.currentUser?.displayName?.split(' ')[0] || 'Estudante'}!</h2>
        <p className="text-slate-500">Aqui estão suas revisões para hoje.</p>
      </header>

      {pendingRevisions.length > 0 && (
        <section className="bg-rose-50 border border-rose-100 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-rose-600 mb-4">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-bold">Você possui revisões pendentes</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRevisions.map(rev => (
              <RevisionCard 
                key={rev.id} 
                revision={rev} 
                isPending 
                onMarkRevised={() => handleMarkAsRevised(rev, true)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-3 text-slate-900 mb-6">
          <CalendarIcon className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-bold">Revisões de Hoje</h3>
        </div>
        
        {todayRevisions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-slate-300 w-8 h-8" />
            </div>
            <p className="text-slate-500">Nenhuma revisão agendada para hoje. Aproveite para estudar algo novo!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {todayRevisions.map(rev => (
              <RevisionCard 
                key={rev.id} 
                revision={rev} 
                onMarkRevised={() => handleMarkAsRevised(rev)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface RevisionCardProps {
  revision: Revision;
  isPending?: boolean;
  onMarkRevised: () => void;
}

function RevisionCard({ revision, isPending, onMarkRevised }: RevisionCardProps) {
  const studyDate = revision.studyDate ? new Date(revision.studyDate) : new Date(revision.originalScheduledDate);
  // If studyDate was not stored, estimate it (originalScheduledDate - 1 day for 24h)
  if (!revision.studyDate && revision.type === '24h') {
    studyDate.setDate(studyDate.getDate() - 1);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col h-full hover:shadow-lg transition-all group">
      <div className="flex-1 space-y-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900 leading-tight">{revision.subject}</h4>
          <p className="text-slate-600 font-medium mt-1">{revision.topic}</p>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Data de estudo:</span>
            <span className="font-semibold text-slate-700">{format(studyDate, 'dd/MM/yyyy')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-indigo-600 font-bold">{revision.type}</span>
            <span className="font-semibold text-slate-700">{format(new Date(revision.scheduledDate), 'dd/MM/yyyy')}</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={onMarkRevised}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isPending ? 'Revisar Hoje' : 'Marcar como revisado'}
        </button>
      </div>
    </div>
  );
}
