import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Lock, Sparkles, ArrowLeft } from 'lucide-react';

import { loginSchema } from '../../schemas/validationSchemas';
import { useAuth } from '../../contexts/AuthContext';
import { extractErrorMessage } from '../../services/api';
import { Button } from '../../components/common/UI';

export const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expired = searchParams.get('expired');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      toast.success('Bem-vinda ao Painel Administrativo!');
      navigate('/admin');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Credenciais inválidas.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-nude-100/70 to-nude-50 px-4 py-12">
      <div className="w-full max-w-md mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-caption font-semibold text-nude-700 hover:text-espresso-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para a página do estúdio
        </Link>
      </div>

      <div role="alert" className="sr-only">{loading ? 'Entrando...' : ''}</div>
      <div className="card p-8 sm:p-10 max-w-md w-full shadow-lifted space-y-7">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-espresso-900 text-nude-200 flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="eyebrow justify-center pt-1">Gestão Executiva</span>
          <h1 className="font-serif text-h2 font-semibold text-espresso-900">Acesso Profissional</h1>
          <p className="text-small text-nude-700">Gerencie sua agenda, clientes e faturamento.</p>
        </div>

        {expired && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-caption font-medium p-3.5 rounded-2xl text-center">
            Sua sessão expirou por segurança. Faça login novamente.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="login-f1" className="label-field">E-mail administrativo</label>
            <input id="login-f1"
              type="email"
              autoComplete="username"
              placeholder="admin@lashstudio.com"
              {...register('email')}
              className="input-field"
            />
            {errors.email && (
              <p className="text-caption text-rose-600 font-medium mt-1.5">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="text-caption font-semibold text-espresso-800 tracking-wide">Senha</label>
              <Link
                to="/admin/recuperar-senha"
                className="text-caption font-semibold text-nude-700 hover:text-espresso-900 hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className="input-field"
            />
            {errors.password && (
              <p className="text-caption text-rose-600 font-medium mt-1.5">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" size="lg" isLoading={loading} className="w-full">
            <Lock className="w-4 h-4" /> Entrar no Painel
          </Button>
        </form>
      </div>
    </div>
  );
};