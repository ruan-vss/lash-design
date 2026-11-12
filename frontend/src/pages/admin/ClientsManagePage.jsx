import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, Eye, X } from 'lucide-react';
import { clientService } from '../../services/clientService';
import { extractErrorMessage } from '../../services/api';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { LoadingState, ErrorState, EmptyState, Button, StatusBadge } from '../../components/common/UI';

export const ClientsManagePage = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [internalNotes, setInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientService.listClients({ search, page, limit: 20 });
      setClients(data.clients || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const openClientFicha = async (id) => {
    try {
      const data = await clientService.getClientDetails(id);
      setSelectedClient(data.client);
      setInternalNotes(data.client.internalNotes || '');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const saveClientNotes = async () => {
    if (!selectedClient) return;
    setSavingNotes(true);
    try {
      await clientService.updateClientNotes(selectedClient.id, { internalNotes });
      toast.success('Ficha técnica e observações salvas!');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Clientes</span>
        <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
          Clientes
        </h1>
        <p className="text-small text-nude-700">
          Consulte contatos, histórico de atendimentos e observações de cada cliente.
        </p>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-nude-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar cliente por nome, telefone ou e-mail..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadClients} />
      ) : clients.length === 0 ? (
        <EmptyState title="Nenhuma cliente encontrada" />
      ) : (
        <div className="table-container">
          <div className="table-scroll">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>1º Atendimento</th>
                  <th>Último Atendimento</th>
                  <th>Total Visitas</th>
                  <th className="text-right">Ficha</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-espresso-900">{c.fullName}</td>
                    <td>
                      <span className="tabular-nums">{c.phone}</span>
                      <span className="block text-caption text-nude-600">{c.email || '-'}</span>
                    </td>
                    <td className="tabular-nums">{formatDate(c.firstVisitDate)}</td>
                    <td className="tabular-nums">{formatDate(c.lastVisitDate)}</td>
                    <td className="font-bold tabular-nums">{c.totalVisits || 0}</td>
                    <td className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => openClientFicha(c.id)}>
                        <Eye className="w-3.5 h-3.5" /> Histórico
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-nude-200 flex items-center justify-between text-caption font-medium">
            <span className="tabular-nums">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-nude-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-lifted max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-nude-100 pb-4">
              <div>
                <span className="eyebrow">Prontuário de Visagismo</span>
                <h3 className="font-serif text-2xl font-semibold text-espresso-900 mt-1">
                  {selectedClient.fullName}
                </h3>
                <p className="text-caption text-nude-600 tabular-nums">
                  {selectedClient.phone} • {selectedClient.email || 'Sem e-mail'}
                </p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-nude-500 hover:bg-nude-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label htmlFor="clients-notes" className="label-field">
                Ficha Técnica / Preferências de Mapping (Curvatura, Espessura, Adesivo)
              </label>
              <textarea
                id="clients-notes"
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Ex: Olhos sensíveis, mapping esquilo, curvatura D 8mm a 12mm..."
                className="input-field"
              />
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={saveClientNotes} isLoading={savingNotes}>
                  Salvar Observações Internas
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-caption font-bold uppercase tracking-wider text-nude-600 mb-3">
                Histórico de Reservas e Pagamentos
              </h4>
              <div className="space-y-2.5 text-small">
                {(selectedClient.bookings || []).map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-nude-50 border border-nude-200/80 flex justify-between items-center"
                  >
                    <div>
                      <strong className="text-espresso-900">{b.serviceNames}</strong>
                      <span className="block text-caption text-nude-600 tabular-nums">
                        {formatDate(b.date)} às {b.startTime}
                      </span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="font-bold text-espresso-900">{formatCurrency(b.totalPrice)}</span>
                      <span className="block mt-1"><StatusBadge status={b.status} /></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};