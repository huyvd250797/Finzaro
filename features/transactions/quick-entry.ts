/** V4.3.0 — user-scoped, device-local Quick Entry preferences and explicit templates.
 * No transaction is written by this module; the server action remains authoritative.
 * Local storage is a convenience, not a cross-device/backup store.
 */
import type { TransactionType } from "@/features/transactions/constants";

export type QuickEntryDraft = {
  title: string;
  from_account_id: string;
  to_account_id: string;
  category_id: string;
  from_amount: string;
  to_amount: string;
  notes: string;
};
export type QuickEntryPreference = {
  from_account_id: string;
  to_account_id: string;
  category_id: string;
  recent_category_ids: string[];
};
export type QuickEntryTemplate = { id: string; name: string; type: TransactionType; draft: QuickEntryDraft };
export type QuickEntryState = { preference: QuickEntryPreference; templates: QuickEntryTemplate[] };
const EMPTY_PREFERENCE: QuickEntryPreference = { from_account_id: "", to_account_id: "", category_id: "", recent_category_ids: [] };
const TYPES: readonly TransactionType[] = ["expense", "income", "transfer"];
const asString = (value: unknown, max = 160) => typeof value === "string" ? value.slice(0, max) : "";
const idValue = (value: unknown) => asString(value, 80);
const amountValue = (value: unknown) => {
  const text = asString(value, 64);
  return /^\d{0,15}(?:[.,]\d{0,6})?$/.test(text) ? text : "";
};
export function emptyQuickEntryState(): QuickEntryState {
  return { preference: { ...EMPTY_PREFERENCE, recent_category_ids: [] }, templates: [] };
}
export function cleanQuickEntryDraft(value: unknown): QuickEntryDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const draft = value as Record<string, unknown>;
  return {
    title: asString(draft.title, 140),
    from_account_id: idValue(draft.from_account_id),
    to_account_id: idValue(draft.to_account_id),
    category_id: idValue(draft.category_id),
    from_amount: amountValue(draft.from_amount),
    to_amount: amountValue(draft.to_amount),
    notes: asString(draft.notes, 500),
  };
}
export function parseQuickEntryState(value: unknown, type: TransactionType): QuickEntryState {
  const empty = emptyQuickEntryState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const raw = value as Record<string, unknown>;
  const pref = raw.preference && typeof raw.preference === "object" && !Array.isArray(raw.preference)
    ? raw.preference as Record<string, unknown> : {};
  const categoryIds = Array.isArray(pref.recent_category_ids) ? pref.recent_category_ids : [];
  empty.preference = {
    from_account_id: idValue(pref.from_account_id),
    to_account_id: idValue(pref.to_account_id),
    category_id: idValue(pref.category_id),
    recent_category_ids: [...new Set(categoryIds.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 80)))].slice(0, 8),
  };
  empty.templates = (Array.isArray(raw.templates) ? raw.templates : []).flatMap((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const draft = cleanQuickEntryDraft(row.draft);
    const id = idValue(row.id);
    const name = asString(row.name, 64).trim();
    return row.type === type && id && name && draft ? [{ id, name, type, draft }] : [];
  }).slice(0, 12);
  return empty;
}
export function quickEntryStorageKey(userId: string, type: TransactionType) {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !TYPES.includes(type)) return "";
  return `finzaro:v430:quick-entry:${userId}:${type}`;
}
export function readQuickEntry(userId: string, type: TransactionType): QuickEntryState {
  const key = quickEntryStorageKey(userId, type);
  if (!key || typeof window === "undefined") return emptyQuickEntryState();
  try { return parseQuickEntryState(JSON.parse(window.localStorage.getItem(key) ?? "null"), type); }
  catch { return emptyQuickEntryState(); }
}
export function writeQuickEntry(userId: string, type: TransactionType, state: QuickEntryState): boolean {
  const key = quickEntryStorageKey(userId, type);
  if (!key || typeof window === "undefined") return false;
  try { window.localStorage.setItem(key, JSON.stringify(parseQuickEntryState(state, type))); return true; }
  catch { return false; }
}
export function rememberSavedChoice(state: QuickEntryState, draft: QuickEntryDraft): QuickEntryState {
  const nextCategories = draft.category_id
    ? [draft.category_id, ...state.preference.recent_category_ids.filter((id) => id !== draft.category_id)].slice(0, 8)
    : state.preference.recent_category_ids;
  return { ...state, preference: {
    from_account_id: draft.from_account_id,
    to_account_id: draft.to_account_id,
    category_id: draft.category_id,
    recent_category_ids: nextCategories,
  }};
}
export function upsertQuickEntryTemplate(state: QuickEntryState, template: QuickEntryTemplate): QuickEntryState {
  const clean = cleanQuickEntryDraft(template.draft);
  if (!clean || !TYPES.includes(template.type) || !template.name.trim() || !template.id) return state;
  const safe = { id: idValue(template.id), name: template.name.trim().slice(0, 64), type: template.type, draft: clean };
  return { ...state, templates: [safe, ...state.templates.filter((row) => row.id !== safe.id)].slice(0, 12) };
}
export function removeQuickEntryTemplate(state: QuickEntryState, id: string): QuickEntryState {
  return { ...state, templates: state.templates.filter((row) => row.id !== id) };
}
