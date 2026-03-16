import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Revision } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';
import { format, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, BookOpen, Clock } from 'lucide-react';
import './Calendar.css';

export default function CalendarView() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

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

  const selectedRevisions = revisions.filter(r => isSameDay(new Date(r.scheduledDate), selectedDate));

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const dayRevisions = revisions.filter(r => isSameDay(new Date(r.scheduledDate), date));
      if (dayRevisions.length > 0) {
        return (
          <div className="flex justify-center mt-1">
            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Calendário de Estudos</h2>
        <p className="text-slate-500">Visualize seu cronograma de revisões ao longo do mês.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <Calendar
              onChange={(val) => setSelectedDate(val as Date)}
              value={selectedDate}
              locale="pt-BR"
              tileContent={tileContent}
              className="w-full border-none font-sans"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <CalendarIcon className="text-indigo-600 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</h3>
                <p className="text-xs text-slate-500">{selectedRevisions.length} revisões programadas</p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedRevisions.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Nenhuma revisão para este dia.</p>
                </div>
              ) : (
                selectedRevisions.map(rev => (
                  <div key={rev.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{rev.area}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">{rev.type}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{rev.topic}</h4>
                    <p className="text-xs text-slate-500">{rev.subject}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
