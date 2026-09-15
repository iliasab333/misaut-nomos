import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AvailabilityBadge({ profile }) {
  const { t } = useTranslation();
  
  if (!profile) return null;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay();

  const isWeekday = currentDay >= 1 && currentDay <= 5;
  const isWeekend = currentDay === 0 || currentDay === 6;

  let isAvailableBySchedule = false;

  if (profile.disponibilidad_tipo === "laborables" && isWeekday) {
    isAvailableBySchedule = true;
  } else if (profile.disponibilidad_tipo === "festivos" && isWeekend) {
    isAvailableBySchedule = true;
  } else if (profile.disponibilidad_tipo === "ambos") {
    isAvailableBySchedule = true;
  }

  if (isAvailableBySchedule && profile.horario_apertura && profile.horario_cierre) {
    const [openHour, openMinute] = profile.horario_apertura.split(':').map(Number);
    const [closeHour, closeMinute] = profile.horario_cierre.split(':').map(Number);

    const currentTime = currentHour * 60 + currentMinute;
    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;

    if (currentTime >= openTime && currentTime < closeTime) {
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-300 flex items-center gap-1.5 w-fit">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-semibold">{t('proProfile.availability.availableNow')}</span>
          <span className="text-xs">· {t('proProfile.availability.until')} {profile.horario_cierre}</span>
        </Badge>
      );
    }
  }

  const getDayTypeText = () => {
    switch (profile.disponibilidad_tipo) {
      case "laborables":
        return t('proProfile.availability.mondayFriday');
      case "festivos":
        return t('proProfile.availability.weekends');
      case "ambos":
        return t('proProfile.availability.everyday');
      default:
        return t('proProfile.availability.mondayFriday');
    }
  };

  return (
    <Badge variant="outline" className="border-gray-300 text-gray-700 flex items-center gap-1.5 w-fit">
      <Calendar className="w-3.5 h-3.5" />
      <span>{getDayTypeText()}</span>
      {profile.horario_apertura && profile.horario_cierre && (
        <span className="text-xs">· {profile.horario_apertura} - {profile.horario_cierre}</span>
      )}
    </Badge>
  );
}