import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Plus, Edit3, Power, Trash2, X } from 'lucide-react';

import { serviceService } from '../../services/serviceService';
import { extractErrorMessage } from '../../services/api';
import { serviceFormSchema } from '../../schemas/validationSchemas';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { Button, LoadingState, ErrorState, ConfirmModal } from '../../components/common/UI';

export const ServicesManagePage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deletingService, setDeletingService] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      depositType: 'PERCENTAGE',
      depositValue: 30,
      prepTimeMinutes: 15,
      active: true,
    },
  });

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await serviceService.getAdminServices();
      setServices(data.services || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openModalForCreate = () => {
    setEditingService(null);
    reset({
      name: '',
      category: 'Extensão de Cílios',
      description: '',
      price: 180,
      durationMinutes: 120,
      prepTimeMinutes: 15,
      depositType: 'PERCENTAGE',
      depositValue: 30,
      guidelines: '',
      maintenanceRules: '',
      imageUrl: '',
      active: true,
    });
    setModalOpen(true);
  };

  const openModalForEdit = (svc) => {
    setEditingService(svc);
    reset(svc);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingService) {
        await serviceService.updateService(editingService.id, values);
        toast.success('Procedimento atualizado!');
      } else {
        await serviceService.createService(values);
        toast.success('Procedimento cadastrado!');
      }
      setModalOpen(false);
      loadServices();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (svc) => {
    try {
      await serviceService.toggleServiceActive(svc.id, !svc.active);
      toast.success(svc.active ? 'Serviço desativado no catálogo público.' : 'Serviço ativado!');
      loadServices();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingService) return;
    setSubmitting(true);
    try {
      await serviceService.softDeleteService(deletingService.id);
      toast.success('Serviço arquivado/removido logicamente preservando histórico.');
      setDeletingService(null);
      loadServices();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Menu & Precificação</span>
          <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
            Serviços
          </h1>
          <p className="text-small text-nude-700">
            Gerencie serviços, preços, duração e regras de sinal.
          </p>
        </div>
        <Button onClick={openModalForCreate}>
          <Plus className="w-4 h-4" /> Novo serviço
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadServices} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {services.map((svc) => (
            <div
              key={svc.id}
              className={`card p-6 flex flex-col justify-between ${
                svc.active ? '' : 'opacity-65 bg-nude-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-caption uppercase tracking-wider font-semibold text-nude-600">
                    {svc.category}
                  </span>
                  <span
                    className={`text-caption px-3 py-0.5 rounded-full font-semibold border ${
                      svc.active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                  >
                    {svc.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-semibold text-espresso-900">{svc.name}</h3>
                <p className="text-small text-nude-700 mt-1 leading-relaxed">{svc.description}</p>
                <div className="mt-4 p-3.5 rounded-2xl bg-nude-50 border border-nude-200/70 text-caption text-nude-800 space-y-1 tabular-nums">
                  <p>
                    <strong className="text-espresso-900">Preço:</strong> {formatCurrency(svc.price)} |{' '}
                    <strong className="text-espresso-900">Duração:</strong>{' '}
                    {formatDuration(svc.durationMinutes)} (+{svc.prepTimeMinutes || 0}min preparação)
                  </p>
                  <p>
                    <strong className="text-espresso-900">Sinal:</strong>{' '}
                    {svc.depositType === 'NONE'
                      ? 'Isento'
                      : svc.depositType === 'PERCENTAGE'
                      ? `${svc.depositValue}%`
                      : formatCurrency(svc.depositValue)}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-nude-100 flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => openModalForEdit(svc)}>
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleToggleActive(svc)}>
                  <Power className="w-3.5 h-3.5" /> {svc.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeletingService(svc)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white border border-nude-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-lifted my-8"
          >
            <div className="flex items-center justify-between border-b border-nude-100 pb-4">
              <h3 className="font-serif text-2xl font-semibold text-espresso-900">
                {editingService ? 'Editar Serviço' : 'Cadastrar Serviço'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-nude-500 hover:bg-nude-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="servicesma-f1" className="label-field">Nome do Procedimento *</label>
                <input id="servicesma-f1" {...register('name')} className="input-field" />
                {errors.name && <p className="text-caption text-rose-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="servicesma-f2" className="label-field">Categoria *</label>
                <input id="servicesma-f2" {...register('category')} className="input-field" />
              </div>
            </div>

            <div>
              <label htmlFor="servicesma-f3" className="label-field">Descrição detalhada *</label>
              <textarea id="servicesma-f3" rows={2} {...register('description')} className="input-field" />
              {errors.description && (
                <p className="text-caption text-rose-600 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="servicesma-f4" className="label-field">Preço (R$) *</label>
                <input id="servicesma-f4"
                  type="number"
                  step="0.01"
                  {...register('price')}
                  className="input-field tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="servicesma-f5" className="label-field">Duração (min) *</label>
                <input id="servicesma-f5"
                  type="number"
                  {...register('durationMinutes')}
                  className="input-field tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="servicesma-f6" className="label-field">Preparação (min)</label>
                <input id="servicesma-f6"
                  type="number"
                  {...register('prepTimeMinutes')}
                  className="input-field tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="servicesma-f7" className="label-field">Regra de Sinal</label>
                <select id="servicesma-f7" {...register('depositType')} className="input-field">
                  <option value="PERCENTAGE">Percentual (%)</option>
                  <option value="FIXED">Valor Fixo (R$)</option>
                  <option value="NONE">Sem Sinal</option>
                </select>
              </div>
              <div>
                <label htmlFor="servicesma-f8" className="label-field">Valor ou % do Sinal</label>
                <input id="servicesma-f8"
                  type="number"
                  step="0.01"
                  {...register('depositValue')}
                  className="input-field tabular-nums"
                />
              </div>
            </div>

            <div>
              <label htmlFor="servicesma-f9" className="label-field">Regras de Manutenção / Retoque</label>
              <input id="servicesma-f9"
                {...register('maintenanceRules')}
                placeholder="Ex: Manutenção válida entre 15 e 21 dias com 50% dos fios."
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="servicesma-f10" className="label-field">Orientações Pré-Atendimento</label>
              <textarea id="servicesma-f10" rows={2} {...register('guidelines')} className="input-field" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-nude-100">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={submitting}>
                Salvar Procedimento
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingService}
        title="Excluir ou desativar serviço?"
        description="Caso este serviço já possua agendamentos anteriores, o backend realizará a exclusão lógica (arquivamento) para preservar os relatórios financeiros."
        confirmLabel="Confirmar Exclusão Lógica"
        isLoading={submitting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingService(null)}
      />
    </div>
  );
};