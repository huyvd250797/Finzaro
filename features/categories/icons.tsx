import type { LucideIcon } from "lucide-react";
import {
  AlarmClock, Ambulance, Apple, Baby, Banknote, Bath, BedDouble, Beer, Bike, BookOpen, Briefcase,
  Building2, Bus, CakeSlice, Camera, Car, Cat, CircleDollarSign, Clapperboard, Cloud, Coins, Coffee,
  CreditCard, Dog, Donut, Dumbbell, Film, Fish, Flower2, Fuel, Gamepad2, Gift, GraduationCap,
  HandCoins, HandHeart, HeartPulse, Home, Hotel, KeyRound, Landmark, Laptop, Library, Mail, MapPin,
  Medal, Monitor, Moon, MoreHorizontal, Music, Package, Palette, PartyPopper, PawPrint, Phone,
  PiggyBank, Pill, Plane, ReceiptText, RotateCcw, School, Scissors, Shapes, Shield, Shirt,
  ShoppingBag, ShoppingCart, Smartphone, Soup, Sparkles, Stethoscope, Store, Sun, Ticket,
  TrainFront, TrendingUp, Trophy, Tv, Umbrella, Users, Utensils, WalletCards, Wifi, Wrench, Zap
} from "lucide-react";

export const CATEGORY_ICONS = {
  Shapes, Briefcase, Gift, Laptop, Store, TrendingUp, RotateCcw, CircleDollarSign, Utensils, Home,
  Car, ShoppingBag, ShoppingCart, ReceiptText, HeartPulse, GraduationCap, Gamepad2, Users,
  MoreHorizontal, Coffee, Plane, Bus, TrainFront, Fuel, Baby, PawPrint, Dog, Shirt, Smartphone,
  Wifi, CreditCard, Dumbbell, Stethoscope, BookOpen, Film, Music, Landmark, WalletCards, PiggyBank,
  Building2, Coins, Banknote, CakeSlice, Camera, Donut, PartyPopper, Shield, Soup, Bike, BedDouble,
  Tv, Wrench, AlarmClock, Ambulance, Apple, Bath, Beer, Cat, Clapperboard, Cloud, Fish, Flower2,
  HandCoins, HandHeart, Hotel, KeyRound, Library, Mail, MapPin, Medal, Monitor, Moon, Package,
  Palette, Phone, Pill, School, Scissors, Sparkles, Sun, Ticket, Trophy, Umbrella, Zap
} satisfies Record<string, LucideIcon>;

export const CATEGORY_ICON_LABELS: Record<keyof typeof CATEGORY_ICONS, string> = {
  Shapes: "Khác", Briefcase: "Công việc", Gift: "Quà tặng", Laptop: "Máy tính", Store: "Cửa hàng",
  TrendingUp: "Tăng trưởng", RotateCcw: "Hoàn tiền", CircleDollarSign: "Tiền", Utensils: "Ăn uống", Home: "Nhà ở",
  Car: "Ô tô", ShoppingBag: "Mua sắm", ShoppingCart: "Đi chợ", ReceiptText: "Hóa đơn", HeartPulse: "Sức khỏe",
  GraduationCap: "Giáo dục", Gamepad2: "Trò chơi", Users: "Gia đình/Nhóm", MoreHorizontal: "Khác", Coffee: "Cà phê",
  Plane: "Máy bay", Bus: "Xe buýt", TrainFront: "Tàu", Fuel: "Xăng dầu", Baby: "Trẻ em",
  PawPrint: "Thú cưng", Dog: "Chó", Shirt: "Quần áo", Smartphone: "Điện thoại", Wifi: "Internet",
  CreditCard: "Thẻ tín dụng", Dumbbell: "Thể thao", Stethoscope: "Khám bệnh", BookOpen: "Sách", Film: "Phim",
  Music: "Âm nhạc", Landmark: "Ngân hàng", WalletCards: "Ví/Tài khoản", PiggyBank: "Tiết kiệm", Building2: "Doanh nghiệp",
  Coins: "Đầu tư", Banknote: "Tiền mặt", CakeSlice: "Sinh nhật", Camera: "Máy ảnh", Donut: "Đồ ăn nhẹ",
  PartyPopper: "Tiệc tùng", Shield: "Bảo hiểm", Soup: "Ẩm thực", Bike: "Xe đạp", BedDouble: "Nghỉ ngơi",
  Tv: "Truyền hình", Wrench: "Sửa chữa", AlarmClock: "Thời gian", Ambulance: "Cấp cứu", Apple: "Thực phẩm",
  Bath: "Sinh hoạt", Beer: "Đồ uống", Cat: "Mèo", Clapperboard: "Giải trí", Cloud: "Cloud/Dịch vụ",
  Fish: "Hải sản", Flower2: "Hoa/Cây cảnh", HandCoins: "Nhận tiền", HandHeart: "Từ thiện", Hotel: "Khách sạn",
  KeyRound: "Thuê nhà/Chìa khóa", Library: "Thư viện", Mail: "Bưu chính", MapPin: "Địa điểm", Medal: "Thành tích",
  Monitor: "Thiết bị", Moon: "Ban đêm", Package: "Giao hàng", Palette: "Nghệ thuật", Phone: "Điện thoại gọi",
  Pill: "Thuốc", School: "Trường học", Scissors: "Làm đẹp", Sparkles: "Chăm sóc", Sun: "Du lịch/Ngoài trời",
  Ticket: "Vé", Trophy: "Giải thưởng", Umbrella: "Bảo vệ", Zap: "Điện/Năng lượng"
};

export const CATEGORY_ICON_COLORS = {
  emerald: "#0d8b66",
  teal: "#0f766e",
  sky: "#0284c7",
  cobalt: "#2563eb",
  violet: "#7c3aed",
  fuchsia: "#c026d3",
  rose: "#e11d48",
  coral: "#f97316",
  amber: "#d97706",
  lime: "#65a30d",
  slate: "#475569",
  graphite: "#1f2937"
} as const;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;
export type CategoryIconColorName = keyof typeof CATEGORY_ICON_COLORS;
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as CategoryIconName[];
export const CATEGORY_ICON_COLOR_NAMES = Object.keys(CATEGORY_ICON_COLORS) as CategoryIconColorName[];

export function isCategoryIconName(value: string): value is CategoryIconName {
  return value in CATEGORY_ICONS;
}

export function isCategoryIconColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function iconColorValue(value?: string | null) {
  if (!value) return CATEGORY_ICON_COLORS.emerald;
  if (isCategoryIconColor(value)) return value;
  if (value in CATEGORY_ICON_COLORS) return CATEGORY_ICON_COLORS[value as CategoryIconColorName];
  return CATEGORY_ICON_COLORS.emerald;
}

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = name && isCategoryIconName(name) ? CATEGORY_ICONS[name] : Shapes;
  return <Icon className={className} aria-hidden="true" />;
}
