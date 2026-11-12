import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Plus, Power } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import { extractErrorMessage } from '../../services/api';
import { promoFormSchema } from '../../schemas/validationSchemas';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Button } from '../../components/common/UI';

export const PromotionsManagePage = () => {
  const [promos, setPromos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(promoFormSchema),
    defaultValues: { discountType: 'PERCENTAGE', discountValue: 10, maxUses: 50, active: true },
  });

  const loadPromos = async () => {
    try {
      const data = await settingsService.listPromotions();
      setPromos(data.promotions || []);
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await settingsService.createPromotion(values);
      toast.success('Cupom promocional criado!');
      reset();
      loadPromos();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (promo) => {
    try {
      await settingsService.togglePromotion(promo.id, !promo.active);
      loadPromos();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Campanhas & Fidelização</span>
        <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
          Cupons
        </h1>
        <p className="text-small text-nude-700">
          Crie e acompanhe cupons de desconto para as clientes.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card p-6 grid grid-cols-1 sm:grid-cols-6 gap-4 items-end"
      >
        <div>
          <label htmlFor="promotions-f1" className="label-field">Código do Cupom *</label>
          <input id="promotions-f1"
            {...register('code')}
            placeholder="LASH10"
            className="input-field uppercase"
          />
          {errors.code && <p className="text-caption text-rose-600 mt-1">{errors.code.message}</p>}
        </div>
        <div>
          <label htmlFor="promotions-f2" className="label-field">Tipo</label>
          <select id="promotions-f2" {...register('discountType')} className="input-field">
            <option value="PERCENTAGE">Percentual (%)</option>
            <option value="FIXED">Fixo (R$)</option>
          </select>
        </div>
        <div>
          <label htmlFor="promotions-f3" className="label-field">Valor do Desconto *</label>
          <input id="promotions-f3"
            type="number"
            step="0.01"
            {...register('discountValue')}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="promotions-f4" className="label-field">Validade *</label>
          <input id="promotions-f4"
            type="date"
            {...register('validUntil')}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="promotions-f5" className="label-field">Limite de usos *</label>
          <input id="promotions-f5" type="number" min="1" {...register('maxUses')} className="input-field tabular-nums" />
          {errors.maxUses && <p className="text-caption text-rose-600 mt-1">{errors.maxUses.message}</p>}
        </div>
        <Button type="submit" isLoading={submitting}>
          <Plus className="w-4 h-4" /> Criar Cupom
        </Button>
      </form>

      <div className="card divide-y divide-nude-100 text-small">
        {promos.length === 0 ? (
          <p className="p-8 text-center text-nude-600">Nenhum cupom cadastrado.</p>
        ) : (
          promos.map((p) => (
            <div key={p.id} className="p-5 flex items-center justify-between gap-4">
              <div>
                <strong className="text-body font-bold text-espresso-900">{p.code}</strong>
                <span className="ml-2.5 text-caption font-semibold px-2.5 py-0.5 rounded-full bg-nude-100 text-nude-800 tabular-nums">
                  {p.discountType === 'PERCENTAGE'
                    ? `${p.discountValue}% OFF`
                    : `${formatCurrency(p.discountValue)} OFF`}
                </span>
                <span className="block text-caption text-nude-600 tabular-nums mt-1">
                  Válido até {formatDate(p.validUntil)} • Usos: {p.usedCount || 0}/{p.maxUses}
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => toggleStatus(p)}>
                <Power className="w-3.5 h-3.5" /> {p.active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};