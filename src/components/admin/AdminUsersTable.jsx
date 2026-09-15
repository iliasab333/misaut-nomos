import React, { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Shield, UserX, UserCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

function DeleteConfirmModal({ user: targetUser, onConfirm, onCancel, loading }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-7 h-7 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{t("admin.usersTable.deleteModal.title")}</h3>
          <p className="text-sm text-gray-600 mt-1">
            <Trans
              i18nKey="admin.usersTable.deleteModal.confirm"
              values={{ email: targetUser.email }}
              components={{ 1: <strong /> }}
            />
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700 space-y-1">
          <p className="font-semibold">{t("admin.usersTable.deleteModal.permanentNotice")}</p>
          <p>{t("admin.usersTable.deleteModal.itemProfile")}</p>
          <p>{t("admin.usersTable.deleteModal.itemSubscription")}</p>
          <p>{t("admin.usersTable.deleteModal.itemMessages")}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>{t("common.cancel")}</Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
            {t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssignTypeModal({ user: targetUser, onConfirm, onCancel, loading }) {
  const { t } = useTranslation();
  const [type, setType] = useState("client");
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t("admin.usersTable.assignModal.title")}</h3>
        <p className="text-sm text-gray-500 mb-4">{targetUser.email}</p>
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setType("client")}
            className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${type === "client" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"}`}
          >
            {t("admin.usersTable.assignModal.client")}
          </button>
          <button
            onClick={() => setType("professionnel")}
            className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${type === "professionnel" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
          >
            {t("admin.usersTable.assignModal.professional")}
          </button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>{t("common.cancel")}</Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => onConfirm(type)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {t("admin.usersTable.assignModal.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersTable({ users, profiles, subscriptions, currentUser }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Antes constante de módulo (FILTERS); dentro para que siga al idioma
  const filters = [
    { id: "all", label: t("admin.usersTable.filters.all") },
    { id: "professionnel", label: t("admin.usersTable.filters.professionals") },
    { id: "client", label: t("admin.usersTable.filters.clients") },
    { id: "unclassified", label: t("admin.usersTable.type.unclassified") },
    { id: "active_sub", label: t("admin.usersTable.filters.withSubscription") },
  ];

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(search.toLowerCase());
      const hasSub = subscriptions.some(s => s.user_id === u.id && (s.estado === "activo" || s.estado === "en_prueba"));
      if (filter === "professionnel") return matchSearch && u.user_type === "professionnel";
      if (filter === "client") return matchSearch && u.user_type === "client";
      if (filter === "unclassified") return matchSearch && !u.user_type;
      if (filter === "active_sub") return matchSearch && hasSub;
      return matchSearch;
    });
  }, [users, search, filter, subscriptions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoadingAction(true);
    try {
      // Delete all related data
      const userId = deleteTarget.id;
      const [profs, subs, metrics, msgs1, msgs2, reviews, notifs, favs] = await Promise.all([
        base44.entities.ProfessionalProfile.filter({ user_id: userId }),
        base44.entities.Subscription.filter({ user_id: userId }),
        base44.entities.ProfileMetrics.filter({ professional_id: userId }),
        base44.entities.Message.filter({ sender_id: userId }),
        base44.entities.Message.filter({ recipient_id: userId }),
        base44.entities.Review.filter({ client_id: userId }),
        base44.entities.Notification.filter({ user_id: userId }),
        base44.entities.Favorite.filter({ client_id: userId }),
      ]);
      await Promise.all([
        ...profs.map(r => base44.entities.ProfessionalProfile.delete(r.id)),
        ...subs.map(r => base44.entities.Subscription.delete(r.id)),
        ...metrics.map(r => base44.entities.ProfileMetrics.delete(r.id)),
        ...msgs1.map(r => base44.entities.Message.delete(r.id)),
        ...msgs2.map(r => base44.entities.Message.delete(r.id)),
        ...reviews.map(r => base44.entities.Review.delete(r.id)),
        ...notifs.map(r => base44.entities.Notification.delete(r.id)),
        ...favs.map(r => base44.entities.Favorite.delete(r.id)),
      ]);
      // Also delete reviews received as professional
      const profsReceived = await base44.entities.Review.filter({ professional_id: userId });
      await Promise.all(profsReceived.map(r => base44.entities.Review.delete(r.id)));

      toast.success(t("admin.usersTable.toast.userDeleted", { email: deleteTarget.email }));
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['professionalProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(t("admin.usersTable.toast.deleteError", { message: err.message }));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAssignType = async (type) => {
    if (!assignTarget) return;
    setLoadingAction(true);
    try {
      await base44.auth.updateMe ? null : null; // can't update other users' type directly
      await base44.entities.User.update ? 
        base44.entities.User.update(assignTarget.id, { user_type: type }) :
        null;
      toast.success(t("admin.usersTable.toast.typeAssigned", { type: type === "client" ? t("clientLabel") : t("professionalLabel") }));
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setAssignTarget(null);
    } catch (err) {
      toast.error(t("admin.usersTable.toast.assignError"));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleRole = async (u) => {
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      await base44.entities.User.update(u.id, { role: newRole });
      toast.success(t("admin.usersTable.toast.roleChanged", { role: newRole }));
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    } catch {
      toast.error(t("admin.usersTable.toast.roleError"));
    }
  };

  const handleToggleSuspend = async (u, profile) => {
    if (!profile) { toast.error(t("admin.usersTable.toast.noProfile")); return; }
    const newEstado = profile.estado_perfil === "suspendido" ? "activo" : "suspendido";
    const newVisible = newEstado === "activo";
    try {
      await base44.entities.ProfessionalProfile.update(profile.id, { estado_perfil: newEstado, visible_en_busqueda: newVisible });
      toast.success(newEstado === "suspendido" ? t("admin.usersTable.toast.profileSuspended") : t("admin.usersTable.toast.profileActivated"));
      queryClient.invalidateQueries({ queryKey: ['professionalProfiles'] });
    } catch {
      toast.error(t("admin.usersTable.toast.statusError"));
    }
  };

  const getUserTypeBadge = (u) => {
    if (!u.user_type) return <Badge className="bg-orange-100 text-orange-700 border-orange-200">{t("admin.usersTable.type.unclassified")}</Badge>;
    if (u.user_type === "professionnel") return <Badge className="bg-blue-100 text-blue-700">{t("professionalLabel")}</Badge>;
    return <Badge className="bg-gray-100 text-gray-700">{t("clientLabel")}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={t("admin.usersTable.searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-500">{t("admin.usersTable.count", { count: filtered.length })}</div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("emailField")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.usersTable.columns.type")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.usersTable.columns.subscription")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("city")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.usersTable.columns.signupDate")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.usersTable.columns.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => {
                const profile = profiles.find(p => p.user_id === u.id);
                const sub = subscriptions.find(s => s.user_id === u.id);
                const isAdmin = u.role === "admin";
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{u.email}</p>
                        {u.full_name && <p className="text-gray-400 text-xs">{u.full_name}</p>}
                        {isAdmin && <Badge className="bg-purple-100 text-purple-700 text-[10px] mt-0.5">{t("admin.usersTable.adminBadge")}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getUserTypeBadge(u)}</td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <div>
                          <Badge className={sub.estado === "activo" ? "bg-green-100 text-green-700" : sub.estado === "en_prueba" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}>
                            {sub.estado}
                          </Badge>
                          <p className="text-[10px] text-gray-400 mt-0.5">{new Date(sub.fecha_expiracion).toLocaleDateString("es-ES")}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{t("admin.usersTable.noSubscription")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {profile?.ciudad || profile?.provincia || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(u.created_date).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {!u.user_type && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-orange-300 text-orange-600" onClick={() => setAssignTarget(u)}>
                            {t("admin.usersTable.classify")}
                          </Button>
                        )}
                        {profile && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(`/autonomo/${profile.slug_publico || profile.user_id}`, '_blank')}>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                        {!isSelf && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleToggleRole(u)} title={isAdmin ? t("admin.usersTable.removeAdmin") : t("admin.usersTable.makeAdmin")}>
                            <Shield className="w-3 h-3" />
                          </Button>
                        )}
                        {profile && (
                          <Button size="sm" variant="outline" className={`h-7 text-xs ${profile.estado_perfil === "suspendido" ? "text-green-600" : "text-yellow-600"}`} onClick={() => handleToggleSuspend(u, profile)}>
                            {profile.estado_perfil === "suspendido" ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          </Button>
                        )}
                        {!isSelf && (
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setDeleteTarget(u)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={loadingAction}
        />
      )}
      {assignTarget && (
        <AssignTypeModal
          user={assignTarget}
          onConfirm={handleAssignType}
          onCancel={() => setAssignTarget(null)}
          loading={loadingAction}
        />
      )}
    </div>
  );
}
