import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { Area, RevisionType } from '../types';
import { calculateRevisionDate } from '../utils';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';
import { BookPlus, Upload, FileText, X, CheckCircle, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

const SUBJECTS: { name: string; area: Area; isHeader?: boolean; isBold?: boolean }[] = [
  { name: 'Linguagens e Códigos', area: 'Linguagens', isHeader: true },
  { name: 'Português', area: 'Linguagens' },
  { name: 'Literatura', area: 'Linguagens' },
  { name: 'Inglês', area: 'Linguagens' },
  { name: 'Espanhol', area: 'Linguagens' },
  { name: 'Artes', area: 'Linguagens' },
  { name: 'Educação Fisica', area: 'Linguagens' },
  { name: 'Ciências da Natureza', area: 'Ciências da Natureza', isHeader: true },
  { name: 'Física', area: 'Ciências da Natureza' },
  { name: 'Química', area: 'Ciências da Natureza' },
  { name: 'Biologia', area: 'Ciências da Natureza' },
  { name: 'Ciências Humanas', area: 'Ciências Humanas', isHeader: true },
  { name: 'História', area: 'Ciências Humanas' },
  { name: 'Geografia', area: 'Ciências Humanas' },
  { name: 'Filosofia', area: 'Ciências Humanas' },
  { name: 'Sociologia', area: 'Ciências Humanas' },
  { name: 'Matemática e suas Tecnologias', area: 'Matemática', isHeader: true },
  { name: 'Matemática', area: 'Matemática' },
  { name: 'Redação', area: 'Redação' }
];

interface NewStudyProps {
  setActiveTab: (tab: any) => void;
}

export default function NewStudy({ setActiveTab }: NewStudyProps) {
  const [subject, setSubject] = useState('');
  const [studyDate, setStudyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      let pdfUrl = '';
      let pdfName = '';

      if (file) {
        const fileRef = ref(storage, `studies/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        pdfUrl = await getDownloadURL(fileRef);
        pdfName = file.name;
      }

      const selectedSubject = SUBJECTS.find(s => s.name === subject);
      const area = selectedSubject?.area || 'Linguagens';

      const studyData = {
        userId: auth.currentUser.uid,
        area,
        subject,
        topic,
        description,
        pdfUrl,
        pdfName,
        createdAt: new Date(studyDate + 'T12:00:00').toISOString()
      };

      const studyDoc = await addDoc(collection(db, 'studies'), studyData).catch(err => handleFirestoreError(err, OperationType.CREATE, 'studies'));

      // Generate revisions
      const revisionTypes: RevisionType[] = ['24h', '7d', '15d', '30d', '60d', '120d', '180d'];
      const baseDate = new Date(studyDate + 'T12:00:00');

      const revisionPromises = revisionTypes.map(type => {
        const scheduledDate = calculateRevisionDate(baseDate, type);
        return addDoc(collection(db, 'revisions'), {
          userId: auth.currentUser!.uid,
          studyId: studyDoc.id,
          type,
          scheduledDate: scheduledDate.toISOString(),
          originalScheduledDate: scheduledDate.toISOString(),
          status: 'Agendada',
          subject,
          topic,
          area,
          studyDate: baseDate.toISOString()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'revisions'));
      });

      await Promise.all(revisionPromises);
      
      setSuccess(true);
      setTimeout(() => {
        setActiveTab('inicio');
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao salvar estudo:", error);
      let message = "Ocorreu um erro ao salvar seu estudo.";
      
      if (error.code === 'storage/retry-limit-exceeded') {
        message = "Erro ao fazer upload do PDF. Verifique se o Firebase Storage está ativado no seu Console do Firebase.";
      } else if (error.code === 'storage/unauthorized') {
        message = "Você não tem permissão para fazer upload de arquivos.";
      } else if (error.message && error.message.includes('Missing or insufficient permissions')) {
        message = "Erro de permissão no banco de dados. Verifique as regras do Firestore.";
      }
      
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-10 h-10" />
        </motion.div>
        <h3 className="text-2xl font-bold text-slate-900">Estudo Registrado!</h3>
        <p className="text-slate-500 mt-2">Suas revisões foram agendadas automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Novo Estudo</h2>
        <p className="text-slate-500">Registre o que você estudou hoje para organizar suas revisões.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Matéria</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">Selecione a matéria</option>
              {SUBJECTS.map(s => (
                <option 
                  key={s.name} 
                  value={s.name} 
                  disabled={s.isHeader}
                  className={`${s.isHeader ? "font-bold text-slate-900 bg-slate-100" : ""} ${s.isBold ? "font-bold text-slate-900" : ""}`}
                >
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Data do Estudo</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                required
                value={studyDate}
                onChange={(e) => setStudyDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Assunto</label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: Termodinâmica, Revolução Francesa..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Descrição (Opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Observações sobre o estudo..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Anexar PDF (Opcional)</label>
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="flex items-center justify-center gap-3 w-full px-4 py-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group"
            >
              {file ? (
                <div className="flex items-center gap-3 text-indigo-600">
                  <FileText className="w-6 h-6" />
                  <span className="font-medium">{file.name}</span>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); setFile(null); }}
                    className="p-1 hover:bg-indigo-100 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-indigo-500" />
                  <p className="text-sm text-slate-500">Clique para fazer upload de um resumo ou lista em PDF</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <BookPlus className="w-5 h-5" />
              Registrar Estudo
            </>
          )}
        </button>
      </form>
    </div>
  );
}
