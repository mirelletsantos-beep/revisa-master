import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { LogIn, Mail, Lock, Chrome } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode>('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      let message: React.ReactNode = "Ocorreu um erro ao entrar. Verifique suas credenciais.";
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = "E-mail ou senha incorretos.";
      } else if (err.code === 'auth/email-already-in-use') {
        message = (
          <div className="flex flex-col gap-2">
            <span>Este e-mail já está cadastrado.</span>
            <button 
              onClick={() => setIsRegistering(false)}
              className="text-indigo-600 font-bold hover:underline text-left"
            >
              Clique aqui para fazer login em vez de criar conta.
            </button>
          </div>
        );
      } else if (err.code === 'auth/weak-password') {
        message = "A senha deve ter pelo menos 6 caracteres.";
      } else if (err.code === 'auth/network-request-failed') {
        message = "Erro de conexão. Verifique sua internet.";
      } else if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        message = (
          <div className="space-y-2">
            <p>Este domínio não está autorizado no Firebase Auth.</p>
            <p className="text-xs font-mono bg-rose-100 p-2 rounded">
              Adicione este domínio em Authentication {'>'} Settings {'>'} Authorized Domains:
              <br />- {domain}
            </p>
          </div>
        );
      } else if (err.code === 'auth/operation-not-allowed') {
        message = (
          <div className="space-y-2">
            <p>O login com E-mail/Senha não está ativado no Console do Firebase.</p>
            <p className="text-xs">
              Certifique-se de que você ativou o provedor no projeto correto:
              <br />
              <span className="font-mono bg-rose-100 px-1 rounded">ID: {auth.app.options.projectId}</span>
            </p>
            <p className="text-xs">
              Vá em <b>Authentication {'>'} Sign-in method</b> e ative <b>'E-mail/Senha'</b>.
            </p>
          </div>
        );
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google login error:", err);
      let message: React.ReactNode = "Erro ao entrar com Google.";
      if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        message = (
          <div className="space-y-2">
            <p>Este domínio não está autorizado para login com Google.</p>
            <p className="text-xs font-mono bg-rose-100 p-2 rounded">
              Adicione este domínio em Authentication {'>'} Settings {'>'} Authorized Domains:
              <br />- {domain}
            </p>
          </div>
        );
      } else if (err.code === 'auth/operation-not-allowed') {
        message = (
          <div className="space-y-2">
            <p>O login com Google não está ativado no Console do Firebase.</p>
            <p className="text-xs">
              Certifique-se de que você ativou o provedor no projeto correto:
              <br />
              <span className="font-mono bg-rose-100 px-1 rounded">ID: {auth.app.options.projectId}</span>
            </p>
            <p className="text-xs">
              Vá em <b>Authentication {'>'} Sign-in method</b> e ative o provedor <b>'Google'</b>.
            </p>
          </div>
        );
      } else if (err.code === 'auth/popup-blocked') {
        message = "O popup de login foi bloqueado pelo navegador.";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <LogIn className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Revisa Master</h1>
          <p className="text-slate-500 mt-2">Sua jornada para o ENEM começa aqui</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl mb-6 text-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">⚠️</div>
                <div className="flex-1">{error}</div>
              </div>
              
              <div className="pt-3 mt-1 border-t border-rose-200 text-[10px] font-mono opacity-70">
                <p className="font-bold mb-1 uppercase tracking-wider">Informações de Depuração:</p>
                <p>Projeto ID: {auth.app.options.projectId}</p>
                <p>Domínio Atual: {window.location.hostname}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isRegistering ? 'Criar Conta' : 'Entrar'
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Ou continue com</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 disabled:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl transition-all active:scale-95"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Chrome className="w-5 h-5 text-indigo-600" />
              Google
            </>
          )}
        </button>

        <p className="text-center mt-8 text-slate-500 text-sm">
          {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-1 text-indigo-600 font-semibold hover:underline"
          >
            {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
