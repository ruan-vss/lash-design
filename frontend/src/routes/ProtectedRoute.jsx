import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/common/UI';

export const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, isAuthenticated, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nude-50">
        <LoadingState message="Verificando credenciais de acesso..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (user?.mustChangePassword && location.pathname !== '/admin/trocar-senha') {
    return <Navigate to="/admin/trocar-senha" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-espresso-900">Acesso Restrito (403)</h2>
        <p className="text-sm text-nude-700 mt-2">Seu perfil não possui permissão para acessar este módulo.</p>
      </div>
    );
  }

  return children;
};