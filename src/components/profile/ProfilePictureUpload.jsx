import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { IconSpinner, IconCamera, IconClose } from "@/components/Icons";
import { toast } from "@/lib/toast";
import OptimizedImage from "@/components/OptimizedImage";
import { useTranslation } from "react-i18next";

export default function ProfilePictureUpload({ user, currentPicture, onUpdate, size = "lg", allowedForClients = true }) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentPicture);
  
  const sizes = {
    sm: { avatar: "w-16 h-16", icon: "w-4 h-4", text: "text-xs" },
    md: { avatar: "w-24 h-24", icon: "w-5 h-5", text: "text-sm" },
    lg: { avatar: "w-32 h-32", icon: "w-6 h-6", text: "text-base" },
  };
  
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("proProfile.picture.tooLarge"));
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error(t("proProfile.picture.imagesOnly"));
      return;
    }
    
    setUploading(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
    
    try {
      console.log('📤 Subiendo foto de perfil...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      console.log('✅ Foto subida correctamente:', file_url);
      
      console.log('💾 Guardando URL en usuario...');
      await base44.auth.updateMe({ profile_picture: file_url });
      console.log('✅ URL guardada en BD');
      
      if (user.user_type === "professionnel") {
        console.log('💼 Sincronizando con perfil profesional...');
        const profiles = await base44.entities.ProfessionalProfile.filter({
          user_id: user.id
        });
        
        if (profiles[0]) {
          await base44.entities.ProfessionalProfile.update(profiles[0].id, {
            imagen_principal: file_url
          });
          console.log('✅ imagen_principal actualizada en perfil profesional');
        }
      }
      
      setPreviewUrl(file_url);
      
      if (onUpdate) {
        onUpdate(file_url);
      }
      
      toast.success(t("proProfile.picture.updated"));
    } catch (error) {
      console.error("❌ Error uploading profile picture:", error);
      toast.error(t("proProfile.picture.uploadError", { message: error.message }));
      setPreviewUrl(currentPicture);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(t('proProfile.picture.confirmRemove'))) {
      return;
    }

    try {
      await base44.auth.updateMe({ profile_picture: "" });
      setPreviewUrl(null);
      
      if (onUpdate) {
        onUpdate("");
      }
      
      toast.success(t("proProfile.picture.removed"));
    } catch (error) {
      console.error("Error removing profile picture:", error);
      toast.error(t("proProfile.picture.removeError"));
    }
  };
  
  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };
  
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div className={`relative flex shrink-0 overflow-hidden rounded-full ${sizes[size].avatar} border-4 border-surface shadow-xl`}>
          {previewUrl ? (
            <OptimizedImage
              src={previewUrl}
              alt={t("proProfile.picture.alt")}
              className="w-full h-full"
              objectFit="cover"
              priority={true}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-2xl">
              {getInitials()}
            </span>
          )}
        </div>
        
        <label className="absolute bottom-0 right-0 cursor-pointer">
          <div className="w-10 h-10 bg-c-accent hover:bg-accent-hover rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
            {uploading ? (
              <IconSpinner className="w-5 h-5 text-white animate-spin" />
            ) : (
              <IconCamera className="w-5 h-5 text-white" />
            )}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            aria-label={previewUrl ? t("proProfile.picture.change") : t("proProfile.picture.add")}
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>

        {previewUrl && (
          <button
            onClick={handleRemove}
            type="button"
            className="absolute top-0 left-0 w-8 h-8 bg-error hover:brightness-90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            aria-label={t("proProfile.picture.removeAria")}
          >
            <IconClose className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      
      <div className="text-center">
        <p className={`font-semibold text-ink ${sizes[size].text}`}>
          {previewUrl ? t("proProfile.picture.change") : t("proProfile.picture.add")}
        </p>
        <p className="text-xs text-c-muted mt-1">
          {t("proProfile.picture.hint")}
        </p>
      </div>
    </div>
  );
}