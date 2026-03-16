import React, { useState, useEffect } from 'react';
import { Revision, Question, SimulationResult } from '../types';
import { generateSimulation } from '../services/gemini';
import { X, BrainCircuit, CheckCircle2, XCircle, ChevronRight, ChevronLeft, Award, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface SimulationModalProps {
  revision: Revision;
  onClose: () => void;
  onFinish?: () => void;
}

export default function SimulationModal({ revision, onClose, onFinish }: SimulationModalProps) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadQuestions() {
      try {
        const data = await generateSimulation(revision.subject, revision.topic);
        setQuestions(data);
      } catch (err) {
        setError('Não foi possível gerar o simulado agora. Tente novamente em instantes.');
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [revision]);

  const handleOptionSelect = (optionIndex: number) => {
    if (showResult || answeredQuestions.has(currentQuestionIndex)) return;
    
    setSelectedOptions({ ...selectedOptions, [currentQuestionIndex]: optionIndex });
    setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedOptions[idx] === q.correctAnswer) {
        score++;
      }
    });
    return score;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Simulado: {revision.topic}</h3>
              <p className="text-xs text-slate-500">{revision.subject} • 10 Questões</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
              <h4 className="text-xl font-bold text-slate-900">Gerando seu simulado...</h4>
              <p className="text-slate-500 mt-2">Nossa IA está preparando 10 questões exclusivas baseadas no ENEM.</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
              <p className="text-slate-900 font-bold text-lg">{error}</p>
              <button onClick={onClose} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Voltar</button>
            </div>
          ) : showResult ? (
            <div className="space-y-8">
              <div className="text-center py-8 bg-indigo-50 rounded-3xl border border-indigo-100">
                <Award className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                <h4 className="text-3xl font-black text-slate-900">Resultado</h4>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-black text-indigo-600">{calculateScore()}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Acertos</p>
                  </div>
                  <div className="w-px h-12 bg-indigo-200"></div>
                  <div className="text-center">
                    <p className="text-4xl font-black text-slate-400">{questions.length - calculateScore()}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Erros</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h5 className="font-bold text-slate-900 text-lg">Revisão das Questões</h5>
                {questions.map((q, idx) => (
                  <div key={idx} className={`p-6 rounded-2xl border ${selectedOptions[idx] === q.correctAnswer ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="flex items-start gap-3 mb-4">
                      {selectedOptions[idx] === q.correctAnswer ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                      )}
                      <p className="font-bold text-slate-900">{idx + 1}. {q.question}</p>
                    </div>
                    
                    <div className="space-y-2 ml-9">
                      {q.options.map((opt, optIdx) => (
                        <div 
                          key={optIdx} 
                          className={`p-3 rounded-xl text-sm ${
                            optIdx === q.correctAnswer 
                              ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200' 
                              : optIdx === selectedOptions[idx]
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-white/50 text-slate-600 border border-transparent'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}) {opt}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-white/80 rounded-xl border border-slate-200/50 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                          <Info className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Visão Pedagógica</span>
                        </div>
                        <div className="text-sm text-slate-700 prose prose-slate max-w-none mb-4">
                          <ReactMarkdown>{q.explanation}</ReactMarkdown>
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 mb-1 text-indigo-600">
                            <Award className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Habilidade ENEM: {q.skill}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed italic">
                            {q.skillDescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {
                  if (onFinish) onFinish();
                  onClose();
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-100"
              >
                Concluir Simulado
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Questão {currentQuestionIndex + 1} de {questions.length}</span>
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-300" 
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <h4 className="text-xl font-bold text-slate-900 leading-relaxed">
                {questions[currentQuestionIndex].question}
              </h4>

              <div className="space-y-3">
                {questions[currentQuestionIndex].options.map((option, idx) => {
                  const isSelected = selectedOptions[currentQuestionIndex] === idx;
                  const isCorrect = questions[currentQuestionIndex].correctAnswer === idx;
                  const hasAnswered = answeredQuestions.has(currentQuestionIndex);

                  let buttonClass = 'border-slate-100 bg-slate-50 hover:border-slate-200 text-slate-600';
                  let iconClass = 'bg-white text-slate-400';

                  if (hasAnswered) {
                    if (isCorrect) {
                      buttonClass = 'border-emerald-500 bg-emerald-50 text-emerald-700';
                      iconClass = 'bg-emerald-500 text-white';
                    } else if (isSelected) {
                      buttonClass = 'border-rose-500 bg-rose-50 text-rose-700';
                      iconClass = 'bg-rose-500 text-white';
                    } else {
                      buttonClass = 'border-slate-100 bg-slate-50 opacity-50 text-slate-400';
                      iconClass = 'bg-white text-slate-300';
                    }
                  } else if (isSelected) {
                    buttonClass = 'border-indigo-600 bg-indigo-50 text-indigo-700';
                    iconClass = 'bg-indigo-600 text-white';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      disabled={hasAnswered}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${buttonClass}`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${iconClass}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-medium">{option}</span>
                      {hasAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto" />}
                      {hasAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600 ml-auto" />}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {answeredQuestions.has(currentQuestionIndex) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Visão Pedagógica</p>
                          <div className="text-sm text-slate-700 prose prose-slate max-w-none mb-4">
                            <ReactMarkdown>{questions[currentQuestionIndex].explanation}</ReactMarkdown>
                          </div>
                          
                          <div className="pt-3 border-t border-indigo-100">
                            <div className="flex items-center gap-2 mb-1 text-indigo-600">
                              <Award className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Habilidade ENEM: {questions[currentQuestionIndex].skill}</span>
                            </div>
                            <p className="text-[11px] text-indigo-500/80 leading-relaxed italic">
                              {questions[currentQuestionIndex].skillDescription}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {!loading && !showResult && !error && (
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-6 py-2 font-bold text-slate-500 disabled:opacity-30 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>
            <button
              onClick={handleNext}
              disabled={selectedOptions[currentQuestionIndex] === undefined}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finalizar' : 'Próxima'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
