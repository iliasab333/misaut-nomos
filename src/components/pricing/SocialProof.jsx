import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Star, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function SocialProof({ profilesCount = 0 }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    professionals: 0,
    jobsCompleted: 0,
    avgRating: 4.8,
    satisfaction: 97
  });

  useEffect(() => {
    // Animación de contadores
    const interval = setInterval(() => {
      setStats(prev => ({
        professionals: Math.min(prev.professionals + 3, profilesCount || 247),
        jobsCompleted: Math.min(prev.jobsCompleted + 15, 1840),
        avgRating: 4.8,
        satisfaction: 97
      }));
    }, 50);

    setTimeout(() => clearInterval(interval), 2000);
    return () => clearInterval(interval);
  }, [profilesCount]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center"
      >
        <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
        <p className="text-2xl font-bold text-blue-900">{stats.professionals}+</p>
        <p className="text-xs text-blue-700">{t('pricing.socialProof.activeProfessionals')}</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-center"
      >
        <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
        <p className="text-2xl font-bold text-green-900">{stats.jobsCompleted}+</p>
        <p className="text-xs text-green-700">{t('pricing.socialProof.jobsThisMonth')}</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl text-center"
      >
        <Star className="w-6 h-6 text-yellow-600 mx-auto mb-2 fill-yellow-600" />
        <p className="text-2xl font-bold text-yellow-900">{stats.avgRating}</p>
        <p className="text-xs text-yellow-700">{t('pricing.socialProof.avgRating')}</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl text-center"
      >
        <Award className="w-6 h-6 text-purple-600 mx-auto mb-2" />
        <p className="text-2xl font-bold text-purple-900">{stats.satisfaction}%</p>
        <p className="text-xs text-purple-700">{t('pricing.socialProof.satisfaction')}</p>
      </motion.div>
    </div>
  );
}
