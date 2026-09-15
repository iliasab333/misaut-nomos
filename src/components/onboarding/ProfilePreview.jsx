import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ProfilePreview({ formData, currentUser }) {
  const { t } = useTranslation();
  const hasContent = formData.business_name || formData.descripcion_corta || formData.photos?.length > 0;

  if (!hasContent) return null;

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-purple-900">
            {t('onboarding.preview.title')}
          </h3>
          <Badge className="bg-purple-600 text-white text-xs">{t('onboarding.preview.liveBadge')}</Badge>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
              {formData.business_name?.charAt(0) || currentUser?.full_name?.charAt(0) || "P"}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {formData.business_name || t('onboarding.preview.namePlaceholder')}
              </h4>
              {formData.categories?.length > 0 && (
                <p className="text-xs text-gray-600">{formData.categories[0]}</p>
              )}
            </div>
          </div>

          {formData.descripcion_corta && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {formData.descripcion_corta}
            </p>
          )}

          {(formData.ciudad || formData.provincia) && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <MapPin className="w-3 h-3" />
              <span>{formData.ciudad ? `${formData.ciudad}, ${formData.provincia}` : formData.provincia}</span>
            </div>
          )}

          {formData.photos?.length > 0 && (
            <div className="grid grid-cols-3 gap-1 mb-2">
              {formData.photos.slice(0, 3).map((photo, idx) => (
                <img
                  key={idx}
                  src={photo}
                  alt={t('onboarding.portfolio.photoAlt', { number: idx + 1 })}
                  className="w-full h-16 object-cover rounded"
                  loading="lazy"
                />
              ))}
            </div>
          )}

          <div className="flex gap-1 mt-3">
            <Badge variant="outline" className="text-xs">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
              {t('profile_card.new_tag')}
            </Badge>
            {formData.years_experience > 0 && (
              <Badge variant="outline" className="text-xs">
                {t('onboarding.preview.yearsExp', { years: formData.years_experience })}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-xs text-purple-700 mt-2 text-center">
          {t('onboarding.preview.footer')}
        </p>
      </CardContent>
    </Card>
  );
}
