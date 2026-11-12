import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Info, Calendar, Sparkles } from 'lucide-react';
import { serviceService } from '../../services/serviceService';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/UI';

export const CatalogPage = () => {
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await serviceService.getPublicServices();
      setServices(data.services || []);
    } catch {
      setError('Erro ao carregar o catálogo de procedimentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const categories = ['ALL', ...new Set(services.map((s) => s.category).filter(Boolean))];
  const filtered =
    selectedCategory === 'ALL' ? services : services.filter((s) => s.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-8 sm:py-12 sm:py-16">
      <div className="max-w-2xl mb-10">
        <span className="eyebrow">Menu de Tratamentos</span>
        <h1 className="font-serif text-h1 sm:text-display font-semibold text-espresso-900 mt-1">
          Catálogo de Procedimentos
        </h1>
        <p className="text-body text-nude-700 mt-2 leading-relaxed">
          Valores oficiais, tempo estimado em cabine e orientações personalizadas de manutenção.
        </p>
      </div>

      {categories.length > 1 && (
        <div
          className="flex flex-wrap gap-2.5 mb-10 p-1.5 bg-nude-100/80 border border-nude-200 rounded-2xl w-fit"
          role="tablist"
          aria-label="Filtrar por categoria"
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[44px] px-5 py-2 rounded-xl text-small font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-espresso-900 text-nude-50 shadow-sm'
                    : 'text-nude-800 hover:text-espresso-900 hover:bg-white/60'
                }`}
              >
                {cat === 'ALL' ? 'Todos os Serviços' : cat}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCatalog} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhum serviço disponível nesta categoria" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((service) => (
            <article
              key={service.id}
              className="card-interactive p-6 sm:p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="text-caption uppercase tracking-[0.12em] text-nude-600 font-semibold block mb-1">
                      {service.category}
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-espresso-900 leading-snug">
                      {service.name}
                    </h2>
                  </div>
                  <div className="text-right shrink-0 bg-nude-50 border border-nude-200/80 px-3.5 py-2 rounded-2xl">
                    <span className="price text-xl block">{formatCurrency(service.price)}</span>
                    <span className="text-caption text-nude-700 font-medium flex items-center justify-end gap-1 mt-0.5 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-nude-500" />
                      {formatDuration(service.durationMinutes)}
                    </span>
                  </div>
                </div>

                <p className="text-small text-nude-800 leading-relaxed mb-5">
                  {service.description}
                </p>

                {service.maintenanceRules && (
                  <div className="bg-nude-50/90 border border-nude-200 rounded-xl p-3.5 mb-3.5 text-caption text-nude-800 leading-relaxed">
                    <strong className="text-espresso-900 font-semibold">
                      Política de Manutenção/Retoque:
                    </strong>{' '}
                    {service.maintenanceRules}
                  </div>
                )}

                {service.guidelines && (
                  <div className="flex items-start gap-2.5 text-caption text-nude-700 mb-5 bg-white border border-nude-100 rounded-xl p-3">
                    <Info className="w-4 h-4 text-nude-600 shrink-0 mt-0.5" />
                    <span>{service.guidelines}</span>
                  </div>
                )}
              </div>

              <div className="pt-5 border-t border-nude-100 flex flex-wrap items-center justify-between gap-4">
                <div className="text-caption text-nude-700">
                  {service.depositType !== 'NONE' && service.depositValue > 0 ? (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-nude-600" />
                      Sinal sugerido:{' '}
                      <strong className="text-espresso-900 tabular-nums">
                        {service.depositType === 'PERCENTAGE'
                          ? `${service.depositValue}%`
                          : formatCurrency(service.depositValue)}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-nude-600">Sem sinal antecipado</span>
                  )}
                </div>

                <Link
                  to={`/agendar?serviceId=${service.id}`}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-small font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all duration-250"
                >
                  <Calendar className="w-4 h-4" />
                  Agendar este serviço
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};