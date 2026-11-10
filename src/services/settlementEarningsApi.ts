export type SettlementRole = "seller" | "delivery";
export type SettlementCadence = "twice_weekly" | "weekly" | "monthly";

export interface SettlementSchedule {
  id?: string;
  role?: SettlementRole;
  payee_id?: string;
  cadence: SettlementCadence;
  cadence_label?: string;
  next_settlement_date?: string;
  due_today?: boolean;
  is_active?: boolean;
  company?: { name: string; city: string; postal_code: string; website: string };
}

export interface EarningsDetailRecord {
  record_id: string;
  order_number?: string;
  booking_number?: string;
  batch_number?: string;
  completed_at?: string;
  payment_method?: string;
  payment_status?: string;
  order_count?: number;
  gross_amount: number;
  commission_percent: number;
  commission_amount: number;
  cod_deduction_amount: number;
  net_amount: number;
  settlement_status?: string;
  payout_status?: string;
}


export interface SettlementSettings {
  id?: string;
  seller_commission_percent: number;
  delivery_commission_percent: number;
  cod_cash_deduction_enabled: boolean;
  settlement_day: number;
  invoice_prefix: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface SellerSettlementSetting {
  id: string;
  name: string;
  email: string;
  status: string;
  order_active: boolean;
  commission_percent: number;
  commission_override?: number | null;
}

export interface SellerCommissionRule {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_email: string;
  commission_percent: number;
  notes?: string;
  is_active: boolean;
  order_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by_id?: string;
  updated_by_id?: string;
}

export interface SellerCommissionSeller {
  id: string;
  name: string;
  email: string;
  status: string;
  order_active: boolean;
  has_commission_rule: boolean;
  effective_commission_percent: number;
}

export interface SellerCommissionListResponse {
  success: boolean;
  rules: SellerCommissionRule[];
  sellers: SellerCommissionSeller[];
  default_commission_percent: number;
  csrf_token: string;
}

export interface SettlementRecord {
  id: string;
  settlement_number?: string;
  invoice_number?: string;
  role: SettlementRole;
  payee_id: string;
  payee_name: string;
  payee_email?: string;
  period: string;
  range_start?: string;
  range_end?: string;
  schedule_cadence?: SettlementCadence;
  schedule_label?: string;
  settlement_type?: "scheduled" | "manual" | "custom";
  payment_method?: string;
  payment_source?: string;
  payment_note?: string;
  payment_recorded_at?: string;
  payment_verified_identity_name?: string;
  payment_bank_holder_name?: string;
  payment_bank_account_number?: string;
  payment_bank_account_masked?: string;
  payment_bank_ifsc?: string;
  payment_bank_name?: string;
  payment_bank_branch?: string;
  payment_bank_verified_at?: string;
  email_status?: string;
  email_sent_at?: string;
  wallet_before_amount?: number;
  wallet_after_amount?: number;
  wallet_after_due_to_platform?: number;
  custom_clear_wallet?: boolean;
  gross_amount: number;
  commission_percent: number;
  commission_amount: number;
  cod_deduction_amount?: number;
  net_amount: number;
  amount_due_to_platform?: number;
  currency?: string;
  status: string;
  payment_reference?: string;
  included_record_ids?: string[];
  created_at?: string;
  updated_at?: string;
  paid_at?: string;
}

export interface CodCollectionRecord {
  id: string;
  batch_id: string;
  batch_number?: string;
  order_id: string;
  order_number?: string;
  delivery_person_id?: string;
  delivery_person_name?: string;
  customer_name?: string;
  amount: number;
  currency?: string;
  status: string;
  payment_status?: string;
  collection_method?: string;
  cash_collected_amount?: number;
  liability_amount?: number;
  online_payment_id?: string;
  online_paid_at?: string;
  qr_code_id?: string;
  qr_image_url?: string;
  qr_status?: string;
  qr_payment_id?: string;
  qr_amount_paid?: number;
  collected_at?: string;
  qr_paid_at?: string;
  remitted_at?: string;
  remittance_reference?: string;
  collection_note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentRecordRow extends EarningsDetailRecord {
  payment_record_status: "paid" | "processing" | "pending";
  settlement_id?: string;
  settlement_number?: string;
  invoice_number?: string;
  payment_reference?: string;
  paid_at?: string;
  cod_statuses?: string[];
}

export interface SelfPaymentRecordsSummary {
  role: SettlementRole;
  payee_id: string;
  payee_name: string;
  payee_email?: string;
  period: string;
  range_start: string;
  range_end: string;
  gross_amount: number;
  commission_amount: number;
  cod_deduction_amount: number;
  net_amount: number;
  paid_amount: number;
  pending_amount: number;
  paid_record_count: number;
  pending_record_count: number;
  record_count: number;
  records: PaymentRecordRow[];
  settlement_history: SettlementRecord[];
}


export interface EarningsRow {
  role: SettlementRole;
  payee_id: string;
  payee_name: string;
  payee_email?: string;
  period: string;
  gross_amount: number;
  commission_percent: number;
  commission_amount: number;
  cod_deduction_amount: number;
  net_amount: number;
  amount_due_to_platform: number;
  record_count: number;
  included_record_ids?: string[];
  cod_records?: CodCollectionRecord[];
  settlement?: SettlementRecord | null;
  settlement_history?: SettlementRecord[];
  records?: EarningsDetailRecord[];
  schedule?: SettlementSchedule;
  range_start?: string;
  range_end?: string;
  order_active?: boolean;
}

export interface AdminEarningsSummary {
  period: string;
  seller_gross: number;
  seller_commission: number;
  seller_net_payable: number;
  delivery_gross: number;
  delivery_commission: number;
  delivery_cod_deductions: number;
  delivery_net_payable: number;
  delivery_due_to_platform: number;
  platform_commission_total: number;
  seller_count: number;
  delivery_person_count: number;
  pending_settlement_count: number;
  seller_rows: EarningsRow[];
  delivery_rows: EarningsRow[];
}

export interface PlatformSellerOption {
  seller_id: string;
  seller_name: string;
  seller_email?: string;
  commission_percent: number;
  order_active: boolean;
}

export interface PlatformSellerOrderItem {
  name: string;
  quantity: number;
  line_total: number;
}

export interface PlatformSellerOrderRow {
  record_id: string;
  seller_id: string;
  seller_name: string;
  seller_email?: string;
  order_id?: string;
  order_number: string;
  booking_number?: string;
  created_at?: string;
  updated_at?: string;
  promised_delivery_end_at?: string;
  items: PlatformSellerOrderItem[];
  item_count: number;
  seller_amount: number;
  delivery_amount: 0;
  commission_percent: number;
  commission_amount: number;
  commission_realized: boolean;
  payment_method?: string;
  payment_status: string;
  seller_status: string;
  seller_seen: boolean;
  seller_response_at?: string;
  delivery_status: string;
  delivery_person_id?: string;
  delivery_person_name?: string;
  settlement_status: string;
  settlement_reference?: string;
  settled_at?: string;
  order_state: "successful" | "processing" | "attention";
  issue_code: string;
  issue_label: string;
  issue_detail: string;
}

export interface PlatformSellerSettlementRow {
  settlement_id: string;
  settlement_number: string;
  invoice_number?: string;
  seller_id: string;
  seller_name: string;
  paid_at?: string;
  seller_amount: number;
  commission_amount: number;
  commission_percent: number;
  payment_reference?: string;
}

export interface PlatformEarningsSummary {
  range_start: string;
  range_end: string;
  selected_seller_id?: string;
  sellers: PlatformSellerOption[];
  tracked_order_count: number;
  successful_order_count: number;
  processing_order_count: number;
  attention_order_count: number;
  seller_order_amount: number;
  seller_commission_realized: number;
  seller_commission_pending: number;
  seller_commission_total: number;
  rows: PlatformSellerOrderRow[];
  seller_settlements: PlatformSellerSettlementRow[];
}


export interface AdminScheduleRow {
  role: SettlementRole;
  payee_id: string;
  payee_name: string;
  payee_email?: string;
  available_for_orders: boolean;
  schedule: SettlementSchedule;
  suggested_range_start?: string;
  suggested_range_end?: string;
  outstanding: {
    gross_amount: number;
    commission_amount: number;
    cod_deduction_amount: number;
    net_amount: number;
    amount_due_to_platform?: number;
    record_count: number;
  };
  wallet?: {
    gross_amount: number;
    commission_amount: number;
    cod_deduction_amount: number;
    net_amount: number;
    amount_due_to_platform?: number;
    record_count: number;
  };
}

export interface SettlementWalletPreview {
  role: SettlementRole;
  payee_id: string;
  payee_name: string;
  clear_wallet: boolean;
  effective_range_start: string;
  effective_range_end: string;
  wallet: {
    gross_amount: number;
    commission_amount: number;
    cod_deduction_amount: number;
    net_amount: number;
    amount_due_to_platform: number;
    record_count: number;
  };
  selected: {
    gross_amount: number;
    commission_amount: number;
    cod_deduction_amount: number;
    net_amount: number;
    amount_due_to_platform: number;
    record_count: number;
  };
  projected_wallet_after: number;
  projected_due_to_platform_after: number;
}

export interface PaymentDeskBankDetails {
  verified_identity_name: string;
  bank_status: string;
  verification_status: string;
  bank_approved: boolean;
  payout_ready: boolean;
  holder_name: string;
  account_number: string;
  account_number_masked: string;
  ifsc: string;
  bank_name: string;
  branch_name: string;
  imps_reference?: string;
  verified_at?: string;
}

export interface PaymentDeskRow {
  role: SettlementRole;
  payee_id: string;
  payee_name: string;
  full_name?: string;
  business_name?: string;
  email?: string;
  phone?: string;
  available_for_orders?: boolean;
  wallet: {
    gross_amount: number;
    commission_amount: number;
    cod_deduction_amount: number;
    net_amount: number;
    amount_due_to_platform: number;
    record_count: number;
  };
  bank: PaymentDeskBankDetails;
  schedule?: SettlementSchedule;
}

export interface PaymentDeskResponse {
  success: boolean;
  role: SettlementRole;
  as_of: string;
  rows: PaymentDeskRow[];
  history: SettlementRecord[];
  company?: {
    name: string;
    city: string;
    postal_code: string;
    website: string;
  };
  csrf_token: string;
}

export interface BatchCodSummary {
  cod_collection_amount: number;
  cod_cash_collected_amount: number;
  cod_gateway_paid_amount: number;
  cod_outstanding_amount: number;
  cod_collection_status: string;
}

export interface BatchCodResponse {
  success: boolean;
  records: CodCollectionRecord[];
  summary: BatchCodSummary;
  csrf_token: string;
  message?: string;
}

export class SettlementApiError extends Error {
  status: number;
  code: string;
  payload?: Record<string, any>;

  constructor(
    message: string,
    status: number,
    code = "settlement_request_failed",
    payload?: Record<string, any>,
  ) {
    super(message);
    this.name = "SettlementApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

async function loadFreshGlobalCsrfToken(
  fallbackToken = "",
): Promise<string> {
  try {
    const response = await fetch("/react/api/auth/session", {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return fallbackToken;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      csrf_token?: string;
    };

    return String(payload.csrf_token || fallbackToken).trim();
  } catch {
    return fallbackToken;
  }
}


async function requestJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const rawText = await response.text();
  let payload: Record<string, any> = {};

  if (rawText.trim()) {
    try {
      payload = JSON.parse(rawText) as Record<string, any>;
    } catch {
      payload = {};
    }
  }

  if (!response.ok || payload.success === false) {
    const rawPreview = rawText.trim().slice(0, 400);
    const message =
      String(payload.message || "").trim() ||
      (rawPreview
        ? `Request failed (${response.status}): ${rawPreview}`
        : `Unable to complete the settlement request (${response.status}).`);

    throw new SettlementApiError(
      message,
      response.status,
      String(payload.code || `settlement_http_${response.status}`),
      {
        ...payload,
        raw_response: rawPreview,
        request_url: url,
      },
    );
  }

  return payload as T;
}

function postBody(csrfToken: string, values: Record<string, unknown> = {}): RequestInit {
  return {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ csrf_token: csrfToken, ...values }),
  };
}

function mutationHeaders(
  csrfToken: string,
  method: "POST" | "PUT" | "DELETE",
): RequestInit {
  return {
    method,
    headers: {
      Accept: "application/json",
      "X-CSRF-Token": csrfToken,
    },
  };
}

export function settlementErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function loadAdminSettlementSettings() {
  return requestJson<{
    success: boolean;
    settings: SettlementSettings;
    sellers: SellerSettlementSetting[];
    csrf_token: string;
  }>("/react/api/admin/settlement-settings");
}

export async function saveAdminSettlementSettings(
  csrfToken: string,
  settings: Partial<SettlementSettings>,
) {
  return requestJson<{
    success: boolean;
    message: string;
    settings: SettlementSettings;
    csrf_token: string;
  }>("/react/api/admin/settlement-settings", postBody(csrfToken, settings));
}

export async function setSellerOrderAvailability(
  sellerId: string,
  active: boolean,
  csrfToken: string,
) {
  const activeCsrfToken = await loadFreshGlobalCsrfToken(
    csrfToken,
  );

  const query = new URLSearchParams({
    active: active ? "true" : "false",
  });

  return requestJson<{
    success: boolean;
    message: string;
    active: boolean;
    csrf_token: string;
  }>(
    `/react/api/admin/sellers/${encodeURIComponent(
      sellerId,
    )}/order-availability?${query.toString()}`,
    mutationHeaders(activeCsrfToken, "POST"),
  );
}

export async function setSettlementCommission(
  role: SettlementRole,
  payeeId: string,
  commissionPercent: number | "",
  csrfToken: string,
  useDefault = false,
) {
  return requestJson<{
    success: boolean;
    commission_percent: number;
    csrf_token: string;
  }>(
    `/react/api/admin/settlement-commission/${role}/${encodeURIComponent(payeeId)}`,
    postBody(csrfToken, {
      commission_percent: commissionPercent,
      use_default: useDefault,
    }),
  );
}

export async function loadSellerCommissionRules() {
  return requestJson<SellerCommissionListResponse>(
    "/react/api/admin/seller-commissions",
  );
}

export async function loadSellerCommissionRule(ruleId: string) {
  return requestJson<{
    success: boolean;
    rule: SellerCommissionRule;
    csrf_token: string;
  }>(`/react/api/admin/seller-commissions/${encodeURIComponent(ruleId)}`);
}

export async function createSellerCommissionRule(
  sellerId: string,
  commissionPercent: number,
  notes: string,
  csrfToken: string,
) {
  if (!sellerId.trim()) {
    throw new SettlementApiError("Select a seller.", 400, "seller_required");
  }

  if (
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    throw new SettlementApiError(
      "Commission percentage must be between 0 and 100.",
      400,
      "invalid_commission_percent",
    );
  }

  const activeCsrfToken = await loadFreshGlobalCsrfToken(
    csrfToken,
  );

  const query = new URLSearchParams({
    seller_id: sellerId,
    commission_percent: String(commissionPercent),
    notes,
    is_active: "true",
  });

  return requestJson<{
    success: boolean;
    message: string;
    rule: SellerCommissionRule;
    csrf_token: string;
  }>(
    `/react/api/admin/seller-commissions?${query.toString()}`,
    mutationHeaders(activeCsrfToken, "POST"),
  );
}

export async function updateSellerCommissionRule(
  ruleId: string,
  values: { commission_percent: number; notes?: string; is_active?: boolean },
  csrfToken: string,
) {
  if (
    !Number.isFinite(values.commission_percent) ||
    values.commission_percent < 0 ||
    values.commission_percent > 100
  ) {
    throw new SettlementApiError(
      "Commission percentage must be between 0 and 100.",
      400,
      "invalid_commission_percent",
    );
  }

  const activeCsrfToken = await loadFreshGlobalCsrfToken(
    csrfToken,
  );

  const query = new URLSearchParams({
    commission_percent: String(values.commission_percent),
  });

  if (values.notes !== undefined) {
    query.set("notes", values.notes);
  }

  if (values.is_active !== undefined) {
    query.set("is_active", values.is_active ? "true" : "false");
  }

  return requestJson<{
    success: boolean;
    message: string;
    rule: SellerCommissionRule;
    csrf_token: string;
  }>(
    `/react/api/admin/seller-commissions/${encodeURIComponent(
      ruleId,
    )}?${query.toString()}`,
    mutationHeaders(activeCsrfToken, "PUT"),
  );
}

export async function deleteSellerCommissionRule(
  ruleId: string,
  csrfToken: string,
) {
  const activeCsrfToken = await loadFreshGlobalCsrfToken(
    csrfToken,
  );

  return requestJson<{
    success: boolean;
    message: string;
    csrf_token: string;
  }>(
    `/react/api/admin/seller-commissions/${encodeURIComponent(ruleId)}`,
    mutationHeaders(activeCsrfToken, "DELETE"),
  );
}

export type SellerOrderChannel =
  | "instant_delivery"
  | "one_day_delivery"
  | "subscription";

export interface SellerOrderChannels {
  instant_delivery: boolean;
  one_day_delivery: boolean;
  subscription: boolean;
}

export async function loadMyOrderAvailability() {
  return requestJson<{
    success: boolean;
    role: SettlementRole;
    available: boolean;
    master_active?: boolean;
    seller_channels?: SellerOrderChannels;
    message: string;
    csrf_token: string;
  }>("/react/api/order-availability");
}

export async function saveMyOrderAvailability(
  available: boolean,
  csrfToken: string,
  channel?: SellerOrderChannel,
) {
  const activeCsrfToken =
    await loadFreshGlobalCsrfToken(csrfToken);

  return requestJson<{
    success: boolean;
    role: SettlementRole;
    available: boolean;
    channel?: SellerOrderChannel;
    seller_channels?: SellerOrderChannels;
    message: string;
    csrf_token: string;
  }>(
    "/react/api/order-availability",
    postBody(activeCsrfToken, {
      available,
      ...(channel ? { channel } : {}),
    }),
  );
}

export async function loadMySettlementSchedule() {
  return requestJson<{
    success: boolean;
    schedule: SettlementSchedule;
    current_outstanding: EarningsRow;
    options: Array<{ value: SettlementCadence; label: string; description: string }>;
    csrf_token: string;
  }>("/react/api/settlement-schedule");
}

export async function saveMySettlementSchedule(
  cadence: SettlementCadence,
  csrfToken: string,
) {
  const activeCsrfToken = await loadFreshGlobalCsrfToken(csrfToken);
  return requestJson<{
    success: boolean;
    message: string;
    schedule: SettlementSchedule;
    csrf_token: string;
  }>(
    "/react/api/settlement-schedule",
    postBody(activeCsrfToken, { cadence }),
  );
}

export async function loadAdminSettlementSchedules(role: "all" | SettlementRole = "all") {
  const query = new URLSearchParams({ role });
  return requestJson<{
    success: boolean;
    rows: AdminScheduleRow[];
    custom_payments: SettlementRecord[];
    options: Array<{ value: SettlementCadence; label: string; description: string }>;
    csrf_token: string;
  }>(`/react/api/admin/settlement-schedules?${query.toString()}`);
}

export async function saveAdminSettlementSchedule(
  role: SettlementRole,
  payeeId: string,
  cadence: SettlementCadence,
  csrfToken: string,
) {
  const activeCsrfToken = await loadFreshGlobalCsrfToken(csrfToken);
  return requestJson<{
    success: boolean;
    message: string;
    schedule: SettlementSchedule;
    csrf_token: string;
  }>(
    `/react/api/admin/settlement-schedules/${role}/${encodeURIComponent(payeeId)}`,
    postBody(activeCsrfToken, { cadence }),
  );
}

export async function loadSettlementWalletPreview(
  role: SettlementRole,
  payeeId: string,
  fromDate: string,
  toDate: string,
  clearWallet: boolean,
) {
  const query = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
    clear_wallet: clearWallet ? "true" : "false",
  });

  return requestJson<{
    success: boolean;
    preview: SettlementWalletPreview;
    csrf_token: string;
  }>(
    `/react/api/admin/settlement-wallet/${role}/${encodeURIComponent(
      payeeId,
    )}?${query.toString()}`,
  );
}

export async function payCustomSettlement(
  role: SettlementRole,
  payeeId: string,
  csrfToken: string,
  values: {
    fromDate: string;
    toDate: string;
    clearWallet: boolean;
    paymentMethod: "bank_transfer" | "upi" | "cash" | "other";
    paymentReference: string;
  },
) {
  return requestJson<{
    success: boolean;
    message: string;
    settlement: SettlementRecord;
    wallet_before: SettlementWalletPreview["wallet"];
    wallet_after: SettlementWalletPreview["wallet"];
    csrf_token: string;
  }>(
    `/react/api/admin/settlements/${role}/${encodeURIComponent(
      payeeId,
    )}/custom-pay`,
    postBody(csrfToken, {
      from_date: values.fromDate,
      to_date: values.toDate,
      clear_wallet: values.clearWallet,
      payment_method: values.paymentMethod,
      payment_reference: values.paymentReference,
    }),
  );
}

export async function loadAdminPaymentDesk(
  role: SettlementRole,
) {
  return requestJson<PaymentDeskResponse>(
    `/react/api/admin/payment-desk/${role}`,
  );
}

export async function payAdminWalletManually(
  role: SettlementRole,
  payeeId: string,
  csrfToken: string,
  values: {
    paymentMethod: "bank_transfer" | "neft" | "imps" | "rtgs" | "upi";
    paymentReference: string;
    paymentNote?: string;
  },
) {
  const activeCsrfToken = await loadFreshGlobalCsrfToken(csrfToken);

  return requestJson<{
    success: boolean;
    message: string;
    settlement: SettlementRecord;
    wallet_before: PaymentDeskRow["wallet"];
    wallet_after: PaymentDeskRow["wallet"];
    email_status?: string;
    email_error?: string;
    csrf_token: string;
  }>(
    `/react/api/admin/payment-desk/${role}/${encodeURIComponent(
      payeeId,
    )}/pay`,
    postBody(activeCsrfToken, {
      payment_method: values.paymentMethod,
      payment_reference: values.paymentReference,
      payment_note: values.paymentNote || "",
    }),
  );
}

export async function loadPlatformEarnings(
  fromDate: string,
  toDate: string,
  sellerId = "",
) {
  const query = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
  });

  if (sellerId) {
    query.set("seller_id", sellerId);
  }

  return requestJson<{
    success: boolean;
    summary: PlatformEarningsSummary;
    csrf_token: string;
  }>(`/react/api/admin/platform-earnings?${query.toString()}`);
}

export async function loadAdminEarnings(period: string) {
  const query = new URLSearchParams({ period });
  return requestJson<{
    success: boolean;
    summary: AdminEarningsSummary;
    settings: SettlementSettings;
    csrf_token: string;
  }>(`/react/api/admin/earnings?${query.toString()}`);
}

export async function loadAdminSettlements(role: SettlementRole, period: string) {
  const query = new URLSearchParams({ period });
  return requestJson<{
    success: boolean;
    role: SettlementRole;
    period: string;
    rows: EarningsRow[];
    csrf_token: string;
  }>(`/react/api/admin/settlements/${role}?${query.toString()}`);
}

export async function prepareSettlement(
  role: SettlementRole,
  payeeId: string,
  period: string,
  csrfToken: string,
  options: { fromDate?: string; toDate?: string; cadence?: SettlementCadence } = {},
) {
  return requestJson<{
    success: boolean;
    message: string;
    settlement: SettlementRecord;
    csrf_token: string;
  }>(
    `/react/api/admin/settlements/${role}/${encodeURIComponent(payeeId)}/prepare`,
    postBody(csrfToken, {
      period,
      from_date: options.fromDate || "",
      to_date: options.toDate || "",
      schedule_cadence: options.cadence || "",
    }),
  );
}

export async function markSettlementPaid(
  settlementId: string,
  paymentReference: string,
  csrfToken: string,
) {
  return requestJson<{
    success: boolean;
    message: string;
    settlement: SettlementRecord;
    csrf_token: string;
  }>(
    `/react/api/admin/settlements/${encodeURIComponent(settlementId)}/mark-paid`,
    postBody(csrfToken, { payment_reference: paymentReference }),
  );
}

export async function sendSettlementEmail(
  settlementId: string,
  csrfToken: string,
) {
  return requestJson<{
    success: boolean;
    message: string;
    email_status: string;
    csrf_token: string;
  }>(
    `/react/api/admin/settlements/${encodeURIComponent(settlementId)}/send-email`,
    postBody(csrfToken),
  );
}

export function settlementInvoiceUrl(settlementId: string): string {
  return `/react/api/admin/settlements/${encodeURIComponent(settlementId)}/invoice`;
}

export async function loadSellerEarnings(period: string) {
  const query = new URLSearchParams({ period });
  return requestJson<{
    success: boolean;
    earnings: EarningsRow;
    csrf_token: string;
  }>(`/react/api/seller/earnings?${query.toString()}`);
}

export async function loadDeliveryEarnings(period: string) {
  const query = new URLSearchParams({ period });
  return requestJson<{
    success: boolean;
    earnings: EarningsRow;
    csrf_token: string;
  }>(`/react/api/delivery/earnings?${query.toString()}`);
}

export async function loadSellerPaymentRecords(
  period: string,
) {
  const query = new URLSearchParams({ period });

  return requestJson<{
    success: boolean;
    payment_records: SelfPaymentRecordsSummary;
    csrf_token: string;
  }>(
    `/react/api/seller/payment-records?${query.toString()}`,
  );
}

export async function loadDeliveryPaymentRecords(
  period: string,
) {
  const query = new URLSearchParams({ period });

  return requestJson<{
    success: boolean;
    payment_records: SelfPaymentRecordsSummary;
    csrf_token: string;
  }>(
    `/react/api/delivery/payment-records?${query.toString()}`,
  );
}


export async function loadBatchCod(batchId: string) {
  return requestJson<BatchCodResponse>(
    `/react/api/delivery/batches/${encodeURIComponent(batchId)}/cod`,
  );
}

export async function confirmBatchCodCash(
  batchId: string,
  csrfToken: string,
  termsAccepted: boolean,
  note = "",
) {
  if (!termsAccepted) {
    throw new SettlementApiError(
      "Accept the COD cash and earnings-deduction terms first.",
      400,
      "COD_TERMS_REQUIRED",
    );
  }

  return requestJson<BatchCodResponse & { message?: string }>(
    `/react/api/delivery/batches/${encodeURIComponent(
      batchId,
    )}/cod/cash-collected`,
    postBody(csrfToken, {
      note,
      terms_accepted: true,
      deduction_accepted: true,
    }),
  );
}

export async function markCodCashCollected(
  batchId: string,
  codId: string,
  csrfToken: string,
  termsAccepted: boolean,
  note = "",
) {
  if (!termsAccepted) {
    throw new SettlementApiError(
      "Accept the COD cash and earnings-deduction terms first.",
      400,
      "COD_TERMS_REQUIRED",
    );
  }

  return requestJson<{
    success: boolean;
    message: string;
    record: CodCollectionRecord;
    csrf_token: string;
  }>(
    `/react/api/delivery/batches/${encodeURIComponent(batchId)}/cod/${encodeURIComponent(codId)}/cash-collected`,
    postBody(csrfToken, {
      note,
      terms_accepted: true,
      deduction_accepted: true,
    }),
  );
}

export async function generateCodQr(
  batchId: string,
  codId: string,
  csrfToken: string,
) {
  return requestJson<{
    success: boolean;
    message: string;
    record: CodCollectionRecord;
    csrf_token: string;
  }>(
    `/react/api/delivery/batches/${encodeURIComponent(batchId)}/cod/${encodeURIComponent(codId)}/qr`,
    postBody(csrfToken),
  );
}

export async function refreshCodQr(
  batchId: string,
  codId: string,
  csrfToken: string,
) {
  return requestJson<{
    success: boolean;
    message: string;
    record: CodCollectionRecord;
    csrf_token: string;
  }>(
    `/react/api/delivery/batches/${encodeURIComponent(batchId)}/cod/${encodeURIComponent(codId)}/qr/refresh`,
    postBody(csrfToken),
  );
}

export async function markCodRemitted(
  batchId: string,
  codId: string,
  reference: string,
  csrfToken: string,
) {
  return requestJson<{
    success: boolean;
    message: string;
    record: CodCollectionRecord;
    csrf_token: string;
  }>(
    `/react/api/admin/delivery/batches/${encodeURIComponent(batchId)}/cod/${encodeURIComponent(codId)}/remit`,
    postBody(csrfToken, { reference }),
  );
}
