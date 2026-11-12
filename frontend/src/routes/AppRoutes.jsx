import { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { LoadingState } from '../components/common/UI';
import { ProtectedRoute } from './ProtectedRoute';
const PublicLayout = lazy(() => import('../layouts/PublicLayout').then((m) => ({ default: m.PublicLayout })));
const AdminLayout = lazy(() => import('../layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })));

// Páginas Públicas
const HomePage = lazy(() => import('../pages/public/HomePage').then((m) => ({ default: m.HomePage })));
const CatalogPage = lazy(() => import('../pages/public/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const BookingFlowPage = lazy(() => import('../pages/public/BookingFlowPage').then((m) => ({ default: m.BookingFlowPage })));
const BookingConfirmationPage = lazy(() => import('../pages/public/BookingConfirmationPage').then((m) => ({ default: m.BookingConfirmationPage })));
const MyBookingsPage = lazy(() => import('../pages/public/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })));
const BookingDetailsPage = lazy(() => import('../pages/public/BookingDetailsPage').then((m) => ({ default: m.BookingDetailsPage })));
const CancellationPolicyPage = lazy(() => import('../pages/public/LegalPages').then((m) => ({ default: m.CancellationPolicyPage })));
const PrivacyPolicyPage = lazy(() => import('../pages/public/LegalPages').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('../pages/public/LegalPages').then((m) => ({ default: m.TermsPage })));

// Autenticação
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const ChangePasswordPage = lazy(() => import('../pages/auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));

// Páginas Administrativas
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CalendarPage = lazy(() => import('../pages/admin/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const BookingsManagePage = lazy(() => import('../pages/admin/BookingsManagePage').then((m) => ({ default: m.BookingsManagePage })));
const ClientsManagePage = lazy(() => import('../pages/admin/ClientsManagePage').then((m) => ({ default: m.ClientsManagePage })));
const ServicesManagePage = lazy(() => import('../pages/admin/ServicesManagePage').then((m) => ({ default: m.ServicesManagePage })));
const PaymentsManagePage = lazy(() => import('../pages/admin/PaymentsManagePage').then((m) => ({ default: m.PaymentsManagePage })));
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AvailabilityPage = lazy(() => import('../pages/admin/AvailabilityBlockingsPage').then((m) => ({ default: m.AvailabilityPage })));
const BlockingsPage = lazy(() => import('../pages/admin/AvailabilityBlockingsPage').then((m) => ({ default: m.BlockingsPage })));
const PromotionsManagePage = lazy(() => import('../pages/admin/PromotionsManagePage').then((m) => ({ default: m.PromotionsManagePage })));
const NotificationsManagePage = lazy(() => import('../pages/admin/NotificationsManagePage').then((m) => ({ default: m.NotificationsManagePage })));
const SettingsPage = lazy(() => import('../pages/admin/SettingsUsersPage').then((m) => ({ default: m.SettingsPage })));
const UsersManagePage = lazy(() => import('../pages/admin/SettingsUsersPage').then((m) => ({ default: m.UsersManagePage })));

const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <span className="eyebrow">Erro 404</span>
    <h1 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">Página não encontrada</h1>
    <p className="text-small text-nude-700 mt-2 mb-6">O endereço que você acessou não existe ou foi movido.</p>
    <Link to="/" className="underline font-semibold text-espresso-900">Voltar para o início</Link>
  </div>
);

export const AppRoutes = () => (
  <Suspense fallback={<LoadingState message="Carregando..." />}>
  <Routes>
    {/* Área Pública da Cliente */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/servicos" element={<CatalogPage />} />
      <Route path="/agendar" element={<BookingFlowPage />} />
      <Route path="/agendamento/confirmacao" element={<BookingConfirmationPage />} />
      <Route path="/minhas-reservas" element={<MyBookingsPage />} />
      <Route path="/minhas-reservas/:id" element={<BookingDetailsPage />} />
      <Route path="/politica-de-cancelamento" element={<CancellationPolicyPage />} />
      <Route path="/politica-de-privacidade" element={<PrivacyPolicyPage />} />
      <Route path="/termos" element={<TermsPage />} />
    </Route>

    {/* Autenticação Administrativa */}
    <Route path="/admin/login" element={<LoginPage />} />
    <Route path="/admin/recuperar-senha" element={<ForgotPasswordPage />} />
    <Route path="/admin/redefinir-senha" element={<ResetPasswordPage />} />
    <Route path="/admin/trocar-senha" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

    {/* Painel Administrativo Protegido */}
    <Route
      path="/admin"
      element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="agenda" element={<CalendarPage />} />
      <Route path="agendamentos" element={<BookingsManagePage />} />
      <Route path="clientes" element={<ClientsManagePage />} />
      <Route path="servicos" element={<ProtectedRoute requiredRoles={['ADMIN', 'PROFESSIONAL']}><ServicesManagePage /></ProtectedRoute>} />
      <Route path="pagamentos" element={<ProtectedRoute requiredRoles={['ADMIN', 'RECEPTIONIST']}><PaymentsManagePage /></ProtectedRoute>} />
      <Route path="relatorios" element={<ProtectedRoute requiredRoles={['ADMIN']}><ReportsPage /></ProtectedRoute>} />
      <Route path="horarios" element={<ProtectedRoute requiredRoles={['ADMIN', 'PROFESSIONAL']}><AvailabilityPage /></ProtectedRoute>} />
      <Route path="bloqueios" element={<ProtectedRoute requiredRoles={['ADMIN', 'PROFESSIONAL']}><BlockingsPage /></ProtectedRoute>} />
      <Route path="promocoes" element={<ProtectedRoute requiredRoles={['ADMIN']}><PromotionsManagePage /></ProtectedRoute>} />
      <Route path="notificacoes" element={<ProtectedRoute requiredRoles={['ADMIN']}><NotificationsManagePage /></ProtectedRoute>} />
      <Route path="configuracoes" element={<ProtectedRoute requiredRoles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
      <Route path="usuarios" element={<ProtectedRoute requiredRoles={['ADMIN']}><UsersManagePage /></ProtectedRoute>} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
  </Suspense>
);