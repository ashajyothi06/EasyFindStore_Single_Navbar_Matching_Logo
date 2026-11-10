export type PaymentTransaction = {
  id: string;
  event_type: string;
  status_group: string;
  status: string;
  provider?: string;
  payment_method?: string;
  order_id?: string;
  order_number?: string;
  user_id?: string;
  customer_name?: string;
  user_email?: string;
  amount?: number;
  amount_subunits?: number;
  currency?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_tracking_id?: string;
  payment_reference?: string;
  gateway_status?: string;
  signature_verified?: boolean;
  collector_seller_id?: string;
  collector_seller_name?: string;
  collector_business_name?: string;
  failure_reason?: string;
  email_status?: string;
  email_error?: string;
  order_created_at?: string;
  paid_at?: string;
  event_at?: string;
  created_at?: string;
};

export type PaymentTransactionSummary = {
  total_records: number;
  created: number;
  successful: number;
  failed: number;
  cancelled: number;
  successful_amount: number;
  failed_amount: number;
  email_sent: number;
  email_failed: number;
  unique_orders: number;
  unique_razorpay_payments: number;
};

export type PaymentTransactionFilters = {
  status?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
};

export type PaymentTransactionsResponse = {
  success: boolean;
  transactions: PaymentTransaction[];
  count: number;
  limit: number;
  offset: number;
  summary: PaymentTransactionSummary;
  export_url: string;
};

export class PaymentTransactionsApiError extends Error {
  status: number;
  code: string;
  loginUrl: string;

  constructor(
    status: number,
    message: string,
    code = "",
    loginUrl = "",
  ) {
    super(message);
    this.name = "PaymentTransactionsApiError";
    this.status = status;
    this.code = code;
    this.loginUrl = loginUrl;
  }
}

function queryString(
  filters: PaymentTransactionFilters,
): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return;
      }
      params.set(key, String(value));
    },
  );

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function loadAdminPaymentTransactions(
  filters: PaymentTransactionFilters = {},
): Promise<PaymentTransactionsResponse> {
  const response = await fetch(
    `/react/api/admin/payment-transactions${queryString(
      filters,
    )}`,
    {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );

  let payload: any = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || payload.success === false) {
    throw new PaymentTransactionsApiError(
      response.status,
      String(
        payload.message ||
          "Unable to load payment transactions.",
      ),
      String(payload.code || ""),
      String(payload.login_url || ""),
    );
  }

  return payload as PaymentTransactionsResponse;
}

export function paymentTransactionsCsvUrl(
  filters: PaymentTransactionFilters = {},
): string {
  const exportFilters = {
    status: filters.status,
    search: filters.search,
    from_date: filters.from_date,
    to_date: filters.to_date,
  };

  return `/react/api/admin/payment-transactions/export.csv${queryString(
    exportFilters,
  )}`;
}
