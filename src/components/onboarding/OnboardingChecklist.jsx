import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconCheckCircle, IconCircle, IconChevronRight } from "@/components/Icons";

export default function OnboardingChecklist({ currentStep, formData }) {
  const { t } = useTranslation();

  const steps = [
    {
      id: 1,
      title: t('professionalIdentity'),
      items: [
        { label: t('onboarding.checklist.businessNameLabel'), check: formData.business_name?.length >= 2 },
        { label: t('onboarding.checklist.nifCifLabel'), check: formData.cif_nif?.length === 9 },
        { label: t('emailContact'), check: formData.email_contacto?.includes('@') },
        { label: t('phoneLabel'), check: formData.telefono_contacto?.replace(/\D/g, '').length >= 9 }
      ]
    },
    {
      id: 2,
      title: t('onboarding.checklist.servicesTitle'),
      items: [
        { label: t('onboarding.checklist.categorySelected'), check: formData.categories?.length > 0 },
        { label: t('yearsExperience'), check: formData.years_experience !== '' && parseInt(formData.years_experience) >= 0 },
        { label: t('onboarding.checklist.descriptionComplete'), check: formData.descripcion_corta?.length >= 20 }
      ]
    },
    {
      id: 3,
      title: t('onboarding.location.title'),
      items: [
        { label: t('province'), check: !!formData.provincia },
        { label: t('cityLabel'), check: !!formData.ciudad },
        { label: t('proProfile.sections.paymentMethods'), check: formData.formas_pago?.length > 0 },
        { label: t('onboarding.checklist.workPhotosLabel'), check: formData.photos?.length > 0 },
        { label: t('onboarding.checklist.consents'), check: formData.acepta_terminos && formData.acepta_politica_privacidad && formData.consiente_contacto_clientes }
      ]
    }
  ];

  const currentStepData = steps.find(s => s.id === currentStep);
  const completedItems = currentStepData?.items.filter(i => i.check).length || 0;
  const totalItems = currentStepData?.items.length || 0;

  return (
    <div className="card border-2 border-blue-100 bg-blue-50/50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-ink">
            {t('onboarding.checklist.progressTitle')}
          </h3>
          <span className="text-xs font-bold text-c-accent bg-blue-100 px-2 py-1 rounded-full">
            {completedItems}/{totalItems}
          </span>
        </div>

        <div className="space-y-2">
          {currentStepData?.items.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 text-sm transition-all ${
                item.check ? 'text-success' : 'text-c-muted'
              }`}
            >
              {item.check ? (
                <IconCheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              ) : (
                <IconCircle className="w-4 h-4 text-c-muted flex-shrink-0" />
              )}
              <span className={item.check ? 'font-medium' : ''}>{item.label}</span>
            </div>
          ))}
        </div>

        {completedItems < totalItems && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-c-accent">
              <IconChevronRight className="w-3 h-3 inline mr-1" />
              {t('onboarding.checklist.completeAllFields')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
