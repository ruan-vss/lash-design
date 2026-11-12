import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../services/api';
import { Button } from '../../components/common/UI';

const passwordHelp = 'Mínimo de 12 caracteres, com maiúscula, minúscula, número e caractere especial.';

export const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Link de recuperação inválido.');
    if (password !== confirmPassword) return toast.error('As senhas não coincidem.');
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success('Senha redefinida. Faça login com a nova senha.');
      navigate('/admin/login', { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-nude-50 px-4">
      <form onSubmit={handleSubmit} className="card p-8 sm:p-10 max-w-md w-full shadow-lifted space-y-5">
        <div>
          <span className="eyebrow">Segurança da Conta</span>
          <h1 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">Redefinir Senha</h1>
          <p className="text-small text-nude-700 mt-2">{passwordHelp}</p>
        </div>
        {!token && <p className="text-small text-rose-700 bg-rose-50 p-4 rounded-xl">Este link não contém um token válido.</p>}
        <div>
          <label htmlFor="resetpassw-f1" className="label-field">Nova senha</label>
          <input id="resetpassw-f1" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
        </div>
        <div>
          <label htmlFor="resetpassw-f2" className="label-field">Confirmar nova senha</label>
          <input id="resetpassw-f2" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" />
        </div>
        <Button type="submit" size="lg" isLoading={loading} disabled={!token} className="w-full">
          <KeyRound className="w-4 h-4" /> Salvar nova senha
        </Button>
        <Link to="/admin/login" className="block text-center text-caption font-semibold text-nude-700 hover:text-espresso-900">Voltar para o login</Link>
      </form>
    </div>
  );
};
