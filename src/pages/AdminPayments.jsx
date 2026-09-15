import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Search, 
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser || currentUser.role !== 'admin') {
        navigate(createPageUrl("Search"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Search"));
    }
  };

  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ['adminPayments'],
    queryFn: async () => {
      const allPayments = await base44.entities.PaymentRecord.list('-payment_date', 200);
      return allPayments;
    },
    enabled: !!user,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.ProfessionalProfile.list(),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const activateProfileMutation = useMutation({
    mutationFn: async (userEmail) => {
      const response = await base44.functions.invoke('forceActivateProfile', { user_email: userEmail });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      toast.success(t('admin.payments.profileActivated', { payments: data.payments_count, total: data.total_paid.toFixed(2) }));
    },
    onError: (error) => {
      toast.error(t('admin.payments.errorGeneric', { message: error.response?.data?.error || error.message }));
    }
  });

  const syncPaymentsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncStripePayments');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminPayments'] });
      toast.success(t('admin.payments.syncSuccess', { registered: data.results.registered }));
    },
    onError: (error) => {
      toast.error(t('admin.payments.syncError', { message: error.message }));
    }
  });

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      payment.user_email?.toLowerCase().includes(search) ||
      payment.plan_nombre?.toLowerCase().includes(search) ||
      payment.stripe_invoice_id?.toLowerCase().includes(search)
    );
  });

  const stats = React.useMemo(() => {
    const totalRevenue = payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const uniquePayingUsers = new Set(
      payments.filter(p => p.status === 'succeeded').map(p => p.user_id)
    ).size;

    const visibleProfiles = profiles.filter(p => p.visible_en_busqueda === true).length;

    return { totalRevenue, uniquePayingUsers, visibleProfiles };
  }, [payments, profiles]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('admin.payments.title')}</h1>
            <p className="text-gray-600">{t('admin.payments.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => syncPaymentsMutation.mutate()}
              disabled={syncPaymentsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {syncPaymentsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('admin.payments.syncing')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {t('admin.payments.syncWithStripe')}
                </>
              )}
            </Button>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t('admin.payments.refresh')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {t('admin.payments.totalRevenue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {stats.totalRevenue.toFixed(2)} €
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('admin.payments.payingCustomers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {stats.uniquePayingUsers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {t('admin.payments.visibleProfiles')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-indigo-600">
                {stats.visibleProfiles}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('admin.payments.totalPayments')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {payments.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder={t('admin.payments.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('admin.payments.table.date')}</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('admin.payments.table.user')}</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('admin.payments.table.plan')}</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('admin.payments.table.amount')}</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('admin.payments.table.status')}</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('admin.payments.table.period')}</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('admin.payments.table.profile')}</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('admin.payments.table.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => {
                      const profile = profiles.find(p => p.user_id === payment.user_id);
                      const userInfo = allUsers.find(u => u.id === payment.user_id);
                      
                      return (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">
                            {format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm")}
                          </td>
                          <td className="p-3 text-sm">
                            <div>
                              <p className="font-medium text-gray-900">{payment.user_email}</p>
                              <p className="text-xs text-gray-500">{userInfo?.full_name || t('admin.payments.notAvailable')}</p>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <div>
                              <p className="font-medium">{payment.plan_nombre}</p>
                              {payment.is_trial && (
                                <Badge variant="outline" className="text-xs mt-1">{t('admin.payments.trialBadge')}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm font-semibold text-green-600">
                            {payment.amount?.toFixed(2)} €
                          </td>
                          <td className="p-3">
                            {payment.status === 'succeeded' ? (
                              <Badge className="bg-green-100 text-green-800 gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {t('admin.payments.status.succeeded')}
                              </Badge>
                            ) : payment.status === 'failed' ? (
                              <Badge className="bg-red-100 text-red-800 gap-1">
                                <XCircle className="w-3 h-3" />
                                {t('admin.payments.status.failed')}
                              </Badge>
                            ) : (
                              <Badge variant="outline">{payment.status}</Badge>
                            )}
                          </td>
                          <td className="p-3 text-xs text-gray-600">
                            {format(new Date(payment.period_start), "dd/MM/yy")} - 
                            {format(new Date(payment.period_end), "dd/MM/yy")}
                          </td>
                          <td className="p-3">
                            {profile ? (
                              <Badge className={profile.visible_en_busqueda 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                              }>
                                {profile.visible_en_busqueda ? t('admin.payments.profileVisible') : t('admin.payments.profileHidden')}
                              </Badge>
                            ) : (
                              <Badge variant="outline">{t('admin.payments.noProfile')}</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            {profile && !profile.visible_en_busqueda && payment.status === 'succeeded' && (
                              <Button
                                size="sm"
                                onClick={() => activateProfileMutation.mutate(payment.user_email)}
                                disabled={activateProfileMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-xs"
                              >
                                {activateProfileMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>{t('admin.payments.activate')}</>
                                )}
                              </Button>
                            )}
                            {!profile && payment.status === 'succeeded' && (
                              <span className="text-xs text-orange-600">{t('admin.payments.noProfileWarning')}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}