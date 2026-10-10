-- Finzaro V0.8.0 — Release Candidate
-- Expands the database allow-list so the richer Category icon picker can persist every supported icon.

alter table public.categories drop constraint if exists categories_icon_allowed;
alter table public.categories drop constraint if exists categories_icon_allowed_v0100;
alter table public.categories drop constraint if exists categories_icon_allowed_v080;

alter table public.categories
  add constraint categories_icon_allowed_v080
  check (icon_name in ('Shapes','Briefcase','Gift','Laptop','Store','TrendingUp','RotateCcw','CircleDollarSign','Utensils','Home','Car','ShoppingBag','ShoppingCart','ReceiptText','HeartPulse','GraduationCap','Gamepad2','Users','MoreHorizontal','Coffee','Plane','Bus','TrainFront','Fuel','Baby','PawPrint','Dog','Shirt','Smartphone','Wifi','CreditCard','Dumbbell','Stethoscope','BookOpen','Film','Music','Landmark','WalletCards','PiggyBank','Building2','Coins','Banknote','CakeSlice','Camera','Donut','PartyPopper','Shield','Soup','Bike','BedDouble','Tv','Wrench','AlarmClock','Ambulance','Apple','Bath','Beer','Cat','Clapperboard','Cloud','Fish','Flower2','HandCoins','HandHeart','Hotel','KeyRound','Library','Mail','MapPin','Medal','Monitor','Moon','Package','Palette','Phone','Pill','School','Scissors','Sparkles','Sun','Ticket','Trophy','Umbrella','Zap'));
