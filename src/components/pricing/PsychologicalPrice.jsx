import React from 'react';
import { Coffee, ShoppingBag } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

export default function PsychologicalPrice({ monthlyPrice }) {
  const { t } = useTranslation();
  const dailyPrice = (monthlyPrice / 30).toFixed(2);
  const comparison = monthlyPrice <= 15
    ? t('pricing.psychological.lessThanCoffee')
    : t('pricing.psychological.lessThanMenu');
  const ComparisonIcon = monthlyPrice <= 15 ? Coffee : ShoppingBag;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-semibold text-gray-900 tracking-tight">
          {monthlyPrice}€
        </span>
        <span className="text-lg text-gray-500">{t('pricing.psychological.perMonth')}</span>
      </div>
      
      <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
        <ComparisonIcon className="w-4 h-4 text-blue-600" />
        <span>
          <Trans
            i18nKey="pricing.psychological.dailyPrice"
            values={{ price: dailyPrice }}
            components={{ strong: <strong className="text-blue-700" /> }}
          />
        </span>
      </div>
      
      <p className="text-xs text-gray-500">
        {comparison}
      </p>
    </div>
  );
}
