import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Gift } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";

export default function ReferralBanner({ profile }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!profile?.referral_code) return null;

  const code = profile.referral_code;
  const refUrl = `https://misautonomos.es/r/${code}`;
  const waText = t('referrals.banner.whatsappText', { url: refUrl });

  const copyLink = () => {
    navigator.clipboard.writeText(refUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-gray-900 text-sm">{t('referrals.banner.title')}</h3>
      </div>

      {/* Código grande */}
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-white border-2 border-amber-300 rounded-xl px-4 py-2">
          <p className="text-xs text-gray-500 leading-none mb-0.5">{t('referrals.banner.yourCode')}</p>
          <p className="text-xl font-extrabold text-gray-900 tracking-widest">{code}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 leading-none mb-0.5">{t('referrals.banner.yourLink')}</p>
          <p className="text-xs text-gray-700 truncate font-mono">{refUrl}</p>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2 flex-wrap mb-3">
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> {t('referrals.banner.copied')}</> : <><Copy className="w-3.5 h-3.5" /> {t('referrals.banner.copyLink')}</>}
        </button>
        <button
          onClick={shareWA}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {t('referrals.banner.shareWhatsapp')}
        </button>
        <button
          onClick={() => navigate("/referidos")}
          className="text-amber-700 hover:text-amber-900 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors"
        >
          {t('referrals.banner.viewReferrals')}
        </button>
      </div>

      {/* Métricas inline */}
      <div className="flex items-center gap-4 text-xs text-gray-600 border-t border-amber-200 pt-3">
        <span><Trans i18nKey="referrals.banner.referredCount" values={{ count: profile.referral_count || 0 }} components={{ strong: <strong /> }} /></span>
        <span><Trans i18nKey="referrals.banner.monthsEarned" values={{ count: profile.referral_months_earned || 0 }} components={{ strong: <strong /> }} /></span>
        {(profile.referral_months_used || 0) > 0 && (
          <span><Trans i18nKey="referrals.banner.applied" values={{ count: profile.referral_months_used }} components={{ strong: <strong /> }} /></span>
        )}
      </div>
    </div>
  );
}