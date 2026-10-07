import type { LucideIcon } from "lucide-react";
import {
  Baby, Banknote, BedDouble, Bike, BookOpen, Briefcase, Building2, Bus, CakeSlice, Camera, Car,
  CircleDollarSign, Coins, Coffee, CreditCard, Dog, Donut, Dumbbell, Film, Fuel, Gamepad2, Gift,
  GraduationCap, HeartPulse, Home, Landmark, Laptop, MoreHorizontal, Music, PartyPopper, PawPrint,
  PiggyBank, Plane, ReceiptText, RotateCcw, Shapes, Shield, Shirt, ShoppingBag, ShoppingCart,
  Smartphone, Soup, Stethoscope, Store, TrainFront, TrendingUp, Tv, Users, Utensils, WalletCards,
  Wifi, Wrench
} from "lucide-react";

export const CATEGORY_ICONS = {
  Shapes, Briefcase, Gift, Laptop, Store, TrendingUp, RotateCcw, CircleDollarSign, Utensils, Home,
  Car, ShoppingBag, ShoppingCart, ReceiptText, HeartPulse, GraduationCap, Gamepad2, Users,
  MoreHorizontal, Coffee, Plane, Bus, TrainFront, Fuel, Baby, PawPrint, Dog, Shirt, Smartphone,
  Wifi, CreditCard, Dumbbell, Stethoscope, BookOpen, Film, Music, Landmark, WalletCards, PiggyBank,
  Building2, Coins, Banknote, CakeSlice, Camera, Donut, PartyPopper, Shield, Soup, Bike, BedDouble,
  Tv, Wrench
} satisfies Record<string, LucideIcon>;

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
