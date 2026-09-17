import React, { useState } from "react";
import { IconSparkles, IconPlus, IconClose, IconAward, IconCheckCircle } from "@/components/Icons";
import { useTranslation } from "react-i18next";

export default function SkillsSection({ 
  skills = [], 
  certifications = [], 
  yearsExperience = "",
  isEditing, 
  onSkillsChange, 
  onCertificationsChange,
  onYearsChange 
}) {
  const { t } = useTranslation();
  const [newSkill, setNewSkill] = useState("");
  const [newCertification, setNewCertification] = useState("");

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      onSkillsChange([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill) => {
    onSkillsChange(skills.filter(s => s !== skill));
  };

  const addCertification = () => {
    if (newCertification.trim() && !certifications.includes(newCertification.trim())) {
      onCertificationsChange([...certifications, newCertification.trim()]);
      setNewCertification("");
    }
  };

  const removeCertification = (cert) => {
    onCertificationsChange(certifications.filter(c => c !== cert));
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="space-y-6">
      {/* Años de experiencia */}
      <div className="card">
        <div className="p-6 pb-3">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <IconAward className="w-5 h-5 text-c-accent" />
            {t("proProfile.skills.experienceTitle")}
          </h3>
        </div>
        <div className="p-6 pt-0">
          <div>
            <label className="label flex items-center gap-2" htmlFor="skills-years">
              {yearsExperience ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
              {t("yearsExperience")}
            </label>
            <input
              id="skills-years"
              type="number"
              value={yearsExperience}
              onChange={(e) => onYearsChange(e.target.value)}
              disabled={!isEditing}
              placeholder="5"
              min="0"
              max="50"
              className="input max-w-32 mt-2"
            />
          </div>
        </div>
      </div>

      {/* Habilidades */}
      <div className="card">
        <div className="p-6 pb-3">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <IconSparkles className="w-5 h-5 text-purple-600" />
            {t("proProfile.skills.skillsTitle")}
          </h3>
        </div>
        <div className="p-6 pt-0 space-y-4">
          <p className="text-sm text-c-muted">
            {t("proProfile.skills.skillsIntro")}
          </p>

          {isEditing && (
            <div className="flex gap-2">
              <input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addSkill)}
                placeholder={t("proProfile.skills.skillPlaceholder")}
                className="input flex-1"
              />
              <button 
                type="button" 
                onClick={addSkill}
                disabled={!newSkill.trim()}
                aria-label={t("proProfile.skills.skillsTitle")}
                className="btn-primary bg-purple-600 hover:bg-purple-700"
              >
                <IconPlus className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {skills.length === 0 && !isEditing ? (
              <p className="text-sm text-c-muted italic">{t("proProfile.skills.noSkills")}</p>
            ) : (
              skills.map((skill, idx) => (
                <span 
                  key={idx} 
                  className="badge bg-purple-100 text-purple-800 px-3 py-1.5 text-sm gap-1"
                >
                  <IconSparkles className="w-3 h-3" />
                  {skill}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      aria-label={t("common.delete")}
                      className="ml-1 hover:text-purple-900"
                    >
                      <IconClose className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>

          {isEditing && (
            <p className="text-xs text-c-muted">
              {t("proProfile.skills.suggestions")}
            </p>
          )}
        </div>
      </div>

      {/* Certificaciones */}
      <div className="card">
        <div className="p-6 pb-3">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <IconAward className="w-5 h-5 text-warning" />
            {t("proProfile.skills.certificationsTitle")}
          </h3>
        </div>
        <div className="p-6 pt-0 space-y-4">
          <p className="text-sm text-c-muted">
            {t("proProfile.skills.certificationsIntro")}
          </p>

          {isEditing && (
            <div className="flex gap-2">
              <input
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addCertification)}
                placeholder={t("proProfile.skills.certificationPlaceholder")}
                className="input flex-1"
              />
              <button 
                type="button" 
                onClick={addCertification}
                disabled={!newCertification.trim()}
                aria-label={t("proProfile.skills.certificationsTitle")}
                className="btn-primary bg-amber-600 hover:bg-amber-700"
              >
                <IconPlus className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {certifications.length === 0 && !isEditing ? (
              <p className="text-sm text-c-muted italic">{t("proProfile.skills.noCertifications")}</p>
            ) : (
              certifications.map((cert, idx) => (
                <span 
                  key={idx} 
                  className="badge-warning px-3 py-1.5 text-sm gap-1"
                >
                  <IconAward className="w-3 h-3" />
                  {cert}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeCertification(cert)}
                      aria-label={t("common.delete")}
                      className="ml-1 hover:opacity-70"
                    >
                      <IconClose className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
