import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconSparkles, IconChevronDown, IconArrowRight } from "@/components/Icons";
import { useTranslation, Trans } from "react-i18next";

const PROVINCIAS = [
  "Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Barcelona",
  "Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ciudad Real","Córdoba",
  "Cuenca","Gerona","Granada","Guadalajara","Guipúzcoa","Huelva","Huesca",
  "Islas Baleares","Jaén","La Coruña","La Rioja","Las Palmas","León","Lérida",
  "Lugo","Madrid","Málaga","Murcia","Navarra","Orense","Palencia","Pontevedra",
  "Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla","Soria","Tarragona",
  "Teruel","Toledo","Valencia","Valladolid","Vizcaya","Zamora","Zaragoza",
];

export default function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1, 2, 3
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProvincia, setSelectedProvincia] = useState("");
  const [provinciaOpen, setProvinciaOpen] = useState(false);

  // Antes constantes de módulo (CATEGORIES, STEPS): viven aquí para que se
  // retraduzcan al cambiar de idioma. `value` es el nombre en español que va
  // en la URL (?categoria=…) y entiende el buscador; `label` es lo que se ve.
  const categories = [
    { emoji: "🔌", value: "Electricista", label: t('categories.electrician') },
    { emoji: "🔧", value: "Fontanero", label: t('categories.plumber') },
    { emoji: "🎨", value: "Pintor", label: t('categories.painter') },
    { emoji: "🏗️", value: "Albañil/Reformas", label: t('home.hero.categories.renovations') },
    { emoji: "🌿", value: "Jardinero", label: t('categories.gardener') },
    { emoji: "🧹", value: "Limpieza", label: t('home.categories.cleaning') },
    { emoji: "🔑", value: "Cerrajero", label: t('categories.locksmith') },
    { emoji: "❄️", value: "Climatización", label: t('home.hero.categories.hvac') },
    { emoji: "💻", value: "Informático", label: t('home.hero.categories.itTech') },
    { emoji: "🪟", value: "Carpintero", label: t('categories.carpenter') },
    { emoji: "🚚", value: "Mudanzas", label: t('home.hero.categories.removals') },
    { emoji: "📸", value: "Fotógrafo", label: t('home.hero.categories.photographer') },
    { emoji: "🍽️", value: "Catering", label: t('home.hero.categories.catering') },
    { emoji: "💆", value: "Masajista", label: t('home.hero.categories.masseur') },
    { emoji: "⚖️", value: "Abogado", label: t('home.hero.categories.lawyer') },
    { emoji: "📊", value: "Asesor fiscal", label: t('home.hero.categories.taxAdvisor') },
    { emoji: "🐾", value: "Mascotas", label: t('home.hero.categories.pets') },
    { emoji: "🚿", value: "Fontanería", label: t('home.hero.categories.plumbing') },
  ];
  const steps = [t('home.hero.stepCategory'), t('provinceField'), t('home.hero.stepResults')];
  const selectedCat = categories.find((c) => c.value === selectedCategory);

  const handleCategorySelect = (label) => {
    setSelectedCategory(label);
    setStep(2);
  };

  const handleProvinciaSelect = (prov) => {
    setSelectedProvincia(prov);
    setProvinciaOpen(false);
    setStep(3);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("categoria", selectedCategory);
    if (selectedProvincia) params.set("provincia", selectedProvincia);
    navigate(`/buscar?${params.toString()}`);
  };

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        overflowY: "visible",
        background: "linear-gradient(135deg, #0a1a3a 0%, #112763 50%, #1e3a8a 100%)",
        color: "white",
        boxSizing: "border-box",
      }}
    >
      {/* Fondo decorativo */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.25) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "-80px", left: "-80px", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: "1152px", margin: "0 auto", padding: "48px 20px 72px", boxSizing: "border-box" }}>

        {/* Badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "999px", padding: "6px 16px", fontSize: "12px", fontWeight: 600 }}>
            <IconSparkles style={{ width: "14px", height: "14px", color: "#fbbf24", flexShrink: 0 }} />
            <span>{t('home.hero.badge')}</span>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ textAlign: "center", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "12px", fontSize: "clamp(1.7rem, 6vw, 3.5rem)" }}>
          <Trans i18nKey="home.hero.title" components={{ 1: <span style={{ color: "#67e8f9" }} /> }} />
        </h1>

        <p style={{ textAlign: "center", color: "rgba(219,234,254,0.9)", fontSize: "clamp(0.9rem, 2.2vw, 1.1rem)", lineHeight: 1.6, marginBottom: "36px", maxWidth: "520px", marginLeft: "auto", marginRight: "auto" }}>
          {t('home.hero.subtitle')}
        </p>

        {/* STEP INDICATOR */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "28px" }}>
          {steps.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <React.Fragment key={label}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: isDone ? "#10b981" : isActive ? "#fbbf24" : "rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700,
                    color: isDone || isActive ? "#000" : "rgba(255,255,255,0.5)",
                    transition: "all 0.3s ease",
                    flexShrink: 0,
                  }}>
                    {isDone ? "✓" : stepNum}
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: isActive ? "#fbbf24" : isDone ? "#10b981" : "rgba(255,255,255,0.4)", display: "none", whiteSpace: "nowrap" }} className="sm-inline">
                    {label}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: isActive ? "#fbbf24" : isDone ? "#10b981" : "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: "24px", height: "2px", background: step > stepNum ? "#10b981" : "rgba(255,255,255,0.2)", transition: "background 0.3s ease", flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* FILTER CARD */}
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", padding: "28px 24px", maxWidth: "760px", margin: "0 auto", backdropFilter: "blur(8px)" }}>

          {/* PASO 1 — Categorías */}
          {step >= 1 && (
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "rgba(191,219,254,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                {step === 1 ? t('landing.hero.whatLabel') : `✓ ${selectedCat?.label ?? selectedCategory}`}
              </p>

              {step === 1 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                }}>
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => handleCategorySelect(cat.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 12px",
                        background: selectedCategory === cat.value ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.08)",
                        border: selectedCategory === cat.value ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        cursor: "pointer",
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 500,
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        width: "100%",
                      }}
                      onMouseEnter={e => { if (selectedCategory !== cat.value) { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}}
                      onMouseLeave={e => { if (selectedCategory !== cat.value) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}}
                    >
                      <span style={{ fontSize: "20px", lineHeight: 1, flexShrink: 0 }}>{cat.emoji}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {step > 1 && (
                <button
                  onClick={() => setStep(1)}
                  style={{ background: "rgba(251,191,36,0.15)", border: "2px solid #fbbf24", borderRadius: "12px", padding: "10px 16px", color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "18px" }}>{selectedCat?.emoji}</span>
                  {selectedCat?.label ?? selectedCategory}
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginLeft: "4px" }}>{t('home.hero.change')}</span>
                </button>
              )}
            </div>
          )}

          {/* Separador */}
          {step >= 2 && (
            <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "20px 0" }} />
          )}

          {/* PASO 2 — Provincia */}
          {step >= 2 && (
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "rgba(191,219,254,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                {t('home.hero.provinceQuestion')}
              </p>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setProvinciaOpen(!provinciaOpen)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    background: "white",
                    border: "2px solid " + (selectedProvincia ? "#fbbf24" : "transparent"),
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: selectedProvincia ? 600 : 400,
                    color: selectedProvincia ? "#1e3a8a" : "#6b7280",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <span>{selectedProvincia || t('home.hero.provincePlaceholder')}</span>
                  <IconChevronDown style={{ width: "18px", height: "18px", color: "#6b7280", transform: provinciaOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }} />
                </button>

                {provinciaOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    background: "white",
                    borderRadius: "14px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                    zIndex: 100,
                    maxHeight: "260px",
                    overflowY: "auto",
                    border: "1px solid #e5e7eb",
                  }}>
                    {PROVINCIAS.map((prov) => (
                      <button
                        key={prov}
                        onClick={() => handleProvinciaSelect(prov)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "11px 16px",
                          background: selectedProvincia === prov ? "#eff6ff" : "transparent",
                          border: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: selectedProvincia === prov ? "#1d4ed8" : "#374151",
                          fontWeight: selectedProvincia === prov ? 600 : 400,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = selectedProvincia === prov ? "#eff6ff" : "transparent"; }}
                      >
                        {prov}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Separador */}
          {step >= 3 && (
            <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "20px 0" }} />
          )}

          {/* PASO 3 — Botón */}
          {step >= 3 && (
            <button
              onClick={handleSearch}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                border: "none",
                borderRadius: "14px",
                color: "#000",
                fontSize: "17px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 8px 30px rgba(245,158,11,0.5)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(245,158,11,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(245,158,11,0.5)"; }}
            >
              {t('home.hero.viewProfessionals')}
              <IconArrowRight style={{ width: "20px", height: "20px" }} />
            </button>
          )}

          {/* Skip link */}
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              onClick={() => navigate("/buscar")}
              style={{ background: "none", border: "none", color: "rgba(191,219,254,0.6)", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
            >
              {t('home.hero.viewAllUnfiltered')}
            </button>
          </div>
        </div>

        {/* Trust pills */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "12px", color: "rgba(191,219,254,0.8)", marginTop: "28px" }}>
          <span>{t('home.hero.directContact')}</span>
          <span>·</span>
          <span>{t('landing.feature_no_fees')}</span>
          <span>·</span>
          <span>{t('landing.feature_verified')}</span>
        </div>

        {/* Banner autónomos */}
        <div style={{ marginTop: "24px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "14px", padding: "14px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "12px", maxWidth: "520px", marginLeft: "auto", marginRight: "auto" }}>
          <span style={{ fontSize: "14px", color: "rgba(167,243,208,0.9)", fontWeight: 500 }}>{t('home.hero.proBanner')}</span>
          <button
            onClick={() => navigate("/completar-perfil")}
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: "10px", padding: "8px 18px", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {t('home.hero.registerFree')}
          </button>
        </div>
      </div>

      {/* Wave divider */}
      <div style={{ position: "relative", lineHeight: 0 }}>
        <svg style={{ display: "block", width: "100%", height: "48px" }} viewBox="0 0 1440 74" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 40L60 36C120 32 240 24 360 26C480 28 600 40 720 44C840 48 960 44 1080 38C1200 32 1320 24 1380 20L1440 16V74H0V40Z" style={{ fill: "rgb(var(--c-soft))" }} />
        </svg>
      </div>
    </section>
  );
}