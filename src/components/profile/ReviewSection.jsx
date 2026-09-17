import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconStarOutline,
  IconMessageSquare,
  IconFlag,
  IconReply,
  IconShield,
} from "@/components/Icons";
import Modal from "@/components/Modal";
import { EmptyState } from "@/components/ListStates";
import { useIdentityVerification } from "@/components/verification/IdentityVerificationWidget";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

// ── Sub-componente: Formulario de valoración ──────────────────────────────────
function ReviewForm({ professionalId, currentUser, existingReview, onSuccess }) {
  const [ratings, setRatings] = useState({
    rapidez: existingReview?.rapidez || 0,
    comunicacion: existingReview?.comunicacion || 0,
    calidad: existingReview?.calidad || 0,
    precio_satisfaccion: existingReview?.precio_satisfaccion || 0,
  });
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const LABELS = {
    rapidez: t("reviews.criteria.speed"),
    comunicacion: t("reviews.criteria.communication"),
    calidad: t("reviews.form.qualityOfWork"),
    precio_satisfaccion: t("reviews.form.valueForMoney"),
  };

  const avgRating = Math.round(
    (ratings.rapidez + ratings.comunicacion + ratings.calidad + ratings.precio_satisfaccion) / 4
  );

  const StarInput = ({ field }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setRatings((r) => ({ ...r, [field]: s }))}
          className="focus:outline-none"
          aria-label={`${s}/5`}
        >
          <IconStarOutline
            className={`w-6 h-6 transition-colors ${
              s <= ratings[field] ? "fill-star text-star" : "text-c-border hover:text-star/70"
            }`}
          />
        </button>
      ))}
    </div>
  );

  const handleSubmit = async () => {
    if (Object.values(ratings).some((r) => r === 0)) {
      toast.error(t("reviews.form.rateAllAspects"));
      return;
    }
    setSubmitting(true);
    try {
      // Comprobar si el usuario tiene verificación aprobada
      let clientVerified = false;
      try {
        const verifs = await base44.entities.IdentityVerification.filter({ user_id: currentUser.id });
        clientVerified = verifs[0]?.status === "approved";
      } catch {}

      const data = {
        professional_id: professionalId,
        client_id: currentUser.id,
        client_name: currentUser.full_name || currentUser.email?.split("@")[0],
        rating: avgRating,
        rapidez: ratings.rapidez,
        comunicacion: ratings.comunicacion,
        calidad: ratings.calidad,
        precio_satisfaccion: ratings.precio_satisfaccion,
        comment: comment.trim(),
        is_verified: true,
        client_verified: clientVerified,
      };
      if (existingReview) {
        await base44.entities.Review.update(existingReview.id, data);
      } else {
        await base44.entities.Review.create(data);
        // Actualizar media en el perfil
        const allReviews = await base44.entities.Review.filter({ professional_id: professionalId });
        const total = allReviews.length;
        const avg = allReviews.reduce((s, r) => s + (r.rating || 0), 0) / total;
        const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: professionalId });
        if (profiles[0]) {
          await base44.entities.ProfessionalProfile.update(profiles[0].id, {
            average_rating: Math.round(avg * 10) / 10,
            total_reviews: total,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["reviews", professionalId] });
      toast.success(t("reviews.form.submitted"));
      onSuccess?.();
    } catch (err) {
      toast.error(t("reviews.form.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
      <p className="font-semibold text-ink text-sm">
        {existingReview ? t("reviews.form.editTitle") : t("reviews.form.newTitle")}
      </p>
      <div className="space-y-3">
        {Object.entries(LABELS).map(([field, label]) => (
          <div key={field} className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink w-40 flex-shrink-0">{label}</span>
            <StarInput field={field} />
          </div>
        ))}
      </div>
      <textarea
        className="textarea h-24 text-sm bg-surface"
        placeholder={t("reviews.form.commentPlaceholder")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
      />
      <p className="text-xs text-c-muted text-right">{comment.length}/500</p>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="btn-primary w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
      >
        {submitting ? t("reviews.form.sending") : existingReview ? t("reviews.form.update") : t("reviews.form.submit")}
      </button>
    </div>
  );
}

// ── Sub-componente: Respuesta del autónomo ────────────────────────────────────
function ProfessionalResponseBox({ review, isOwner, professionalId }) {
  const [editing, setEditing] = useState(false);
  const [response, setResponse] = useState(review.professional_response || "");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const handleSave = async () => {
    if (!response.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Review.update(review.id, { professional_response: response.trim() });
      queryClient.invalidateQueries({ queryKey: ["reviews", professionalId] });
      setEditing(false);
      toast.success(t("reviews.card.responseSaved"));
    } catch {
      toast.error(t("reviews.card.responseError"));
    } finally {
      setSaving(false);
    }
  };

  if (review.professional_response && !editing) {
    return (
      <div className="mt-3 ml-8 bg-c-accent/5 border border-c-accent/20 rounded-lg p-3">
        <p className="text-xs font-semibold text-c-accent mb-1 flex items-center gap-1">
          <IconReply className="w-3 h-3" /> {t("reviews.card.professionalResponse")}
        </p>
        <p className="text-sm text-ink">{review.professional_response}</p>
        {isOwner && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-c-accent mt-1 hover:underline"
          >
            {t("reviews.card.editResponse")}
          </button>
        )}
      </div>
    );
  }

  if (isOwner) {
    return editing || !review.professional_response ? (
      <div className="mt-3 ml-8 space-y-2">
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-secondary btn-sm text-xs"
          >
            <IconReply className="w-3 h-3 mr-1" />
            {t("reviews.card.reply")}
          </button>
        )}
        {editing && (
          <>
            <textarea
              className="textarea h-20 text-sm"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={t("reviews.card.replyPlaceholder")}
              maxLength={400}
            />
            <div className="flex gap-2">
              <button type="button" className="btn-primary btn-sm text-xs" onClick={handleSave} disabled={saving}>
                {saving ? t("reviews.card.saving") : t("reviews.card.publishResponse")}
              </button>
              <button type="button" className="btn-secondary btn-sm text-xs" onClick={() => setEditing(false)}>
                {t("common.cancel")}
              </button>
            </div>
          </>
        )}
      </div>
    ) : null;
  }

  return null;
}

// ── Botón de valorar con gate de verificación ────────────────────────────────
function ReviewButton({ currentUser, myReview, showForm, setShowForm }) {
  const { t } = useTranslation();
  const { data: verification } = useIdentityVerification(currentUser?.id);
  const isVerified = verification?.status === "approved";

  if (!isVerified) {
    return (
      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-warning">
        <IconShield className="w-3.5 h-3.5" />
        <span>{t("reviews.gate.verifyToReview")}</span>
        <a href="/mi-perfil" className="font-semibold underline hover:no-underline ml-1">→</a>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={
        myReview
          ? "btn-secondary btn-sm text-xs"
          : "btn-primary btn-sm text-xs bg-amber-500 hover:bg-amber-600 text-white"
      }
      onClick={() => setShowForm((v) => !v)}
    >
      <IconStarOutline className="w-3 h-3 mr-1" />
      {myReview ? t("reviews.gate.myReview") : t("messages.rate")}
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ReviewSection({ reviews, professionalId, currentUser }) {
  const [reportingReviewId, setReportingReviewId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const isOwner = currentUser?.id === professionalId;
  const isClient = currentUser?.user_type === "client";

  // Comprueba si el cliente ya dejó reseña
  const myReview = reviews?.find((r) => r.client_id === currentUser?.id);

  const calculateStats = () => {
    if (!reviews || reviews.length === 0) return null;
    const count = reviews.length;
    const sum = (field) => reviews.reduce((a, r) => a + (r[field] || 0), 0);
    return {
      overall: sum("rating") / count,
      rapidez: sum("rapidez") / count,
      comunicacion: sum("comunicacion") / count,
      calidad: sum("calidad") / count,
      precio: sum("precio_satisfaccion") / count,
    };
  };

  const stats = calculateStats();

  const reportReviewMutation = useMutation({
    mutationFn: async (reviewId) => {
      await base44.entities.Review.update(reviewId, { is_reported: true });
      await base44.integrations.Core.SendEmail({
        to: "administrador@misautonomos.es",
        subject: "⚠️ Opinión reportada - MisAutónomos",
        body: `Una opinión ha sido reportada. Review ID: ${reviewId}. Reportado por: ${currentUser?.email}`,
        from_name: "MisAutónomos",
      }).catch(() => {});
    },
    onSuccess: () => {
      setReportingReviewId(null);
      queryClient.invalidateQueries({ queryKey: ["reviews", professionalId] });
      toast.success(t("reviews.report.success"));
    },
  });

  const StatBar = ({ label, value, color }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-sm font-semibold text-ink">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-soft rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  );

  const visibleReviews = reviews?.filter((r) => !r.is_reported) || [];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconStarOutline className="w-5 h-5 fill-star text-star" />
            <span className="font-semibold text-ink">
              {t("reviewsTitle")} ({visibleReviews.length})
            </span>
          </div>

          {/* CTA para clientes verificados */}
          {isClient && currentUser && !isOwner && (
            <ReviewButton currentUser={currentUser} myReview={myReview} showForm={showForm} setShowForm={setShowForm} />
          )}
        </div>

        {/* Formulario de valoración */}
        {showForm && isClient && currentUser && !isOwner && (
          <ReviewForm
            professionalId={professionalId}
            currentUser={currentUser}
            existingReview={myReview}
            onSuccess={() => setShowForm(false)}
          />
        )}

        {/* Resumen estadístico */}
        {stats && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-4 mb-4">
              <div>
                <div className="text-4xl font-bold text-ink">{stats.overall.toFixed(1)}</div>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <IconStarOutline
                      key={s}
                      className={`w-4 h-4 ${s <= stats.overall ? "fill-star text-star" : "text-c-border"}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-c-muted mt-1">{t("reviews.summary.count", { count: visibleReviews.length })}</p>
              </div>
            </div>
            {/* Juego decorativo de 4 barras (azul/verde/morado/naranja). No son
                colores semánticos: `bg-blue-500` no es el primario (blue-600) y
                morado/naranja no están en la tabla de tokens. Se dejan tal cual
                para no romper el conjunto ni cambiar el aspecto. */}
            <div className="space-y-2">
              <StatBar label={t("reviews.criteria.speed")} value={stats.rapidez} color="bg-blue-500" />
              <StatBar label={t("reviews.criteria.communication")} value={stats.comunicacion} color="bg-green-500" />
              <StatBar label={t("reviews.criteria.quality")} value={stats.calidad} color="bg-purple-500" />
              <StatBar label={t("reviews.summary.priceSatisfaction")} value={stats.precio} color="bg-orange-500" />
            </div>
          </div>
        )}

        {/* Lista de reseñas */}
        {visibleReviews.length > 0 ? (
          <div className="space-y-4">
            {visibleReviews.map((review) => (
              <article key={review.id} className="bg-soft rounded-xl p-4 border border-c-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 shrink-0 rounded-full bg-c-accent text-white text-sm flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {review.client_name?.charAt(0).toUpperCase() || "C"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink flex items-center gap-1.5">
                      {review.client_name}
                      {review.client_verified && (
                        <span title={t("proProfile.badges.identityVerified")} className="inline-flex items-center">
                          <IconShield className="w-3.5 h-3.5 text-emerald-500" />
                        </span>
                      )}
                    </p>
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <IconStarOutline
                              key={s}
                              className={`w-3 h-3 ${s <= review.rating ? "fill-star text-star" : "text-c-border"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-c-muted">
                          {format(new Date(review.created_date), "d MMMM yyyy", { locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {review.is_verified && (
                      <span className="badge-success text-xs">
                        {t("reviews.card.verifiedReview")}
                      </span>
                    )}
                    {currentUser && review.client_id !== currentUser.id && !review.is_reported && (
                      <button
                        type="button"
                        onClick={() => setReportingReviewId(review.id)}
                        className="p-1 rounded hover:bg-error/10"
                        title={t("reviews.card.reportTitle")}
                        aria-label={t("reviews.card.reportTitle")}
                      >
                        <IconFlag className="w-3.5 h-3.5 text-c-border hover:text-error" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-ratings */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                  {[
                    { label: t("reviews.criteria.speed"), val: review.rapidez },
                    { label: t("reviews.criteria.communication"), val: review.comunicacion },
                    { label: t("reviews.criteria.quality"), val: review.calidad },
                    { label: t("reviews.card.price"), val: review.precio_satisfaccion },
                  ].map(({ label, val }) =>
                    val ? (
                      <span key={label} className="text-xs text-c-muted">
                        {label}: <strong className="text-ink">{val}/5</strong>
                      </span>
                    ) : null
                  )}
                </div>

                {review.comment && (
                  <p className="text-sm text-ink leading-relaxed">{review.comment}</p>
                )}

                {/* Respuesta del profesional */}
                <ProfessionalResponseBox
                  review={review}
                  isOwner={isOwner}
                  professionalId={professionalId}
                />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("noReviewsYet")}
            body={t("beFirstToReview")}
            icon={<IconMessageSquare className="w-6 h-6" />}
          />
        )}
      </div>

      <Modal
        open={!!reportingReviewId}
        onClose={() => setReportingReviewId(null)}
        dismissible={false}
        showClose={false}
        title={t("reviews.report.confirmTitle")}
        description={t("reviews.report.confirmDescription")}
      >
        <div className="mt-6 flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => setReportingReviewId(null)}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn-danger-solid"
            onClick={() => reportReviewMutation.mutate(reportingReviewId)}
          >
            {t("reviews.report.confirm")}
          </button>
        </div>
      </Modal>
    </>
  );
}
