-- Finzaro V0.8.0 — Release Candidate verification

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.categories'::regclass
  and conname = 'categories_icon_allowed_v080';

-- Expected: one CHECK constraint whose definition includes the expanded icon set,
-- including Apple, HandCoins, Pill, MapPin, Sparkles and Zap.

select count(*) as unsupported_existing_icons
from public.categories
where icon_name not in ('Shapes','Briefcase','Gift','Laptop','Store','TrendingUp','RotateCcw','CircleDollarSign','Utensils','Home','Car','ShoppingBag','ShoppingCart','ReceiptText','HeartPulse','GraduationCap','Gamepad2','Users','MoreHorizontal','Coffee','Plane','Bus','TrainFront','Fuel','Baby','PawPrint','Dog','Shirt','Smartphone','Wifi','CreditCard','Dumbbell','Stethoscope','BookOpen','Film','Music','Landmark','WalletCards','PiggyBank','Building2','Coins','Banknote','CakeSlice','Camera','Donut','PartyPopper','Shield','Soup','Bike','BedDouble','Tv','Wrench','AlarmClock','Ambulance','Apple','Bath','Beer','Cat','Clapperboard','Cloud','Fish','Flower2','HandCoins','HandHeart','Hotel','KeyRound','Library','Mail','MapPin','Medal','Monitor','Moon','Package','Palette','Phone','Pill','School','Scissors','Sparkles','Sun','Ticket','Trophy','Umbrella','Zap');

-- Expected: 0.
