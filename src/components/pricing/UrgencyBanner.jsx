import React, { useState, useEffect } from 'react';
import { Users, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';

export default function UrgencyBanner() {
  const { t } = useTranslation();
  const [recentSignups, setRecentSignups] = useState(8);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    // Simular nuevos registros cada 15 segundos
    const interval = setInterval(() => {
      setRecentSignups(prev => Math.min(prev + 1, 15));
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 1000);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto mb-8"
    >
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showPulse && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-2 h-2 bg-green-400 rounded-full"
                />
              )}
            </AnimatePresence>
            <Users className="w-5 h-5" />
            <Trans
              i18nKey="pricing.urgency.joinedToday"
              values={{ signups: recentSignups }}
              components={{
                bold: <span className="font-bold text-lg" />,
                light: <span className="font-light" />,
              }}
            />
          </div>
          
          <div className="hidden md:block w-px h-6 bg-white/30" />
          
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-light">{t('pricing.urgency.offerEnding')}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
