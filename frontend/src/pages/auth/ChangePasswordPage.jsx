import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { extractErrorMessage } from '../../services/api';
import { Button, LoadingState } from '../../components/common/UI';

export const ChangePasswordPage = () => {
  const { user, isAuthenticated, loadingAuth, changePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center bg-nude-50"><LoadingState /></div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('As senhas não coincidem.');
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Senha alterada com sucesso.');
      navigate('/admin', { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-nude-50 px-4">
      <form onSubmit={handleSubmit} className="card p-8 sm:p-10 max-w-md w-full shadow-lifted space-y-5">
        <div className="flex gap-3 items-start">
          <ShieldCheck className="w-7 h-7 text-emerald-700 shrink-0" />
          <div>
            <span className="eyebrow">Primeiro acesso</span>
            <h1 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">Troca obrigatória de senha</h1>
            <p className="text-small text-nude-700 mt-2">Olá, {user?.name}. Antes de acessar o painel, substitua a senha temporária. Use pelo menos 12 caracteres, com maiúscula, minúscula, número e símbolo.</p>
          </div>
        </div>
        <div>
          <label htmlFor="changepass-f1" className="label-field">Senha atual / temporária</label>
          <input id="changepass-f1" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field" />
        </div>
        <div>
          <label htmlFor="changepass-f2" className="label-field">Nova senha</label>
          <input id="changepass-f2" type="password" autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" />
        </div>
        <div>
          <label htmlFor="changepass-f3" className="label-field">Confirmar nova senha</label>
          <input id="changepass-f3" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" />
        </div>
        <Button type="submit" size="lg" isLoading={loading} className="w-full">Alterar senha e entrar</Button>
      </form>
    </div>
  );
};
