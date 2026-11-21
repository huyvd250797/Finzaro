/** Personal VND loans are distinct from cash accounts and legacy bank-loan modules. */
export type DebtDirection = "receivable" | "payable";
export type DebtRow = {
  id:string; user_id:string; direction:DebtDirection; party_name:string; title:string;
  original_principal_minor:number; outstanding_minor:number;
  started_on:string; due_on:string|null; annual_interest_rate:number|null;
  notes:string|null; archived:boolean; created_at:string;
};
export type DebtEvent = {
  id:string;debt_id:string;event_type:"opening_existing"|"opening_cash"|"repayment";
  principal_minor:number;interest_minor:number;account_id:string|null;event_date:string;
  notes:string|null;created_at:string;
};
export type CashAccount = {id:string;name:string;current_balance_minor:number;account_type:string;currency_code:string};

export function personalDebtTotals(rows:DebtRow[]){
  const active=rows.filter(d=>!d.archived);
  const receivable=active.filter(d=>d.direction==="receivable").reduce((n,d)=>n+d.outstanding_minor,0);
  const payable=active.filter(d=>d.direction==="payable").reduce((n,d)=>n+d.outstanding_minor,0);
  if(!Number.isSafeInteger(receivable)||!Number.isSafeInteger(payable)||!Number.isSafeInteger(receivable-payable)){
    throw new Error("Tổng công nợ vượt giới hạn số nguyên an toàn.");
  }
  return {receivable,payable,net:receivable-payable,active:active.length};
}
export function debtLifecycle(row:DebtRow,today:string){
  if(row.archived) return "archived" as const;
  if(row.outstanding_minor===0) return "settled" as const;
  if(row.due_on && row.due_on<today) return "overdue" as const;
  if(row.due_on && row.due_on<=nextSevenDays(today)) return "upcoming" as const;
  return "active" as const;
}
function nextSevenDays(today:string){
  const value=new Date(`${today}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate()+7);
  return value.toISOString().slice(0,10);
}
