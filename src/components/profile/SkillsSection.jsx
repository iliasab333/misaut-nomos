import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sparkles, Plus, X, Award, CheckCircle } from "lucide-react";
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
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-700" />
            {t("proProfile.skills.experienceTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="flex items-center gap-2">
              {yearsExperience ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
              {t("yearsExperience")}
            </Label>
            <Input
              type="number"
              value={yearsExperience}
              onChange={(e) => onYearsChange(e.target.value)}
              disabled={!isEditing}
              placeholder="5"
              min="0"
              max="50"
              className="max-w-32 mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Habilidades */}
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            {t("proProfile.skills.skillsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("proProfile.skills.skillsIntro")}
          </p>

          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addSkill)}
                placeholder={t("proProfile.skills.skillPlaceholder")}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={addSkill}
                disabled={!newSkill.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {skills.length === 0 && !isEditing ? (
              <p className="text-sm text-gray-400 italic">{t("proProfile.skills.noSkills")}</p>
            ) : (
              skills.map((skill, idx) => (
                <Badge 
                  key={idx} 
                  className="bg-purple-100 text-purple-800 px-3 py-1.5 text-sm flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {skill}
                  {isEditing && (
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:text-purple-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))
            )}
          </div>

          {isEditing && (
            <p className="text-xs text-gray-500">
              {t("proProfile.skills.suggestions")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Certificaciones */}
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            {t("proProfile.skills.certificationsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("proProfile.skills.certificationsIntro")}
          </p>

          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addCertification)}
                placeholder={t("proProfile.skills.certificationPlaceholder")}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={addCertification}
                disabled={!newCertification.trim()}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {certifications.length === 0 && !isEditing ? (
              <p className="text-sm text-gray-400 italic">{t("proProfile.skills.noCertifications")}</p>
            ) : (
              certifications.map((cert, idx) => (
                <Badge 
                  key={idx} 
                  className="bg-amber-100 text-amber-800 px-3 py-1.5 text-sm flex items-center gap-1"
                >
                  <Award className="w-3 h-3" />
                  {cert}
                  {isEditing && (
                    <button
                      onClick={() => removeCertification(cert)}
                      className="ml-1 hover:text-amber-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}