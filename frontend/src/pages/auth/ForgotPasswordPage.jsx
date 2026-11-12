import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../services/api';
import { Button } from '../../components/common/UI';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success('Instruções enviadas ao seu e-mail!');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-nude-50 px-4">
      <div className="card p-8 sm:p-10 max-w-md w-full shadow-lifted space-y-6">
        <div>
          <span className="eyebrow">Segurança da Conta</span>
          <h1 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">Recuperar Senha</h1>
        </div>
        {sent ? (
          <div className="text-small text-emerald-800 bg-emerald-50 p-5 rounded-2xl border border-emerald-200 flex items-start gap-3">
            <MailCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Se o e-mail informado estiver cadastrado, você receberá um link seguro para redefinição de senha.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="forgotpass-f1" className="label-field">Seu e-mail de acesso</label>
              <input id="forgotpass-f1"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@lashstudio.com"
                className="input-field"
              />
            </div>
            <Button type="submit" size="lg" isLoading={loading} className="w-full">
              Enviar link de recuperação
            </Button>
          </form>
        )}
        <div className="pt-2 border-t border-nude-100 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-caption font-semibold text-nude-700 hover:text-espresso-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
};