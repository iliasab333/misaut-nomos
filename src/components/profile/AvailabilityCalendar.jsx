import React from "react";
import { IconClock, IconCalendar, IconCheckCircle } from "@/components/Icons";
import { useTranslation } from "react-i18next";

export default function AvailabilityCalendar({ 
  disponibilidadTipo = "laborables",
  horarioApertura = "09:00",
  horarioCierre = "18:00",
  horariorDias = [],
  isEditing,
  onChange
}) {
  const { t } = useTranslation();

  // Los `id` son los valores que se guardan en la BD (horario_dias); las
  // etiquetas viven dentro del componente para seguir al idioma activo.
  const DAYS = [
    { id: "lunes", label: t("proProfile.availability.days.monday.label"), short: t("proProfile.availability.days.monday.short"), abbr: t("proProfile.availability.days.monday.abbr") },
    { id: "martes", label: t("proProfile.availability.days.tuesday.label"), short: t("proProfile.availability.days.tuesday.short"), abbr: t("proProfile.availability.days.tuesday.abbr") },
    { id: "miercoles", label: t("proProfile.availability.days.wednesday.label"), short: t("proProfile.availability.days.wednesday.short"), abbr: t("proProfile.availability.days.wednesday.abbr") },
    { id: "jueves", label: t("proProfile.availability.days.thursday.label"), short: t("proProfile.availability.days.thursday.short"), abbr: t("proProfile.availability.days.thursday.abbr") },
    { id: "viernes", label: t("proProfile.availability.days.friday.label"), short: t("proProfile.availability.days.friday.short"), abbr: t("proProfile.availability.days.friday.abbr") },
    { id: "sabado", label: t("proProfile.availability.days.saturday.label"), short: t("proProfile.availability.days.saturday.short"), abbr: t("proProfile.availability.days.saturday.abbr") },
    { id: "domingo", label: t("proProfile.availability.days.sunday.label"), short: t("proProfile.availability.days.sunday.short"), abbr: t("proProfile.availability.days.sunday.abbr") }
  ];

  const AVAILABILITY_TYPES = [
    { value: "laborables", label: t("proProfile.availability.typeWeekdays"), icon: "📅" },
    { value: "festivos", label: t("proProfile.availability.weekends"), icon: "🎉" },
    { value: "ambos", label: t("proProfile.availability.typeEveryDay"), icon: "🗓️" }
  ];

  const handleDayToggle = (dayId) => {
    if (!isEditing) return;
    
    const currentDays = horariorDias || [];
    let newDays;
    
    if (currentDays.includes(dayId)) {
      newDays = currentDays.filter(d => d !== dayId);
    } else {
      newDays = [...currentDays, dayId];
    }
    
    onChange({ horario_dias: newDays });
  };

  const handleTypeChange = (type) => {
    if (!isEditing) return;
    onChange({ disponibilidad_tipo: type });
  };

  const getActiveDays = () => {
    if (disponibilidadTipo === "laborables") {
      return ["lunes", "martes", "miercoles", "jueves", "viernes"];
    } else if (disponibilidadTipo === "festivos") {
      return ["sabado", "domingo"];
    } else if (disponibilidadTipo === "ambos") {
      return DAYS.map(d => d.id);
    }
    return horariorDias || [];
  };

  const activeDays = getActiveDays();

  return (
    <div className="card">
      <div className="p-6 pb-3">
        <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
          <IconCalendar className="w-5 h-5 text-c-accent" />
          {t("proProfile.availability.title")}
        </h3>
      </div>
      <div className="p-6 pt-0 space-y-4">
        <p className="text-sm text-c-muted">
          {t("proProfile.availability.intro")}
        </p>

        {/* Tipo de disponibilidad */}
        <div>
          <p className="label mb-3 block">{t("proProfile.availability.typeLabel")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {AVAILABILITY_TYPES.map((type) => (
              <button
                type="button"
                key={type.value}
                onClick={() => handleTypeChange(type.value)}
                aria-pressed={disponibilidadTipo === type.value}
                className={`w-full text-left flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                  isEditing ? 'cursor-pointer' : ''
                } ${
                  disponibilidadTipo === type.value
                    ? "border-c-accent bg-c-accent/10"
                    : "border-c-border hover:bg-soft"
                }`}
              >
                <span className="text-2xl">{type.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{type.label}</p>
                </div>
                {disponibilidadTipo === type.value && (
                  <IconCheckCircle className="w-5 h-5 text-c-accent" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de días (visual) */}
        <div>
          <p className="label mb-3 block">{t("proProfile.availability.workDays")}</p>
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day) => {
              const isActive = activeDays.includes(day.id);
              return (
                <div
                  key={day.id}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-all ${
                    isActive
                      ? "border-success bg-success/10 text-success"
                      : "border-c-border bg-soft text-c-muted"
                  }`}
                >
                  <span className="text-xs font-bold mb-1">{day.short}</span>
                  <span className="text-[10px]">{day.abbr}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-c-muted mt-2">
            {disponibilidadTipo === "laborables" && t("proProfile.availability.hintWeekdays")}
            {disponibilidadTipo === "festivos" && t("proProfile.availability.hintWeekends")}
            {disponibilidadTipo === "ambos" && t("proProfile.availability.hintEveryDay")}
          </p>
        </div>

        {/* Horarios */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-2" htmlFor="availability-open">
              <IconClock className="w-4 h-4 text-c-accent" />
              {t("proProfile.availability.openingTime")}
            </label>
            <input
              id="availability-open"
              type="time"
              value={horarioApertura}
              onChange={(e) => onChange({ horario_apertura: e.target.value })}
              disabled={!isEditing}
              className="input mt-2"
            />
          </div>
          <div>
            <label className="label flex items-center gap-2" htmlFor="availability-close">
              <IconClock className="w-4 h-4 text-c-accent" />
              {t("proProfile.availability.closingTime")}
            </label>
            <input
              id="availability-close"
              type="time"
              value={horarioCierre}
              onChange={(e) => onChange({ horario_cierre: e.target.value })}
              disabled={!isEditing}
              className="input mt-2"
            />
          </div>
        </div>

        {/* Resumen visual */}
        {!isEditing && (
          <div className="p-4 bg-c-accent/10 border-l-4 border-c-accent rounded-lg">
            <div className="flex items-start gap-3">
              <IconCheckCircle className="w-5 h-5 text-c-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ink mb-1">
                  {disponibilidadTipo === "ambos" ? t("availableEveryDay") :
                   disponibilidadTipo === "laborables" ? t("proProfile.availability.summaryWeekdays") :
                   t("proProfile.availability.summaryWeekends")}
                </p>
                <p className="text-xs text-c-muted">
                  {t("proProfile.availability.scheduleRange", { from: horarioApertura, to: horarioCierre })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}