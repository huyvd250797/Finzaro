import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pending = fs.readFileSync("components/pending-submit-button.tsx", "utf8");
const auth = fs.readFileSync("lib/auth.ts", "utf8");
const accounts = fs.readFileSync("app/(dashboard)/accounts/page.tsx", "utf8");
const transactions = fs.readFileSync("app/(dashboard)/transactions/page.tsx", "utf8");
const login = fs.readFileSync("app/login/page.tsx", "utf8");
const register = fs.readFileSync("app/register/page.tsx", "utf8");
const navigation = fs.readFileSync("components/navigation-progress.tsx", "utf8");

 test("forms expose immediate pending feedback", () => {
  assert.match(pending, /useFormStatus/);
  assert.match(login, /Đang đăng nhập/);
  assert.match(register, /Đang tạo tài khoản/);
  assert.match(accounts, /Đang tạo tài khoản/);
  assert.match(transactions, /Đang lưu giao dịch/);
});

test("new account and transaction forms can open without a server round-trip", () => {
  assert.match(accounts, /InstantReveal/);
  assert.match(transactions, /InstantTransactionLauncher/);
});

test("auth checks are request-deduplicated and avoid getUser round-trip", () => {
  assert.match(auth, /cache\(async/);
  assert.match(auth, /getClaims\(\)/);
  assert.doesNotMatch(auth, /getUser\(\)/);
});

test("route navigation gives immediate visual feedback", () => {
  assert.match(navigation, /setActive\(true\)/);
  assert.match(navigation, /role="progressbar"/);
});
