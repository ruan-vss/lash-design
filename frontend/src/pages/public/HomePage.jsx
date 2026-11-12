import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ShieldCheck, MapPin, ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { useStudio } from '../../contexts/StudioContext';
import { serviceService } from '../../services/serviceService';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { LoadingState, ErrorState } from '../../components/common/UI';

export const HomePage = () => {
  const { studio } = useStudio();
  const [featuredServices, setFeaturedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await serviceService.getPublicServices();
      setFeaturedServices((data.services || []).slice(0, 6));
    } catch {
      setError('Não foi possível carregar os serviços agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  return (
    <div>
      <section className="border-b border-nude-200 bg-white" aria-labelledby="home-title">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-8 sm:py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-sm font-semibold text-nude-700 mb-4">Atendimento com hora marcada</p>
            <h1 id="home-title" className="text-4xl sm:text-5xl lg:text-display font-light tracking-normal leading-tight text-espresso-900 max-w-2xl">
              Cílios personalizados para valorizar o seu olhar.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-nude-800 leading-relaxed max-w-xl">
              {studio.description}
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                to="/agendar"
                className="min-h-[52px] inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <Calendar className="w-5 h-5" aria-hidden="true" />
                Agendar horário
              </Link>
              <Link
                to="/servicos"
                className="min-h-[52px] inline-flex items-center justify-center gap-2 bg-white hover:bg-nude-50 text-espresso-900 font-semibold px-6 py-3 rounded-xl border border-nude-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Ver serviços
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-nude-700" aria-label="Diferenciais do atendimento">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Atendimento individual</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Design personalizado</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Agendamento online</li>
            </ul>
          </div>

          <div className="relative max-w-xl mx-auto lg:mx-0 w-full">
            <div className="rounded-2xl overflow-hidden bg-nude-50 border border-nude-200">
              <div className="px-4 sm:px-5 py-4 border-b border-nude-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-nude-100 text-espresso-900 flex items-center justify-center shrink-0" aria-hidden="true">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-espresso-900">Onde estamos</p>
                    <p className="text-sm text-nude-700 leading-snug mt-0.5 break-words">{studio.address}</p>
                  </div>
                </div>
                {studio.address && studio.address !== 'Endereço configurável no painel administrativo' && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-nude-300 bg-white hover:bg-nude-50 text-sm font-semibold text-espresso-900 shrink-0"
                  >
                    Abrir no Maps
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
              </div>

              {studio.address && studio.address !== 'Endereço configurável no painel administrativo' ? (
                <div className="aspect-[4/3] sm:aspect-[5/4] min-h-[300px] bg-nude-100">
                  <iframe
                    title={`Mapa com a localização de ${studio.studioName}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(studio.address)}&output=embed`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] sm:aspect-[5/4] min-h-[300px] flex items-center justify-center p-8 text-center bg-nude-50">
                  <div className="max-w-sm">
                    <MapPin className="w-8 h-8 mx-auto text-nude-500" aria-hidden="true" />
                    <p className="mt-3 text-sm font-bold text-espresso-900">Localização ainda não configurada</p>
                    <p className="mt-1 text-sm text-nude-700">Adicione o endereço nas configurações do painel para o mapa aparecer automaticamente aqui.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-3.5 sm:px-6 py-8 sm:py-16" aria-labelledby="services-title">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-nude-700">Serviços</p>
            <h2 id="services-title" className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-espresso-900">
              Escolha o cuidado ideal para você
            </h2>
          </div>
          <Link to="/servicos" className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-espresso-900 hover:underline underline-offset-4">
            Ver todos os serviços <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Carregando serviços..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadServices} />
        ) : featuredServices.length === 0 ? (
          <div className="rounded-2xl border border-nude-200 bg-nude-50 p-8 text-center text-sm text-nude-700">
            Os serviços estão sendo atualizados. Tente novamente em instantes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredServices.map((service) => (
              <article key={service.id} className="rounded-2xl border border-nude-200 bg-white p-5 sm:p-6 flex flex-col">
                <div className="flex items-center justify-between gap-3 text-xs text-nude-600 mb-4">
                  <span className="font-semibold">{service.category}</span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatDuration(service.durationMinutes)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-espresso-900 leading-snug">{service.name}</h3>
                <p className="mt-2 text-sm text-nude-700 leading-relaxed line-clamp-3 flex-1">{service.description}</p>
                <div className="mt-5 pt-4 border-t border-nude-100 flex items-center justify-between gap-4">
                  <span className="text-lg font-bold tabular-nums text-espresso-900">{formatCurrency(service.price)}</span>
                  <Link
                    to={`/agendar?serviceId=${service.id}`}
                    className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                    aria-label={`Agendar ${service.name}`}
                  >
                    Agendar
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-nude-50 border-y border-nude-200" aria-labelledby="about-title">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-8 sm:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          <div>
            <p className="text-sm font-semibold text-nude-700">Sobre o atendimento</p>
            <h2 id="about-title" className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-espresso-900">
              {studio.professionalName}
            </h2>
            <p className="mt-4 text-base text-nude-800 leading-relaxed">{studio.professionalBio}</p>

            <dl className="mt-7 space-y-4">
              {studio.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 text-nude-700 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-sm font-bold text-espresso-900">Localização</dt>
                    <dd className="text-sm text-nude-700 mt-0.5">{studio.address}</dd>
                  </div>
                </div>
              )}
              {studio.openingHoursText && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 mt-0.5 text-nude-700 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-sm font-bold text-espresso-900">Horário</dt>
                    <dd className="text-sm text-nude-700 mt-0.5">{studio.openingHoursText}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-nude-200 bg-white p-6 sm:p-7">
            <div className="flex items-center gap-2 text-espresso-900">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              <h3 className="text-lg font-bold">Antes do atendimento</h3>
            </div>
            <p className="mt-3 text-sm text-nude-700 leading-relaxed">{studio.cancellationPolicyText}</p>
            <ul className="mt-5 space-y-3 text-sm text-nude-800">
              <li className="flex items-start gap-2.5"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /><span>Venha sem rímel ou maquiagem na região dos olhos.</span></li>
              <li className="flex items-start gap-2.5"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /><span>Atrasos podem reduzir o tempo disponível para o procedimento.</span></li>
              <li className="flex items-start gap-2.5"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /><span>A reserva é confirmada pelo sistema após a validação do horário.</span></li>
            </ul>
            <Link to="/politica-de-cancelamento" className="mt-5 min-h-[44px] inline-flex items-center text-sm font-semibold text-espresso-900 hover:underline underline-offset-4">
              Ler política completa
            </Link>
          </div>
        </div>
      </section>

      {Array.isArray(studio.reviews) && studio.reviews.length > 0 && (
        <section className="max-w-6xl mx-auto px-3.5 sm:px-6 py-8 sm:py-16" aria-labelledby="reviews-title">
          <h2 id="reviews-title" className="text-3xl font-bold tracking-tight text-espresso-900 mb-7">O que clientes dizem</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {studio.reviews.map((rev) => (
              <figure key={rev.id} className="rounded-2xl border border-nude-200 bg-white p-6">
                <blockquote className="text-sm text-nude-800 leading-relaxed">“{rev.comment}”</blockquote>
                <figcaption className="mt-4 text-sm font-bold text-espresso-900">{rev.clientName}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {(studio.faqs || []).length > 0 && (
        <section className="max-w-4xl mx-auto px-3.5 sm:px-6 py-8 sm:py-16" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-3xl font-bold tracking-tight text-espresso-900 mb-7">Dúvidas frequentes</h2>
          <div className="divide-y divide-nude-200 border-y border-nude-200">
            {(studio.faqs || []).map((faq, idx) => (
              <div key={idx} className="py-5">
                <h3 className="text-base font-bold text-espresso-900">{faq.question}</h3>
                <p className="mt-2 text-sm text-nude-700 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
