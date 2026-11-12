import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../services/api';
import { useStudio } from '../../contexts/StudioContext';
import { Button } from '../../components/common/UI';

export const SettingsPage = () => {
  const { studio, refreshStudio } = useStudio();
  const [formData, setFormData] = useState(studio);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(studio);
  }, [studio]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.updateAdminSettings(formData);
      await refreshStudio();
      toast.success('Configurações gerais atualizadas!');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Parâmetros Globais</span>
          <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
            Configurações
          </h1>
          <p className="text-small text-nude-700">
            Ajuste dados do estúdio, regras de atendimento e preferências do sistema.
          </p>
        </div>
        <Button type="submit" isLoading={saving}>
          Salvar alterações
        </Button>
      </div>

      <div className="card p-6 sm:p-8 space-y-5">
        <h3 className="text-h4 font-bold text-espresso-900 border-b border-nude-100 pb-3">
          Identidade e Contato
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="settingsus-f1" className="label-field">Nome Comercial do Estúdio</label>
            <input id="settingsus-f1"
              value={formData.studioName || ''}
              onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="settingsus-f2" className="label-field">Nome da Especialista</label>
            <input id="settingsus-f2"
              value={formData.professionalName || ''}
              onChange={(e) => setFormData({ ...formData, professionalName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="settingsus-f3" className="label-field">WhatsApp Público (apenas números com DDD)</label>
            <input id="settingsus-f3"
              value={formData.whatsapp || ''}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="input-field tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="settingsus-f4" className="label-field">Endereço Completo</label>
            <input id="settingsus-f4"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      </div>

      <div className="card p-6 sm:p-8 space-y-5">
        <h3 className="text-h4 font-bold text-espresso-900 border-b border-nude-100 pb-3">
          Regras de Negócio
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="settingsus-f5" className="label-field">Fuso Horário Oficial (IANA)</label>
            <input id="settingsus-f5"
              value={formData.timezone || 'America/Sao_Paulo'}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="settingsus-f6" className="label-field">Texto da Política de Cancelamento</label>
          <textarea id="settingsus-f6"
            rows={3}
            value={formData.cancellationPolicyText || ''}
            onChange={(e) => setFormData({ ...formData, cancellationPolicyText: e.target.value })}
            className="input-field"
          />
        </div>
      </div>
    </form>
  );
};

export const UsersManagePage = () => {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('PROFESSIONAL');
  const [submitting, setSubmitting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const loadUsers = async () => {
    try {
      const data = await authService.listUsers();
      setUsers(data.users || []);
    } catch {
      // Silencioso caso plano individual
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await authService.createUser({ name, email, role });
      setTemporaryPassword(data.temporaryPassword || '');
      toast.success('Membro da equipe criado. Compartilhe a senha temporária por canal seguro.');
      setName('');
      setEmail('');
      loadUsers();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Governança & Acessos</span>
        <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
          Equipe
        </h1>
        <p className="text-small text-nude-700">
          Gerencie quem pode acessar o painel e o nível de permissão de cada pessoa.
        </p>
      </div>

      <form
        onSubmit={handleAddUser}
        className="card p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
      >
        <div>
          <label htmlFor="settingsus-f7" className="label-field">Nome *</label>
          <input id="settingsus-f7"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="settingsus-f8" className="label-field">E-mail *</label>
          <input id="settingsus-f8"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="settingsus-f9" className="label-field">Permissão</label>
          <select id="settingsus-f9"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input-field"
          >
            <option value="ADMIN">Administradora Geral</option>
            <option value="PROFESSIONAL">Lash Designer (Agenda)</option>
            <option value="RECEPTIONIST">Recepção / Atendimento</option>
          </select>
        </div>
        <Button type="submit" isLoading={submitting}>
          <UserPlus className="w-4 h-4" /> Adicionar
        </Button>
      </form>

      {temporaryPassword && (
        <div className="card p-5 border-amber-300 bg-amber-50 text-small">
          <strong className="text-amber-900">Senha temporária gerada (exibida apenas agora):</strong>
          <code className="block mt-2 p-3 bg-white rounded-xl border border-amber-200 select-all font-mono">{temporaryPassword}</code>
          <p className="text-caption text-amber-800 mt-2">O novo usuário será obrigado a trocar essa senha no primeiro acesso.</p>
        </div>
      )}

      <div className="card divide-y divide-nude-100 text-small">
        {users.length === 0 ? (
          <p className="p-8 text-center text-nude-600">
            Apenas a conta proprietária está cadastrada no momento.
          </p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="p-5 flex items-center justify-between">
              <div>
                <strong className="text-espresso-900 font-semibold">{u.name}</strong>
                <span className="block text-caption text-nude-600">
                  {u.email} • Perfil: <strong>{u.role}</strong>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};