import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';

const StudioContext = createContext(null);

const defaultFallbackConfig = {
  studioName: 'Atelier Lash Designer',
  description: 'Especialista em extensão de cílios com foco em naturalidade, saúde ocular e atendimento personalizado.',
  professionalName: 'Profissional Lash Designer',
  professionalBio: 'Certificada em técnicas avançadas de acoplagem e visagismo do olhar.',
  phone: '',
  whatsapp: '',
  address: 'Endereço configurável no painel administrativo',
  openingHoursText: 'Terça a Sábado, mediante agendamento',
  confirmationMode: 'ADMIN_APPROVAL',
  cancellationPolicyText: 'Cancelamentos ou reagendamentos devem ser solicitados respeitando o prazo mínimo configurado pelo estúdio.',
  allowMultipleServices: true,
  allowClientReschedule: true,
  gallery: [],
  reviews: [], // Nunca inventar avaliações falsas
  faqs: [
    {
      question: 'Quanto tempo dura o procedimento?',
      answer: 'A duração varia conforme a técnica escolhida, sendo exibida exatamente na seleção do serviço.'
    },
    {
      question: 'Como funciona a confirmação do agendamento?',
      answer: 'Você envia a solicitação pelo site e a profissional confirma o horário. Se houver sinal, ele é combinado diretamente com o estúdio.'
    }
  ]
};

export const StudioProvider = ({ children }) => {
  const [studio, setStudio] = useState(defaultFallbackConfig);
  const [loadingStudio, setLoadingStudio] = useState(true);
  const [apiError, setApiError] = useState(false);

  const fetchStudioConfig = useCallback(async () => {
    setLoadingStudio(true);
    setApiError(false);
    try {
      const data = await settingsService.getPublicStudioConfig();
      if (data?.studio) {
        setStudio({ ...defaultFallbackConfig, ...data.studio });
      }
    } catch {
      setApiError(true);
    } finally {
      setLoadingStudio(false);
    }
  }, []);

  useEffect(() => {
    fetchStudioConfig();
  }, [fetchStudioConfig]);

  return (
    <StudioContext.Provider value={{ studio, loadingStudio, apiError, refreshStudio: fetchStudioConfig }}>
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => useContext(StudioContext);