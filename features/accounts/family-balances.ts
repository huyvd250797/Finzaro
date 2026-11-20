/** Money under management, split by real spending access. No exchange rates are assumed. */
export type FamilyBalanceAccount = {
  account_type: string;
  currency_code: string;
  current_balance_minor: number;
  is_archived: boolean;
};
export function familyBalanceTotals(accounts: FamilyBalanceAccount[],currency: string){
  const active = accounts.filter(a=>!a.is_archived && a.currency_code===currency);
  const available = active.filter(a=>["cash","bank","ewallet"].includes(a.account_type))
    .reduce((sum,a)=>sum+a.current_balance_minor,0);
  const reserved = active.filter(a=>a.account_type==="family_savings")
    .reduce((sum,a)=>sum+a.current_balance_minor,0);
  if(!Number.isSafeInteger(available)||!Number.isSafeInteger(reserved)||!Number.isSafeInteger(available+reserved))
    throw new Error("Số dư vượt giới hạn tính toán an toàn.");
  return {available,reserved,managed:available+reserved};
}
