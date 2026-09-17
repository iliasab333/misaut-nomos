// Iconos — lucide-react con trazo y tamaño coherentes. Método de khdemlidaba:
// UN fichero importa lucide; el resto de la app importa de aquí. Así el
// grosor (1.8) y el tamaño por defecto (24) no se deciden 200 veces, y
// cambiar de set de iconos es tocar un fichero.
//
// Durante la migración los ficheros aún no migrados siguen importando
// lucide directamente; cada swap los pasa por aquí. Añade iconos según
// hagan falta — no adelantes el catálogo entero de lucide.
//
// IconWhatsApp va en SVG inline por reconocimiento de marca (lucide no lo
// trae con la forma oficial).

import {
  Search,
  MapPin,
  Briefcase,
  Star,
  ShieldCheck,
  Phone,
  Menu,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MessageSquareText,
  MessageCircle,
  BadgeCheck,
  Sparkles,
  Zap,
  Copy,
  Check,
  CheckCheck,
  CheckSquare,
  Globe,
  Camera,
  Images,
  PenLine,
  Share2,
  Heart,
  Bell,
  User,
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Minus,
  Calendar,
  Clock,
  FileText,
  Download,
  Upload,
  ExternalLink,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  Settings,
  LogOut,
  Home,
  Filter,
  SlidersHorizontal,
  MoreHorizontal,
  MoreVertical,
  Euro,
  CreditCard,
  Receipt,
  Send,
  Paperclip,
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw,
  Building2,
  Save,
  CheckCircle,
  HelpCircle,
  Lightbulb,
  TrendingUp,
  Award,
  BarChart3,
  Music,
  MessageSquare,
  Pencil,
  Facebook,
  Instagram,
  Linkedin,
  StickyNote,
  UserCog,
  Megaphone,
  MousePointer,
  Shield,
  Flag,
  Reply,
  Bookmark,
  Apple,
  Droplets,
  Paintbrush,
  HardHat,
  Trees,
  Key,
  Hammer,
  LifeBuoy,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Headphones,
  Scale,
  Cookie,
  Trophy,
  ShieldOff,
  FileCheck2,
  Twitter,
  Clock3,
  Wallet,
  FlaskConical,
  LayoutDashboard,
  BarChart2,
  Ticket,
  Gift,
  UserMinus,
  Tag,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  MousePointerClick,
  Rocket,
  Wrench,
  Quote,
  FilePlus2,
  ShieldX,
} from 'lucide-react';

const mk = (Cmp, defaults = {}) => {
  const Icon = (p) => <Cmp size={24} strokeWidth={1.8} {...defaults} {...p} />;
  Icon.displayName = `Icon(${Cmp.displayName || Cmp.name || 'lucide'})`;
  return Icon;
};

export const IconSearch = mk(Search);
export const IconMapPin = mk(MapPin);
export const IconBriefcase = mk(Briefcase);
export const IconStar = mk(Star, { size: 16, strokeWidth: 0, fill: 'currentColor' });
export const IconStarOutline = mk(Star, { size: 16 });
export const IconShield = mk(ShieldCheck);
export const IconPhone = mk(Phone);
export const IconMenu = mk(Menu);
export const IconClose = mk(X);
export const IconArrowRight = mk(ArrowRight);
export const IconArrowLeft = mk(ArrowLeft);
export const IconChevronDown = mk(ChevronDown);
export const IconChevronRight = mk(ChevronRight);
export const IconChevronLeft = mk(ChevronLeft);
export const IconMessage = mk(MessageSquareText);
export const IconMessageCircle = mk(MessageCircle);
export const IconVerified = mk(BadgeCheck);
export const IconSparkles = mk(Sparkles);
export const IconZap = mk(Zap);
export const IconCopy = mk(Copy);
export const IconCheck = mk(Check);
export const IconCheckCheck = mk(CheckCheck);
export const IconCheckSquare = mk(CheckSquare);
export const IconGlobe = mk(Globe);
export const IconCamera = mk(Camera);
export const IconImages = mk(Images);
export const IconEdit = mk(PenLine);
export const IconShare = mk(Share2);
export const IconHeart = mk(Heart);
export const IconHeartFilled = mk(Heart, { fill: 'currentColor', strokeWidth: 0 });
export const IconBell = mk(Bell);
export const IconUser = mk(User);
export const IconUsers = mk(Users);
export const IconMail = mk(Mail);
export const IconLock = mk(Lock);
export const IconEye = mk(Eye);
export const IconEyeOff = mk(EyeOff);
export const IconTrash = mk(Trash2);
export const IconPlus = mk(Plus);
export const IconMinus = mk(Minus);
export const IconCalendar = mk(Calendar);
export const IconClock = mk(Clock);
export const IconFile = mk(FileText);
export const IconDownload = mk(Download);
export const IconUpload = mk(Upload);
export const IconExternal = mk(ExternalLink);
export const IconInfo = mk(Info);
export const IconWarning = mk(AlertTriangle);
export const IconAlert = mk(AlertCircle);
export const IconSuccess = mk(CheckCircle2);
export const IconCircle = mk(Circle);
export const IconError = mk(XCircle);
export const IconSpinner = mk(Loader2, { className: 'animate-spin' });
export const IconSettings = mk(Settings);
export const IconLogout = mk(LogOut);
export const IconHome = mk(Home);
export const IconFilter = mk(Filter);
export const IconSliders = mk(SlidersHorizontal);
export const IconMore = mk(MoreHorizontal);
export const IconMoreVertical = mk(MoreVertical);
export const IconEuro = mk(Euro);
export const IconCard = mk(CreditCard);
export const IconReceipt = mk(Receipt);
export const IconSend = mk(Send);
export const IconAttach = mk(Paperclip);
export const IconImage = mk(ImageIcon);
export const IconLink = mk(LinkIcon);
export const IconRefresh = mk(RefreshCw);
export const IconBuilding = mk(Building2);
export const IconSave = mk(Save);
export const IconCheckCircle = mk(CheckCircle);
export const IconHelp = mk(HelpCircle);
export const IconLightbulb = mk(Lightbulb);
export const IconTrending = mk(TrendingUp);
export const IconAward = mk(Award);
export const IconChart = mk(BarChart3);
export const IconMusic = mk(Music);
export const IconMessageSquare = mk(MessageSquare);
export const IconPencil = mk(Pencil);
export const IconFacebook = mk(Facebook);
export const IconInstagram = mk(Instagram);
export const IconLinkedin = mk(Linkedin);

export const IconNote = mk(StickyNote);
export const IconUserCog = mk(UserCog);
export const IconMegaphone = mk(Megaphone);
export const IconPointer = mk(MousePointer);
export const IconShieldPlain = mk(Shield);

export const IconFlag = mk(Flag);

export const IconReply = mk(Reply);

export const IconLifeBuoy = mk(LifeBuoy);
export const IconThumbUp = mk(ThumbsUp);
export const IconThumbDown = mk(ThumbsDown);
export const IconBook = mk(BookOpen);
export const IconHeadphones = mk(Headphones);

// Añadidos por el lote «publico-1» (búsqueda, categoría, login).
export const IconBookmark = mk(Bookmark);
export const IconApple = mk(Apple);
export const IconDroplets = mk(Droplets);
export const IconPaintbrush = mk(Paintbrush);
export const IconHardHat = mk(HardHat);
export const IconTrees = mk(Trees);
export const IconKey = mk(Key);
export const IconHammer = mk(Hammer);

// Añadidos por el lote «publico-2» (legales, blog, contacto, newsletter).
export const IconScale = mk(Scale);
export const IconCookie = mk(Cookie);
export const IconTrophy = mk(Trophy);
export const IconShieldOff = mk(ShieldOff);
export const IconFileCheck = mk(FileCheck2);
export const IconTwitter = mk(Twitter);
export const IconClock3 = mk(Clock3);
export const IconWallet = mk(Wallet);


// Añadidos por el lote «admin-2» (campañas, layout admin, blog, newsletter,
// outreach, soporte, usuarios, dashboard).
export const IconFlask = mk(FlaskConical);
export const IconDashboard = mk(LayoutDashboard);
export const IconBarChart = mk(BarChart2);
export const IconTicket = mk(Ticket);
export const IconGift = mk(Gift);
export const IconUserMinus = mk(UserMinus);
export const IconTag = mk(Tag);
export const IconRotateCcw = mk(RotateCcw);
export const IconToggleOff = mk(ToggleLeft);
export const IconToggleOn = mk(ToggleRight);
export const IconPointerClick = mk(MousePointerClick);

// Añadido por el lote «suscripcion» (planes, pago, onboarding de alta).
export const IconRocket = mk(Rocket);

// Añadido por el lote «cuenta-2» (verificación de identidad).
export const IconShieldX = mk(ShieldX);

export const IconWhatsApp = ({ size = 24, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

// Añadidos por el lote «layout» (home, landing, layout).
export const IconWrench = mk(Wrench);
export const IconQuote = mk(Quote);
export const IconFilePlus = mk(FilePlus2);
