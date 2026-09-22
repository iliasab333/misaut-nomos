import { base44 } from './base44Client';

// Auth SDK (compat Base44: User === base44.auth)
export const User = base44.auth;

// Entidades (re-exportadas por compatibilidad con imports nominales)
export const ServiceCategory = base44.entities.ServiceCategory;
export const ProfessionalProfile = base44.entities.ProfessionalProfile;
export const SubscriptionPlan = base44.entities.SubscriptionPlan;
export const Subscription = base44.entities.Subscription;
export const PaymentRecord = base44.entities.PaymentRecord;
export const Message = base44.entities.Message;
export const Review = base44.entities.Review;
export const Favorite = base44.entities.Favorite;
export const Notification = base44.entities.Notification;
export const ProfileMetrics = base44.entities.ProfileMetrics;
export const QuoteRequest = base44.entities.QuoteRequest;
export const SavedSearch = base44.entities.SavedSearch;
export const Ticket = base44.entities.Ticket;
export const TicketMessage = base44.entities.TicketMessage;
export const TicketEvent = base44.entities.TicketEvent;
export const IdentityVerification = base44.entities.IdentityVerification;
export const CookieConsent = base44.entities.CookieConsent;
export const BlogPost = base44.entities.BlogPost;
export const NewsletterSubscriber = base44.entities.NewsletterSubscriber;
export const ReviewRequest = base44.entities.ReviewRequest;
export const FollowUpReminder = base44.entities.FollowUpReminder;
export const TrialUsageLog = base44.entities.TrialUsageLog;
export const ClientContact = base44.entities.ClientContact;
export const Job = base44.entities.Job;
export const Invoice = base44.entities.Invoice;
export const InvoiceTemplate = base44.entities.InvoiceTemplate;
export const InvoicingSettings = base44.entities.InvoicingSettings;
export const ClientActivity = base44.entities.ClientActivity;
export const CRMAutomation = base44.entities.CRMAutomation;
export const AutomationExecution = base44.entities.AutomationExecution;
export const Task = base44.entities.Task;
export const Project = base44.entities.Project;
export const ProjectPhase = base44.entities.ProjectPhase;
export const ProjectTask = base44.entities.ProjectTask;
export const TimeLog = base44.entities.TimeLog;
export const Quote = base44.entities.Quote;
export const Referral = base44.entities.Referral;
export const AdminAlert = base44.entities.AdminAlert;
export const AdsBriefing = base44.entities.AdsBriefing;
export const ClientInsights = base44.entities.ClientInsights;
export const PlanAuditLog = base44.entities.PlanAuditLog;
export const RedirectLog = base44.entities.RedirectLog;
export const EmailLog = base44.entities.EmailLog;
export const ResendEvent = base44.entities.ResendEvent;
export const OutboundLead = base44.entities.OutboundLead;
export const FreeMonthGrant = base44.entities.FreeMonthGrant;

// No usado realmente en la app (solo texto de UI), se mantiene por compat.
export const Query = base44.entities.Query;
