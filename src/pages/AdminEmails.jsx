import React from 'react';
import { useTranslation } from 'react-i18next';
import AdminEmailsPanel from '@/components/admin/AdminEmailsPanel';

export default function AdminEmailsPage() {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.emails.title')}</h1>
      <p className="text-gray-600 mb-8">{t('admin.emails.subtitle')}</p>
      <AdminEmailsPanel />
    </div>
  );
}
