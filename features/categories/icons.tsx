import type { LucideIcon } from "lucide-react";
import {
  Baby,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  CircleDollarSign,
  Coffee,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  MoreHorizontal,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  ReceiptText,
  RotateCcw,
  Shapes,
  Shirt,
  ShoppingBag,
  Smartphone,
  Stethoscope,
  Store,
  TrendingUp,
  Utensils,
  Users,
  WalletCards,
  Wifi
} from "lucide-react";

export const CATEGORY_ICONS = {
  Shapes,
  Briefcase,
  Gift,
  Laptop,
  Store,
  TrendingUp,
  RotateCcw,
  CircleDollarSign,
  Utensils,
  Home,
  Car,
  ShoppingBag,
  ReceiptText,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  Users,
  MoreHorizontal,
  Coffee,
  Plane,
  Bus,
  Fuel,
  Baby,
  PawPrint,
  Shirt,
  Smartphone,
  Wifi,
  Dumbbell,
  Stethoscope,
  BookOpen,
  Film,
  Music,
  Landmark,
  WalletCards,
  PiggyBank
} satisfies Record<string, LucideIcon>;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as CategoryIconName[];

export function isCategoryIconName(value: string): value is CategoryIconName {
  return value in CATEGORY_ICONS;
}

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = name && isCategoryIconName(name) ? CATEGORY_ICONS[name] : Shapes;
  return <Icon className={className} aria-hidden="true" />;
}
