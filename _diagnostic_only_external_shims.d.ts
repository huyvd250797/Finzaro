
declare namespace React {
  type ReactNode = any;
  type CSSProperties = Record<string, any>;
  type FormEvent<T = any> = { currentTarget: T; preventDefault():void };
  type MouseEvent<T = any> = {currentTarget:T; clientX:number; clientY:number; preventDefault(): void};
  type KeyboardEvent<T=any> = { currentTarget:T; key:string; preventDefault():void };
  type PointerEvent<T=any> = MouseEvent<T> & {pointerId:number; pointerType:string};
  interface HTMLAttributes<T=any> {children?:ReactNode; className?:string; style?:CSSProperties; title?:string; id?:string; [k:string]:any}
  interface ButtonHTMLAttributes<T=any> extends HTMLAttributes<T> { type?:'button'|'submit'|'reset' }
  interface Component<P={},S={}> { props:P; state:S; setState(state: Partial<S>): void }
  namespace JSX { type Element = any; interface IntrinsicElements { [elemName: string]: any } interface ElementChildrenAttribute { children: {} } }
}
declare namespace JSX { type Element = any; interface IntrinsicElements { [elemName: string]: any } interface ElementChildrenAttribute { children: {} } }
declare module "react" {
 export type ReactNode=React.ReactNode; export type CSSProperties=React.CSSProperties;
 export type HTMLAttributes<T=any> = React.HTMLAttributes<T>;
 export type ButtonHTMLAttributes<T=any> = React.ButtonHTMLAttributes<T>;
 export type MouseEvent<T=any> = React.MouseEvent<T>;
 export type KeyboardEvent<T=any> = React.KeyboardEvent<T>;
 export type PointerEvent<T=any> = React.PointerEvent<T>;
 export type ErrorInfo={componentStack:string};
 export class Component<P={},S={}> { props:P; state:S; setState(state:Partial<S>):void }
 export function useState<T=undefined>(v?:T|(()=>T)): [T, (v:T|((p:T)=>T))=>void];
 export function useMemo<T>(v:()=>T, d?:readonly any[]): T;
 export function useEffect(f:()=>void | (()=>void), d?:readonly any[]):void;
 export function useCallback<T extends (...args:any[])=>any>(f:T,d?:readonly any[]): T;
 export function useRef<T>(v:T): {current:T};
 export function useActionState<S,A>(action:(s:S,a:A)=>S|Promise<S>,initial:S):[S,(a:A)=>void,boolean];
 export function cache<T extends (...args:any[])=>any>(f:T):T;
 export function Suspense(props:any):any;
 const React: any; export default React;
}

declare module "next" {export type Metadata=any;export type Viewport=any; export type NextConfig=any; export namespace MetadataRoute {type Manifest=any}}
declare module "next/link" {const Link: (props:any)=>any; export default Link}
declare module "next/image" {const Image: (props:any)=>any; export default Image}
declare module "next/navigation" {export function redirect(url:string):never;export function usePathname():string; export function useRouter():any;export function useSearchParams():any}
declare module "next/cache" { export function revalidatePath(path:string, type?:'layout'|'page'):void }
declare module "next/headers" { export function headers(): Promise<any>; export function cookies(): Promise<any> }
declare module "next/server" {export class NextRequest { nextUrl:any; url:string; headers:Headers; cookies:any; json():Promise<any> }; export const NextResponse:any }
declare module "react-dom" {export function createPortal(...args:any[]):any;export function useFormStatus():any}
declare module "@supabase/supabase-js" { export type SupabaseClient<T=any> = any;export type EmailOtpType=any;export function createClient(...args:any[]):any }
declare module "@supabase/ssr" { export function createBrowserClient<T=any>(...args:any[]):any; export function createServerClient<T=any>(...args:any[]):any }
declare var process:any;
declare module "lucide-react" {
 export type LucideIcon = (props:any)=>any;
 export const AlarmClock: LucideIcon;
 export const AlertTriangle: LucideIcon;
 export const Ambulance: LucideIcon;
 export const Apple: LucideIcon;
 export const Archive: LucideIcon;
 export const ArchiveRestore: LucideIcon;
 export const ArrowDownLeft: LucideIcon;
 export const ArrowDownRight: LucideIcon;
 export const ArrowLeft: LucideIcon;
 export const ArrowLeftRight: LucideIcon;
 export const ArrowRight: LucideIcon;
 export const ArrowUpRight: LucideIcon;
 export const Baby: LucideIcon;
 export const Banknote: LucideIcon;
 export const BarChart3: LucideIcon;
 export const Bath: LucideIcon;
 export const BedDouble: LucideIcon;
 export const Beer: LucideIcon;
 export const Bike: LucideIcon;
 export const BookOpen: LucideIcon;
 export const Briefcase: LucideIcon;
 export const Building2: LucideIcon;
 export const Bus: LucideIcon;
 export const CakeSlice: LucideIcon;
 export const Calculator: LucideIcon;
 export const CalendarDays: LucideIcon;
 export const Camera: LucideIcon;
 export const Car: LucideIcon;
 export const Cat: LucideIcon;
 export const Check: LucideIcon;
 export const CheckCircle2: LucideIcon;
 export const ChevronDown: LucideIcon;
 export const ChevronLeft: LucideIcon;
 export const ChevronRight: LucideIcon;
 export const CircleAlert: LucideIcon;
 export const CircleDollarSign: LucideIcon;
 export const Clapperboard: LucideIcon;
 export const Cloud: LucideIcon;
 export const Coffee: LucideIcon;
 export const Coins: LucideIcon;
 export const CreditCard: LucideIcon;
 export const Database: LucideIcon;
 export const Dog: LucideIcon;
 export const Donut: LucideIcon;
 export const Download: LucideIcon;
 export const Dumbbell: LucideIcon;
 export const Ellipsis: LucideIcon;
 export const Film: LucideIcon;
 export const Filter: LucideIcon;
 export const Fish: LucideIcon;
 export const Flower2: LucideIcon;
 export const Fuel: LucideIcon;
 export const Gamepad2: LucideIcon;
 export const Gift: LucideIcon;
 export const GraduationCap: LucideIcon;
 export const GripVertical: LucideIcon;
 export const HandCoins: LucideIcon;
 export const HandHeart: LucideIcon;
 export const HeartPulse: LucideIcon;
 export const Home: LucideIcon;
 export const Hotel: LucideIcon;
 export const KeyRound: LucideIcon;
 export const Landmark: LucideIcon;
 export const Laptop: LucideIcon;
 export const LayoutDashboard: LucideIcon;
 export const Library: LucideIcon;
 export const LoaderCircle: LucideIcon;
 export const LockKeyhole: LucideIcon;
 export const LogOut: LucideIcon;
 export const Mail: LucideIcon;
 export const MapPin: LucideIcon;
 export const Medal: LucideIcon;
 export const Monitor: LucideIcon;
 export const Moon: LucideIcon;
 export const MoreHorizontal: LucideIcon;
 export const Music: LucideIcon;
 export const Package: LucideIcon;
 export const Palette: LucideIcon;
 export const PartyPopper: LucideIcon;
 export const PawPrint: LucideIcon;
 export const Pencil: LucideIcon;
 export const Phone: LucideIcon;
 export const PiggyBank: LucideIcon;
 export const Pill: LucideIcon;
 export const Plane: LucideIcon;
 export const Plus: LucideIcon;
 export const ReceiptText: LucideIcon;
 export const RefreshCw: LucideIcon;
 export const RotateCcw: LucideIcon;
 export const School: LucideIcon;
 export const Scissors: LucideIcon;
 export const Search: LucideIcon;
 export const SearchX: LucideIcon;
 export const Settings2: LucideIcon;
 export const Shapes: LucideIcon;
 export const Shield: LucideIcon;
 export const ShieldAlert: LucideIcon;
 export const ShieldCheck: LucideIcon;
 export const Shirt: LucideIcon;
 export const ShoppingBag: LucideIcon;
 export const ShoppingCart: LucideIcon;
 export const Smartphone: LucideIcon;
 export const Soup: LucideIcon;
 export const Sparkles: LucideIcon;
 export const Stethoscope: LucideIcon;
 export const Store: LucideIcon;
 export const Sun: LucideIcon;
 export const Ticket: LucideIcon;
 export const TrainFront: LucideIcon;
 export const Trash2: LucideIcon;
 export const TrendingDown: LucideIcon;
 export const TrendingUp: LucideIcon;
 export const Trophy: LucideIcon;
 export const Tv: LucideIcon;
 export const Umbrella: LucideIcon;
 export const UserRound: LucideIcon;
 export const Users: LucideIcon;
 export const Utensils: LucideIcon;
 export const WalletCards: LucideIcon;
 export const Wifi: LucideIcon;
 export const WifiOff: LucideIcon;
 export const Wrench: LucideIcon;
 export const X: LucideIcon;
 export const Zap: LucideIcon;
}
