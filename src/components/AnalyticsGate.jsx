// Monta Vercel Analytics + Speed Insights SOLO si el visitante ha aceptado la
// categoría "Medición de audiencia" del banner. Antes de aceptar no se carga
// ningún script de Vercel.
//
// El banner guarda el consentimiento en localStorage.cookie_consent y avisa
// con el evento `consent:changed`, así que aceptar o retirar surte efecto sin
// recargar la página. El evento `storage` cubre el caso de dos pestañas.
import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function accepted() {
  try {
    return Boolean(JSON.parse(localStorage.getItem('cookie_consent') || '{}').analytics);
  } catch {
    return false;
  }
}

export default function AnalyticsGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const read = () => setEnabled(accepted());
    read();
    window.addEventListener('consent:changed', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('consent:changed', read);
      window.removeEventListener('storage', read);
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
