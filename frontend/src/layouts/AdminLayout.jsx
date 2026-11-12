import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Sparkles,
  Users,
  Wallet,
  BarChart3,
  Clock,
  ShieldBan,
  TicketPercent,
  MessageSquare,
  Settings,
  UserCog,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudio } from '../contexts/StudioContext';

const navigation = [
  {
    label: 'Principal',
    items: [
      { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
      { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
      { to: '/admin/agendamentos', label: 'Reservas', icon: ClipboardList },
      { to: '/admin/clientes', label: 'Clientes', icon: Users },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/admin/pagamentos', label: 'Financeiro', icon: Wallet, roles: ['ADMIN', 'RECEPTIONIST'] },
      { to: '/admin/servicos', label: 'Serviços', icon: Sparkles, roles: ['ADMIN', 'PROFESSIONAL'] },
      { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, roles: ['ADMIN'] },
      { to: '/admin/promocoes', label: 'Cupons', icon: TicketPercent, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Agenda e sistema',
    items: [
      { to: '/admin/horarios', label: 'Expediente', icon: Clock, roles: ['ADMIN', 'PROFESSIONAL'] },
      { to: '/admin/bloqueios', label: 'Bloqueios', icon: ShieldBan, roles: ['ADMIN', 'PROFESSIONAL'] },
      { to: '/admin/notificacoes', label: 'WhatsApp', icon: MessageSquare, roles: ['ADMIN'] },
      { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, roles: ['ADMIN'] },
      { to: '/admin/usuarios', label: 'Equipe', icon: UserCog, roles: ['ADMIN'] },
    ],
  },
];

const pageTitles = {
  '/admin': 'Visão geral',
  '/admin/agenda': 'Agenda',
  '/admin/agendamentos': 'Reservas',
  '/admin/clientes': 'Clientes',
  '/admin/pagamentos': 'Financeiro',
  '/admin/servicos': 'Serviços',
  '/admin/relatorios': 'Relatórios',
  '/admin/promocoes': 'Cupons',
  '/admin/horarios': 'Expediente',
  '/admin/bloqueios': 'Bloqueios',
  '/admin/notificacoes': 'WhatsApp',
  '/admin/configuracoes': 'Configurações',
  '/admin/usuarios': 'Equipe',
};

const roleLabels = {
  ADMIN: 'Administrador',
  PROFESSIONAL: 'Profissional',
  RECEPTIONIST: 'Recepção',
};

export const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const { studio } = useStudio();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentTitle = pageTitles[location.pathname] || 'Painel';
  const visibleGroups = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(user?.role)),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = () => {
    signOut();
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell min-h-screen flex bg-[#f8f7f5] text-espresso-900">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-espresso-950/35 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 w-[264px] bg-white border-r border-nude-200/80 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-[72px] px-5 flex items-center justify-between border-b border-nude-200/70">
          <Link to="/admin" className="flex items-center gap-3 min-w-0" onClick={() => setSidebarOpen(false)}>
            <div className="w-9 h-9 rounded-xl bg-espresso-900 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <strong className="text-small font-bold text-espresso-900 block truncate">
                {studio.studioName || 'Lash Studio'}
              </strong>
              <span className="text-[11px] text-nude-600 block mt-0.5">Painel administrativo</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-nude-600 hover:bg-nude-100"
            aria-label="Fechar menu lateral"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu administrativo">
          {visibleGroups.map((group, index) => (
            <div key={group.label} className={index > 0 ? 'mt-5' : ''}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-nude-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-lg text-small font-medium transition-colors ${
                          isActive
                            ? 'bg-nude-100 text-espresso-900 font-semibold'
                            : 'text-nude-700 hover:bg-nude-50 hover:text-espresso-900'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-[17px] h-[17px] shrink-0 ${isActive ? 'text-nude-700' : 'text-nude-500'}`} />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-nude-200/70">
          <div className="flex items-center gap-3 p-2 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-nude-100 border border-nude-200 flex items-center justify-center text-caption font-bold text-espresso-900 shrink-0">
              {(user?.name || 'A').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold text-espresso-900 truncate">{user?.name || 'Administradora'}</p>
              <p className="text-[11px] text-nude-500 truncate">{roleLabels[user?.role] || user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-nude-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              aria-label="Sair do painel"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-[72px] bg-white/95 border-b border-nude-200/70 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-lg text-espresso-900 hover:bg-nude-100 border border-nude-200"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] text-nude-500 hidden sm:block">Administração</p>
              <strong className="text-small sm:text-body font-bold text-espresso-900 truncate block">{currentTitle}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/agenda?new=1"
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 rounded-lg bg-espresso-900 hover:bg-espresso-800 text-caption font-semibold text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova reserva</span>
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] inline-flex items-center gap-2 px-3 rounded-lg border border-nude-200 bg-white hover:bg-nude-50 text-caption font-semibold text-espresso-900 transition-colors"
              aria-label="Abrir página pública"
            >
              <span className="hidden md:inline">Página pública</span>
              <ExternalLink className="w-4 h-4 text-nude-600" />
            </a>
          </div>
        </header>

        <main className="admin-content flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1480px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
