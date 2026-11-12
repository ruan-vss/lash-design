import { Loader2, AlertCircle, Inbox, RefreshCw, X } from 'lucide-react';
import { statusBadgeConfig } from '../../utils/formatters';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-sans font-semibold rounded-xl transition-all duration-250 ease-luxury focus:outline-none focus-visible:ring-2 focus-visible:ring-nude-600 focus-visible:ring-offset-2 focus-visible:ring-offset-nude-50 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  const variants = {
    primary:
      'bg-nude-600 text-white hover:bg-nude-700 shadow-sm hover:shadow-soft border border-transparent',
    secondary:
      'bg-white text-espresso-900 hover:bg-nude-100/80 border border-nude-300 shadow-card',
    outline:
      'bg-transparent border border-nude-400 text-nude-800 hover:bg-nude-100/70 hover:border-nude-500',
    danger:
      'bg-rose-500 text-white hover:bg-rose-600 shadow-sm border border-transparent focus-visible:ring-rose-500',
    ghost:
      'bg-transparent text-espresso-800 hover:bg-nude-100/80 border border-transparent',
    dark:
      'bg-espresso-900 text-nude-50 hover:bg-espresso-800 shadow-sm border border-espresso-800',
  };

  // Todos os tamanhos respeitam altura confortável de toque em mobile
  const sizes = {
    sm: 'min-h-[38px] px-3.5 py-2 text-caption gap-1.5',
    md: 'min-h-[44px] px-5 py-2.5 text-small gap-2',
    lg: 'min-h-[52px] px-7 py-3.5 text-body gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};

export const Card = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default: 'card',
    interactive: 'card-interactive',
    featured: 'card-featured',
    subtle: 'bg-nude-100/60 border border-nude-200/80 rounded-2xl',
  };

  return (
    <div className={`${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const StatusBadge = ({ status }) => {
  const config = statusBadgeConfig[status] || {
    label: status || 'Desconhecido',
    classes: 'bg-stone-100 text-stone-700 border-stone-200',
  };

  const dotColors = {
    PENDING_APPROVAL: 'bg-blue-500',
    CONFIRMED: 'bg-emerald-500',
    COMPLETED: 'bg-espresso-800',
    CANCELLED: 'bg-rose-500',
    NO_SHOW: 'bg-red-600',
  };

  const dotColor = dotColors[status] || 'bg-stone-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-semibold border whitespace-nowrap ${config.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      {config.label}
    </span>
  );
};

export const Skeleton = ({ className = 'h-24 w-full' }) => (
  <div
    className={`animate-pulse bg-nude-200/60 rounded-2xl ${className}`}
    aria-hidden="true"
  />
);

export const LoadingState = ({ message = 'Sincronizando informações...' }) => (
  <div className="w-full py-12 px-4">
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-center gap-3 text-nude-700 mb-6">
        <Loader2 className="w-5 h-5 text-nude-600 animate-spin shrink-0" />
        <p className="text-small font-medium">{message}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full hidden md:block" />
      </div>
    </div>
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="bg-rose-50/90 border border-rose-200 rounded-3xl p-8 text-center max-w-lg mx-auto my-8 shadow-card">
    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
      <AlertCircle className="w-6 h-6" />
    </div>
    <h3 className="text-h4 font-bold text-espresso-900 mb-1.5">Não foi possível carregar</h3>
    <p className="text-small text-nude-800 mb-6 leading-relaxed">
      {message || 'Não foi possível carregar os dados do servidor no momento.'}
    </p>
    {onRetry && (
      <Button variant="secondary" size="md" onClick={onRetry}>
        <RefreshCw className="w-4 h-4" />
        Tentar novamente
      </Button>
    )}
  </div>
);

export const EmptyState = ({ title = 'Nenhum registro encontrado', description, action }) => (
  <div className="card p-12 text-center my-6 max-w-2xl mx-auto">
    <div className="w-14 h-14 rounded-2xl bg-nude-100 border border-nude-200 flex items-center justify-center mx-auto mb-4 text-nude-600">
      <Inbox className="w-6 h-6" />
    </div>
    <h3 className="text-h4 font-bold text-espresso-900 mb-1.5">{title}</h3>
    {description && (
      <p className="text-small text-nude-700 max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>
    )}
    {action && <div className="flex justify-center">{action}</div>}
  </div>
);

export const ConfirmModal = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-nude-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-lifted animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="font-serif text-2xl font-semibold text-espresso-900">{title}</h3>
          <button
            onClick={onCancel}
            className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-nude-500 hover:text-espresso-900 hover:bg-nude-100 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-small text-nude-700 leading-relaxed mb-8">{description}</p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};