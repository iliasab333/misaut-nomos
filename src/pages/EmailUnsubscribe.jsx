import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function EmailUnsubscribePage() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const unsubscribe = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        return;
      }

      try {
        // Decodificar token: "email:timestamp" en base64
        const decoded = atob(token);
        const [emailAddr] = decoded.split(':');

        setEmail(emailAddr);

        // Buscar el subscriber
        const subscribers = await base44.asServiceRole.entities.NewsletterSubscriber.filter({
          email: emailAddr
        });

        if (!subscribers || subscribers.length === 0) {
          setStatus('not_found');
          return;
        }

        // Marcar como unsubscribed
        await base44.asServiceRole.entities.NewsletterSubscriber.update(subscribers[0].id, {
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString()
        });

        setStatus('success');
      } catch (error) {
        console.error('Unsubscribe error:', error);
        setStatus('error');
      }
    };

    unsubscribe();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-gray-600">{t('newsletter.unsubscribe.processing')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('newsletter.unsubscribe.title')}</h2>
            <p className="text-gray-600 mb-4">
              <Trans i18nKey="newsletter.unsubscribe.bodyEmail" values={{ email }} components={{ strong: <strong /> }} />
            </p>
            <p className="text-sm text-gray-500 mb-6">{t('newsletter.unsubscribe.transactionalNoteLong')}</p>
            <Button
              onClick={async () => {
                // Reactivar si el usuario lo desea
                const subscribers = await base44.asServiceRole.entities.NewsletterSubscriber.filter({
                  email
                });
                if (subscribers && subscribers.length > 0) {
                  await base44.asServiceRole.entities.NewsletterSubscriber.update(subscribers[0].id, {
                    status: 'subscribed',
                    unsubscribed_at: null
                  });
                  setStatus('resubscribed');
                }
              }}
              variant="outline"
              className="w-full mb-2"
            >
              {t('newsletter.unsubscribe.resubscribe')}
            </Button>
            <a href="/" className="text-blue-600 hover:text-blue-700 text-sm">
              {t('newsletter.backHome')}
            </a>
          </div>
        )}

        {status === 'resubscribed' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('newsletter.unsubscribe.resubscribedTitle')}</h2>
            <p className="text-gray-600 mb-6">{t('newsletter.unsubscribe.resubscribedBody')}</p>
            <a href="/" className="text-blue-600 hover:text-blue-700 text-sm">
              {t('newsletter.backHome')}
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('common.error')}</h2>
            <p className="text-gray-600 mb-6">{t('newsletter.unsubscribe.errorBodySupport')}</p>
            <a href="/" className="text-blue-600 hover:text-blue-700 text-sm">
              {t('newsletter.backHome')}
            </a>
          </div>
        )}

        {status === 'not_found' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('newsletter.unsubscribe.notFoundTitle')}</h2>
            <p className="text-gray-600 mb-6">{t('newsletter.unsubscribe.notFoundBody')}</p>
            <a href="/" className="text-blue-600 hover:text-blue-700 text-sm">
              {t('newsletter.backHome')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
