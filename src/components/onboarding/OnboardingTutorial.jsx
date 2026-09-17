import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/Modal';
import {
  IconMessageSquare,
  IconFile,
  IconCalendar,
  IconTrending,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/Icons';

export default function OnboardingTutorial({ open, onClose }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  // Dentro del componente para que se retraduzca al cambiar de idioma.
  const tutorialSteps = [
    {
      icon: IconMessageSquare,
      title: t('onboarding.tutorial.steps.messages.title'),
      description: t('onboarding.tutorial.steps.messages.description'),
      tip: t('onboarding.tutorial.steps.messages.tip'),
    },
    {
      icon: IconFile,
      title: t('onboarding.tutorial.steps.quotes.title'),
      description: t('onboarding.tutorial.steps.quotes.description'),
      tip: t('onboarding.tutorial.steps.quotes.tip'),
    },
    {
      icon: IconCalendar,
      title: t('onboarding.tutorial.steps.jobs.title'),
      description: t('onboarding.tutorial.steps.jobs.description'),
      tip: t('onboarding.tutorial.steps.jobs.tip'),
    },
    {
      icon: IconTrending,
      title: t('onboarding.tutorial.steps.reviews.title'),
      description: t('onboarding.tutorial.steps.reviews.description'),
      tip: t('onboarding.tutorial.steps.reviews.tip'),
    },
  ];

  const currentStep = tutorialSteps[step];
  const Icon = currentStep.icon;

  return (
    <Modal open={open} onClose={onClose} title={t('onboarding.tutorial.title')}>
      <div className="py-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-c-accent rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-9 h-9 text-white" />
        </div>

        <h3 className="text-lg font-bold text-ink">
          {currentStep.title}
        </h3>

        <p className="text-c-muted leading-relaxed">
          {currentStep.description}
        </p>

        <div className="bg-warning/10 border-l-4 border-warning p-4 rounded-lg">
          <p className="text-sm text-warning font-medium">
            {currentStep.tip}
          </p>
        </div>

        <div className="flex justify-center gap-2 pt-4">
          {tutorialSteps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === step ? 'w-8 bg-c-accent' : 'w-2 bg-c-border'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="btn-secondary flex-1"
          >
            <IconChevronLeft className="w-4 h-4 mr-1" />
            {t('home.whyTrust.previous')}
          </button>
        )}

        {step < tutorialSteps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="btn-primary flex-1"
          >
            {t('common.next')}
            <IconChevronRight className="w-4 h-4 ml-1" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="btn flex-1 text-white bg-success hover:opacity-90"
          >
            {t('onboarding.tutorial.done')}
          </button>
        )}
      </div>
    </Modal>
  );
}
