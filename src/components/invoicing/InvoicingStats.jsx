import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, Euro, FileText, Users, Calendar,
  Filter, Download, ArrowUpRight, ArrowDownRight, Loader2
} from "lucide-react";
import { format, subMonths, subYears, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const STATUS_COLORS = {
  paid: '#10b981',
  sent: '#3b82f6',
  draft: '#9ca3af',
  overdue: '#ef4444',
  cancelled: '#6b7280'
};

export default function InvoicingStats({ invoices = [], loading = false }) {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState('year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const STATUS_LABELS = {
    paid: t('invoices.stats.status.paid'),
    sent: t('invoices.stats.status.sent'),
    draft: t('draft'),
    overdue: t('invoices.stats.status.overdue'),
    cancelled: t('invoices.stats.status.cancelled')
  };

  // Calcular rango de fechas
  const dateFilter = useMemo(() => {
    const now = new Date();
    
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      return {
        start: parseISO(customStartDate),
        end: parseISO(customEndDate)
      };
    }
    
    switch (dateRange) {
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case '3months':
        return { start: subMonths(now, 3), end: now };
      case '6months':
        return { start: subMonths(now, 6), end: now };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'all':
        return { start: new Date(2020, 0, 1), end: now };
      default:
        return { start: startOfYear(now), end: endOfYear(now) };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Filtrar facturas por rango de fechas
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv.issue_date) return false;
      const invDate = parseISO(inv.issue_date);
      return isWithinInterval(invDate, { start: dateFilter.start, end: dateFilter.end });
    });
  }, [invoices, dateFilter]);

  // Estadísticas generales
  const stats = useMemo(() => {
    const total = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paid = filteredInvoices.filter(inv => inv.status === 'paid');
    const pending = filteredInvoices.filter(inv => ['sent', 'draft'].includes(inv.status));
    const overdue = filteredInvoices.filter(inv => inv.status === 'overdue');
    
    const paidTotal = paid.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const pendingTotal = pending.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const overdueTotal = overdue.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Comparación con periodo anterior
    const periodLength = dateFilter.end.getTime() - dateFilter.start.getTime();
    const prevStart = new Date(dateFilter.start.getTime() - periodLength);
    const prevEnd = new Date(dateFilter.start.getTime() - 1);
    
    const prevInvoices = invoices.filter(inv => {
      if (!inv.issue_date) return false;
      const invDate = parseISO(inv.issue_date);
      return isWithinInterval(invDate, { start: prevStart, end: prevEnd });
    });
    const prevTotal = prevInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const growth = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return {
      total,
      paidTotal,
      pendingTotal,
      overdueTotal,
      invoiceCount: filteredInvoices.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      growth,
      avgInvoice: filteredInvoices.length > 0 ? total / filteredInvoices.length : 0
    };
  }, [filteredInvoices, invoices, dateFilter]);

  // Datos para gráfico de evolución mensual
  const monthlyData = useMemo(() => {
    const months = {};
    
    filteredInvoices.forEach(inv => {
      if (!inv.issue_date) return;
      const month = format(parseISO(inv.issue_date), 'yyyy-MM');
      if (!months[month]) {
        months[month] = { month, total: 0, paid: 0, pending: 0, count: 0 };
      }
      months[month].total += inv.total || 0;
      months[month].count += 1;
      if (inv.status === 'paid') {
        months[month].paid += inv.total || 0;
      } else {
        months[month].pending += inv.total || 0;
      }
    });

    return Object.values(months)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        ...m,
        monthLabel: format(parseISO(m.month + '-01'), 'MMM yy', { locale: es })
      }));
  }, [filteredInvoices]);

  // Datos para gráfico de estados
  const statusData = useMemo(() => {
    const statusCounts = {};
    
    filteredInvoices.forEach(inv => {
      const status = inv.status || 'draft';
      if (!statusCounts[status]) {
        statusCounts[status] = { status, count: 0, total: 0 };
      }
      statusCounts[status].count += 1;
      statusCounts[status].total += inv.total || 0;
    });

    return Object.values(statusCounts).map(s => ({
      ...s,
      name: STATUS_LABELS[s.status] || s.status,
      color: STATUS_COLORS[s.status] || '#9ca3af'
    }));
  }, [filteredInvoices, t]);

  // Datos por cliente
  const clientData = useMemo(() => {
    const clients = {};
    
    filteredInvoices.forEach(inv => {
      const clientName = inv.client_name || t('invoices.stats.unnamedClient');
      if (!clients[clientName]) {
        clients[clientName] = { name: clientName, total: 0, count: 0 };
      }
      clients[clientName].total += inv.total || 0;
      clients[clientName].count += 1;
    });

    return Object.values(clients)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredInvoices, t]);

  // Años disponibles para filtro
  const availableYears = useMemo(() => {
    const years = new Set();
    invoices.forEach(inv => {
      if (inv.issue_date) {
        years.add(parseISO(inv.issue_date).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs text-gray-500">{t('invoices.stats.period')}</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{t('invoices.period.thisMonth')}</SelectItem>
                  <SelectItem value="3months">{t('invoices.period.lastThreeMonths')}</SelectItem>
                  <SelectItem value="6months">{t('invoices.period.lastSixMonths')}</SelectItem>
                  <SelectItem value="year">{t('invoices.period.thisYear')}</SelectItem>
                  <SelectItem value="all">{t('invoices.period.all')}</SelectItem>
                  <SelectItem value="custom">{t('invoices.period.custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <Label className="text-xs text-gray-500">{t('invoices.period.from')}</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{t('invoices.period.to')}</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}

            <div className="ml-auto text-sm text-gray-500">
              <Calendar className="w-4 h-4 inline mr-1" />
              {format(dateFilter.start, 'dd MMM yyyy', { locale: es })} - {format(dateFilter.end, 'dd MMM yyyy', { locale: es })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">{t('invoices.stats.totalBilled')}</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {stats.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                </p>
                <p className="text-xs text-blue-600 mt-1">{t('invoices.stats.invoiceCount', { count: stats.invoiceCount })}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${stats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(stats.growth).toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">{t('invoices.stats.collected')}</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {stats.paidTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                </p>
                <p className="text-xs text-green-600 mt-1">{t('invoices.stats.paidCount', { count: stats.paidCount })}</p>
              </div>
              <div className="p-2 bg-green-200 rounded-lg">
                <Euro className="w-5 h-5 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">{t('invoices.stats.pending')}</p>
                <p className="text-3xl font-bold text-yellow-900 mt-1">
                  {stats.pendingTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                </p>
                <p className="text-xs text-yellow-600 mt-1">{t('invoices.stats.pendingCount', { count: stats.pendingCount })}</p>
              </div>
              <div className="p-2 bg-yellow-200 rounded-lg">
                <FileText className="w-5 h-5 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">{t('invoices.stats.averagePerInvoice')}</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {stats.avgInvoice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                </p>
                <p className="text-xs text-purple-600 mt-1">{t('invoices.stats.averageAmount')}</p>
              </div>
              <div className="p-2 bg-purple-200 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolución de ingresos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              {t('invoices.stats.revenueChart')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip 
                    formatter={(value) => [`${value.toFixed(2)}€`, '']}
                    labelFormatter={(label) => t('invoices.stats.monthTooltip', { month: label })}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    name={t('total')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('invoices.stats.noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagadas vs Pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              {t('invoices.stats.paidVsPending')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(value) => [`${value.toFixed(2)}€`, '']} />
                  <Legend />
                  <Bar dataKey="paid" name={t('invoices.stats.status.paid')} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name={t('invoices.stats.status.pending')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('invoices.stats.noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado de facturas (Pie) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('invoices.stats.statusChart')}</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="flex items-center">
                <ResponsiveContainer width="60%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="total"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value.toFixed(2)}€`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-40% space-y-2">
                  {statusData.map((status, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-sm text-gray-700">{status.name}</span>
                      <span className="text-sm font-semibold ml-auto">{status.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                {t('invoices.stats.noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              {t('invoices.stats.topClients')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientData.length > 0 ? (
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {clientData.map((client, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                      <p className="text-xs text-gray-500">{t('invoices.stats.invoiceCount', { count: client.count })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {client.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                      </p>
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                          style={{ width: `${(client.total / clientData[0].total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-500">
                {t('invoices.stats.noData')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumen por vencimiento */}
      {stats.overdueCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800">
                  {t('invoices.stats.overdueCount', { count: stats.overdueCount })}
                </p>
                <p className="text-sm text-red-600">
                  {t('invoices.stats.overdueAmount', { amount: stats.overdueTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 }) })}
                </p>
              </div>
              <Badge className="ml-auto bg-red-100 text-red-800 hover:bg-red-100">
                {t('invoices.stats.needsAttention')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
