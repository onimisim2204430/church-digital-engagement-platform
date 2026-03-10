/**
 * FinancialSanctum — "The Vault"
 *
 * A complete professional accounting, bookkeeping, treasury and
 * secretary platform. Operates as a standalone page integrated into
 * the main app layout. Does NOT duplicate FinancialHub or PaymentRecords.
 *
 * 10 Modules:
 *  1. Command     — Financial health, ratios, alerts, forecast
 *  2. Ledger      — Chart of accounts, double-entry journal, trial balance
 *  3. Statements  — P&L · Balance Sheet · Cash Flow (IFRS format)
 *  4. Treasury    — Cash positions, investments, fund reserves, reconciliation
 *  5. Payables    — Vendors, bills, aging schedule, approval workflow
 *  6. Assets      — Fixed asset register, depreciation schedules
 *  7. Payroll     — Staff register, PAYE, pension, net pay
 *  8. Tax         — VAT, WHT, compliance calendar
 *  9. Audit       — Controls, anomalies, bank reconciliation, trail
 * 10. Board Pack  — Executive narrative, KPIs, board-ready reports
 */

import React, {
  useState, useEffect, useCallback, useMemo, memo, useRef,
} from 'react';
import Icon from '../components/common/Icon';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type SanctumTab = 'command'|'ledger'|'statements'|'treasury'|'payables'|'assets'|'payroll'|'tax'|'audit'|'board';

interface Account {
  code: string; name: string; type: 'asset'|'liability'|'equity'|'revenue'|'expense';
  subtype: string; balance: number; normal: 'debit'|'credit'; description: string;
}

interface JournalEntry {
  id: string; date: string; reference: string; description: string; narration: string;
  lines: { account_code: string; account_name: string; debit: number; credit: number }[];
  posted: boolean; approved_by: string; created_by: string; total: number;
}

interface Vendor {
  id: string; name: string; email: string; phone: string; bank: string; account_no: string;
  bank_code: string; category: string; terms: number; balance_owed: number; ytd_paid: number;
  status: 'active'|'inactive'; tax_id: string;
}

interface Bill {
  id: string; vendor_id: string; vendor_name: string; reference: string; description: string;
  amount: number; due_date: string; issue_date: string;
  status: 'draft'|'pending'|'approved'|'paid'|'overdue'|'disputed';
  category: string; vat: number; wht: number;
}

interface FixedAsset {
  id: string; name: string; category: string; code: string;
  acquisition_date: string; acquisition_cost: number; useful_life: number;
  depreciation_method: 'straight_line'|'reducing_balance'; salvage_value: number;
  accumulated_depreciation: number; location: string; status: 'active'|'disposed'|'written_off';
  serial_number: string; supplier: string;
}

interface StaffMember {
  id: string; name: string; department: string; role: string; grade: string;
  gross_salary: number; paye: number; pension_employee: number; pension_employer: number;
  nhf: number; nsitf: number; net_pay: number; bank: string; account_no: string;
  start_date: string; status: 'active'|'suspended'|'terminated';
}

interface VatEntry {
  id: string; date: string; reference: string; description: string;
  type: 'output'|'input'; taxable_amount: number; vat_amount: number; rate: number;
  vendor_customer: string; status: 'filed'|'pending';
}

interface AuditLog {
  id: string; timestamp: string; user: string; action: string; module: string;
  entity_id: string; before: string; after: string; ip: string; severity: 'info'|'warning'|'critical';
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SANCTUM_TABS: { key: SanctumTab; icon: string; label: string; badge?: string }[] = [
  { key:'command',    icon:'hub',               label:'Command'    },
  { key:'ledger',     icon:'book',              label:'Ledger'     },
  { key:'statements', icon:'analytics',         label:'Statements' },
  { key:'treasury',   icon:'account_balance',   label:'Treasury'   },
  { key:'payables',   icon:'request_quote',     label:'Payables'   },
  { key:'assets',     icon:'domain',            label:'Assets'     },
  { key:'payroll',    icon:'badge',             label:'Payroll'    },
  { key:'tax',        icon:'receipt_long',      label:'Tax'        },
  { key:'audit',      icon:'verified_user',     label:'Audit'      },
  { key:'board',      icon:'summarize',         label:'Board Pack' },
];

// Emerald green accent — matching FinancialHub
const G  = '#10b981';  // emerald primary
const G2 = '#34d399';  // emerald light
const G3 = '#064e3b';  // emerald dark

// ── Theme context ──
type Theme = 'dark' | 'light';
const ThemeCtx = React.createContext<Theme>('dark');
const useTheme = () => React.useContext(ThemeCtx);
const useTHIN  = () => useTheme() === 'light' ? THIN_LIGHT : THIN_DARK;

const THIN_DARK:  React.CSSProperties = { scrollbarWidth:'thin', scrollbarColor:'#1e293b transparent' };
const THIN_LIGHT: React.CSSProperties = { scrollbarWidth:'thin', scrollbarColor:'#cbd5e1 transparent' };

// ── Dynamic THIN based on theme ──
// (used inline via useTHIN hook)

const FS_CSS = `
/* ── DARK MODE ── */
.fs.dark { background: #020617; }
.fs.dark .fs-page { background: #020617; }
.fs.dark .fs-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; }
.fs.dark .fs-topbar { background: #0a0f1e; border-bottom: 1px solid #1a2540; }
.fs.dark .fs-toolbar { background: #0f172a; border-bottom: 1px solid #1e293b; }
.fs.dark .fs-thead { background: #0f172a; border-bottom: 1px solid #1e293b; }
.fs.dark .fs-tr-even { background: #020617; }
.fs.dark .fs-tr-odd  { background: rgba(15,23,42,0.5); }
.fs.dark .fs-tr-even:hover,.fs.dark .fs-tr-odd:hover { background: rgba(30,41,59,0.5); }
.fs.dark .fs-bar-track { background: #1e293b; }
.fs.dark .fs-input {
  background: rgba(30,41,59,0.8) !important;
  border: 1px solid #334155 !important;
  color: #cbd5e1 !important;
}
.fs.dark .fs-input::placeholder { color: #334155 !important; }
.fs.dark .fs-text1 { color: #f1f5f9; }
.fs.dark .fs-text2 { color: #94a3b8; }
.fs.dark .fs-text3 { color: #64748b; }
.fs.dark .fs-text4 { color: #334155; }
.fs.dark .fs-divider { border-color: #1e293b; }
.fs.dark .fs-tab-bar { border-top: 1px solid rgba(30,41,59,0.5); }
.fs.dark .fs-tab-btn { color: #475569; }
.fs.dark .fs-tab-btn.active { color: #10b981; border-color: #10b981; }
.fs.dark .fs-stat-chip { background: rgba(30,41,59,0.6); }
.fs.dark .fs-panel-footer { background: rgba(16,185,129,0.05); border-top: 1px solid #1e293b; }
.fs.dark .fs-hover:hover { background: rgba(30,41,59,0.4); }
.fs.dark .fs-col-sep { border-left: 1px solid #1e293b; }

/* ── LIGHT MODE ── */
.fs.light { background: #f0fdf4; }
.fs.light .fs-page { background: #f0fdf4; }
.fs.light .fs-card { background: #ffffff; border: 1px solid #d1fae5; border-radius: 12px; box-shadow: 0 1px 8px rgba(16,185,129,0.06); }
.fs.light .fs-topbar { background: #ffffff; border-bottom: 1px solid #d1fae5; }
.fs.light .fs-toolbar { background: #f8fffe; border-bottom: 1px solid #d1fae5; }
.fs.light .fs-thead { background: #f0fdf4; border-bottom: 1px solid #d1fae5; }
.fs.light .fs-tr-even { background: #ffffff; }
.fs.light .fs-tr-odd  { background: #f8fffe; }
.fs.light .fs-tr-even:hover,.fs.light .fs-tr-odd:hover { background: #ecfdf5; }
.fs.light .fs-bar-track { background: #d1fae5; }
.fs.light .fs-input {
  background: #f0fdf4 !important;
  border: 1px solid #a7f3d0 !important;
  color: #064e3b !important;
}
.fs.light .fs-input::placeholder { color: #a7f3d0 !important; }
.fs.light .fs-text1 { color: #064e3b; }
.fs.light .fs-text2 { color: #065f46; }
.fs.light .fs-text3 { color: #6b7280; }
.fs.light .fs-text4 { color: #d1fae5; }
.fs.light .fs-divider { border-color: #d1fae5; }
.fs.light .fs-tab-bar { border-top: 1px solid #d1fae5; }
.fs.light .fs-tab-btn { color: #6b7280; }
.fs.light .fs-tab-btn.active { color: #10b981; border-color: #10b981; }
.fs.light .fs-stat-chip { background: #ecfdf5; border: 1px solid #d1fae5; color: #065f46; }
.fs.light .fs-panel-footer { background: rgba(16,185,129,0.04); border-top: 1px solid #d1fae5; }
.fs.light .fs-hover:hover { background: #ecfdf5; }
.fs.light .fs-col-sep { border-left: 1px solid #d1fae5; }

/* ── SHARED ── */
.fs { font-family: 'Roboto Mono', monospace; transition: background 0.25s; }
.fs-input:focus { border-color: #10b981 !important; box-shadow: 0 0 0 2px rgba(16,185,129,0.18) !important; outline: none !important; }
.fs-green { color: #10b981; }
.fs.dark .fs-subtlebg { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.18); }
.fs.light .fs-subtlebg { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); }
.fs.dark .fs-inset { background: rgba(30,41,59,0.4); border: 1px solid #1e293b; }
.fs.light .fs-inset { background: #f0fdf4; border: 1px solid #d1fae5; }
.fs.dark .fs-ratio-good { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); }
.fs.light .fs-ratio-good { background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.25); }
.fs.dark .fs-ratio-bad  { background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); }
.fs.light .fs-ratio-bad { background: rgba(248,113,113,0.05); border: 1px solid rgba(248,113,113,0.2); }
.fs.dark .fs-surplus-banner { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); }
.fs.light .fs-surplus-banner { background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.3); }
.fs.dark .fs-kpi-card { background: #0f172a; border: 1px solid #1e293b; }
.fs.light .fs-kpi-card { background: #fff; border: 1px solid #d1fae5; }
.fs.dark  .fs-health-banner { background: linear-gradient(135deg,rgba(16,185,129,0.12),rgba(52,211,153,0.06)); border: 1px solid rgba(16,185,129,0.25); }
.fs.light .fs-health-banner { background: linear-gradient(135deg,rgba(16,185,129,0.10),rgba(240,253,244,0.95)); border: 1px solid rgba(16,185,129,0.3); }
.fs.dark .fs-row-expand { background: rgba(16,185,129,0.04); border-bottom: 1px solid rgba(16,185,129,0.15); }
.fs.light .fs-row-expand { background: rgba(16,185,129,0.03); border-bottom: 1px solid rgba(16,185,129,0.12); }

@keyframes fs-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
@keyframes fs-slide-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes fs-spin { to{transform:rotate(360deg)} }
.fs-pulse { animation: fs-pulse 2s ease-in-out infinite; }
.fs-slide { animation: fs-slide-in 0.3s ease; }
.fs-spin { animation: fs-spin 0.8s linear infinite; }
.green-glow { box-shadow: 0 0 0 1px rgba(16,185,129,0.2), 0 4px 24px rgba(16,185,129,0.08); }
.green-line::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,#10b98160,transparent); }
`;

let _fsCss = false;
const injectFSCSS = () => {
  if (_fsCss || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.textContent = FS_CSS;
  document.head.appendChild(s);
  _fsCss = true;
};

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════

const ngn  = (n: number, decimals = 0) =>
  new Intl.NumberFormat('en-NG', { style:'currency', currency:'NGN', maximumFractionDigits:decimals }).format(n);

const pct  = (a: number, b: number) => b > 0 ? ((a/b)*100).toFixed(1) : '0.0';
const fmtD = (s: string) => s ? new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const fmtShort = (s: string) => s ? new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
const num  = (n: number) => n.toLocaleString('en-NG');
const abs  = Math.abs;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const compact = (n: number): string => {
  if (n >= 1_000_000_000) return `₦${(n/1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n/1_000).toFixed(0)}K`;
  return ngn(n);
};

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

// ── Chart of Accounts ──
const CHART_OF_ACCOUNTS: Account[] = [
  // ASSETS
  { code:'1000', name:'Cash & Bank — GTBank', type:'asset', subtype:'Current Asset', balance:8420000, normal:'debit', description:'Primary operating account' },
  { code:'1010', name:'Cash & Bank — Zenith', type:'asset', subtype:'Current Asset', balance:3150000, normal:'debit', description:'Secondary operating account' },
  { code:'1020', name:'Petty Cash', type:'asset', subtype:'Current Asset', balance:125000, normal:'debit', description:'Office petty cash float' },
  { code:'1100', name:'Accounts Receivable', type:'asset', subtype:'Current Asset', balance:2280000, normal:'debit', description:'Amounts owed to ministry' },
  { code:'1200', name:'Prepaid Expenses', type:'asset', subtype:'Current Asset', balance:640000, normal:'debit', description:'Advance payments' },
  { code:'1300', name:'Inventory — Merchandise', type:'asset', subtype:'Current Asset', balance:380000, normal:'debit', description:'Books, CDs, merchandise' },
  { code:'1500', name:'Land & Building', type:'asset', subtype:'Fixed Asset', balance:85000000, normal:'debit', description:'Church property at Plot 42' },
  { code:'1510', name:'Acc. Depr — Building', type:'asset', subtype:'Contra Asset', balance:-4250000, normal:'credit', description:'Accumulated depreciation on building' },
  { code:'1520', name:'Equipment & Furniture', type:'asset', subtype:'Fixed Asset', balance:9800000, normal:'debit', description:'AV, office, musical equipment' },
  { code:'1530', name:'Acc. Depr — Equipment', type:'asset', subtype:'Contra Asset', balance:-3920000, normal:'credit', description:'Accumulated depreciation on equipment' },
  { code:'1540', name:'Motor Vehicles', type:'asset', subtype:'Fixed Asset', balance:12500000, normal:'debit', description:'Ministry vehicles (3)' },
  { code:'1550', name:'Acc. Depr — Vehicles', type:'asset', subtype:'Contra Asset', balance:-5000000, normal:'credit', description:'Accumulated depreciation on vehicles' },
  { code:'1600', name:'Investments — FGN Bonds', type:'asset', subtype:'Long-term Investment', balance:25000000, normal:'debit', description:'FGN savings bonds portfolio' },
  { code:'1610', name:'Investments — T-Bills', type:'asset', subtype:'Short-term Investment', balance:10000000, normal:'debit', description:'Treasury bills (90-day rolling)' },
  // LIABILITIES
  { code:'2000', name:'Accounts Payable', type:'liability', subtype:'Current Liability', balance:1840000, normal:'credit', description:'Outstanding vendor bills' },
  { code:'2100', name:'Accrued Expenses', type:'liability', subtype:'Current Liability', balance:920000, normal:'credit', description:'Accrued but unpaid expenses' },
  { code:'2200', name:'VAT Payable', type:'liability', subtype:'Current Liability', balance:214000, normal:'credit', description:'Output VAT collected, net of input' },
  { code:'2210', name:'WHT Payable', type:'liability', subtype:'Current Liability', balance:87000, normal:'credit', description:'Withholding tax deducted at source' },
  { code:'2300', name:'PAYE Payable', type:'liability', subtype:'Current Liability', balance:340000, normal:'credit', description:'Staff PAYE due to FIRS' },
  { code:'2310', name:'Pension Payable', type:'liability', subtype:'Current Liability', balance:280000, normal:'credit', description:'Staff & employer pension contributions' },
  { code:'2400', name:'Deferred Revenue', type:'liability', subtype:'Current Liability', balance:1200000, normal:'credit', description:'Unearned program fees' },
  { code:'2500', name:'Long-term Loan', type:'liability', subtype:'Long-term Liability', balance:15000000, normal:'credit', description:'Building renovation loan (Bank)' },
  // EQUITY / FUND BALANCES
  { code:'3000', name:'General Fund Balance', type:'equity', subtype:'Unrestricted Net Assets', balance:42000000, normal:'credit', description:'Unrestricted accumulated surplus' },
  { code:'3100', name:'Building Fund', type:'equity', subtype:'Restricted Net Assets', balance:8660000, normal:'credit', description:'Designated for new sanctuary' },
  { code:'3200', name:'Missions Fund', type:'equity', subtype:'Restricted Net Assets', balance:1650000, normal:'credit', description:'Missionary support — Kenya' },
  { code:'3300', name:'Endowment Fund', type:'equity', subtype:'Permanently Restricted', balance:30000000, normal:'credit', description:'Permanent endowment corpus' },
  { code:'3400', name:'Current Year Surplus', type:'equity', subtype:'Retained Surplus', balance:0, normal:'credit', description:'YTD net surplus' },
  // REVENUES
  { code:'4000', name:'Tithes & Offerings', type:'revenue', subtype:'Ministry Revenue', balance:38420000, normal:'credit', description:'Regular giving receipts' },
  { code:'4100', name:'Project Offerings', type:'revenue', subtype:'Project Revenue', balance:12850000, normal:'credit', description:'Special project giving' },
  { code:'4200', name:'Fundraising Revenue', type:'revenue', subtype:'Special Revenue', balance:6740000, normal:'credit', description:'Events & fundraising proceeds' },
  { code:'4300', name:'Program Fees', type:'revenue', subtype:'Service Revenue', balance:2180000, normal:'credit', description:'Youth, music, language programs' },
  { code:'4400', name:'Investment Income', type:'revenue', subtype:'Other Revenue', balance:3250000, normal:'credit', description:'Bond interest + T-bill yields' },
  { code:'4500', name:'Rental Income', type:'revenue', subtype:'Other Revenue', balance:840000, normal:'credit', description:'Hall & facility rentals' },
  { code:'4600', name:'Merchandise Sales', type:'revenue', subtype:'Other Revenue', balance:420000, normal:'credit', description:'Books, CDs, branded merchandise' },
  // EXPENSES
  { code:'5000', name:'Pastoral Salaries', type:'expense', subtype:'Personnel', balance:18600000, normal:'debit', description:'Lead & associate pastor compensation' },
  { code:'5010', name:'Staff Salaries', type:'expense', subtype:'Personnel', balance:9840000, normal:'debit', description:'Administrative & support staff' },
  { code:'5020', name:'Pension — Employer', type:'expense', subtype:'Personnel', balance:1428000, normal:'debit', description:'10% employer pension contribution' },
  { code:'5030', name:'Staff Benefits', type:'expense', subtype:'Personnel', balance:840000, normal:'debit', description:'HMO, transport, housing allowances' },
  { code:'5100', name:'Building & Maintenance', type:'expense', subtype:'Operations', balance:4820000, normal:'debit', description:'Repairs, upkeep, utilities' },
  { code:'5110', name:'Utilities', type:'expense', subtype:'Operations', balance:1840000, normal:'debit', description:'Electricity, water, internet' },
  { code:'5120', name:'Rent & Rates', type:'expense', subtype:'Operations', balance:0, normal:'debit', description:'External space rentals if any' },
  { code:'5200', name:'Media & Technology', type:'expense', subtype:'Ministry', balance:3180000, normal:'debit', description:'Streaming, equipment, software' },
  { code:'5210', name:'Printing & Stationery', type:'expense', subtype:'Operations', balance:640000, normal:'debit', description:'Bulletins, admin forms' },
  { code:'5300', name:'Mission & Outreach', type:'expense', subtype:'Ministry', balance:4200000, normal:'debit', description:'Evangelism, missions giving' },
  { code:'5400', name:'Youth & Programs', type:'expense', subtype:'Ministry', balance:2840000, normal:'debit', description:'Youth ministry operating costs' },
  { code:'5500', name:'Travel & Transport', type:'expense', subtype:'Operations', balance:1240000, normal:'debit', description:'Ministry travel, vehicle running costs' },
  { code:'5600', name:'Professional Fees', type:'expense', subtype:'Administration', balance:580000, normal:'debit', description:'Audit, legal, consulting fees' },
  { code:'5700', name:'Bank Charges', type:'expense', subtype:'Finance', balance:124000, normal:'debit', description:'Transaction fees, transfer charges' },
  { code:'5710', name:'Interest Expense', type:'expense', subtype:'Finance', balance:900000, normal:'debit', description:'Loan interest payments' },
  { code:'5800', name:'Depreciation', type:'expense', subtype:'Non-cash', balance:2380000, normal:'debit', description:'Annual depreciation charge' },
  { code:'5900', name:'Benevolence & Welfare', type:'expense', subtype:'Ministry', balance:1680000, normal:'debit', description:'Congregant welfare payments' },
];

// ── Journal Entries ──
const JOURNAL_ENTRIES: JournalEntry[] = [
  { id:'JNL-001', date:'2025-01-05', reference:'JNL-2025-001', description:'January Tithes & Offerings', narration:'Recording of weekly offering collection deposited to GTBank', lines:[{account_code:'1000',account_name:'Cash & Bank — GTBank',debit:3240000,credit:0},{account_code:'4000',account_name:'Tithes & Offerings',debit:0,credit:3240000}], posted:true, approved_by:'Elder James', created_by:'Accountant Mary', total:3240000 },
  { id:'JNL-002', date:'2025-01-10', reference:'JNL-2025-002', description:'Pastoral Salary Payment — January', narration:'Net salary disbursement after PAYE and pension deductions', lines:[{account_code:'5000',account_name:'Pastoral Salaries',debit:2100000,credit:0},{account_code:'2300',account_name:'PAYE Payable',debit:0,credit:280000},{account_code:'2310',account_name:'Pension Payable',debit:0,credit:210000},{account_code:'1000',account_name:'Cash & Bank — GTBank',debit:0,credit:1610000}], posted:true, approved_by:'Senior Pastor', created_by:'Accountant Mary', total:2100000 },
  { id:'JNL-003', date:'2025-01-15', reference:'JNL-2025-003', description:'Media Equipment Purchase', narration:'Purchase of LED projector and audio mixer from TechPro Nig Ltd', lines:[{account_code:'1520',account_name:'Equipment & Furniture',debit:1200000,credit:0},{account_code:'2200',account_name:'VAT Payable',debit:0,credit:90000},{account_code:'2000',account_name:'Accounts Payable',debit:0,credit:1110000}], posted:true, approved_by:'Elder James', created_by:'Accountant Mary', total:1200000 },
  { id:'JNL-004', date:'2025-02-01', reference:'JNL-2025-004', description:'Building Fund Offering Transfer', narration:'Special building offering received and allocated to Building Fund', lines:[{account_code:'1000',account_name:'Cash & Bank — GTBank',debit:800000,credit:0},{account_code:'3100',account_name:'Building Fund',debit:0,credit:800000}], posted:true, approved_by:'Board Chair', created_by:'Accountant Mary', total:800000 },
  { id:'JNL-005', date:'2025-02-14', reference:'JNL-2025-005', description:'T-Bill Investment', narration:'Purchase of 90-day Treasury Bills via Zenith Bank capital markets desk', lines:[{account_code:'1610',account_name:'Investments — T-Bills',debit:5000000,credit:0},{account_code:'1010',account_name:'Cash & Bank — Zenith',debit:0,credit:5000000}], posted:true, approved_by:'Board Finance', created_by:'Treasurer', total:5000000 },
  { id:'JNL-006', date:'2025-03-01', reference:'JNL-2025-006', description:'Missions Giving — Kenya', narration:'Quarterly remittance to Nairobi missions partner', lines:[{account_code:'5300',account_name:'Mission & Outreach',debit:600000,credit:0},{account_code:'1000',account_name:'Cash & Bank — GTBank',debit:0,credit:600000}], posted:true, approved_by:'Elder James', created_by:'Accountant Mary', total:600000 },
  { id:'JNL-007', date:'2025-03-15', reference:'JNL-2025-007', description:'Depreciation — Q1 Charge', narration:'Quarterly depreciation on building, equipment and vehicles', lines:[{account_code:'5800',account_name:'Depreciation',debit:595000,credit:0},{account_code:'1510',account_name:'Acc. Depr — Building',debit:0,credit:212500},{account_code:'1530',account_name:'Acc. Depr — Equipment',debit:0,credit:245000},{account_code:'1550',account_name:'Acc. Depr — Vehicles',debit:0,credit:137500}], posted:true, approved_by:'Accountant Mary', created_by:'Accountant Mary', total:595000 },
  { id:'JNL-008', date:'2025-04-05', reference:'JNL-2025-008', description:'Easter Convention Revenue', narration:'Convention registration fees and special offerings received', lines:[{account_code:'1000',account_name:'Cash & Bank — GTBank',debit:2840000,credit:0},{account_code:'4200',account_name:'Fundraising Revenue',debit:0,credit:2840000}], posted:true, approved_by:'Board Chair', created_by:'Treasurer', total:2840000 },
  { id:'JNL-009', date:'2025-04-20', reference:'JNL-2025-009', description:'Loan Interest Payment', narration:'Monthly interest on building renovation loan — Stanbic Bank', lines:[{account_code:'5710',account_name:'Interest Expense',debit:75000,credit:0},{account_code:'1000',account_name:'Cash & Bank — GTBank',debit:0,credit:75000}], posted:true, approved_by:'Elder James', created_by:'Accountant Mary', total:75000 },
  { id:'JNL-010', date:'2025-05-01', reference:'JNL-2025-010', description:'PAYE Remittance — April', narration:'PAYE deducted from staff salaries remitted to FIRS', lines:[{account_code:'2300',account_name:'PAYE Payable',debit:340000,credit:0},{account_code:'1000',account_name:'Cash & Bank — GTBank',debit:0,credit:340000}], posted:true, approved_by:'Accountant Mary', created_by:'Accountant Mary', total:340000 },
  { id:'JNL-011', date:'2025-05-10', reference:'JNL-2025-011', description:'Investment Income — Bond Interest', narration:'Semi-annual coupon received on FGN Bond portfolio', lines:[{account_code:'1000',account_name:'Cash & Bank — GTBank',debit:1125000,credit:0},{account_code:'4400',account_name:'Investment Income',debit:0,credit:1125000}], posted:true, approved_by:'Board Finance', created_by:'Treasurer', total:1125000 },
  { id:'JNL-012', date:'2025-06-01', reference:'JNL-2025-012', description:'Accrual — June Utilities', narration:'Accrual for June electricity and internet bills (not yet invoiced)', lines:[{account_code:'5110',account_name:'Utilities',debit:180000,credit:0},{account_code:'2100',account_name:'Accrued Expenses',debit:0,credit:180000}], posted:false, approved_by:'', created_by:'Accountant Mary', total:180000 },
];

// ── Vendors ──
const VENDORS: Vendor[] = [
  { id:'VND-001', name:'TechPro Nigeria Ltd', email:'accounts@techpro.ng', phone:'08012345678', bank:'GTBank', account_no:'0123456789', bank_code:'058', category:'Technology', terms:30, balance_owed:1110000, ytd_paid:3840000, status:'active', tax_id:'12345678-0001' },
  { id:'VND-002', name:'CleanSweep Services', email:'billing@cleansweep.ng', phone:'08098765432', bank:'Access Bank', account_no:'9876543210', bank_code:'044', category:'Facilities', terms:14, balance_owed:0, ytd_paid:480000, status:'active', tax_id:'98765432-0002' },
  { id:'VND-003', name:'Stanbic IBTC Bank', email:'loans@stanbic.com', phone:'01-2806000', bank:'Stanbic IBTC', account_no:'0001112223', bank_code:'221', category:'Financial', terms:0, balance_owed:15000000, ytd_paid:900000, status:'active', tax_id:'RC-000234-FIN' },
  { id:'VND-004', name:'NEPA / IKEDC', email:'billing@ikedc.com', phone:'0700-IKEDC-00', bank:'First Bank', account_no:'2031900042', bank_code:'011', category:'Utilities', terms:30, balance_owed:92000, ytd_paid:1260000, status:'active', tax_id:'GOV-POWER-001' },
  { id:'VND-005', name:'Ola & Co. Chartered Accountants', email:'audit@olaandco.ng', phone:'01-7654321', bank:'Zenith Bank', account_no:'1122334455', bank_code:'057', category:'Professional', terms:30, balance_owed:240000, ytd_paid:580000, status:'active', tax_id:'ICAN-000892' },
  { id:'VND-006', name:'Gospel Print House', email:'orders@gospelprint.ng', phone:'09011223344', bank:'UBA', account_no:'5544332211', bank_code:'033', category:'Printing', terms:7, balance_owed:45000, ytd_paid:320000, status:'active', tax_id:'RC-088-PRINT' },
  { id:'VND-007', name:'Swift Couriers Nigeria', email:'invoices@swiftng.com', phone:'08033219988', bank:'Ecobank', account_no:'8877665544', bank_code:'050', category:'Logistics', terms:14, balance_owed:0, ytd_paid:124000, status:'inactive', tax_id:'RC-COURIER-88' },
  { id:'VND-008', name:'Arise FM / Radio', email:'ads@arisefm.ng', phone:'01-8001234', bank:'GTBank', account_no:'0099887766', bank_code:'058', category:'Media', terms:30, balance_owed:312000, ytd_paid:840000, status:'active', tax_id:'NBC-ARISE-2020' },
];

// ── Bills ──
const BILLS: Bill[] = [
  { id:'BILL-001', vendor_id:'VND-001', vendor_name:'TechPro Nigeria Ltd', reference:'INV-TP-2025-089', description:'LED Projector + Audio Mixer', amount:1200000, due_date:'2025-02-14', issue_date:'2025-01-15', status:'paid', category:'Technology', vat:90000, wht:12000 },
  { id:'BILL-002', vendor_id:'VND-004', vendor_name:'NEPA / IKEDC', reference:'IKEDC-JAN-2025', description:'January Electricity Bill', amount:92000, due_date:'2025-02-05', issue_date:'2025-01-25', status:'overdue', category:'Utilities', vat:0, wht:0 },
  { id:'BILL-003', vendor_id:'VND-005', vendor_name:'Ola & Co. Chartered Accountants', reference:'OLA-2025-Q1-AUDIT', description:'Q1 Audit & Compliance Review', amount:240000, due_date:'2025-04-30', issue_date:'2025-04-01', status:'approved', category:'Professional', vat:36000, wht:12000 },
  { id:'BILL-004', vendor_id:'VND-003', vendor_name:'Stanbic IBTC Bank', reference:'LOAN-INT-MAY25', description:'May Loan Interest Payment', amount:75000, due_date:'2025-05-31', issue_date:'2025-05-01', status:'paid', category:'Finance', vat:0, wht:0 },
  { id:'BILL-005', vendor_id:'VND-008', vendor_name:'Arise FM / Radio', reference:'ARISEFM-ADV-2025', description:'Q2 Radio Outreach Advertising', amount:312000, due_date:'2025-06-15', issue_date:'2025-05-15', status:'pending', category:'Media', vat:46800, wht:15600 },
  { id:'BILL-006', vendor_id:'VND-002', vendor_name:'CleanSweep Services', reference:'CS-MAY-2025', description:'May Cleaning & Sanitation', amount:80000, due_date:'2025-05-31', issue_date:'2025-05-25', status:'paid', category:'Facilities', vat:0, wht:0 },
  { id:'BILL-007', vendor_id:'VND-006', vendor_name:'Gospel Print House', reference:'GPH-INV-0482', description:'May Bulletins & Programs (2,000 copies)', amount:45000, due_date:'2025-05-28', issue_date:'2025-05-20', status:'pending', category:'Printing', vat:6750, wht:2250 },
  { id:'BILL-008', vendor_id:'VND-001', vendor_name:'TechPro Nigeria Ltd', reference:'INV-TP-2025-142', description:'Annual Software Licenses (Church Suite)', amount:480000, due_date:'2025-07-01', issue_date:'2025-06-01', status:'draft', category:'Technology', vat:72000, wht:24000 },
];

// ── Fixed Assets ──
const FIXED_ASSETS: FixedAsset[] = [
  { id:'FA-001', name:'Church Main Auditorium', category:'Buildings', code:'BLD-001', acquisition_date:'2008-01-01', acquisition_cost:60000000, useful_life:50, depreciation_method:'straight_line', salvage_value:6000000, accumulated_depreciation:3060000, location:'Plot 42, Victoria Island', status:'active', serial_number:'N/A', supplier:'Eko Builders Ltd' },
  { id:'FA-002', name:'Administrative Block', category:'Buildings', code:'BLD-002', acquisition_date:'2015-06-01', acquisition_cost:25000000, useful_life:50, depreciation_method:'straight_line', salvage_value:2500000, accumulated_depreciation:1190000, location:'Plot 42, Victoria Island', status:'active', serial_number:'N/A', supplier:'Eko Builders Ltd' },
  { id:'FA-003', name:'Toyota Hiace Bus (Church Bus 1)', category:'Motor Vehicles', code:'VEH-001', acquisition_date:'2020-03-15', acquisition_cost:7500000, useful_life:5, depreciation_method:'straight_line', salvage_value:750000, accumulated_depreciation:5250000, location:'Church Compound', status:'active', serial_number:'ABC-123-LG', supplier:'CFAO Motors' },
  { id:'FA-004', name:'Toyota Hilux Pickup', category:'Motor Vehicles', code:'VEH-002', acquisition_date:'2022-08-01', acquisition_cost:5000000, useful_life:5, depreciation_method:'straight_line', salvage_value:500000, accumulated_depreciation:1350000, location:'Church Compound', status:'active', serial_number:'XYZ-456-LG', supplier:'CFAO Motors' },
  { id:'FA-005', name:'Professional Sound System', category:'Equipment', code:'EQP-001', acquisition_date:'2021-01-20', acquisition_cost:3200000, useful_life:8, depreciation_method:'straight_line', salvage_value:320000, accumulated_depreciation:1080000, location:'Main Auditorium', status:'active', serial_number:'SS-YAMAHAMIX-01', supplier:'TechPro Nigeria Ltd' },
  { id:'FA-006', name:'LED Projector & Screen System', category:'Equipment', code:'EQP-002', acquisition_date:'2025-01-15', acquisition_cost:1200000, useful_life:5, depreciation_method:'straight_line', salvage_value:120000, accumulated_depreciation:0, location:'Main Auditorium', status:'active', serial_number:'EPSON-4K-2025', supplier:'TechPro Nigeria Ltd' },
  { id:'FA-007', name:'Office Furniture Set (Admin)', category:'Furniture', code:'FUR-001', acquisition_date:'2019-04-01', acquisition_cost:1800000, useful_life:10, depreciation_method:'straight_line', salvage_value:180000, accumulated_depreciation:936000, location:'Admin Block', status:'active', serial_number:'BATCH-2019-OF', supplier:'Home & Office Nig' },
  { id:'FA-008', name:'Power Generator (100KVA)', category:'Plant & Machinery', code:'PLT-001', acquisition_date:'2018-09-01', acquisition_cost:4500000, useful_life:10, depreciation_method:'reducing_balance', salvage_value:450000, accumulated_depreciation:3150000, location:'Generator House', status:'active', serial_number:'MIKANO-100KVA-18', supplier:'Mikano International' },
];

// ── Staff / Payroll ──
const STAFF_MEMBERS: StaffMember[] = [
  { id:'EMP-001', name:'Rev. David Okafor', department:'Pastoral', role:'Senior Pastor', grade:'LP-1', gross_salary:800000, paye:180000, pension_employee:80000, pension_employer:80000, nhf:4000, nsitf:8000, net_pay:528000, bank:'GTBank', account_no:'0123456001', start_date:'2010-01-01', status:'active' },
  { id:'EMP-002', name:'Pastor Emeka Eze', department:'Pastoral', role:'Associate Pastor', grade:'LP-2', gross_salary:500000, paye:90000, pension_employee:50000, pension_employer:50000, nhf:2500, nsitf:5000, net_pay:352500, bank:'Zenith Bank', account_no:'1122334001', start_date:'2015-03-01', status:'active' },
  { id:'EMP-003', name:'Mrs. Chioma Adeyemi', department:'Administration', role:'Church Secretary', grade:'SS-3', gross_salary:250000, paye:32000, pension_employee:25000, pension_employer:25000, nhf:1250, nsitf:2500, net_pay:189250, bank:'Access Bank', account_no:'9876543001', start_date:'2018-06-01', status:'active' },
  { id:'EMP-004', name:'Mr. Tunde Balogun', department:'Finance', role:'Accountant', grade:'SS-2', gross_salary:300000, paye:42000, pension_employee:30000, pension_employer:30000, nhf:1500, nsitf:3000, net_pay:223500, bank:'UBA', account_no:'5544332001', start_date:'2019-01-15', status:'active' },
  { id:'EMP-005', name:'Mr. Segun Adeleke', department:'Media', role:'Media Director', grade:'SS-2', gross_salary:280000, paye:38000, pension_employee:28000, pension_employer:28000, nhf:1400, nsitf:2800, net_pay:209800, bank:'GTBank', account_no:'0199887001', start_date:'2020-09-01', status:'active' },
  { id:'EMP-006', name:'Miss Ngozi Eze', department:'Youth Ministry', role:'Youth Coordinator', grade:'SS-1', gross_salary:180000, paye:18000, pension_employee:18000, pension_employer:18000, nhf:900, nsitf:1800, net_pay:141300, bank:'First Bank', account_no:'3322114001', start_date:'2021-07-01', status:'active' },
  { id:'EMP-007', name:'Mr. Femi Adeola', department:'Facilities', role:'Facility Manager', grade:'SS-1', gross_salary:200000, paye:22000, pension_employee:20000, pension_employer:20000, nhf:1000, nsitf:2000, net_pay:155000, bank:'Ecobank', account_no:'8866554001', start_date:'2017-04-01', status:'active' },
  { id:'EMP-008', name:'Mrs. Yetunde Okonkwo', department:'Pastoral Support', role:'PA to Senior Pastor', grade:'SS-2', gross_salary:260000, paye:34000, pension_employee:26000, pension_employer:26000, nhf:1300, nsitf:2600, net_pay:196100, bank:'GTBank', account_no:'0155443001', start_date:'2016-11-01', status:'active' },
];

// ── VAT Entries ──
const VAT_ENTRIES: VatEntry[] = [
  { id:'VAT-001', date:'2025-01-15', reference:'INV-TP-2025-089', description:'LED Projector purchase (TechPro)', type:'input', taxable_amount:1110000, vat_amount:90000, rate:7.5, vendor_customer:'TechPro Nigeria Ltd', status:'filed' },
  { id:'VAT-002', date:'2025-01-05', reference:'PROG-FEE-JAN', description:'Program fees collected — January', type:'output', taxable_amount:180000, vat_amount:13500, rate:7.5, vendor_customer:'Various Members', status:'filed' },
  { id:'VAT-003', date:'2025-02-10', reference:'HALL-RENT-FEB', description:'Hall rental fee collected', type:'output', taxable_amount:200000, vat_amount:15000, rate:7.5, vendor_customer:'Covenant Events Ltd', status:'filed' },
  { id:'VAT-004', date:'2025-04-01', reference:'OLA-2025-Q1-AUDIT', description:'Audit fee (Ola & Co.)', type:'input', taxable_amount:240000, vat_amount:18000, rate:7.5, vendor_customer:'Ola & Co. Chartered Accountants', status:'pending' },
  { id:'VAT-005', date:'2025-05-15', reference:'ARISEFM-ADV-2025', description:'Radio advertising (Arise FM)', type:'input', taxable_amount:312000, vat_amount:23400, rate:7.5, vendor_customer:'Arise FM / Radio', status:'pending' },
  { id:'VAT-006', date:'2025-05-01', reference:'PROG-FEE-MAY', description:'Program fees collected — May', type:'output', taxable_amount:220000, vat_amount:16500, rate:7.5, vendor_customer:'Various Members', status:'pending' },
];

// ── Audit Log ──
const AUDIT_LOG: AuditLog[] = [
  { id:'AUD-001', timestamp:'2025-05-30T09:14:22', user:'Accountant Mary', action:'Posted Journal Entry', module:'Ledger', entity_id:'JNL-011', before:'draft', after:'posted', ip:'192.168.1.45', severity:'info' },
  { id:'AUD-002', timestamp:'2025-05-28T14:30:00', user:'Treasurer', action:'Approved Bill', module:'Payables', entity_id:'BILL-003', before:'pending', after:'approved', ip:'192.168.1.12', severity:'info' },
  { id:'AUD-003', timestamp:'2025-05-25T11:05:30', user:'Admin User', action:'Modified Journal Entry', module:'Ledger', entity_id:'JNL-009', before:'amount:80000', after:'amount:75000', ip:'192.168.1.45', severity:'warning' },
  { id:'AUD-004', timestamp:'2025-05-20T08:00:00', user:'Accountant Mary', action:'Processed Payroll', module:'Payroll', entity_id:'PAY-MAY-2025', before:'draft', after:'processed', ip:'192.168.1.45', severity:'info' },
  { id:'AUD-005', timestamp:'2025-05-18T16:42:11', user:'Elder James', action:'Approved Withdrawal', module:'Treasury', entity_id:'WDR-008', before:'pending', after:'approved', ip:'192.168.1.88', severity:'info' },
  { id:'AUD-006', timestamp:'2025-05-15T10:11:00', user:'Unknown', action:'Failed Login Attempt', module:'Auth', entity_id:'N/A', before:'', after:'', ip:'41.58.120.99', severity:'critical' },
  { id:'AUD-007', timestamp:'2025-05-14T14:20:00', user:'Board Chair', action:'Approved Budget Amendment', module:'Budget', entity_id:'BUD-2025-Q2', before:'draft', after:'approved', ip:'192.168.1.100', severity:'info' },
  { id:'AUD-008', timestamp:'2025-05-10T09:30:00', user:'Accountant Mary', action:'Exported Financial Data', module:'Reports', entity_id:'RPT-Q1-2025', before:'', after:'CSV export triggered', ip:'192.168.1.45', severity:'warning' },
  { id:'AUD-009', timestamp:'2025-05-05T11:00:00', user:'Accountant Mary', action:'Remitted PAYE', module:'Tax', entity_id:'PAYE-APR-2025', before:'outstanding', after:'remitted', ip:'192.168.1.45', severity:'info' },
  { id:'AUD-010', timestamp:'2025-04-30T17:00:00', user:'Treasurer', action:'Filed VAT Return', module:'Tax', entity_id:'VAT-Q1-2025', before:'pending', after:'filed', ip:'192.168.1.12', severity:'info' },
];

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════

const SCard = memo(({ children, className='', gold=false, highlight=false, style={} }: {
  children: React.ReactNode; className?: string; gold?: boolean; highlight?: boolean; style?: React.CSSProperties;
}) => {
  const theme = useTheme();
  const isHl  = highlight || gold;
  return (
    <div className={`fs-card relative overflow-hidden ${className}`}
      style={{ boxShadow: isHl
        ? '0 0 0 1px rgba(16,185,129,0.22), 0 4px 24px rgba(16,185,129,0.09)'
        : theme==='light' ? '0 1px 8px rgba(16,185,129,0.07)' : '0 4px 16px rgba(0,0,0,0.25)', ...style }}>
      {isHl && <div className="absolute top-0 left-0 right-0 h-px" style={{ background:'linear-gradient(90deg,transparent,#10b98160,transparent)' }} />}
      {children}
    </div>
  );
});
SCard.displayName = 'SCard';

const SBar = memo(({ v, color=G, h=4 }: { v:number; color?:string; h?:number }) => (
  <div className="fs-bar-track w-full rounded-full overflow-hidden" style={{ height:h }}>
    <div className="h-full rounded-full transition-all duration-700" style={{ width:`${clamp(v,0,100)}%`, background:color }} />
  </div>
));
SBar.displayName = 'SBar';

const Pill = memo(({ label, color, bg }: { label:string; color:string; bg:string }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
    style={{ color, background:bg, border:`1px solid ${color}33` }}>
    {label}
  </span>
));
Pill.displayName = 'Pill';

const BillStatusPill = memo(({ status }: { status: Bill['status'] }) => {
  const M: Record<Bill['status'],{c:string,b:string}> = {
    draft:    {c:'#64748b',b:'rgba(100,116,139,0.15)'},
    pending:  {c:'#60a5fa',b:'rgba(96,165,250,0.15)'},
    approved: {c:'#a78bfa',b:'rgba(167,139,250,0.15)'},
    paid:     {c:'#10b981',b:'rgba(16,185,129,0.15)'},
    overdue:  {c:'#f87171',b:'rgba(248,113,113,0.15)'},
    disputed: {c:'#34d399',b:'rgba(251,191,36,0.15)'},
  };
  return <Pill label={status.toUpperCase()} color={M[status].c} bg={M[status].b} />;
});
BillStatusPill.displayName = 'BillStatusPill';

const SectionHeader = memo(({ title, subtitle, action }: {
  title:string; subtitle?:string; action?:React.ReactNode;
}) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-sm font-bold fs-text1 tracking-tight" style={{ fontFamily:'Roboto Mono, monospace' }}>{title}</h3>
      {subtitle && <p className="text-[10px] fs-text3 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
));
SectionHeader.displayName = 'SectionHeader';

const AccountTypeBadge = memo(({ type }: { type: Account['type'] }) => {
  const M = {
    asset:   {c:'#10b981',b:'rgba(16,185,129,0.12)'},
    liability:{c:'#f87171',b:'rgba(248,113,113,0.12)'},
    equity:  {c:'#a78bfa',b:'rgba(167,139,250,0.12)'},
    revenue: {c:'#34d399',b:'rgba(251,191,36,0.12)'},
    expense: {c:'#fb923c',b:'rgba(251,146,60,0.12)'},
  };
  return <Pill label={type} color={M[type].c} bg={M[type].b} />;
});
AccountTypeBadge.displayName = 'AccountTypeBadge';

// ── Micro area chart ──
const MiniLine = memo(({ pts, color=G, w=80, h=32 }: {pts:number[];color?:string;w?:number;h?:number}) => {
  if (pts.length < 2) return null;
  const max = Math.max(...pts)||1, min = Math.min(...pts);
  const range = max-min||1;
  const coords = pts.map((v,i) => `${(i/(pts.length-1))*w},${h-((v-min)/range)*h}`);
  const area = [`0,${h}`, ...coords, `${w},${h}`].join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs><linearGradient id={`ml-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={area} fill={`url(#ml-${color.replace('#','')})`}/>
      <polyline points={coords.join(' ')} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
});
MiniLine.displayName = 'MiniLine';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 1: COMMAND CENTER
// ═══════════════════════════════════════════════════════════════════════════

const CommandModule = memo(() => {
  const totalRevenue  = CHART_OF_ACCOUNTS.filter(a=>a.type==='revenue').reduce((s,a)=>s+a.balance,0);
  const totalExpenses = CHART_OF_ACCOUNTS.filter(a=>a.type==='expense').reduce((s,a)=>s+a.balance,0);
  const netSurplus    = totalRevenue - totalExpenses;
  const totalAssets   = CHART_OF_ACCOUNTS.filter(a=>a.type==='asset').reduce((s,a)=>s+a.balance,0);
  const totalLiab     = CHART_OF_ACCOUNTS.filter(a=>a.type==='liability').reduce((s,a)=>s+a.balance,0);
  const totalEquity   = CHART_OF_ACCOUNTS.filter(a=>a.type==='equity').reduce((s,a)=>s+a.balance,0);
  const cashBal       = 8420000+3150000+125000;
  const currentAssets = 8420000+3150000+125000+2280000+640000+380000+10000000;
  const currentLiab   = 1840000+920000+214000+87000+340000+280000+1200000;
  const currentRatio  = (currentAssets/currentLiab).toFixed(2);
  const debtToEquity  = (totalLiab/abs(totalEquity)).toFixed(2);
  const grossMargin   = ((totalRevenue - 18600000 - 9840000) / totalRevenue * 100).toFixed(1);
  const netMargin     = (netSurplus/totalRevenue*100).toFixed(1);
  const overdueCount  = BILLS.filter(b=>b.status==='overdue').length;
  const overdueAmt    = BILLS.filter(b=>b.status==='overdue').reduce((s,b)=>s+b.amount,0);
  const pendingJnl    = JOURNAL_ENTRIES.filter(j=>!j.posted).length;
  const MONTHS        = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const revTrend      = [3240000,3850000,3100000,5080000,3620000,3240000,3900000,4200000,3800000,4100000,4400000,3950000];
  const expTrend      = [2800000,3100000,2700000,3200000,3000000,2800000,3200000,3400000,3000000,3500000,3800000,3200000];
  const cashTrend     = [9200000,10100000,9800000,11200000,10800000,11695000,12100000,11500000,12400000,12100000,13000000,11695000];
  const RATIOS = [
    { label:'Current Ratio', value:currentRatio, target:'> 1.5', good:parseFloat(currentRatio)>=1.5, desc:'Short-term liquidity', icon:'water_drop' },
    { label:'Debt / Equity', value:debtToEquity, target:'< 0.5', good:parseFloat(debtToEquity)<=0.5, desc:'Financial leverage', icon:'balance' },
    { label:'Gross Margin', value:`${grossMargin}%`, target:'> 40%', good:parseFloat(grossMargin)>=40, desc:'After personnel costs', icon:'trending_up' },
    { label:'Net Surplus Margin', value:`${netMargin}%`, target:'> 15%', good:parseFloat(netMargin)>=15, desc:'Bottom line efficiency', icon:'savings' },
  ];
  const HEALTH_SCORE = RATIOS.filter(r=>r.good).length * 25;
  return (
    <div className="p-5 space-y-5 fs-slide">
      {/* Health Banner */}
      <div className="fs-health-banner rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 opacity-5" style={{ background:'radial-gradient(circle at right, #10b981, transparent)' }}/>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(16,185,129,0.2)', border:'1px solid rgba(16,185,129,0.4)' }}>
          <span className="text-2xl font-black fs-green" style={{ fontFamily:'Roboto Mono, monospace' }}>{HEALTH_SCORE}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold fs-text1">Financial Health Score — {HEALTH_SCORE>=75?'STRONG':HEALTH_SCORE>=50?'ADEQUATE':'NEEDS ATTENTION'}</p>
          <p className="text-[11px] fs-text3 mt-1">Based on 4 core financial ratios · Fiscal Year 2025 · As of {fmtD(new Date().toISOString())}</p>
          <div className="flex gap-1 mt-2">
            {[25,50,75,100].map(t => <div key={t} className={`h-1.5 flex-1 rounded-sm transition-all ${HEALTH_SCORE<t?'fs-bar-track':''}`} style={{ background: HEALTH_SCORE>=t ? G : undefined }} />)}
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-2xl font-black fs-green">{compact(netSurplus)}</p>
          <p className="text-[10px] fs-text3">YTD Net Surplus</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {[
          { label:'Total Revenue', v:totalRevenue, sub:'YTD gross income', color:'#10b981', pts:revTrend, icon:'trending_up' },
          { label:'Total Expenses', v:totalExpenses, sub:'YTD operating costs', color:'#fb923c', pts:expTrend, icon:'trending_down' },
          { label:'Net Surplus', v:netSurplus, sub:'Revenue minus expenses', color:netSurplus>=0?'#10b981':'#f87171', pts:revTrend.map((r,i)=>r-expTrend[i]), icon:'savings' },
          { label:'Total Assets', v:totalAssets, sub:'Gross asset base', color:'#60a5fa', pts:[totalAssets*0.9,totalAssets], icon:'domain' },
          { label:'Cash & Equivalents', v:cashBal, sub:'Liquid reserves', color:'#10b981', pts:cashTrend, icon:'account_balance_wallet' },
          { label:'Total Equity', v:abs(totalEquity), sub:'Net fund balances', color:'#a78bfa', pts:[abs(totalEquity)*0.8,abs(totalEquity)], icon:'pie_chart' },
        ].map(k => (
          <SCard key={k.label} className="p-4 flex flex-col gap-3" gold={k.label==='Net Surplus'}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold fs-text3 uppercase tracking-widest">{k.label}</span>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:`${k.color}22` }}>
                <Icon name={k.icon} size={12} style={{ color:k.color }}/>
              </div>
            </div>
            <p className="text-lg font-black tracking-tight" style={{ color:k.color, fontFamily:'Roboto Mono, monospace' }}>{compact(k.v)}</p>
            <div className="flex items-end justify-between">
              <p className="text-[9px] fs-text3">{k.sub}</p>
              <MiniLine pts={k.pts} color={k.color} w={60} h={20}/>
            </div>
          </SCard>
        ))}
      </div>

      {/* Ratios + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SCard className="p-5 lg:col-span-2">
          <SectionHeader title="Key Financial Ratios" subtitle="Benchmarked against best-practice nonprofit standards"/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RATIOS.map(r => (
              <div key={r.label} className={`p-3 rounded-lg ${r.good?'fs-ratio-good':'fs-ratio-bad'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold fs-text3 uppercase tracking-wider">{r.label}</span>
                  <span className={`text-[9px] font-bold ${r.good?'text-emerald-500':'text-red-400'}`}>{r.good?'✓ HEALTHY':'⚠ REVIEW'}</span>
                </div>
                <p className="text-2xl font-black" style={{ color:r.good?'#10b981':'#f87171', fontFamily:'Roboto Mono, monospace' }}>{r.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[9px] fs-text3">{r.desc}</p>
                  <p className="text-[9px] font-mono fs-text3">target: {r.target}</p>
                </div>
              </div>
            ))}
          </div>
          {/* 12-month comparative bars */}
          <div className="mt-5">
            <p className="text-[9px] font-bold fs-text3 uppercase tracking-widest mb-3">12-Month Revenue vs Expenses</p>
            <div className="flex items-end gap-1.5 h-20">
              {MONTHS.map((m,i) => {
                const maxV = Math.max(...revTrend,...expTrend);
                const rh = Math.round((revTrend[i]/maxV)*72);
                const eh = Math.round((expTrend[i]/maxV)*72);
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex items-end justify-center gap-px" style={{ height:72 }}>
                      <div className="rounded-t flex-1" style={{ height:rh, background:'rgba(16,185,129,0.6)', minWidth:4 }}/>
                      <div className="rounded-t flex-1" style={{ height:eh, background:'rgba(251,146,60,0.4)', minWidth:4 }}/>
                    </div>
                    <span className="text-[7px] fs-text3">{m}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2">
              <span className="text-[9px] fs-text3 flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background:'rgba(16,185,129,0.6)' }}/>Revenue</span>
              <span className="text-[9px] fs-text3 flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background:'rgba(251,146,60,0.4)' }}/>Expenses</span>
            </div>
          </div>
        </SCard>

        <div className="space-y-3">
          <SCard className="p-4">
            <p className="text-[9px] font-bold fs-text3 uppercase tracking-widest mb-3">Action Items</p>
            <div className="space-y-2">
              {[
                { icon:'warning', label:`${overdueCount} overdue ${overdueCount===1?'bill':'bills'}`, amount:ngn(overdueAmt), color:'#f87171', link:'payables' },
                { icon:'pending_actions', label:`${pendingJnl} unposted journal ${pendingJnl===1?'entry':'entries'}`, amount:'', color:'#34d399', link:'ledger' },
                { icon:'account_balance', label:'VAT return due in 8 days', amount:ngn(214000), color:'#fb923c', link:'tax' },
                { icon:'person', label:'PAYE remittance pending', amount:ngn(340000), color:'#60a5fa', link:'payroll' },
              ].map((a,i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer fs-hover fs-inset transition-colors" style={{ border:`1px solid ${a.color}22` }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:`${a.color}15` }}>
                    <Icon name={a.icon} size={13} style={{ color:a.color }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] fs-text2 truncate">{a.label}</p>
                    {a.amount && <p className="text-[10px] font-mono" style={{ color:a.color }}>{a.amount}</p>}
                  </div>
                  <Icon name="chevron_right" size={12} className="fs-text3 flex-shrink-0"/>
                </div>
              ))}
            </div>
          </SCard>

          <SCard className="p-4">
            <p className="text-[9px] font-bold fs-text3 uppercase tracking-widest mb-3">Cash Runway</p>
            <p className="text-3xl font-black fs-green" style={{ fontFamily:'Roboto Mono, monospace' }}>{Math.round(cashBal / (totalExpenses/12))} <span className="text-sm fs-text3">months</span></p>
            <p className="text-[10px] fs-text3 mt-1">At current burn rate of {compact(totalExpenses/12)}/mo</p>
            <div className="mt-3">
              <SBar v={Math.min(100, (cashBal/(totalExpenses/12))/24*100)} color={G} h={6}/>
              <p className="text-[9px] fs-text3 mt-1">vs 24-month target runway</p>
            </div>
          </SCard>

          <SCard className="p-4">
            <p className="text-[9px] font-bold fs-text3 uppercase tracking-widest mb-3">Fund Allocation</p>
            <div className="space-y-2">
              {[
                { name:'General Fund', amt:42000000, color:'#10b981' },
                { name:'Building Fund', amt:8660000, color:'#3b82f6' },
                { name:'Endowment', amt:30000000, color:'#a78bfa' },
                { name:'Missions Fund', amt:1650000, color:'#10b981' },
              ].map(f => {
                const total = 82310000;
                return (
                  <div key={f.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] fs-text3">{f.name}</span>
                      <span className="text-[10px] font-mono" style={{ color:f.color }}>{compact(f.amt)}</span>
                    </div>
                    <SBar v={parseFloat(pct(f.amt,total))} color={f.color} h={3}/>
                  </div>
                );
              })}
            </div>
          </SCard>
        </div>
      </div>
    </div>
  );
});
CommandModule.displayName = 'CommandModule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 2: GENERAL LEDGER
// ═══════════════════════════════════════════════════════════════════════════

const LedgerModule = memo(() => {
  const THIN = useTHIN();
  const [view, setView]     = useState<'coa'|'journal'|'trial'>('coa');
  const [search, setSearch] = useState('');
  const [typeF, setTypeF]   = useState('all');
  const [expanded, setExpanded] = useState<string|null>(null);

  const coa = useMemo(() => {
    let list = CHART_OF_ACCOUNTS;
    if (typeF !== 'all') list = list.filter(a => a.type === typeF);
    if (search) list = list.filter(a => a.code.includes(search) || a.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [typeF, search]);

  const trialBalance = useMemo(() => {
    const debits  = CHART_OF_ACCOUNTS.filter(a => a.balance > 0 && a.normal === 'debit').reduce((s,a)=>s+a.balance,0);
    const credits = CHART_OF_ACCOUNTS.filter(a => a.balance > 0 && a.normal === 'credit').reduce((s,a)=>s+a.balance,0);
    const negDebs = CHART_OF_ACCOUNTS.filter(a => a.balance < 0 && a.normal === 'debit').reduce((s,a)=>s+a.balance,0);
    const negCreds = CHART_OF_ACCOUNTS.filter(a => a.balance < 0 && a.normal === 'credit').reduce((s,a)=>s+a.balance,0);
    return { debits: debits + abs(negCreds), credits: credits + abs(negDebs) };
  }, []);

  const jnlSearch = search.toLowerCase();
  const journals  = JOURNAL_ENTRIES.filter(j =>
    !search || j.reference.toLowerCase().includes(jnlSearch) || j.description.toLowerCase().includes(jnlSearch)
  );

  const totalsByType = useMemo(() => {
    const out: Record<string, number> = {};
    CHART_OF_ACCOUNTS.forEach(a => { out[a.type] = (out[a.type]||0) + a.balance; });
    return out;
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden fs-slide">
      {/* Toolbar */}
      <div className="fs-toolbar px-5 py-3 flex-shrink-0 flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border fs-divider">
          {([['coa','Chart of Accounts'],['journal','Journal Entries'],['trial','Trial Balance']] as [typeof view, string][]).map(([k,l]) => (
            <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 text-[11px] font-bold transition-all ${view===k?'text-black':'fs-text3 hover:fs-text2'}`} style={view===k?{background:G}:{background:'transparent'}}>{l}</button>
          ))}
        </div>
        {view !== 'trial' && (
          <div className="relative">
            <Icon name="search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 fs-text3"/>
            <input type="text" placeholder={view==='coa'?'Code or name…':'Ref or description…'} value={search} onChange={e=>setSearch(e.target.value)}
              className="fs-input w-44 pl-8 pr-3 py-1.5 rounded-lg text-[11px] focus:outline-none"/>
          </div>
        )}
        {view==='coa' && (
          <select value={typeF} onChange={e=>setTypeF(e.target.value)} className="fs-input px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none">
            <option value="all">All Types</option>
            {['asset','liability','equity','revenue','expense'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        )}
        <span className="ml-auto text-[10px] fs-text3">{view==='coa'?`${coa.length} accounts`:view==='journal'?`${journals.length} entries`:''}</span>
      </div>

      <div className="flex-1 overflow-y-auto" style={THIN}>
        {/* ── CHART OF ACCOUNTS ── */}
        {view==='coa' && (
          <div>
            {/* Type summaries */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-4 border-b border-slate-900">
              {[['asset','#10b981'],['liability','#f87171'],['equity','#a78bfa'],['revenue','#10b981'],['expense','#fb923c']].map(([t,c]) => (
                <div key={t} onClick={() => setTypeF(typeF===t?'all':t)} className="p-2.5 rounded-lg cursor-pointer transition-all" style={{ background:typeF===t?`${c}20`:'rgba(30,41,59,0.4)', border:`1px solid ${typeF===t?c+'40':'#1e293b'}` }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color:c }}>{t}</p>
                  <p className="text-base font-black mt-1 font-mono" style={{ color:c }}>{compact(abs(totalsByType[t]||0))}</p>
                </div>
              ))}
            </div>
            <table className="w-full min-w-[700px] border-collapse">
              <thead className="sticky top-0 z-10 fs-thead">
                <tr>{['CODE','ACCOUNT NAME','TYPE','SUBTYPE','NORMAL BAL.','BALANCE (₦)',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left"><span className="text-[9px] font-bold fs-text3 uppercase tracking-widest">{h}</span></th>
                ))}</tr>
              </thead>
              <tbody>
                {coa.map((a,i) => (
                  <React.Fragment key={a.code}>
                    <tr className={`border-b border-opacity-30 cursor-pointer transition-colors ${i%2===0?'fs-tr-even':'fs-tr-odd'} ${expanded===a.code?'border-emerald-900/30':'fs-hover'}`}
                      onClick={() => setExpanded(expanded===a.code?null:a.code)}>
                      <td className="px-4 py-2.5"><span className="text-[11px] font-mono font-bold" style={{ color:G }}>{a.code}</span></td>
                      <td className="px-4 py-2.5"><span className="text-xs font-sans fs-text2">{a.name}</span></td>
                      <td className="px-4 py-2.5"><AccountTypeBadge type={a.type}/></td>
                      <td className="px-4 py-2.5"><span className="text-[10px] fs-text3">{a.subtype}</span></td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] font-mono font-bold uppercase ${a.normal==='debit'?'text-blue-400':'text-emerald-400'}`}>{a.normal}</span></td>
                      <td className="px-4 py-2.5">
                        <span className={`text-sm font-mono font-black ${a.balance<0?'text-red-400':a.type==='revenue'||a.type==='liability'||a.type==='equity'?'text-emerald-400':'text-emerald-400'}`}>
                          {a.balance<0?`(${ngn(abs(a.balance))})`:`${ngn(a.balance)}`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5"><Icon name={expanded===a.code?'expand_less':'expand_more'} size={14} className="fs-text3"/></td>
                    </tr>
                    {expanded===a.code && (
                      <tr className="border-b border-emerald-900/20">
                        <td colSpan={7} className="px-6 py-3" style={{ background:'rgba(16,185,129,0.04)' }}>
                          <div className="flex items-start gap-6">
                            <div><p className="text-[9px] fs-text3 uppercase tracking-widest mb-1">Description</p><p className="text-xs fs-text2">{a.description}</p></div>
                            <div><p className="text-[9px] fs-text3 uppercase tracking-widest mb-1">Account Code</p><p className="text-xs font-mono text-emerald-400">{a.code}</p></div>
                            <div><p className="text-[9px] fs-text3 uppercase tracking-widest mb-1">Classification</p><p className="text-xs font-mono fs-text2">{a.type} / {a.subtype}</p></div>
                            {a.type==='expense'||a.type==='revenue'?<div><p className="text-[9px] fs-text3 uppercase tracking-widest mb-1">YTD Activity</p><p className="text-xs font-mono text-emerald-400">{ngn(abs(a.balance))}</p></div>:<></>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── JOURNAL ENTRIES ── */}
        {view==='journal' && (
          <div className="p-4 space-y-3">
            {journals.map(jnl => (
              <SCard key={jnl.id} className="overflow-hidden" gold={!jnl.posted}>
                <div className={`h-px w-full`} style={{ background: jnl.posted ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.4)' }}/>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold" style={{ color:G }}>{jnl.reference}</span>
                        <Pill label={jnl.posted?'POSTED':'DRAFT'} color={jnl.posted?'#10b981':'#10b981'} bg={jnl.posted?'rgba(16,185,129,0.12)':'rgba(16,185,129,0.12)'}/>
                      </div>
                      <p className="text-sm font-bold fs-text1 mt-1">{jnl.description}</p>
                      <p className="text-[10px] fs-text3 mt-0.5">{fmtD(jnl.date)} · By {jnl.created_by}{jnl.approved_by && ` · Approved: ${jnl.approved_by}`}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-mono font-black fs-green">{ngn(jnl.total)}</p>
                      <p className="text-[9px] fs-text3">{jnl.lines.length} lines</p>
                    </div>
                  </div>
                  <p className="text-[10px] fs-text3 mb-3 italic">{jnl.narration}</p>
                  {/* Debit/Credit lines */}
                  <div className="fs-card rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[80px_1fr_120px_120px] gap-0 px-3 py-1.5 fs-thead">
                      {['ACCT','ACCOUNT','DEBIT (₦)','CREDIT (₦)'].map(h => <span key={h} className="text-[9px] font-bold fs-text3 uppercase tracking-widest">{h}</span>)}
                    </div>
                    {jnl.lines.map((l,li) => (
                      <div key={li} className={`grid grid-cols-[80px_1fr_120px_120px] gap-0 px-3 py-2 border-t border-slate-900/60 ${li%2===0?'fs-tr-even':'fs-tr-odd'}`}>
                        <span className="text-[10px] font-mono" style={{ color:G }}>{l.account_code}</span>
                        <span className="text-[11px] fs-text2 truncate pr-2">{l.account_name}</span>
                        <span className="text-[11px] font-mono font-bold text-blue-400 text-right">{l.debit>0?ngn(l.debit):'—'}</span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400 text-right">{l.credit>0?ngn(l.credit):'—'}</span>
                      </div>
                    ))}
                    <div className="grid grid-cols-[80px_1fr_120px_120px] gap-0 px-3 py-2 border-t fs-divider" style={{ background:'rgba(30,41,59,0.6)' }}>
                      <span/><span className="text-[9px] font-bold fs-text3 uppercase">TOTALS</span>
                      <span className="text-xs font-mono font-black text-blue-300 text-right">{ngn(jnl.lines.reduce((s,l)=>s+l.debit,0))}</span>
                      <span className="text-xs font-mono font-black text-emerald-300 text-right">{ngn(jnl.lines.reduce((s,l)=>s+l.credit,0))}</span>
                    </div>
                  </div>
                </div>
              </SCard>
            ))}
          </div>
        )}

        {/* ── TRIAL BALANCE ── */}
        {view==='trial' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold fs-text1">Trial Balance</h3>
                <p className="text-[10px] fs-text3">As at {fmtD(new Date().toISOString())} · {CHART_OF_ACCOUNTS.length} accounts</p>
              </div>
              <div className="flex items-center gap-2">
                <Pill label={trialBalance.debits===trialBalance.credits?'BALANCED':'UNBALANCED'} color={trialBalance.debits===trialBalance.credits?'#10b981':'#f87171'} bg={trialBalance.debits===trialBalance.credits?'rgba(16,185,129,0.12)':'rgba(248,113,113,0.12)'}/>
              </div>
            </div>
            <div className="fs-card rounded-xl overflow-hidden">
              <div className="grid grid-cols-[100px_1fr_160px_160px] gap-0 px-4 py-2.5 fs-thead">
                {['CODE','ACCOUNT NAME','DEBIT (₦)','CREDIT (₦)'].map(h => <span key={h} className="text-[9px] font-bold fs-text3 uppercase tracking-widest">{h}</span>)}
              </div>
              {CHART_OF_ACCOUNTS.map((a,i) => {
                const isDebit = (a.normal==='debit' && a.balance>0) || (a.normal==='credit' && a.balance<0);
                const isCredit = (a.normal==='credit' && a.balance>0) || (a.normal==='debit' && a.balance<0);
                return (
                  <div key={a.code} className={`grid grid-cols-[100px_1fr_160px_160px] gap-0 px-4 py-2 border-t border-opacity-20 ${i%2===0?'fs-tr-even':'fs-tr-odd'}`}>
                    <span className="text-[10px] font-mono text-emerald-400">{a.code}</span>
                    <span className="text-[11px] fs-text2 pr-4 truncate">{a.name}</span>
                    <span className="text-[11px] font-mono text-blue-400 text-right pr-4">{isDebit ? ngn(abs(a.balance)) : ''}</span>
                    <span className="text-[11px] font-mono text-emerald-400 text-right">{isCredit ? ngn(abs(a.balance)) : ''}</span>
                  </div>
                );
              })}
              {/* Totals */}
              <div className="grid grid-cols-[100px_1fr_160px_160px] gap-0 px-4 py-3 border-t-2 border-emerald-900/40" style={{ background:'rgba(16,185,129,0.06)' }}>
                <span/><span className="text-xs font-black fs-text2 uppercase tracking-widest">GRAND TOTALS</span>
                <span className="text-sm font-black text-blue-300 text-right pr-4">{ngn(trialBalance.debits)}</span>
                <span className="text-sm font-black text-emerald-300 text-right">{ngn(trialBalance.credits)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
LedgerModule.displayName = 'LedgerModule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 3: FINANCIAL STATEMENTS (P&L · Balance Sheet · Cash Flow)
// ═══════════════════════════════════════════════════════════════════════════

const StatementsModule = memo(() => {
  const THIN = useTHIN();
  const [stmt, setStmt] = useState<'pl'|'bs'|'cf'>('pl');

  // P&L figures
  const tithes       = 38420000; const projects  = 12850000; const fundraising = 6740000;
  const programFees  = 2180000;  const investInc  = 3250000;  const rental      = 840000;
  const merchandise  = 420000;
  const totalRevenue = tithes+projects+fundraising+programFees+investInc+rental+merchandise;

  const pastoralSal  = 18600000; const staffSal   = 9840000;  const empPension  = 1428000;
  const benefits     = 840000;
  const totalPersonnel = pastoralSal+staffSal+empPension+benefits;

  const building     = 4820000;  const utilities  = 1840000;  const media       = 3180000;
  const printing     = 640000;   const missions   = 4200000;  const youth       = 2840000;
  const travel       = 1240000;  const profFees   = 580000;   const benevolence = 1680000;
  const totalMinOps  = building+utilities+media+printing+missions+youth+travel+profFees+benevolence;

  const bankCharges  = 124000;   const interest   = 900000;   const depreciation= 2380000;
  const totalOther   = bankCharges+interest+depreciation;
  const totalExpenses= totalPersonnel+totalMinOps+totalOther;
  const EBITDA       = totalRevenue - totalPersonnel - totalMinOps;
  const netSurplus   = totalRevenue - totalExpenses;

  // Balance Sheet
  const currentAssets   = 8420000+3150000+125000+2280000+640000+380000+10000000;
  const fixedAssetsGross= 85000000+9800000+12500000;
  const accDepr         = 4250000+3920000+5000000;
  const fixedAssetsNet  = fixedAssetsGross - accDepr;
  const longTermInvest  = 25000000;
  const totalAssets     = currentAssets+fixedAssetsNet+longTermInvest;
  const currentLiab     = 1840000+920000+214000+87000+340000+280000+1200000;
  const ltLiab          = 15000000;
  const totalLiab       = currentLiab+ltLiab;
  const totalEquity     = 42000000+8660000+1650000+30000000+netSurplus;
  const totalLiabEquity = totalLiab+totalEquity;

  const Row = ({ label, amount, level=0, bold=false, total=false, sep=false }: {
    label:string; amount?:number; level?:number; bold?:boolean; total?:boolean; sep?:boolean;
  }) => sep ? (
    <div className="border-t border-slate-800 my-0.5"/>
  ) : (
    <div className={`flex items-center justify-between py-1.5 px-4 ${total?'border-t-2 border-emerald-900/40 mt-1':'border-b border-slate-900/30'}`}
      style={{ paddingLeft: 16 + level*20, background: total ? 'rgba(16,185,129,0.05)' : 'transparent' }}>
      <span className={`text-xs ${bold||total ? 'font-black fs-text1' : 'fs-text2'}`}>{label}</span>
      {amount !== undefined && (
        <span className={`text-xs font-mono ${total ? 'font-black text-emerald-300' : bold ? 'font-bold fs-text2' : amount<0?'text-red-400':'fs-text2'}`}>
          {amount < 0 ? `(${ngn(abs(amount))})` : ngn(amount)}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden fs-slide">
      <div className="fs-toolbar px-5 py-3 flex-shrink-0 flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border fs-divider">
          {([['pl','Income Statement'],['bs','Balance Sheet'],['cf','Cash Flow']] as [typeof stmt, string][]).map(([k,l]) => (
            <button key={k} onClick={() => setStmt(k)} className={`px-4 py-1.5 text-[11px] font-bold transition-all ${stmt===k?'text-black':'fs-text3 hover:fs-text2'}`} style={stmt===k?{background:G}:{background:'transparent'}}>{l}</button>
          ))}
        </div>
        <span className="ml-auto text-[10px] fs-text3">Fiscal Year 2025 · IFRS Basis · Unaudited</span>
      </div>

      <div className="flex-1 overflow-y-auto" style={THIN}>

        {/* ── INCOME STATEMENT / P&L ── */}
        {stmt==='pl' && (
          <div className="max-w-2xl mx-auto p-5">
            <div className="text-center mb-6">
              <p className="text-[10px] fs-text3 uppercase tracking-widest">Statement of Financial Activities</p>
              <h2 className="text-lg font-black fs-text1 mt-1" style={{ fontFamily:'Roboto Mono, monospace' }}>Income Statement</h2>
              <p className="text-[11px] fs-text3 mt-1">For the Period: 1 January — 31 December 2025</p>
            </div>
            <SCard>
              <Row label="INCOME" bold/>
              <Row label="Ministry Income" level={1} bold/>
              <Row label="Tithes & Offerings"       amount={tithes}      level={2}/>
              <Row label="Project Offerings"        amount={projects}     level={2}/>
              <Row label="Fundraising Revenue"      amount={fundraising}  level={2}/>
              <Row label="Total Ministry Income"    amount={tithes+projects+fundraising} level={1} bold/>
              <Row label="Other Income" level={1} bold/>
              <Row label="Program Fees"             amount={programFees}  level={2}/>
              <Row label="Investment Income"        amount={investInc}    level={2}/>
              <Row label="Rental Income"            amount={rental}       level={2}/>
              <Row label="Merchandise Sales"        amount={merchandise}  level={2}/>
              <Row label="Total Other Income"       amount={programFees+investInc+rental+merchandise} level={1} bold/>
              <Row label="TOTAL INCOME"             amount={totalRevenue} total bold/>
              <div className="h-3"/>
              <Row label="EXPENDITURE" bold/>
              <Row label="Personnel Costs" level={1} bold/>
              <Row label="Pastoral Salaries"        amount={pastoralSal}  level={2}/>
              <Row label="Staff Salaries"           amount={staffSal}     level={2}/>
              <Row label="Employer Pension (10%)"   amount={empPension}   level={2}/>
              <Row label="Staff Benefits & HMO"     amount={benefits}     level={2}/>
              <Row label="Total Personnel"          amount={totalPersonnel} level={1} bold/>
              <Row label="Ministry & Operations" level={1} bold/>
              <Row label="Building & Maintenance"   amount={building}     level={2}/>
              <Row label="Utilities"                amount={utilities}    level={2}/>
              <Row label="Media & Technology"       amount={media}        level={2}/>
              <Row label="Printing & Stationery"    amount={printing}     level={2}/>
              <Row label="Mission & Outreach"       amount={missions}     level={2}/>
              <Row label="Youth & Programs"         amount={youth}        level={2}/>
              <Row label="Travel & Transport"       amount={travel}       level={2}/>
              <Row label="Professional Fees"        amount={profFees}     level={2}/>
              <Row label="Benevolence & Welfare"    amount={benevolence}  level={2}/>
              <Row label="Total Ministry & Ops"     amount={totalMinOps}  level={1} bold/>
              <Row label="EBITDA"                   amount={EBITDA}       total bold/>
              <Row label="Finance & Non-cash" level={1} bold/>
              <Row label="Bank Charges"             amount={bankCharges}  level={2}/>
              <Row label="Interest Expense"         amount={interest}     level={2}/>
              <Row label="Depreciation"             amount={depreciation} level={2}/>
              <Row label="Total Finance & Non-cash" amount={totalOther}   level={1} bold/>
              <Row label="TOTAL EXPENDITURE"        amount={totalExpenses} total bold/>
              <div className="h-3"/>
              <div className="p-4 mx-2 mb-2 rounded-xl" style={{ background: netSurplus>=0?'rgba(16,185,129,0.1)':'rgba(248,113,113,0.1)', border:`1px solid ${netSurplus>=0?'rgba(16,185,129,0.3)':'rgba(248,113,113,0.3)'}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black fs-text1">NET SURPLUS / (DEFICIT)</span>
                  <span className={`text-xl font-black font-mono ${netSurplus>=0?'text-emerald-400':'text-red-400'}`}>{netSurplus>=0?ngn(netSurplus):`(${ngn(abs(netSurplus))})`}</span>
                </div>
                <div className="flex gap-6 mt-2">
                  <div><p className="text-[9px] fs-text3">Surplus Margin</p><p className="text-xs font-mono text-emerald-400">{pct(netSurplus,totalRevenue)}%</p></div>
                  <div><p className="text-[9px] fs-text3">EBITDA Margin</p><p className="text-xs font-mono text-blue-400">{pct(EBITDA,totalRevenue)}%</p></div>
                  <div><p className="text-[9px] fs-text3">Personnel Ratio</p><p className="text-xs font-mono text-violet-400">{pct(totalPersonnel,totalRevenue)}%</p></div>
                </div>
              </div>
            </SCard>
          </div>
        )}

        {/* ── BALANCE SHEET ── */}
        {stmt==='bs' && (
          <div className="max-w-2xl mx-auto p-5">
            <div className="text-center mb-6">
              <p className="text-[10px] fs-text3 uppercase tracking-widest">Statement of Financial Position</p>
              <h2 className="text-lg font-black fs-text1 mt-1" style={{ fontFamily:'Roboto Mono, monospace' }}>Balance Sheet</h2>
              <p className="text-[11px] fs-text3 mt-1">As at 31 December 2025</p>
            </div>
            <SCard>
              <Row label="ASSETS" bold/>
              <Row label="Current Assets" level={1} bold/>
              <Row label="Cash — GTBank"              amount={8420000}     level={2}/>
              <Row label="Cash — Zenith Bank"         amount={3150000}     level={2}/>
              <Row label="Petty Cash"                 amount={125000}      level={2}/>
              <Row label="T-Bills (90-day)"           amount={10000000}    level={2}/>
              <Row label="Accounts Receivable"        amount={2280000}     level={2}/>
              <Row label="Prepaid Expenses"           amount={640000}      level={2}/>
              <Row label="Inventory"                  amount={380000}      level={2}/>
              <Row label="Total Current Assets"       amount={currentAssets} level={1} bold/>
              <Row label="Non-Current Assets" level={1} bold/>
              <Row label="Land & Building (Gross)"    amount={85000000}    level={2}/>
              <Row label="Less: Acc. Depreciation"    amount={-4250000}    level={2}/>
              <Row label="Equipment & Furniture (Net)"amount={9800000-3920000} level={2}/>
              <Row label="Motor Vehicles (Net)"       amount={12500000-5000000} level={2}/>
              <Row label="FGN Bonds (Long-term)"      amount={25000000}    level={2}/>
              <Row label="Total Non-Current Assets"   amount={fixedAssetsNet+longTermInvest} level={1} bold/>
              <Row label="TOTAL ASSETS"               amount={totalAssets} total bold/>
              <div className="h-3"/>
              <Row label="LIABILITIES & FUND BALANCES" bold/>
              <Row label="Current Liabilities" level={1} bold/>
              <Row label="Accounts Payable"           amount={1840000}     level={2}/>
              <Row label="Accrued Expenses"           amount={920000}      level={2}/>
              <Row label="VAT Payable"                amount={214000}      level={2}/>
              <Row label="WHT Payable"                amount={87000}       level={2}/>
              <Row label="PAYE Payable"               amount={340000}      level={2}/>
              <Row label="Pension Payable"            amount={280000}      level={2}/>
              <Row label="Deferred Revenue"           amount={1200000}     level={2}/>
              <Row label="Total Current Liabilities"  amount={currentLiab} level={1} bold/>
              <Row label="Long-term Liabilities" level={1} bold/>
              <Row label="Building Renovation Loan"   amount={15000000}    level={2}/>
              <Row label="Total Long-term Liabilities" amount={ltLiab}     level={1} bold/>
              <Row label="TOTAL LIABILITIES"          amount={totalLiab}   total bold/>
              <div className="h-3"/>
              <Row label="FUND BALANCES / EQUITY" bold/>
              <Row label="Unrestricted — General Fund" amount={42000000}   level={1}/>
              <Row label="Restricted — Building Fund"  amount={8660000}    level={1}/>
              <Row label="Restricted — Missions Fund"  amount={1650000}    level={1}/>
              <Row label="Permanently Restricted — Endowment" amount={30000000} level={1}/>
              <Row label="Current Year Surplus"       amount={netSurplus}  level={1}/>
              <Row label="TOTAL FUND BALANCES"        amount={totalEquity} total bold/>
              <div className="h-3"/>
              <div className="p-4 mx-2 mb-2 rounded-xl" style={{ background:abs(totalAssets-totalLiabEquity)<10?'rgba(16,185,129,0.08)':'rgba(248,113,113,0.08)', border:`1px solid ${abs(totalAssets-totalLiabEquity)<10?'rgba(16,185,129,0.3)':'rgba(248,113,113,0.3)'}` }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black fs-text2">TOTAL LIABILITIES + FUND BALANCES</span>
                  <span className="text-xl font-black font-mono text-emerald-300">{ngn(totalLiabEquity)}</span>
                </div>
                <p className={`text-[10px] mt-1 font-mono ${abs(totalAssets-totalLiabEquity)<10?'text-emerald-400':'text-red-400'}`}>
                  {abs(totalAssets-totalLiabEquity)<10?'✓ Balance Sheet BALANCES':'⚠ Difference: '+ngn(abs(totalAssets-totalLiabEquity))}
                </p>
              </div>
            </SCard>
          </div>
        )}

        {/* ── CASH FLOW ── */}
        {stmt==='cf' && (
          <div className="max-w-2xl mx-auto p-5">
            <div className="text-center mb-6">
              <p className="text-[10px] fs-text3 uppercase tracking-widest">Statement of Cash Flows</p>
              <h2 className="text-lg font-black fs-text1 mt-1" style={{ fontFamily:'Roboto Mono, monospace' }}>Cash Flow Statement</h2>
              <p className="text-[11px] fs-text3 mt-1">For the Period: 1 January — 31 December 2025 · Indirect Method</p>
            </div>
            <SCard>
              <Row label="OPERATING ACTIVITIES" bold/>
              <Row label="Net Surplus for the Period"        amount={netSurplus}    level={1}/>
              <Row label="Adjustments for non-cash items:" level={1} bold/>
              <Row label="Add: Depreciation"                amount={depreciation}  level={2}/>
              <Row label="Add: Increase in Accounts Payable" amount={420000}       level={2}/>
              <Row label="Add: Increase in Accrued Expenses" amount={180000}       level={2}/>
              <Row label="Less: Increase in Receivables"    amount={-380000}       level={2}/>
              <Row label="Less: Increase in Prepaid Expenses" amount={-120000}     level={2}/>
              <Row label="Less: Increase in Inventory"      amount={-80000}        level={2}/>
              <Row label="Net Cash from Operating Activities" amount={netSurplus+depreciation+420000+180000-380000-120000-80000} total bold/>
              <div className="h-3"/>
              <Row label="INVESTING ACTIVITIES" bold/>
              <Row label="Purchase of Equipment"            amount={-1200000}      level={1}/>
              <Row label="Purchase of T-Bills"              amount={-5000000}      level={1}/>
              <Row label="Proceeds from Investments"        amount={1125000}       level={1}/>
              <Row label="Net Cash used in Investing"       amount={-1200000-5000000+1125000} total bold/>
              <div className="h-3"/>
              <Row label="FINANCING ACTIVITIES" bold/>
              <Row label="Loan Repayment (Principal)"       amount={-600000}       level={1}/>
              <Row label="Interest Paid"                    amount={-900000}       level={1}/>
              <Row label="Net Cash used in Financing"       amount={-1500000}      total bold/>
              <div className="h-3"/>
              <div className="p-4 mx-2 mb-2 rounded-xl" style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)' }}>
                <Row label="Opening Cash Balance (1 Jan 2025)"  amount={9200000}  level={0}/>
                <Row label="NET INCREASE IN CASH"               amount={netSurplus+depreciation+420000+180000-380000-120000-80000-1200000-5000000+1125000-1500000} level={0} bold/>
                <Row label="CLOSING CASH BALANCE (31 Dec 2025)" amount={11695000} level={0} total bold/>
              </div>
            </SCard>
          </div>
        )}
      </div>
    </div>
  );
});
StatementsModule.displayName = 'StatementsModule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 4: TREASURY
// ═══════════════════════════════════════════════════════════════════════════

const TreasuryModule = memo(() => {
  const THIN = useTHIN();

  const cashAccounts = [
    { bank:'GTBank', acct:'012-345-6789', balance:8420000, type:'Current', currency:'NGN', interest:0, lastReconciled:'2025-05-28', color:'#10b981' },
    { bank:'Zenith Bank', acct:'112-233-4455', balance:3150000, type:'Current', currency:'NGN', interest:0, lastReconciled:'2025-05-28', color:'#3b82f6' },
    { bank:'Petty Cash', acct:'Safe-001', balance:125000, type:'Petty Cash', currency:'NGN', interest:0, lastReconciled:'2025-05-30', color:'#64748b' },
  ];
  const investments = [
    { name:'FGN Savings Bond', issuer:'DMO / Federal Govt', maturity:'2027-06-15', face_value:25000000, coupon:12.5, current_value:25000000, ytd_income:1562500, status:'Active', color:'#10b981' },
    { name:'91-Day Treasury Bills', issuer:'CBN (via Zenith)', maturity:'2025-08-10', face_value:10000000, coupon:18.2, current_value:10000000, ytd_income:455000, status:'Active', color:'#60a5fa' },
  ];
  const funds = [
    { name:'General Fund', balance:42000000, restricted:false, purpose:'Unrestricted operations', manager:'Board of Trustees', ytd_in:5200000, ytd_out:3100000 },
    { name:'Building Fund', balance:8660000, restricted:true, purpose:'New sanctuary construction', manager:'Building Committee', ytd_in:2400000, ytd_out:0 },
    { name:'Missions Fund', balance:1650000, restricted:true, purpose:'Kenya & West Africa missions', manager:'Mission Director', ytd_in:600000, ytd_out:600000 },
    { name:'Endowment Fund', balance:30000000, restricted:true, purpose:'Permanent corpus — income only', manager:'Finance Board', ytd_in:0, ytd_out:0 },
  ];
  const totalCash   = cashAccounts.reduce((s,a)=>s+a.balance,0);
  const totalInvest = investments.reduce((s,i)=>s+i.current_value,0);
  const totalIncome = investments.reduce((s,i)=>s+i.ytd_income,0);
  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full fs-slide" style={THIN}>
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{l:'Total Cash',v:totalCash,c:'#10b981',i:'account_balance_wallet'},{l:'Investments',v:totalInvest,c:'#10b981',i:'show_chart'},{l:'Investment Income YTD',v:totalIncome,c:'#60a5fa',i:'trending_up'},{l:'Total Liquid Assets',v:totalCash+totalInvest,c:'#a78bfa',i:'savings'}].map(k => (
          <SCard key={k.l} className="p-4" gold={k.l==='Total Cash'}>
            <div className="flex items-center justify-between mb-2"><span className="text-[9px] fs-text3 uppercase font-bold tracking-widest">{k.l}</span><Icon name={k.i} size={14} style={{color:k.c}}/></div>
            <p className="text-xl font-black font-mono" style={{color:k.c}}>{compact(k.v)}</p>
          </SCard>
        ))}
      </div>

      {/* Cash accounts */}
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div><p className="text-xs font-bold fs-text2">Bank Account Positions</p><p className="text-[10px] fs-text3">Live balances as at {fmtD(new Date().toISOString())}</p></div>
          <button className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"><Icon name="sync" size={11}/>Reconcile All</button>
        </div>
        <div className="divide-y divide-slate-900/40">
          {cashAccounts.map(a => (
            <div key={a.bank} className="p-4 flex items-center gap-4 fs-hover transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${a.color}20`, border:`1px solid ${a.color}40` }}>
                <Icon name="account_balance" size={18} style={{ color:a.color }}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold fs-text1">{a.bank}</p>
                <p className="text-[10px] font-mono fs-text3">{a.acct} · {a.type}</p>
              </div>
              <div className="text-center hidden md:block"><p className="text-[9px] fs-text3">Last Reconciled</p><p className="text-[10px] font-mono fs-text2">{fmtShort(a.lastReconciled)}</p></div>
              <div className="text-right"><p className="text-lg font-black font-mono" style={{color:a.color}}>{ngn(a.balance)}</p><p className="text-[9px] fs-text3">{a.currency}</p></div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-800 flex justify-between" style={{background:'rgba(16,185,129,0.04)'}}>
          <span className="text-xs font-bold fs-text2">TOTAL CASH POSITION</span>
          <span className="text-sm font-black font-mono text-emerald-300">{ngn(totalCash)}</span>
        </div>
      </SCard>

      {/* Investment portfolio */}
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800"><p className="text-xs font-bold fs-text2">Investment Portfolio</p></div>
        <div className="overflow-x-auto" style={THIN}>
          <table className="w-full min-w-[700px] border-collapse">
            <thead><tr className="fs-thead">{['INSTRUMENT','ISSUER','MATURITY','FACE VALUE','COUPON RATE','YTD INCOME','STATUS'].map(h => <th key={h} className="px-4 py-2.5 text-left"><span className="text-[9px] fs-text3 font-bold uppercase tracking-widest">{h}</span></th>)}</tr></thead>
            <tbody>
              {investments.map((inv,i) => (
                <tr key={inv.name} className={`border-b border-opacity-20 ${i%2===0?'fs-tr-even':'fs-tr-odd'}`}>
                  <td className="px-4 py-3"><span className="text-xs font-bold fs-text1">{inv.name}</span></td>
                  <td className="px-4 py-3"><span className="text-[11px] fs-text3">{inv.issuer}</span></td>
                  <td className="px-4 py-3"><span className="text-[11px] font-mono fs-text2">{fmtShort(inv.maturity)}</span></td>
                  <td className="px-4 py-3"><span className="text-sm font-mono font-bold fs-text2">{ngn(inv.face_value)}</span></td>
                  <td className="px-4 py-3"><span className="text-xs font-mono text-emerald-400">{inv.coupon}%</span></td>
                  <td className="px-4 py-3"><span className="text-xs font-mono font-bold" style={{color:inv.color}}>{ngn(inv.ytd_income)}</span></td>
                  <td className="px-4 py-3"><Pill label={inv.status} color="#10b981" bg="rgba(16,185,129,0.12)"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>

      {/* Fund balances */}
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800"><p className="text-xs font-bold fs-text2">Designated Fund Balances</p></div>
        <div className="divide-y divide-slate-900/40">
          {funds.map(f => (
            <div key={f.name} className="p-4 flex items-center gap-4 fs-hover transition-colors">
              <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ background:f.restricted?'rgba(16,185,129,0.6)':'rgba(16,185,129,0.6)' }}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="text-sm font-bold fs-text1">{f.name}</p><Pill label={f.restricted?'RESTRICTED':'UNRESTRICTED'} color={f.restricted?'#10b981':'#10b981'} bg={f.restricted?'rgba(16,185,129,0.1)':'rgba(16,185,129,0.1)'}/></div>
                <p className="text-[10px] fs-text3 mt-0.5">{f.purpose} · Manager: {f.manager}</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-[10px] font-mono text-emerald-400">+{ngn(f.ytd_in)} in</span>
                  <span className="text-[10px] font-mono text-red-400">-{ngn(f.ytd_out)} out</span>
                </div>
              </div>
              <p className="text-xl font-black font-mono text-emerald-300 flex-shrink-0">{compact(f.balance)}</p>
            </div>
          ))}
        </div>
      </SCard>
    </div>
  );
});
TreasuryModule.displayName = 'TreasuryModule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 5: PAYABLES
// ═══════════════════════════════════════════════════════════════════════════

const PayablesModule = memo(() => { 
    const THIN = useTHIN();
  const [view, setView]     = useState<'bills'|'vendors'|'aging'>('bills');
  const [statusF, setStatusF] = useState('all');
  const bills   = statusF==='all' ? BILLS : BILLS.filter(b=>b.status===statusF);
  const now     = new Date();
  const agingBuckets = {
    current: BILLS.filter(b=>b.status!=='paid'&&new Date(b.due_date)>=now).reduce((s,b)=>s+b.amount,0),
    b31:  BILLS.filter(b=>b.status==='overdue'&&Math.floor((now.getTime()-new Date(b.due_date).getTime())/86400000)<=30).reduce((s,b)=>s+b.amount,0),
    b61:  BILLS.filter(b=>b.status==='overdue'&&Math.floor((now.getTime()-new Date(b.due_date).getTime())/86400000)>30&&Math.floor((now.getTime()-new Date(b.due_date).getTime())/86400000)<=60).reduce((s,b)=>s+b.amount,0),
    b90:  BILLS.filter(b=>b.status==='overdue'&&Math.floor((now.getTime()-new Date(b.due_date).getTime())/86400000)>60).reduce((s,b)=>s+b.amount,0),
  };
  const totalOwed = BILLS.filter(b=>b.status!=='paid'&&b.status!=='draft').reduce((s,b)=>s+b.amount,0);
  return (
    <div className="flex flex-col h-full overflow-hidden fs-slide">
      <div className="fs-toolbar px-5 py-3 flex-shrink-0 flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border fs-divider">
          {([['bills','Bills'],['vendors','Vendors'],['aging','Aging']] as [typeof view, string][]).map(([k,l]) => (
            <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 text-[11px] font-bold transition-all ${view===k?'text-black':'fs-text3 hover:fs-text2'}`} style={view===k?{background:G}:{}}>{l}</button>
          ))}
        </div>
        {view==='bills' && (
          <select value={statusF} onChange={e=>setStatusF(e.target.value)} className="fs-input px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none">
            <option value="all">All Status</option>
            {['draft','pending','approved','paid','overdue','disputed'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
        )}
        <span className="ml-auto text-[10px] fs-text3">Total Payable: <span className="text-emerald-400 font-mono font-bold">{ngn(totalOwed)}</span></span>
      </div>
      <div className="flex-1 overflow-y-auto" style={THIN}>
        {view==='bills' && (
          <div className="overflow-x-auto" style={THIN}>
            <table className="w-full min-w-[800px] border-collapse">
              <thead className="sticky top-0 z-10 fs-thead"><tr>{['REF','VENDOR','DESCRIPTION','AMOUNT','DUE DATE','VAT','WHT','STATUS',''].map(h=><th key={h} className="px-4 py-2.5 text-left"><span className="text-[9px] fs-text3 font-bold uppercase tracking-widest">{h}</span></th>)}</tr></thead>
              <tbody>
                {bills.map((b,i) => {
                  const days = Math.floor((now.getTime()-new Date(b.due_date).getTime())/86400000);
                  return (
                    <tr key={b.id} className={`border-b border-opacity-20 ${i%2===0?'fs-tr-even':'fs-tr-odd'}`}>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-mono text-emerald-400">{b.reference}</span></td>
                      <td className="px-4 py-2.5"><span className="text-xs fs-text2 truncate max-w-[120px] block">{b.vendor_name}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[11px] fs-text2 truncate max-w-[180px] block">{b.description}</span></td>
                      <td className="px-4 py-2.5"><span className="text-sm font-mono font-bold fs-text1">{ngn(b.amount)}</span></td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] font-mono ${b.status==='overdue'?'text-red-400':'fs-text3'}`}>{fmtShort(b.due_date)}{b.status==='overdue'?<span className="text-red-500 ml-1">(+{days}d)</span>:null}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-mono fs-text3">{b.vat>0?ngn(b.vat):'—'}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-mono fs-text3">{b.wht>0?ngn(b.wht):'—'}</span></td>
                      <td className="px-4 py-2.5"><BillStatusPill status={b.status}/></td>
                      <td className="px-4 py-2.5"><button className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono">VIEW</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {view==='vendors' && (
          <div className="overflow-x-auto" style={THIN}>
            <table className="w-full min-w-[700px] border-collapse">
              <thead className="sticky top-0 z-10 fs-thead"><tr>{['VENDOR','EMAIL','CATEGORY','TERMS','BALANCE OWED','YTD PAID','STATUS'].map(h=><th key={h} className="px-4 py-2.5 text-left"><span className="text-[9px] fs-text3 font-bold uppercase tracking-widest">{h}</span></th>)}</tr></thead>
              <tbody>{VENDORS.map((v,i) => (
                <tr key={v.id} className={`border-b border-opacity-20 ${i%2===0?'fs-tr-even':'fs-tr-odd'}`}>
                  <td className="px-4 py-3"><p className="text-xs font-bold fs-text1">{v.name}</p><p className="text-[10px] font-mono fs-text3">{v.tax_id}</p></td>
                  <td className="px-4 py-3"><span className="text-[10px] fs-text3">{v.email}</span></td>
                  <td className="px-4 py-3"><span className="text-[10px] fs-text3">{v.category}</span></td>
                  <td className="px-4 py-3"><span className="text-[10px] font-mono fs-text2">Net {v.terms}d</span></td>
                  <td className="px-4 py-3"><span className={`text-xs font-mono font-bold ${v.balance_owed>0?'text-red-400':'fs-text3'}`}>{v.balance_owed>0?ngn(v.balance_owed):'Nil'}</span></td>
                  <td className="px-4 py-3"><span className="text-xs font-mono text-emerald-400">{ngn(v.ytd_paid)}</span></td>
                  <td className="px-4 py-3"><Pill label={v.status.toUpperCase()} color={v.status==='active'?'#10b981':'#64748b'} bg={v.status==='active'?'rgba(16,185,129,0.12)':'rgba(100,116,139,0.12)'}/></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {view==='aging' && (
          <div className="p-5 space-y-4">
            <SCard>
              <div className="px-5 py-3 border-b border-slate-800"><p className="text-xs font-bold fs-text2">Accounts Payable Aging Analysis</p></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-slate-800">
                {[
                  { label:'Current (not yet due)', amount:agingBuckets.current, color:'#10b981' },
                  { label:'1–30 Days Overdue', amount:agingBuckets.b31, color:'#10b981' },
                  { label:'31–60 Days Overdue', amount:agingBuckets.b61, color:'#fb923c' },
                  { label:'60+ Days Overdue', amount:agingBuckets.b90, color:'#f87171' },
                ].map(b => (
                  <div key={b.label} className="p-5 text-center">
                    <p className="text-[9px] fs-text3 uppercase tracking-widest mb-2">{b.label}</p>
                    <p className="text-2xl font-black font-mono" style={{color:b.color}}>{compact(b.amount)}</p>
                    <p className="text-[10px] fs-text3 mt-1">{pct(b.amount,totalOwed||1)}% of total</p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-slate-800 flex justify-between" style={{background:'rgba(16,185,129,0.04)'}}>
                <span className="text-xs font-bold fs-text2">TOTAL OUTSTANDING</span>
                <span className="text-sm font-black font-mono text-emerald-300">{ngn(totalOwed)}</span>
              </div>
            </SCard>
          </div>
        )}
      </div>
    </div>
  );
});
PayablesModule.displayName = 'PayablesModule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 6: FIXED ASSETS
// ═══════════════════════════════════════════════════════════════════════════

const AssetsModule = memo(() => {
    const THIN = useTHIN();
  const totalCost  = FIXED_ASSETS.reduce((s,a)=>s+a.acquisition_cost,0);
  const totalAccDep= FIXED_ASSETS.reduce((s,a)=>s+a.accumulated_depreciation,0);
  const totalNBV   = totalCost - totalAccDep;
  const annualDep  = FIXED_ASSETS.reduce((a,fa) => {
    const depAmt = fa.depreciation_method==='straight_line' ? (fa.acquisition_cost-fa.salvage_value)/fa.useful_life : (fa.acquisition_cost-fa.accumulated_depreciation)*0.25;
    return a + depAmt;
  }, 0);
  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full fs-slide" style={THIN}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{l:'Gross Asset Cost',v:totalCost,c:'#10b981',i:'domain'},{l:'Accumulated Depreciation',v:totalAccDep,c:'#f87171',i:'trending_down'},{l:'Net Book Value',v:totalNBV,c:'#10b981',i:'savings'},{l:'Annual Dep. Charge',v:annualDep,c:'#a78bfa',i:'calendar_today'}].map(k => (
          <SCard key={k.l} className="p-4" gold={k.l==='Net Book Value'}>
            <div className="flex items-center justify-between mb-2"><span className="text-[9px] fs-text3 uppercase font-bold tracking-widest leading-tight">{k.l}</span><Icon name={k.i} size={14} style={{color:k.c}}/></div>
            <p className="text-xl font-black font-mono" style={{color:k.c}}>{compact(k.v)}</p>
          </SCard>
        ))}
      </div>
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800"><p className="text-xs font-bold fs-text2">Fixed Asset Register</p></div>
        <div className="overflow-x-auto" style={THIN}>
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="sticky top-0 z-10 fs-thead"><tr>{['CODE','ASSET','CATEGORY','ACQUIRED','COST','ACC. DEP.','NBV','METHOD','LIFE','STATUS'].map(h=><th key={h} className="px-3 py-2.5 text-left"><span className="text-[9px] fs-text3 font-bold uppercase tracking-widest">{h}</span></th>)}</tr></thead>
            <tbody>
              {FIXED_ASSETS.map((fa,i) => {
                const nbv = fa.acquisition_cost - fa.accumulated_depreciation;
                const depPct = Math.round((fa.accumulated_depreciation/fa.acquisition_cost)*100);
                return (
                  <tr key={fa.id} className={`border-b border-opacity-20 ${i%2===0?'fs-tr-even':'fs-tr-odd'}`}>
                    <td className="px-3 py-2.5"><span className="text-[10px] font-mono text-emerald-400">{fa.code}</span></td>
                    <td className="px-3 py-2.5"><p className="text-xs font-bold fs-text1">{fa.name}</p><p className="text-[9px] fs-text3">{fa.location}</p></td>
                    <td className="px-3 py-2.5"><span className="text-[10px] fs-text3">{fa.category}</span></td>
                    <td className="px-3 py-2.5"><span className="text-[10px] font-mono fs-text3">{fmtShort(fa.acquisition_date)}</span></td>
                    <td className="px-3 py-2.5"><span className="text-xs font-mono fs-text2">{ngn(fa.acquisition_cost)}</span></td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono text-red-400">{ngn(fa.accumulated_depreciation)}</span>
                      <div className="mt-1 w-16"><SBar v={depPct} color="#f87171" h={2}/></div>
                      <p className="text-[8px] fs-text3">{depPct}% dep'd</p>
                    </td>
                    <td className="px-3 py-2.5"><span className={`text-xs font-mono font-bold ${nbv/fa.acquisition_cost<0.2?'text-red-400':nbv/fa.acquisition_cost<0.5?'text-emerald-400':'text-emerald-400'}`}>{ngn(nbv)}</span></td>
                    <td className="px-3 py-2.5"><span className="text-[9px] fs-text3">{fa.depreciation_method==='straight_line'?'SL':'RB'}</span></td>
                    <td className="px-3 py-2.5"><span className="text-[10px] font-mono fs-text3">{fa.useful_life}yr</span></td>
                    <td className="px-3 py-2.5"><Pill label={fa.status.toUpperCase()} color={fa.status==='active'?'#10b981':'#64748b'} bg={fa.status==='active'?'rgba(16,185,129,0.12)':'rgba(100,116,139,0.12)'}/></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr className="border-t-2 border-emerald-900/40" style={{background:'rgba(16,185,129,0.05)'}}>
              <td colSpan={4} className="px-3 py-3"><span className="text-xs font-black fs-text2">TOTALS</span></td>
              <td className="px-3 py-3"><span className="text-xs font-mono font-black fs-text1">{ngn(totalCost)}</span></td>
              <td className="px-3 py-3"><span className="text-xs font-mono font-black text-red-300">{ngn(totalAccDep)}</span></td>
              <td className="px-3 py-3"><span className="text-xs font-mono font-black text-emerald-300">{ngn(totalNBV)}</span></td>
              <td colSpan={3}/>
            </tr></tfoot>
          </table>
        </div>
      </SCard>
    </div>
  );
});
AssetsModule.displayName = 'AssetsModule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 7: PAYROLL
// ═══════════════════════════════════════════════════════════════════════════

const PayrollModule = memo(() => {
  const totalGross   = STAFF_MEMBERS.reduce((s,e)=>s+e.gross_salary,0);
  const totalPAYE    = STAFF_MEMBERS.reduce((s,e)=>s+e.paye,0);
  const totalPensEmp = STAFF_MEMBERS.reduce((s,e)=>s+e.pension_employee,0);
  const totalPensEr  = STAFF_MEMBERS.reduce((s,e)=>s+e.pension_employer,0);
  const totalNet     = STAFF_MEMBERS.reduce((s,e)=>s+e.net_pay,0);
  const headcount    = STAFF_MEMBERS.filter(e=>e.status==='active').length;
  const THIN = useTHIN();
  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full fs-slide" style={THIN}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[{l:'Headcount',v:headcount,c:'#60a5fa',fmt:'n',i:'groups'},{l:'Gross Payroll',v:totalGross,c:'#10b981',fmt:'m',i:'payments'},{l:'PAYE Deductions',v:totalPAYE,c:'#f87171',fmt:'m',i:'receipt'},{l:'Pension Total (Ee+Er)',v:totalPensEmp+totalPensEr,c:'#a78bfa',fmt:'m',i:'savings'},{l:'Net Pay (Take Home)',v:totalNet,c:'#10b981',fmt:'m',i:'account_balance_wallet'}].map(k => (
          <SCard key={k.l} className="p-4" gold={k.l==='Net Pay (Take Home)'}>
            <div className="flex items-center justify-between mb-1"><span className="text-[9px] fs-text3 uppercase font-bold tracking-widest leading-tight">{k.l}</span><Icon name={k.i} size={12} style={{color:k.c}}/></div>
            <p className="text-xl font-black font-mono" style={{color:k.c}}>{k.fmt==='n'?headcount:compact(k.v)}</p>
          </SCard>
        ))}
      </div>
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div><p className="text-xs font-bold fs-text2">Payroll Register — May 2025</p><p className="text-[10px] fs-text3">Status: Processed · Payment Date: 28 May 2025</p></div>
          <div className="flex gap-2">
            <button className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-900/40"><Icon name="download" size={11}/>Payslips</button>
            <button className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-900/40"><Icon name="send" size={11}/>Remit PAYE</button>
          </div>
        </div>
        <div className="overflow-x-auto" style={THIN}>
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="sticky top-0 z-10 fs-thead"><tr>{['EMP ID','NAME','DEPT / ROLE','GROSS','PAYE','PENS. (Ee)','NHF','NSITF','NET PAY','BANK'].map(h=><th key={h} className="px-3 py-2.5 text-left"><span className="text-[9px] fs-text3 font-bold uppercase tracking-widest">{h}</span></th>)}</tr></thead>
            <tbody>
              {STAFF_MEMBERS.map((e,i) => (
                <tr key={e.id} className={`border-b border-opacity-20 ${i%2===0?'fs-tr-even':'fs-tr-odd'}`}>
                  <td className="px-3 py-2.5"><span className="text-[10px] font-mono text-emerald-400">{e.id}</span></td>
                  <td className="px-3 py-2.5"><p className="text-xs font-bold fs-text1">{e.name}</p></td>
                  <td className="px-3 py-2.5"><p className="text-[10px] fs-text3">{e.department}</p><p className="text-[9px] fs-text3">{e.role}</p></td>
                  <td className="px-3 py-2.5"><span className="text-xs font-mono fs-text2">{ngn(e.gross_salary)}</span></td>
                  <td className="px-3 py-2.5"><span className="text-xs font-mono text-red-400">{ngn(e.paye)}</span></td>
                  <td className="px-3 py-2.5"><span className="text-xs font-mono text-violet-400">{ngn(e.pension_employee)}</span></td>
                  <td className="px-3 py-2.5"><span className="text-[10px] font-mono fs-text3">{ngn(e.nhf)}</span></td>
                  <td className="px-3 py-2.5"><span className="text-[10px] font-mono fs-text3">{ngn(e.nsitf)}</span></td>
                  <td className="px-3 py-2.5"><span className="text-sm font-mono font-black text-emerald-400">{ngn(e.net_pay)}</span></td>
                  <td className="px-3 py-2.5"><span className="text-[10px] fs-text3">{e.bank}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-emerald-900/40" style={{background:'rgba(16,185,129,0.05)'}}>
              <td colSpan={3} className="px-3 py-3"><span className="text-xs font-black fs-text2">TOTALS ({headcount} staff)</span></td>
              <td className="px-3 py-3"><span className="text-xs font-mono font-black fs-text1">{ngn(totalGross)}</span></td>
              <td className="px-3 py-3"><span className="text-xs font-mono font-black text-red-300">{ngn(totalPAYE)}</span></td>
              <td className="px-3 py-3"><span className="text-xs font-mono font-black text-violet-300">{ngn(totalPensEmp)}</span></td>
              <td colSpan={2}/>
              <td className="px-3 py-3"><span className="text-xs font-mono font-black text-emerald-300">{ngn(totalNet)}</span></td>
              <td/>
            </tr></tfoot>
          </table>
        </div>
      </SCard>
    </div>
  );
});
PayrollModule.displayName = 'PayrollModule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 8: TAX
// ═══════════════════════════════════════════════════════════════════════════

const TaxModule = memo(() => {
  const outputVAT = VAT_ENTRIES.filter(v=>v.type==='output').reduce((s,v)=>s+v.vat_amount,0);
  const inputVAT  = VAT_ENTRIES.filter(v=>v.type==='input').reduce((s,v)=>s+v.vat_amount,0);
  const netVAT    = outputVAT - inputVAT;
  const paye      = STAFF_MEMBERS.reduce((s,e)=>s+e.paye,0);
  const pension   = STAFF_MEMBERS.reduce((s,e)=>s+e.pension_employee+e.pension_employer,0);
  const whtTotal  = BILLS.reduce((s,b)=>s+b.wht,0);
  const THIN = useTHIN();
  const calendar = [
    { obligation:'Monthly PAYE Remittance', due:'2025-06-10', amount:paye, status:'pending', authority:'FIRS', penalty:'10% + interest' },
    { obligation:'Pension Contribution (Ee+Er)', due:'2025-06-15', amount:pension, status:'pending', authority:'PenCom/PFA', penalty:'2% per month' },
    { obligation:'VAT Return — May 2025', due:'2025-06-21', amount:netVAT, status:'pending', authority:'FIRS', penalty:'₦50,000 + 5% pa' },
    { obligation:'WHT Remittance — May 2025', due:'2025-06-21', amount:whtTotal, status:'pending', authority:'FIRS', penalty:'10% + interest' },
    { obligation:'Annual Tax Return FY2024', due:'2025-06-30', amount:0, status:'filed', authority:'FIRS', penalty:'₦25,000 per annum' },
    { obligation:'NSITF Contribution', due:'2025-06-10', amount:STAFF_MEMBERS.reduce((s,e)=>s+e.nsitf,0), status:'pending', authority:'NSITF', penalty:'2% per month' },
  ];
  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full fs-slide" style={THIN}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{l:'Output VAT',v:outputVAT,c:'#fb923c'},{l:'Input VAT (Recoverable)',v:inputVAT,c:'#60a5fa'},{l:'Net VAT Payable',v:netVAT,c:'#f87171'},{l:'WHT Collected',v:whtTotal,c:'#a78bfa'}].map(k=>(
          <SCard key={k.l} className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-[9px] fs-text3 uppercase font-bold tracking-widest">{k.l}</span></div><p className="text-xl font-black font-mono" style={{color:k.c}}>{ngn(k.v)}</p></SCard>
        ))}
      </div>
      {/* VAT ledger */}
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800"><p className="text-xs font-bold fs-text2">VAT Ledger</p></div>
        <div className="overflow-x-auto" style={THIN}>
          <table className="w-full min-w-[700px] border-collapse">
            <thead className="fs-thead sticky top-0 z-10"><tr>{['DATE','REFERENCE','DESCRIPTION','TYPE','TAXABLE AMOUNT','VAT AMOUNT','VENDOR/CUSTOMER','STATUS'].map(h=><th key={h} className="px-4 py-2.5 text-left"><span className="text-[9px] fs-text3 font-bold uppercase tracking-widest">{h}</span></th>)}</tr></thead>
            <tbody>{VAT_ENTRIES.map((v,i) => (
              <tr key={v.id} className={`border-b border-opacity-20 ${i%2===0?'fs-tr-even':'fs-tr-odd'}`}>
                <td className="px-4 py-2.5"><span className="text-[10px] font-mono fs-text3">{fmtShort(v.date)}</span></td>
                <td className="px-4 py-2.5"><span className="text-[10px] font-mono text-emerald-400">{v.reference}</span></td>
                <td className="px-4 py-2.5"><span className="text-[11px] fs-text2 truncate max-w-[160px] block">{v.description}</span></td>
                <td className="px-4 py-2.5"><Pill label={v.type.toUpperCase()} color={v.type==='output'?'#fb923c':'#60a5fa'} bg={v.type==='output'?'rgba(251,146,60,0.12)':'rgba(96,165,250,0.12)'}/></td>
                <td className="px-4 py-2.5"><span className="text-xs font-mono fs-text2">{ngn(v.taxable_amount)}</span></td>
                <td className="px-4 py-2.5"><span className="text-xs font-mono font-bold" style={{color:v.type==='output'?'#fb923c':'#60a5fa'}}>{ngn(v.vat_amount)}</span></td>
                <td className="px-4 py-2.5"><span className="text-[10px] fs-text3 truncate max-w-[140px] block">{v.vendor_customer}</span></td>
                <td className="px-4 py-2.5"><Pill label={v.status.toUpperCase()} color={v.status==='filed'?'#10b981':'#10b981'} bg={v.status==='filed'?'rgba(16,185,129,0.12)':'rgba(16,185,129,0.12)'}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </SCard>
      {/* Tax calendar */}
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800"><p className="text-xs font-bold fs-text2">Compliance Calendar — June 2025</p></div>
        <div className="divide-y divide-slate-900/40">
          {calendar.map((c,i) => {
            const daysLeft = Math.floor((new Date(c.due).getTime()-Date.now())/86400000);
            const urgent   = daysLeft<=7 && c.status!=='filed';
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-3 fs-hover transition-colors">
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${urgent?'bg-red-900/40 border border-red-700/40':'fs-inset'}`}>
                  <span className="text-[8px] font-bold fs-text3 uppercase">{new Date(c.due).toLocaleDateString('en',{month:'short'})}</span>
                  <span className={`text-lg font-black ${urgent?'text-red-400':'fs-text2'}`} style={{fontFamily:'Roboto Mono, monospace'}}>{new Date(c.due).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold fs-text1">{c.obligation}</p>
                  <p className="text-[10px] fs-text3 mt-0.5">Authority: {c.authority} · Penalty: {c.penalty}</p>
                </div>
                {c.amount>0 && <p className="text-sm font-mono font-bold text-emerald-400 flex-shrink-0">{ngn(c.amount)}</p>}
                <div className="flex-shrink-0">
                  <Pill label={c.status==='filed'?'FILED':urgent?`${daysLeft}D LEFT`:'PENDING'} color={c.status==='filed'?'#10b981':urgent?'#f87171':'#10b981'} bg={c.status==='filed'?'rgba(16,185,129,0.12)':urgent?'rgba(248,113,113,0.12)':'rgba(16,185,129,0.12)'}/>
                </div>
              </div>
            );
          })}
        </div>
      </SCard>
    </div>
  );
});
TaxModule.displayName = 'TaxModule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 9: AUDIT & CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

const AuditModule = memo(() => {
  const criticals = AUDIT_LOG.filter(a=>a.severity==='critical').length;
  const warnings  = AUDIT_LOG.filter(a=>a.severity==='warning').length;
  const THIN = useTHIN();
  const controls = [
    { area:'Segregation of Duties', status:'pass', description:'Approver ≠ Preparer for all journal entries' },
    { area:'Dual Authorization', status:'pass', description:'Bills >₦500K require 2 signatories' },
    { area:'Bank Reconciliation', status:'pass', description:'All accounts reconciled within 5 business days' },
    { area:'Monthly Close Process', status:'warning', description:'June close not yet initiated (due 5 Jul)' },
    { area:'Fixed Asset Verification', status:'pass', description:'Physical count completed Feb 2025' },
    { area:'Password & Access Policy', status:'fail', description:'1 failed external login attempt detected' },
    { area:'Budget Variance Monitoring', status:'pass', description:'Media dept flagged at 109% — reviewed by board' },
    { area:'Petty Cash Limit', status:'pass', description:'Float maintained within ₦200K policy limit' },
  ];
  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full fs-slide" style={THIN}>
      <div className="grid grid-cols-3 gap-3">
        {[{l:'Critical Alerts',v:criticals,c:'#f87171'},{l:'Warnings',v:warnings,c:'#10b981'},{l:'Controls Passing',v:controls.filter(c=>c.status==='pass').length,c:'#10b981'}].map(k=>(
          <SCard key={k.l} className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-[9px] fs-text3 uppercase font-bold tracking-widest">{k.l}</span></div><p className="text-3xl font-black font-mono" style={{color:k.c}}>{k.v}</p></SCard>
        ))}
      </div>
      {/* Internal controls */}
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800"><p className="text-xs font-bold fs-text2">Internal Controls Checklist</p></div>
        <div className="divide-y divide-slate-900/40">
          {controls.map((c,i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 fs-hover transition-colors">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c.status==='pass'?'bg-emerald-900/40':c.status==='warning'?'bg-emerald-900/40':'bg-red-900/40'}`}>
                <Icon name={c.status==='pass'?'check':c.status==='warning'?'warning':'error'} size={13} style={{color:c.status==='pass'?'#10b981':c.status==='warning'?'#10b981':'#f87171'}}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold fs-text1">{c.area}</p>
                <p className="text-[10px] fs-text3">{c.description}</p>
              </div>
              <Pill label={c.status.toUpperCase()} color={c.status==='pass'?'#10b981':c.status==='warning'?'#10b981':'#f87171'} bg={c.status==='pass'?'rgba(16,185,129,0.1)':c.status==='warning'?'rgba(16,185,129,0.1)':'rgba(248,113,113,0.1)'}/>
            </div>
          ))}
        </div>
      </SCard>
      {/* Audit trail */}
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800"><p className="text-xs font-bold fs-text2">Audit Trail — Recent Actions</p></div>
        <div className="divide-y divide-slate-900/40">
          {AUDIT_LOG.map((log,i) => (
            <div key={log.id} className="flex items-start gap-3 px-5 py-3 fs-hover transition-colors">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${log.severity==='critical'?'bg-red-500':log.severity==='warning'?'bg-emerald-500':'bg-emerald-500'}`}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold fs-text1">{log.action}</span>
                  <span className="text-[10px] fs-text3">{log.module}</span>
                  {log.entity_id!=='N/A'&&<span className="text-[9px] font-mono text-emerald-400">{log.entity_id}</span>}
                </div>
                <p className="text-[10px] fs-text3 mt-0.5">By: <strong className="fs-text2">{log.user}</strong> · {new Date(log.timestamp).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} · IP: {log.ip}</p>
                {(log.before||log.after)&&<p className="text-[9px] font-mono fs-text3 mt-0.5">{log.before&&`Before: ${log.before}`}{log.before&&log.after&&' → '}{log.after&&`After: ${log.after}`}</p>}
              </div>
              <Pill label={log.severity.toUpperCase()} color={log.severity==='critical'?'#f87171':log.severity==='warning'?'#10b981':'#64748b'} bg={log.severity==='critical'?'rgba(248,113,113,0.1)':log.severity==='warning'?'rgba(16,185,129,0.1)':'rgba(100,116,139,0.1)'}/>
            </div>
          ))}
        </div>
      </SCard>
    </div>
  );
});
AuditModule.displayName = 'AuditModule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 10: BOARD PACK
// ═══════════════════════════════════════════════════════════════════════════

const BoardModule = memo(() => {
  const totalRevenue = 64700000; const totalExpenses = 58042000; const netSurplus = 6658000;
  const cashBal = 11695000; const totalAssets = 148225000;
  const THIN = useTHIN();
  const reports = [
    { title:'Q1 Financial Report', period:'Jan–Mar 2025', status:'approved', date:'2025-04-15', signatories:['Senior Pastor','Board Chair','Treasurer'] },
    { title:'Q2 Management Accounts', period:'Apr–Jun 2025', status:'draft', date:'', signatories:[] },
    { title:'FY2024 Audited Accounts', period:'Full Year 2024', status:'filed', date:'2025-03-30', signatories:['Senior Pastor','Board Chair','Ola & Co.'] },
    { title:'Annual Budget FY2026', period:'Jan–Dec 2026', status:'pending_approval', date:'', signatories:[] },
  ];
  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full fs-slide" style={THIN}>
      {/* Executive Banner */}
      <SCard className="p-6" gold>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <p className="text-[9px] fs-text3 uppercase tracking-widest">Board Financial Summary</p>
            <h2 className="text-xl font-black fs-text1 mt-1" style={{ fontFamily:'Roboto Mono, monospace' }}>FY2025 Interim Report</h2>
            <p className="text-[11px] fs-text3 mt-1">Prepared by: Finance Department · Reviewed: {fmtD(new Date().toISOString())}</p>
            <p className="text-xs fs-text2 mt-3 leading-relaxed max-w-xl">
              The ministry continues to demonstrate strong financial stewardship. Total income of {compact(totalRevenue)} against total expenditure of {compact(totalExpenses)} yields a healthy surplus of {compact(netSurplus)}, representing a {(netSurplus/totalRevenue*100).toFixed(1)}% surplus margin. Cash reserves remain robust at {compact(cashBal)}, providing {Math.round(cashBal/(totalExpenses/12))} months of operational coverage. All designated fund balances are intact and growing as per board resolutions.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            {[{l:'Total Income',v:compact(totalRevenue),c:'#10b981'},{l:'Total Expenses',v:compact(totalExpenses),c:'#fb923c'},{l:'Net Surplus',v:compact(netSurplus),c:'#10b981'},{l:'Total Assets',v:compact(totalAssets),c:'#60a5fa'}].map(k=>(
              <div key={k.l} className="p-3 rounded-lg text-center fs-inset" style={{minWidth:110}}>
                <p className="text-[9px] fs-text3 uppercase tracking-widest">{k.l}</p>
                <p className="text-lg font-black font-mono mt-1" style={{color:k.c}}>{k.v}</p>
              </div>
            ))}
          </div>
        </div>
      </SCard>
      {/* Reports library */}
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <p className="text-xs font-bold fs-text2">Board Reports Library</p>
          <button className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"><Icon name="add" size={11}/>New Report</button>
        </div>
        <div className="divide-y divide-slate-900/40">
          {reports.map((r,i) => {
            const statusMeta: Record<string,{c:string,b:string,l:string}> = {
              approved:{c:'#10b981',b:'rgba(16,185,129,0.12)',l:'APPROVED'},
              draft:{c:'#64748b',b:'rgba(100,116,139,0.12)',l:'DRAFT'},
              filed:{c:'#60a5fa',b:'rgba(96,165,250,0.12)',l:'FILED'},
              pending_approval:{c:'#10b981',b:'rgba(16,185,129,0.12)',l:'PENDING'},
            };
            const sm = statusMeta[r.status];
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-4 fs-hover transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.25)'}}>
                  <Icon name="summarize" size={18} style={{color:G}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold fs-text1">{r.title}</p>
                  <p className="text-[10px] fs-text3 mt-0.5">Period: {r.period}{r.date && ` · Approved: ${fmtD(r.date)}`}</p>
                  {r.signatories.length>0 && <p className="text-[9px] fs-text3 mt-0.5">Signatories: {r.signatories.join(' · ')}</p>}
                </div>
                <Pill label={sm.l} color={sm.c} bg={sm.b}/>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button className="p-1.5 rounded border fs-divider fs-text3 hover:border-emerald-700 hover:text-emerald-400 transition-colors"><Icon name="download" size={12}/></button>
                  <button className="p-1.5 rounded border fs-divider fs-text3 hover:border-emerald-700 hover:text-emerald-400 transition-colors"><Icon name="edit" size={12}/></button>
                </div>
              </div>
            );
          })}
        </div>
      </SCard>
      {/* Board resolution log */}
      <SCard>
        <div className="px-5 py-3 border-b border-slate-800"><p className="text-xs font-bold fs-text2">Financial Resolutions — 2025</p></div>
        <div className="divide-y divide-slate-900/40">
          {[
            { ref:'RES-2025-01', date:'2025-01-15', resolution:'Approval of FY2025 Operating Budget of ₦85,000,000', passed:true },
            { ref:'RES-2025-02', date:'2025-02-01', resolution:'Authorisation of T-Bill investment up to ₦15,000,000 from reserves', passed:true },
            { ref:'RES-2025-03', date:'2025-03-10', resolution:'Approval of building fund disbursement for architect drawings (₦1,200,000)', passed:true },
            { ref:'RES-2025-04', date:'2025-04-20', resolution:'Amendment to Media budget line — increase from ₦2M to ₦3.5M', passed:true },
            { ref:'RES-2025-05', date:'2025-06-01', resolution:'Proposed endowment corpus increase — ₦5M from surplus', passed:false },
          ].map(r => (
            <div key={r.ref} className="flex items-center gap-4 px-5 py-3 fs-hover transition-colors">
              <span className="text-[10px] font-mono text-emerald-400 flex-shrink-0 w-20">{r.ref}</span>
              <span className="text-[10px] font-mono fs-text3 flex-shrink-0 w-20">{fmtShort(r.date)}</span>
              <p className="text-xs fs-text2 flex-1">{r.resolution}</p>
              <Pill label={r.passed?'PASSED':'PROPOSED'} color={r.passed?'#10b981':'#10b981'} bg={r.passed?'rgba(16,185,129,0.12)':'rgba(16,185,129,0.12)'}/>
            </div>
          ))}
        </div>
      </SCard>
    </div>
  );
});
BoardModule.displayName = 'BoardModule';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — FINANCIAL SANCTUM
// ═══════════════════════════════════════════════════════════════════════════

const FinancialSanctum: React.FC = () => {
  injectFSCSS();
  const [tab,    setTab]    = useState<SanctumTab>('command');
  const [search, setSearch] = useState('');
  const [theme,  setTheme]  = useState<Theme>(() => {
    const saved = localStorage.getItem('admin-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo(0,0); }, [tab]);

  // Sync with admin top-nav theme toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  const isLight = theme === 'light';
  const THIN    = isLight ? THIN_LIGHT : THIN_DARK;

  const topBarBg   = isLight ? '#ffffff'   : '#0a0f1e';
  const topBarBdr  = isLight ? '#d1fae5'   : '#1a2540';
  const divBg      = isLight ? '#d1fae5'   : '#1e293b';
  const tabBarBdr  = isLight ? '#d1fae5'   : 'rgba(30,41,59,0.5)';
  const tabInact   = isLight ? '#6b7280'   : '#475569';
  const tabIconI   = isLight ? '#a7f3d0'   : '#334155';
  const pageScroll = isLight ? '#f0fdf4'   : '#020617';
  const searchIcon = isLight ? '#a7f3d0'   : '#475569';
  const subtleTxt  = isLight ? '#065f46'   : '#64748b';
  const titleTxt   = isLight ? '#064e3b'   : '#f1f5f9';

  const MODULE_MAP: Record<SanctumTab, React.ReactNode> = {
    command:    <CommandModule/>,
    ledger:     <LedgerModule/>,
    statements: <StatementsModule/>,
    treasury:   <TreasuryModule/>,
    payables:   <PayablesModule/>,
    assets:     <AssetsModule/>,
    payroll:    <PayrollModule/>,
    tax:        <TaxModule/>,
    audit:      <AuditModule/>,
    board:      <BoardModule/>,
  };

  return (
    <ThemeCtx.Provider value={theme}>
      <div className={`fs ${theme} flex flex-col h-full overflow-hidden`}>

        {/* ── TOP BAR ── */}
        <div className="fs-topbar flex-shrink-0">
          <div className="px-5 py-3 flex items-center gap-3">

            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                style={{ background:'linear-gradient(135deg,#064e3b,#10b981)', boxShadow:'0 0 18px rgba(16,185,129,0.4)' }}>
                <Icon name="book" size={17} style={{ color:'#fff' }}/>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-black leading-none tracking-tight" style={{ fontFamily:'Roboto Mono, monospace', color:titleTxt }}>The Sanctum</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5" style={{ color:subtleTxt }}>Accounting · Treasury · Compliance</p>
              </div>
            </div>

            <div className="hidden sm:block w-px h-8 flex-shrink-0" style={{ background:divBg }}/>

            {/* Search */}
            <div className="flex-1 max-w-xs relative">
              <Icon name="search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color:searchIcon }}/>
              <input type="text" placeholder="Search accounts, entries…" value={search} onChange={e=>setSearch(e.target.value)}
                className="fs-input w-full pl-8 pr-3 py-1.5 rounded-lg text-[11px] focus:outline-none"/>
            </div>

            {/* Status chips */}
            <div className="hidden lg:flex items-center gap-2 ml-auto">
              {[
                { label:'FY2025', icon:'calendar_today' },
                { label:'NGN', icon:'currency_exchange' },
                { label:'IFRS', icon:'verified' },
                { label:'Unaudited', icon:'pending' },
              ].map(s => (
                <div key={s.label} className="fs-stat-chip flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold" style={{ color:'#10b981' }}>
                  <Icon name={s.icon} size={10} style={{ color:'#10b981' }}/>
                  {s.label}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
                style={isLight
                  ? { border:'1px solid #a7f3d0', color:'#10b981', background:'transparent' }
                  : { border:'1px solid rgba(16,185,129,0.3)', color:'#10b981', background:'transparent' }}>
                <Icon name="print" size={11}/>Print
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors hover:opacity-90"
                style={{ background:'#10b981', color:'#fff' }}>
                <Icon name="add" size={11}/>New Entry
              </button>
            </div>
          </div>

          {/* ── TAB NAVIGATION ── */}
          <div className="flex overflow-x-auto px-4 fs-tab-bar" style={{ scrollbarWidth:'none' }}>
            {SANCTUM_TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`fs-tab-btn flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${tab===t.key?'active':''}`}
                style={tab===t.key ? { borderColor:G, color:G } : { borderColor:'transparent' }}>
                <Icon name={t.icon} size={12} style={{ color:tab===t.key?G:tabIconI }}/>
                {t.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── MODULE CONTENT ── */}
        <div ref={scrollRef} className="fs-page flex-1 min-h-0 overflow-hidden flex flex-col">
          {(['ledger','statements','payables'] as SanctumTab[]).includes(tab)
            ? <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{MODULE_MAP[tab]}</div>
            : <div className="flex-1 overflow-y-auto" style={THIN}>{MODULE_MAP[tab]}</div>
          }
        </div>

      </div>
    </ThemeCtx.Provider>
  );
};

export default FinancialSanctum;