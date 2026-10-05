export type Account = {
  id: string;
  name: string;
  type: "bank" | "cash" | "wallet" | "savings";
  institution: string;
  balance: number;
  accent: string;
};

export type Transaction = {
  id: string;
  title: string;
  category: string;
  account: string;
  date: string;
  amount: number;
  kind: "income" | "expense" | "transfer";
};

export const accounts: Account[] = [
  { id: "acc-1", name: "Tài khoản chính", type: "bank", institution: "Vietcombank", balance: 68250000, accent: "emerald" },
  { id: "acc-2", name: "Quỹ dự phòng", type: "savings", institution: "Techcombank", balance: 45000000, accent: "blue" },
  { id: "acc-3", name: "Ví điện tử", type: "wallet", institution: "MoMo", balance: 3850000, accent: "pink" },
  { id: "acc-4", name: "Tiền mặt", type: "cash", institution: "Ví cá nhân", balance: 11400000, accent: "amber" }
];

export const transactions: Transaction[] = [
  { id: "tx-1", title: "Lương tháng 10", category: "Thu nhập", account: "Vietcombank", date: "05/10/2026", amount: 35000000, kind: "income" },
  { id: "tx-2", title: "Siêu thị cuối tuần", category: "Ăn uống", account: "Vietcombank", date: "05/10/2026", amount: -1285000, kind: "expense" },
  { id: "tx-3", title: "Internet gia đình", category: "Hóa đơn", account: "MoMo", date: "04/10/2026", amount: -350000, kind: "expense" },
  { id: "tx-4", title: "Chuyển quỹ dự phòng", category: "Chuyển tiền", account: "Techcombank", date: "03/10/2026", amount: 5000000, kind: "transfer" },
  { id: "tx-5", title: "Cà phê khách hàng", category: "Ăn uống", account: "Tiền mặt", date: "03/10/2026", amount: -185000, kind: "expense" },
  { id: "tx-6", title: "Grab", category: "Di chuyển", account: "MoMo", date: "02/10/2026", amount: -132000, kind: "expense" }
];

export const categorySpending = [
  { label: "Ăn uống", value: 4_250_000, percent: 34 },
  { label: "Nhà ở", value: 3_100_000, percent: 25 },
  { label: "Di chuyển", value: 1_720_000, percent: 14 },
  { label: "Mua sắm", value: 1_550_000, percent: 12 },
  { label: "Khác", value: 1_880_000, percent: 15 }
];

export const monthlyCashflow = [
  { month: "T5", income: 30, expense: 18 },
  { month: "T6", income: 32, expense: 21 },
  { month: "T7", income: 34, expense: 19 },
  { month: "T8", income: 33, expense: 24 },
  { month: "T9", income: 38, expense: 22 },
  { month: "T10", income: 35, expense: 12.5 }
];
