import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Loader2, 
  Users,
  TrendingUp,
  Calendar,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AdminMessagesStatsPage() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        toast.error(t('admin.messagesStats.accessDenied'));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['allMessages'],
    queryFn: async () => {
      const allMessages = await base44.entities.Message.list();
      return allMessages;
    },
    enabled: !!user,
  });

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['professionalProfiles'],
    queryFn: async () => {
      const allProfiles = await base44.entities.ProfessionalProfile.list();
      return allProfiles;
    },
    enabled: !!user,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers;
    },
    enabled: !!user,
  });

  // Calcular estadísticas de mensajes por profesional
  const professionalStats = React.useMemo(() => {
    if (!messages.length || !profiles.length || !users.length) return [];

    const stats = profiles.map(profile => {
      const professionalUser = users.find(u => u.id === profile.user_id);
      
      // Mensajes recibidos por este profesional
      const receivedMessages = messages.filter(m => m.recipient_id === profile.user_id);
      
      // Clientes únicos que han contactado
      const uniqueClients = new Set(receivedMessages.map(m => m.sender_id));
      
      // Último mensaje recibido
      const lastMessage = receivedMessages.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )[0];

      return {
        professional_id: profile.user_id,
        business_name: profile.business_name,
        email: professionalUser?.email || profile.email_contacto,
        total_messages: receivedMessages.length,
        unique_clients: uniqueClients.size,
        last_contact_date: lastMessage?.created_date || null,
        categories: profile.categories || [],
        provincia: profile.provincia,
        ciudad: profile.ciudad
      };
    });

    // Ordenar por número de mensajes (descendente)
    return stats.sort((a, b) => b.total_messages - a.total_messages);
  }, [messages, profiles, users]);

  const filteredStats = professionalStats.filter(stat => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      stat.business_name?.toLowerCase().includes(search) ||
      stat.email?.toLowerCase().includes(search) ||
      stat.categories?.some(c => c.toLowerCase().includes(search))
    );
  });

  const totalStats = React.useMemo(() => {
    return {
      totalProfessionals: professionalStats.length,
      totalMessages: professionalStats.reduce((sum, s) => sum + s.total_messages, 0),
      totalUniqueClients: new Set(messages.filter(m => 
        professionalStats.some(p => p.professional_id === m.recipient_id)
      ).map(m => m.sender_id)).size,
      avgMessagesPerProfessional: professionalStats.length > 0 
        ? (professionalStats.reduce((sum, s) => sum + s.total_messages, 0) / professionalStats.length).toFixed(1)
        : 0
    };
  }, [professionalStats, messages]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <p className="text-center text-gray-700">{t('admin.messagesStats.accessDeniedAdminsOnly')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.messagesStats.title')}</h1>
          <p className="text-gray-600">{t('admin.messagesStats.subtitle')}</p>
        </div>

        {/* Tarjetas de estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">{t('admin.messagesStats.totalProfessionals')}</p>
                  <p className="text-3xl font-bold">{totalStats.totalProfessionals}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">{t('admin.messagesStats.totalMessages')}</p>
                  <p className="text-3xl font-bold">{totalStats.totalMessages}</p>
                </div>
                <MessageSquare className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">{t('admin.messagesStats.uniqueClients')}</p>
                  <p className="text-3xl font-bold">{totalStats.totalUniqueClients}</p>
                </div>
                <Users className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm mb-1">{t('admin.messagesStats.avgPerPro')}</p>
                  <p className="text-3xl font-bold">{totalStats.avgMessagesPerProfessional}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de profesionales */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-700" />
                {t('admin.messagesStats.contactedProfessionals')}
              </CardTitle>
              <Badge variant="outline" className="text-sm">
                {t('admin.messagesStats.professionalsCount', { count: filteredStats.length })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('admin.messagesStats.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 max-w-md"
                />
              </div>
            </div>

            {loadingMessages || loadingProfiles || loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t('professionalLabel')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t('emailField')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t('admin.messagesStats.table.categories')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t('admin.messagesStats.table.location')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">{t('admin.messagesStats.totalMessages')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">{t('admin.messagesStats.uniqueClients')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t('admin.messagesStats.table.lastContact')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStats.map((stat, index) => (
                      <tr key={stat.professional_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {stat.business_name || t('admin.messagesStats.noName')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {stat.email || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {stat.categories.slice(0, 2).map((cat, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                            {stat.categories.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{stat.categories.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {stat.ciudad ? `${stat.ciudad}, ${stat.provincia}` : stat.provincia || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={
                            stat.total_messages > 10 ? "bg-green-100 text-green-800" :
                            stat.total_messages > 5 ? "bg-blue-100 text-blue-800" :
                            stat.total_messages > 0 ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {stat.total_messages}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-purple-100 text-purple-800">
                            {stat.unique_clients}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {stat.last_contact_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(stat.last_contact_date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit'
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredStats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {t('admin.messagesStats.noResults')}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}