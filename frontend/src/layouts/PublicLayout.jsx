import { Outlet, Link, NavLink } from 'react-router-dom';
import { Sparkles, Calendar, PhoneCall, Menu, X, MapPin, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useStudio } from '../contexts/StudioContext';

export const PublicLayout = () => {
  const { studio } = useStudio();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const whatsappLink = studio.whatsapp
    ? `https://wa.me/${studio.whatsapp.replace(/\D/g, '')}`
    : null;

  const navLinkClasses = ({ isActive }) =>
    `min-h-[44px] inline-flex items-center px-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'text-espresso-900 bg-nude-100'
        : 'text-nude-700 hover:text-espresso-900 hover:bg-nude-50'
    }`;

  return (
    <div className="public-shell min-h-screen flex flex-col bg-white text-espresso-900">
      <a
        href="#conteudo-principal"
        className="skip-link"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-nude-200">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nude-600 focus-visible:ring-offset-2"
            aria-label={`${studio.studioName} — página inicial`}
          >
            <div className="w-9 h-9 rounded-xl bg-espresso-900 text-white flex items-center justify-center" aria-hidden="true">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <span className="text-base sm:text-lg font-bold tracking-tight text-espresso-900 block">
                {studio.studioName}
              </span>
              <span className="text-[11px] text-nude-600 block">Especialista em cílios</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            <NavLink to="/" end className={navLinkClasses}>Início</NavLink>
            <NavLink to="/servicos" className={navLinkClasses}>Serviços</NavLink>
            <NavLink to="/minhas-reservas" className={navLinkClasses}>Minha reserva</NavLink>
            <NavLink to="/politica-de-cancelamento" className={navLinkClasses}>Políticas</NavLink>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/admin/login"
              className="min-h-[44px] inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-nude-700 hover:text-espresso-900 hover:bg-nude-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nude-600 focus-visible:ring-offset-2"
              aria-label="Acessar painel administrativo"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Painel
            </Link>
            <Link
              to="/agendar"
              className="min-h-[44px] inline-flex items-center gap-2 bg-espresso-900 hover:bg-espresso-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nude-600 focus-visible:ring-offset-2"
            >
              <Calendar className="w-4 h-4" aria-hidden="true" />
              Agendar
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-espresso-900 hover:bg-nude-50 border border-nude-200"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="menu-publico-mobile"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav
            id="menu-publico-mobile"
            className="md:hidden bg-white border-t border-nude-100 px-3.5 py-3 space-y-1 max-h-[calc(100dvh-4rem)] overflow-y-auto"
            aria-label="Navegação principal no celular"
          >
            {[
              ['/', 'Início'],
              ['/servicos', 'Serviços'],
              ['/minhas-reservas', 'Minha reserva'],
              ['/politica-de-cancelamento', 'Políticas'],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[48px] px-3 rounded-xl text-sm font-medium text-espresso-900 hover:bg-nude-50"
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 grid grid-cols-1 gap-2">
              <Link
                to="/agendar"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 bg-espresso-900 text-white text-sm font-semibold py-3 rounded-xl"
              >
                <Calendar className="w-4 h-4" aria-hidden="true" />
                Agendar horário
              </Link>
              <Link
                to="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 border border-nude-300 bg-white text-espresso-900 text-sm font-semibold py-3 rounded-xl"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Acessar painel administrativo
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main id="conteudo-principal" className="flex-1" tabIndex="-1">
        <Outlet />
      </main>

      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 z-30 min-h-[48px] min-w-[48px] inline-flex items-center justify-center sm:justify-start gap-2 bg-espresso-900 hover:bg-espresso-800 text-white px-3.5 sm:px-4 py-3 rounded-full shadow-soft text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nude-600 focus-visible:ring-offset-2"
          aria-label="Abrir atendimento pelo WhatsApp em nova aba"
        >
          <PhoneCall className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}

      <footer className="bg-nude-50 border-t border-nude-200 mt-16">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-8 sm:py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-nude-700">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-espresso-900">{studio.studioName}</h2>
            <p className="leading-relaxed max-w-sm">{studio.description}</p>
            {studio.address && (
              <p className="flex items-start gap-2 text-nude-700">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{studio.address}</span>
              </p>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-espresso-900 mb-3">Acesso rápido</h2>
            <ul className="space-y-2">
              <li><Link to="/servicos" className="hover:text-espresso-900 underline-offset-4 hover:underline">Serviços</Link></li>
              <li><Link to="/agendar" className="hover:text-espresso-900 underline-offset-4 hover:underline">Agendar horário</Link></li>
              <li><Link to="/minhas-reservas" className="hover:text-espresso-900 underline-offset-4 hover:underline">Consultar reserva</Link></li>
              <li><Link to="/admin/login" className="hover:text-espresso-900 underline-offset-4 hover:underline">Painel administrativo</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-espresso-900 mb-3">Informações</h2>
            <ul className="space-y-2">
              <li><Link to="/politica-de-cancelamento" className="hover:text-espresso-900 underline-offset-4 hover:underline">Política de cancelamento</Link></li>
              <li><Link to="/politica-de-privacidade" className="hover:text-espresso-900 underline-offset-4 hover:underline">Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-espresso-900 underline-offset-4 hover:underline">Termos de uso</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pb-8 text-xs text-nude-600">
          © {new Date().getFullYear()} {studio.studioName}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};
