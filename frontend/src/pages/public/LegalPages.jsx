import { useStudio } from '../../contexts/StudioContext';

export const CancellationPolicyPage = () => {
  const { studio } = useStudio();
  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-8 sm:py-14">
      <div className="card p-8 sm:p-12 space-y-6">
        <div>
          <span className="eyebrow">Transparência & Respeito Mútuo</span>
          <h1 className="font-serif text-h1 font-semibold text-espresso-900 mt-1">
            Política de Atrasos e Cancelamento
          </h1>
        </div>
        <p className="text-body text-nude-800 leading-relaxed">{studio.cancellationPolicyText}</p>
        <ul className="list-disc pl-5 text-small text-nude-700 space-y-2.5 leading-relaxed">
          <li>Quando houver sinal, ele é combinado diretamente com o estúdio e destina-se à reserva exclusiva do horário da profissional.</li>
          <li>Solicitações de reagendamento respeitam a antecedência mínima configurada no sistema.</li>
          <li>O não comparecimento sem aviso prévio (No-Show) pode implicar retenção do sinal, conforme combinado com o estúdio.</li>
        </ul>
      </div>
    </div>
  );
};

export const PrivacyPolicyPage = () => {
  const { studio } = useStudio();
  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-8 sm:py-14">
      <div className="card p-8 sm:p-12 space-y-6">
        <div>
          <span className="eyebrow">Conformidade & Dados</span>
          <h1 className="font-serif text-h1 font-semibold text-espresso-900 mt-1">
            Política de Privacidade (LGPD)
          </h1>
        </div>
        <p className="text-body text-nude-800 leading-relaxed">
          O estúdio <strong>{studio.studioName}</strong> coleta apenas os dados estritamente necessários (nome,
          telefone, e-mail opcional e observações técnicas de saúde ocular) para execução do agendamento e envio de
          notificações autorizadas.
        </p>
      </div>
    </div>
  );
};

export const TermsPage = () => (
  <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-8 sm:py-14">
    <div className="card p-8 sm:p-12 space-y-6">
      <div>
        <span className="eyebrow">Termos Contratuais</span>
        <h1 className="font-serif text-h1 font-semibold text-espresso-900 mt-1">
          Termos de Uso do Agendamento Online
        </h1>
      </div>
      <p className="text-body text-nude-800 leading-relaxed">
        Toda reserva realizada através desta plataforma está sujeita à validação de disponibilidade, preço oficial e
        confirmação bancária ou administrativa processada pelo servidor.
      </p>
    </div>
  </div>
);