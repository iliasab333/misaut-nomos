import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageSwitcher';

export function useProfileTranslation(profile) {
  const { language } = useLanguage();
  const [translatedProfile, setTranslatedProfile] = useState(profile);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!profile || language === 'es') {
      setTranslatedProfile(profile);
      return;
    }

    translateProfile();
  }, [profile, language]);

  const translateProfile = async () => {
    if (!profile) return;

    // Cache de traducción
    const cacheKey = `profile_translation_${profile.id}_${language}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        if (Date.now() - cachedData.timestamp < 1000 * 60 * 30) { // 30 min cache
          setTranslatedProfile(cachedData.profile);
          return;
        }
      } catch (e) {
        // Ignorar error de cache
      }
    }

    setIsTranslating(true);

    try {
      const fieldsToTranslate = {
        business_name: profile.business_name,
        descripcion_corta: profile.descripcion_corta,
        description: profile.description,
        skills: profile.skills || [],
        certifications: profile.certifications || [],
        activity_other: profile.activity_other
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate the following professional profile fields from Spanish to English. Keep professional terminology accurate. Return ONLY valid JSON with the same structure.

Fields to translate:
${JSON.stringify(fieldsToTranslate, null, 2)}

Return format:
{
  "business_name": "translated name (keep if it's a proper name)",
  "descripcion_corta": "translated short description",
  "description": "translated full description",
  "skills": ["skill1", "skill2"],
  "certifications": ["cert1", "cert2"],
  "activity_other": "translated activity"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            business_name: { type: "string" },
            descripcion_corta: { type: "string" },
            description: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            certifications: { type: "array", items: { type: "string" } },
            activity_other: { type: "string" }
          }
        }
      });

      const translated = {
        ...profile,
        ...result
      };

      setTranslatedProfile(translated);
      
      // Guardar en cache
      sessionStorage.setItem(cacheKey, JSON.stringify({
        profile: translated,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedProfile(profile); // Fallback al original
    } finally {
      setIsTranslating(false);
    }
  };

  return { translatedProfile, isTranslating };
}