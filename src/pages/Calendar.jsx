import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Briefcase,
  FileText,
  Bell,
  CheckSquare,
  Clock,
  MapPin,
  Euro,
  User,
  Filter,
  Download,
  Users,
  FolderKanban,
  X
} from "lucide-react";
import { useTranslation } from "react-i18next";

// Sólo color e icono: la etiqueta de cada tipo no se renderizaba en ningún sitio.
const EVENT_TYPES = {
  project_start: { color: 'bg-indigo-500', icon: FolderKanban },
  project_end: { color: 'bg-indigo-700', icon: FolderKanban },
  job_start: { color: 'bg-blue-500', icon: Briefcase },
  job_end: { color: 'bg-blue-700', icon: Briefcase },
  invoice_due: { color: 'bg-orange-500', icon: FileText },
  reminder: { color: 'bg-purple-500', icon: Bell },
  task: { color: 'bg-green-500', icon: CheckSquare },
};

export default function CalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filters, setFilters] = useState({
    projects: true,
    jobs: true,
    invoices: true,
    reminders: true,
    tasks: true
  });
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    priority: 'medium',
    category: 'work',
    related_client_id: '',
    is_recurring: false,
    recurrence_pattern: 'none',
    recurrence_end_date: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.user_type !== 'professionnel') {
        navigate(createPageUrl("Search"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Search"));
    }
  };

  // Fetch all data
  const { data: projects = [] } = useQuery({
    queryKey: ['calendar-projects', user?.id],
    queryFn: () => base44.entities.Project.filter({ professional_id: user.id }),
    enabled: !!user?.id
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['calendar-jobs', user?.id],
    queryFn: () => base44.entities.Job.filter({ professional_id: user.id }),
    enabled: !!user?.id
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['calendar-invoices', user?.id],
    queryFn: () => base44.entities.Invoice.filter({ professional_id: user.id }),
    enabled: !!user?.id
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['calendar-activities', user?.id],
    queryFn: () => base44.entities.ClientActivity.filter({ 
      professional_id: user.id,
      is_reminder: true 
    }),
    enabled: !!user?.id
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['calendar-tasks', user?.id],
    queryFn: () => base44.entities.Task.filter({ professional_id: user.id }),
    enabled: !!user?.id
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['calendar-clients', user?.id],
    queryFn: () => base44.entities.ClientContact.filter({ professional_id: user.id }),
    enabled: !!user?.id
  });

  // Mutations
  const taskMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTask) {
        return base44.entities.Task.update(editingTask.id, data);
      }
      return base44.entities.Task.create({ ...data, professional_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-tasks']);
      toast.success(editingTask ? t('calendar.tasks.updated') : t('calendar.tasks.created'));
      closeTaskDialog();
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-tasks']);
      toast.success(t('calendar.tasks.deleted'));
    }
  });

  const toggleTaskComplete = useMutation({
    mutationFn: async (task) => {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      return base44.entities.Task.update(task.id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-tasks']);
    }
  });

  // Build calendar events
  const calendarEvents = useMemo(() => {
    const events = [];

    // Projects
    if (filters.projects) {
      projects.forEach(project => {
        if (project.start_date) {
          events.push({
            id: `project-start-${project.id}`,
            type: 'project_start',
            title: `🚀 ${project.name}`,
            subtitle: project.client_name,
            date: project.start_date,
            data: project,
            link: createPageUrl("ProjectDetail") + `?id=${project.id}`
          });
        }
        if (project.end_date) {
          events.push({
            id: `project-end-${project.id}`,
            type: 'project_end',
            title: `🏁 ${project.name}`,
            subtitle: project.client_name,
            date: project.end_date,
            data: project,
            link: createPageUrl("ProjectDetail") + `?id=${project.id}`
          });
        }
      });
    }

    // Jobs
    if (filters.jobs) {
      jobs.forEach(job => {
        if (job.start_date) {
          events.push({
            id: `job-start-${job.id}`,
            type: 'job_start',
            title: job.title,
            subtitle: job.client_name,
            date: job.start_date,
            data: job,
            link: createPageUrl("Jobs") + `?id=${job.id}`
          });
        }
        if (job.end_date) {
          events.push({
            id: `job-end-${job.id}`,
            type: 'job_end',
            title: t('calendar.events.jobEnd', { title: job.title }),
            subtitle: job.client_name,
            date: job.end_date,
            data: job,
            link: createPageUrl("Jobs") + `?id=${job.id}`
          });
        }
      });
    }

    // Invoices
    if (filters.invoices) {
      invoices.forEach(inv => {
        if (inv.due_date && inv.status !== 'paid' && inv.status !== 'cancelled') {
          events.push({
            id: `invoice-${inv.id}`,
            type: 'invoice_due',
            title: t('calendar.events.invoice', { number: inv.invoice_number || inv.id.slice(-6) }),
            subtitle: `${inv.client_name} - ${inv.total?.toFixed(2) || 0}€`,
            date: inv.due_date,
            data: inv,
            link: createPageUrl("Invoices") + `?id=${inv.id}`,
            isOverdue: new Date(inv.due_date) < new Date() && inv.status !== 'paid'
          });
        }
      });
    }

    // Reminders
    if (filters.reminders) {
      activities.forEach(act => {
        if (act.reminder_date && !act.reminder_completed) {
          const client = clients.find(c => c.id === act.client_id);
          events.push({
            id: `reminder-${act.id}`,
            type: 'reminder',
            title: act.title,
            subtitle: client?.client_name || t('clientLabel'),
            date: act.reminder_date.split('T')[0],
            time: act.reminder_date.split('T')[1]?.slice(0, 5),
            data: act,
            link: createPageUrl("ClientDetail") + `?id=${act.client_id}`
          });
        }
      });
    }

    // Tasks
    if (filters.tasks) {
      const categoryLabels = {
        work: t('calendar.taskForm.categories.work'),
        client: t('clientLabel'),
        admin: t('calendar.taskForm.categories.admin'),
        personal: t('calendar.taskForm.categories.personal')
      };
      tasks.forEach(task => {
        const client = clients.find(c => c.id === task.related_client_id);
        events.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          subtitle: client?.client_name || categoryLabels[task.category] || task.category,
          date: task.due_date,
          time: task.due_time,
          data: task,
          isCompleted: task.status === 'completed',
          priority: task.priority
        });
      });
    }

    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [projects, jobs, invoices, activities, tasks, clients, filters, t]);

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarEvents.filter(e => e.date === dateStr);
  };

  const navigateMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const openTaskDialog = (date = null, task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title || '',
        description: task.description || '',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        priority: task.priority || 'medium',
        category: task.category || 'work',
        related_client_id: task.related_client_id || '',
        is_recurring: task.is_recurring || false,
        recurrence_pattern: task.recurrence_pattern || 'none',
        recurrence_end_date: task.recurrence_end_date || ''
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        due_date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        due_time: '',
        priority: 'medium',
        category: 'work',
        related_client_id: '',
        is_recurring: false,
        recurrence_pattern: 'none',
        recurrence_end_date: ''
      });
    }
    setShowTaskDialog(true);
  };

  const closeTaskDialog = () => {
    setShowTaskDialog(false);
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      due_date: '',
      due_time: '',
      priority: 'medium',
      category: 'work',
      related_client_id: '',
      is_recurring: false,
      recurrence_pattern: 'none',
      recurrence_end_date: ''
    });
  };

  const handleSaveTask = () => {
    if (!taskForm.title || !taskForm.due_date) {
      toast.error(t('calendar.taskForm.titleAndDateRequired'));
      return;
    }
    taskMutation.mutate(taskForm);
  };

  const downloadICalendar = () => {
    let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MisAutónomos//ES
CALNAME:${t('calendar.export.calendarName')}
X-WR-CALNAME:MisAutónomos
X-WR-TIMEZONE:Europe/Madrid
`;

    calendarEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const dateStr = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      let summary = event.title;
      let description = event.subtitle || '';
      if (event.type === 'invoice_due') {
        description = t('calendar.export.invoiceDueDescription', { description });
      }
      
      icalContent += `BEGIN:VEVENT
UID:${event.id}@misautonomos.es
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${dateStr}
SUMMARY:${summary}
DESCRIPTION:${description}
STATUS:${event.isCompleted ? 'COMPLETED' : 'CONFIRMED'}
END:VEVENT
`;
    });

    icalContent += 'END:VCALENDAR';

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'misautonomos-calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success(t('calendar.export.downloaded'));
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  // Dentro del componente: se retraducen al cambiar de idioma.
  const DAYS = [
    t('calendar.days.mon'), t('calendar.days.tue'), t('calendar.days.wed'), t('calendar.days.thu'),
    t('calendar.days.fri'), t('calendar.days.sat'), t('calendar.days.sun')
  ];
  const MONTHS = [
    t('calendar.months.january'), t('calendar.months.february'), t('calendar.months.march'),
    t('calendar.months.april'), t('calendar.months.may'), t('calendar.months.june'),
    t('calendar.months.july'), t('calendar.months.august'), t('calendar.months.september'),
    t('calendar.months.october'), t('calendar.months.november'), t('calendar.months.december')
  ];

  const days = getDaysInMonth(currentDate);
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 md:p-6 pb-24 md:pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('calendar.title')}</h1>
            <p className="text-xs md:text-sm text-gray-600">{t('calendar.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={downloadICalendar}
              variant="outline"
              size="sm"
              className="bg-white border-green-300 text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('calendar.export.icsButton')}</span>
              <span className="sm:hidden">{t('calendar.export.icsButtonShort')}</span>
            </Button>
            <Button 
              onClick={() => openTaskDialog(selectedDate)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('calendar.tasks.new')}</span>
              <span className="sm:hidden">{t('calendar.tasks.newShort')}</span>
            </Button>
          </div>
        </div>

        {/* Quick Links */}
        <Card className="border-0 shadow-sm bg-white mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">{t('calendar.quickLinks.title')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button 
                onClick={() => navigate(createPageUrl("Projects"))}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <FolderKanban className="w-4 h-4 mr-2" />
                <span className="truncate">{t('projects.title')}</span>
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl("CRM"))}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <Users className="w-4 h-4 mr-2" />
                <span className="truncate">{t('calendar.quickLinks.clients')}</span>
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl("Presupuestos"))}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="truncate">{t('nav.quotes')}</span>
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl("Invoices"))}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <Euro className="w-4 h-4 mr-2" />
                <span className="truncate">{t('nav.invoices')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Filtros */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {t('search.filters')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={filters.projects}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, projects: checked }))}
                  />
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-sm text-gray-700">{t('projects.title')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={filters.jobs}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, jobs: checked }))}
                  />
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-700">{t('calendar.filters.jobs')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={filters.invoices}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, invoices: checked }))}
                  />
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-gray-700">{t('nav.invoices')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={filters.reminders}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, reminders: checked }))}
                  />
                  <span className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm text-gray-700">{t('calendar.filters.reminders')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={filters.tasks}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, tasks: checked }))}
                  />
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-700">{t('calendar.filters.tasks')}</span>
                </label>
              </CardContent>
            </Card>

            {/* Próximos eventos */}
            <Card className="border-0 shadow-sm hidden lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('calendar.upcoming.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {calendarEvents
                  .filter(e => new Date(e.date) >= new Date().setHours(0,0,0,0))
                  .slice(0, 8)
                  .map(event => {
                    const config = EVENT_TYPES[event.type];
                    return (
                      <div 
                        key={event.id} 
                        className={`p-2 rounded-lg border text-sm cursor-pointer hover:bg-gray-50 transition-all active:scale-98 ${event.isCompleted ? 'opacity-50' : ''}`}
                        onClick={() => {
                          if (event.type === 'task') {
                            openTaskDialog(null, event.data);
                          } else if (event.link) {
                            navigate(event.link);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${config.color} flex-shrink-0`} />
                          <span className={`font-medium truncate ${event.isCompleted ? 'line-through' : ''}`}>
                            {event.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 ml-4 truncate">
                          {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          {event.time && ` · ${event.time}`}
                        </p>
                      </div>
                    );
                  })}
                {calendarEvents.filter(e => new Date(e.date) >= new Date().setHours(0,0,0,0)).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">{t('calendar.upcoming.empty')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calendario */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 md:gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-8 w-8 md:h-9 md:w-9">
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                  <h2 className="text-base md:text-lg font-semibold min-w-[140px] md:min-w-[180px] text-center">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} className="h-8 w-8 md:h-9 md:w-9">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  onClick={goToToday} 
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 md:h-9 md:px-4"
                >
                  {t('calendar.today')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              {/* Days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                  const dayEvents = getEventsForDate(day.date);
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(day.date)}
                      className={`
                        min-h-[60px] md:min-h-[80px] p-1 rounded-lg border cursor-pointer transition-all active:scale-95
                        ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                        ${isToday(day.date) ? 'border-blue-500 border-2' : 'border-gray-100'}
                        ${isSelected(day.date) ? 'ring-2 ring-blue-300 bg-blue-50' : ''}
                        hover:bg-gray-50
                      `}
                    >
                      <div className={`text-xs md:text-sm font-medium mb-1 ${isToday(day.date) ? 'text-blue-600' : ''}`}>
                        {day.date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map(event => {
                          const config = EVENT_TYPES[event.type];
                          return (
                            <div 
                              key={event.id}
                              className={`${config.color} text-white text-[9px] md:text-[10px] px-1 py-0.5 rounded truncate ${event.isCompleted ? 'opacity-50' : ''}`}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] md:text-[10px] text-gray-500 text-center">
                            +{dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Panel de detalles del día */}
          <Card className="lg:col-span-1 border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {selectedDate 
                  ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                  : t('calendar.day.selectPrompt')
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => openTaskDialog(selectedDate)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('calendar.day.addTask')}
                  </Button>

                  {selectedDateEvents.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {selectedDateEvents.map(event => {
                        const config = EVENT_TYPES[event.type];
                        const Icon = config.icon;
                        return (
                          <div 
                            key={event.id}
                            className={`p-3 rounded-lg border hover:shadow-sm transition-all cursor-pointer active:scale-98 ${event.isCompleted ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
                            onClick={() => {
                              if (event.type === 'task') {
                                openTaskDialog(null, event.data);
                              } else if (event.link) {
                                navigate(event.link);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm ${event.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {event.title}
                                </p>
                                {event.subtitle && (
                                  <p className="text-xs text-gray-500 truncate">{event.subtitle}</p>
                                )}
                                {event.time && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {event.time}
                                  </div>
                                )}
                                {event.priority && event.type === 'task' && (
                                  <Badge 
                                    variant="outline" 
                                    className={`mt-1 text-[10px] ${
                                      event.priority === 'high' ? 'border-red-300 text-red-700' :
                                      event.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                      'border-gray-300 text-gray-600'
                                    }`}
                                  >
                                    {event.priority === 'high' ? t('projects.priority.high') : event.priority === 'medium' ? t('projects.priority.medium') : t('projects.priority.low')}
                                  </Badge>
                                )}
                              </div>
                              {event.type === 'task' && (
                                <Checkbox
                                  checked={event.isCompleted}
                                  onCheckedChange={(e) => {
                                    e.stopPropagation();
                                    toggleTaskComplete.mutate(event.data);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">
                      {t('calendar.day.empty')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  {t('calendar.day.hint')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para crear/editar tarea */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? t('calendar.tasks.edit') : t('calendar.tasks.new')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('calendar.taskForm.title')}</label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm(f => ({ ...f, title: e.target.value }))}
                placeholder={t('calendar.taskForm.titlePlaceholder')}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('description')}</label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('calendar.taskForm.descriptionPlaceholder')}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('calendar.taskForm.date')}</label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('calendar.taskForm.time')}</label>
                <Input
                  type="time"
                  value={taskForm.due_time}
                  onChange={(e) => setTaskForm(f => ({ ...f, due_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('projects.priority.label')}</label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) => setTaskForm(f => ({ ...f, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('projects.priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('projects.priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('projects.priority.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('calendar.taskForm.category')}</label>
                <Select
                  value={taskForm.category}
                  onValueChange={(v) => setTaskForm(f => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">{t('calendar.taskForm.categories.work')}</SelectItem>
                    <SelectItem value="client">{t('clientLabel')}</SelectItem>
                    <SelectItem value="admin">{t('calendar.taskForm.categories.admin')}</SelectItem>
                    <SelectItem value="personal">{t('calendar.taskForm.categories.personal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('calendar.taskForm.recurrence')}</label>
              <Select
                value={taskForm.recurrence_pattern || 'none'}
                onValueChange={(v) => setTaskForm(f => ({ 
                  ...f, 
                  recurrence_pattern: v,
                  is_recurring: v !== 'none'
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('calendar.taskForm.recurrenceOptions.none')}</SelectItem>
                  <SelectItem value="daily">{t('calendar.taskForm.recurrenceOptions.daily')}</SelectItem>
                  <SelectItem value="weekly">{t('calendar.taskForm.recurrenceOptions.weekly')}</SelectItem>
                  <SelectItem value="biweekly">{t('calendar.taskForm.recurrenceOptions.biweekly')}</SelectItem>
                  <SelectItem value="monthly">{t('calendar.taskForm.recurrenceOptions.monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {taskForm.recurrence_pattern && taskForm.recurrence_pattern !== 'none' && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t('calendar.taskForm.recurrenceEnd')}</label>
                <Input
                  type="date"
                  value={taskForm.recurrence_end_date || ''}
                  onChange={(e) => setTaskForm(f => ({ ...f, recurrence_end_date: e.target.value }))}
                  min={taskForm.due_date}
                />
                <p className="text-xs text-gray-500 mt-1">{t('calendar.taskForm.recurrenceEndHint')}</p>
              </div>
            )}
            {clients.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t('calendar.taskForm.relatedClient')}</label>
                <Select
                  value={taskForm.related_client_id}
                  onValueChange={(v) => setTaskForm(f => ({ ...f, related_client_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('calendar.taskForm.noClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>{t('calendar.taskForm.noClient')}</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            {editingTask && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  deleteTaskMutation.mutate(editingTask.id);
                  closeTaskDialog();
                }}
              >
                {t('common.delete')}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={closeTaskDialog}>{t('common.cancel')}</Button>
              <Button 
                onClick={handleSaveTask} 
                size="sm"
                disabled={taskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {taskMutation.isPending ? t('calendar.taskForm.saving') : editingTask ? t('common.save') : t('calendar.taskForm.create')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}