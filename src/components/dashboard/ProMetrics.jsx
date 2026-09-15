import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Eye, MessageSquare, Star, TrendingUp } from "lucide-react";

// Mapa explícito tipo → clave de traducción (se resuelve con t() en render).
const METRIC_STYLES = {
  views: {
    icon: Eye,
    labelKey: "dashboard.metrics.views",
    gradient: "from-blue-500 to-cyan-500",
    soft: "bg-blue-50",
    text: "text-blue-700",
  },
  contacts: {
    icon: MessageSquare,
    labelKey: "dashboard.metrics.contacts",
    gradient: "from-emerald-500 to-green-500",
    soft: "bg-emerald-50",
    text: "text-emerald-700",
  },
  rating: {
    icon: Star,
    labelKey: "pricing.socialProof.avgRating",
    gradient: "from-amber-500 to-orange-500",
    soft: "bg-amber-50",
    text: "text-amber-700",
  },
  conversion: {
    icon: TrendingUp,
    labelKey: "dashboard.metrics.conversion",
    gradient: "from-purple-500 to-pink-500",
    soft: "bg-purple-50",
    text: "text-purple-700",
  },
};

function MetricCard({ type, value, suffix = "", trend, index = 0 }) {
  const { t } = useTranslation();
  const style = METRIC_STYLES[type];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
    >
      <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl group bg-white">
        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity`} />
        <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${style.gradient} opacity-10 blur-xl group-hover:opacity-20 transition-opacity`} />
        <CardContent className="relative p-5 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-md shadow-black/5`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {typeof trend === "number" && trend !== 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {trend > 0 ? "+" : ""}{trend}%
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {value}
            </p>
            {suffix && <span className="text-lg font-bold text-gray-500">{suffix}</span>}
          </div>
          <p className="text-sm text-gray-500 mt-1 font-medium">{t(style.labelKey)}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ProMetrics({ views = 0, contacts = 0, rating = 0, totalReviews = 0, conversion = 0 }) {
  const { t } = useTranslation();
  const conversionPct = views > 0 ? Math.round((contacts / views) * 100) : 0;
  const allZero = views === 0 && contacts === 0 && rating === 0;

  // Fix #13: motivational tips when metrics are zero
  const tips = [
    t('dashboard.metrics.tips.photos'),
    t('dashboard.metrics.tips.description'),
    t('dashboard.metrics.tips.whatsapp'),
    t('dashboard.metrics.tips.share'),
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard type="views" value={views.toLocaleString("es-ES")} index={0} />
        <MetricCard type="contacts" value={contacts.toLocaleString("es-ES")} index={1} />
        <MetricCard
          type="rating"
          value={rating > 0 ? rating.toFixed(1) : "—"}
          suffix={totalReviews > 0 ? `(${totalReviews})` : ""}
          index={2}
        />
        <MetricCard type="conversion" value={conversion || conversionPct} suffix="%" index={3} />
      </div>
      {allZero && (
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">{t('dashboard.metrics.tipsTitle')}</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-blue-700">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
