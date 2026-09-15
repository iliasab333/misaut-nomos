import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function Testimonials() {
  const { t } = useTranslation();

  // Antes era una constante de módulo: se evaluaba una vez al importar y no
  // se retraducía al cambiar de idioma. Los nombres y avatares van literales.
  const testimonials = [
    {
      name: "Carlos Mendoza",
      profession: t('pricing.testimonials.carlos.profession'),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos",
      rating: 5,
      text: t('pricing.testimonials.carlos.text'),
      result: t('pricing.testimonials.carlos.result')
    },
    {
      name: "Laura Fernández",
      profession: t('pricing.testimonials.laura.profession'),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Laura",
      rating: 5,
      text: t('pricing.testimonials.laura.text'),
      result: t('pricing.testimonials.laura.result')
    },
    {
      name: "Miguel Ruiz",
      profession: t('pricing.testimonials.miguel.profession'),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Miguel",
      rating: 5,
      text: t('pricing.testimonials.miguel.text'),
      result: t('pricing.testimonials.miguel.result')
    }
  ];

  return (
    <div className="max-w-6xl mx-auto mb-16">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t('pricing.testimonials.title')}
        </h2>
        <p className="text-gray-600">{t('pricing.testimonials.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="h-full border-2 border-gray-100 hover:border-blue-200 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                    loading="lazy"
                  />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{testimonial.name}</p>
                    <p className="text-xs text-gray-600">{testimonial.profession}</p>
                  </div>
                </div>

                <div className="flex gap-0.5 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-blue-200 mb-2" />
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  {testimonial.text}
                </p>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-green-800">{testimonial.result}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
