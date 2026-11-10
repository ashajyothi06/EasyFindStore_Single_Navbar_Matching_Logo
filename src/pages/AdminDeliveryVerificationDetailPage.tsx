import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import {
  deliveryArtifactUrl,
  isAuthenticationError,
  isCsrfError,
  loadAdminDeliveryVerification,
  submitAdminDeliveryBankDecision,
  submitAdminDeliveryKycDecision,
  type AdminDeliveryVerificationDetailResponse,
  verificationErrorMessage,
} from "../services/deliveryVerificationApi";
import "../styles/delivery-verification.css";

function label(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function valueOrDash(value: unknown): string {
  const text = String(value || "").trim();
  return text || "—";
}

function addressText(
  address: Record<string, unknown>,
): string {
  return [
    address.house,
    address.street,
    address.lm,
    address.loc,
    address.vtc,
    address.dist,
    address.state,
    address.pc,
    address.country,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ") || "—";
}

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.readOnly = true;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();

  if (!copied) {
    throw new Error("Copy failed");
  }
}

interface DecisionFormProps {
  title: string;
  approveLabel: string;
  rejectLabel: string;
  working: boolean;
  onDecision: (
    action: "approve" | "reject",
    reason: string,
  ) => Promise<void>;
}

function DecisionForm({
  title,
  approveLabel,
  rejectLabel,
  working,
  onDecision,
}: DecisionFormProps) {
  const [reason, setReason] = useState("");

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const submitter =
      (event.nativeEvent as SubmitEvent)
        .submitter as HTMLButtonElement | null;
    const action =
      submitter?.value === "reject"
        ? "reject"
        : "approve";

    if (action === "reject" && !reason.trim()) {
      return;
    }

    await onDecision(action, reason.trim());

    if (action === "approve") {
      setReason("");
    }
  }

  return (
    <form
      className="dv-decision-form"
      onSubmit={submit}
    >
      <h3>{title}</h3>

      <label>
        Rejection reason
        <textarea
          rows={3}
          value={reason}
          onChange={(event) =>
            setReason(event.target.value)
          }
          placeholder="Required only when rejecting"
        />
      </label>

      <div className="dv-actions">
        <button
          className="dv-button success"
          type="submit"
          value="approve"
          disabled={working}
        >
          {approveLabel}
        </button>

        <button
          className="dv-button danger"
          type="submit"
          value="reject"
          disabled={working || !reason.trim()}
        >
          {rejectLabel}
        </button>
      </div>
    </form>
  );
}

export function AdminDeliveryVerificationDetailPage() {
  const { deliveryId = "" } = useParams();

  const [data, setData] =
    useState<AdminDeliveryVerificationDetailResponse | null>(
      null,
    );
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");
  const [copyStatus, setCopyStatus] =
    useState<Record<string, string>>({});

  async function load() {
    setLoading(true);

    try {
      setData(
        await loadAdminDeliveryVerification(
          deliveryId,
        ),
      );
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        window.location.assign(
          `/react/login?next=${encodeURIComponent(
            `/admin/delivery-verifications/${deliveryId}`,
          )}`,
        );
        return;
      }

      setNotice(
        verificationErrorMessage(
          requestError,
          "Unable to load the delivery verification record.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId]);

  const detail = useMemo(() => {
    const verification = data?.verification;
    const kyc = verification?.kyc || {};
    const bank = verification?.bank || {};
    const review = verification?.admin_review || {};
    const preview = kyc.aadhaar_preview || {};
    const identity = preview.identity || {};
    const address = preview.address || {};

    return {
      verification,
      kyc,
      bank,
      review,
      identity,
      address,
    };
  }, [data]);

  async function copy(
    key: string,
    value: string,
  ) {
    try {
      await copyText(value);
      setCopyStatus((current) => ({
        ...current,
        [key]: "Copied successfully.",
      }));

      window.setTimeout(() => {
        setCopyStatus((current) => ({
          ...current,
          [key]: "",
        }));
      }, 1800);
    } catch {
      setCopyStatus((current) => ({
        ...current,
        [key]:
          "Unable to copy. Select the value manually.",
      }));
    }
  }

  async function decideKyc(
    action: "approve" | "reject",
    reason: string,
  ) {
    if (!data?.csrf_token) return;

    setWorking("kyc");
    setNotice("");

    try {
      const response =
        await submitAdminDeliveryKycDecision(
          deliveryId,
          data.csrf_token,
          {
            action,
            reason,
          },
        );

      setNotice(
        response.message ||
        "KYC decision saved.",
      );
      await load();
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setNotice(
        verificationErrorMessage(
          requestError,
          "Unable to save the KYC decision.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  async function decideBank(
    action: "approve" | "reject",
    reason: string,
  ) {
    if (!data?.csrf_token) return;

    setWorking("bank");
    setNotice("");

    try {
      const response =
        await submitAdminDeliveryBankDecision(
          deliveryId,
          data.csrf_token,
          {
            action,
            reason,
          },
        );

      setNotice(
        response.message ||
        "Bank decision saved.",
      );
      await load();
    } catch (requestError) {
      if (isCsrfError(requestError)) {
        window.location.reload();
        return;
      }

      setNotice(
        verificationErrorMessage(
          requestError,
          "Unable to save the bank decision.",
        ),
      );
    } finally {
      setWorking("");
    }
  }

  if (
    loading ||
    !data?.delivery_user ||
    !detail.verification
  ) {
    return (
      <main className="dv-page">
        <div className="dv-page-container">
          <div className="dv-loading">
            {notice ||
              "Loading delivery verification review…"}
          </div>
        </div>
      </main>
    );
  }

  const user = data.delivery_user;
  const verification = detail.verification;
  const identity = detail.identity;
  const bank = detail.bank;
  const kyc = detail.kyc;
  const review = detail.review;
  const uid = String(
    identity.uid_number ||
    identity.uid_masked ||
    "",
  );
  const maskedBank = String(
    bank.account_number_masked || "",
  );

  return (
    <main className="dv-page">
      <div className="dv-page-container">
        <section className="dv-heading">
          <div>
            <span className="dv-eyebrow">
              Delivery verification review
            </span>
            <h1>
              {user.full_name || "Delivery Person"}
            </h1>
            <p>
              {user.email} · {user.phone}
            </p>
          </div>

          <Link
            className="dv-button secondary"
            to="/admin/delivery-verifications"
          >
            Back to Review Queue
          </Link>
        </section>

        {notice && (
          <div className="dv-alert warning">
            {notice}
          </div>
        )}

        {[
          "KYC_SUBMITTED",
          "BANK_SUBMITTED",
        ].includes(verification.status) && (
            <div className="dv-alert warning">
              This delivery person has a submission waiting
              for administrator review.
            </div>
          )}

        {verification.status === "COMPLETED" && (
          <div className="dv-alert success">
            Aadhaar and bank verification are completed.
          </div>
        )}

        {[
          "KYC_REJECTED",
          "BANK_REJECTED",
        ].includes(verification.status) && (
            <div className="dv-alert danger">
              The latest submission was rejected and can be
              resubmitted.
            </div>
          )}

        <div className="dv-review-layout">
          <section className="dv-card">
            <h2>Delivery Profile</h2>
            <div className="dv-review-row">
              <strong>Full name</strong>
              <span>{valueOrDash(user.full_name)}</span>
            </div>
            <div className="dv-review-row">
              <strong>Email</strong>
              <span>{valueOrDash(user.email)}</span>
            </div>
            <div className="dv-review-row">
              <strong>Phone</strong>
              <span>{valueOrDash(user.phone)}</span>
            </div>
            <div className="dv-review-row">
              <strong>Vehicle type</strong>
              <span>
                {valueOrDash(user.vehicle_type)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Vehicle number</strong>
              <span>
                {valueOrDash(user.vehicle_number)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Licence number</strong>
              <span>
                {valueOrDash(user.license_number)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Service area</strong>
              <span>
                {valueOrDash(user.service_area)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Account status</strong>
              <span>{label(user.status)}</span>
            </div>
            <div className="dv-review-row">
              <strong>Verification status</strong>
              <span>
                {label(verification.status)}
              </span>
            </div>
          </section>

          <section className="dv-card">
            <h2>Aadhaar KYC Review</h2>

            <div className="dv-review-row">
              <strong>KYC status</strong>
              <span>{label(kyc.status)}</span>
            </div>
            <div className="dv-review-row">
              <strong>Aadhaar name</strong>
              <span>
                {valueOrDash(identity.name)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Aadhaar number</strong>
              <span>
                {uid ? (
                  <>
                    <span className="dv-copy-wrap">
                      <span className="dv-number-value">
                        {uid}
                      </span>
                      <button
                        className="dv-button secondary small"
                        type="button"
                        onClick={() =>
                          void copy("aadhaar", uid)
                        }
                      >
                        Copy
                      </button>
                    </span>
                    <small className="dv-copy-status">
                      {copyStatus.aadhaar}
                    </small>
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Date of birth</strong>
              <span>{valueOrDash(identity.dob)}</span>
            </div>
            <div className="dv-review-row">
              <strong>Gender</strong>
              <span>
                {valueOrDash(identity.gender)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Address</strong>
              <span>
                {addressText(
                  detail.address as Record<
                    string,
                    unknown
                  >,
                )}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Submitted at</strong>
              <span>
                {valueOrDash(kyc.submitted_at)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>XML filename</strong>
              <span>
                {valueOrDash(kyc.xml_file)}
              </span>
            </div>

            {kyc.has_photo_artifact && (
              <img
                className="dv-aadhaar-photo"
                src={deliveryArtifactUrl(
                  deliveryId,
                  "photo",
                )}
                alt="Delivery-person Aadhaar"
              />
            )}

            <div className="dv-actions">
              {kyc.has_xml_artifact && (
                <a
                  className="dv-button secondary small"
                  href={deliveryArtifactUrl(
                    deliveryId,
                    "xml",
                  )}
                >
                  Download Aadhaar XML
                </a>
              )}

              {kyc.has_photo_artifact && (
                <a
                  className="dv-button secondary small"
                  href={deliveryArtifactUrl(
                    deliveryId,
                    "photo",
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Aadhaar Photo
                </a>
              )}
            </div>

            {review.kyc_rejection_reason && (
              <div className="dv-alert danger">
                Previous rejection reason:{" "}
                {review.kyc_rejection_reason}
              </div>
            )}

            {data.capabilities?.can_review_kyc && (
              <DecisionForm
                title="KYC Decision"
                approveLabel="Approve Aadhaar KYC"
                rejectLabel="Reject Aadhaar KYC"
                working={working === "kyc"}
                onDecision={decideKyc}
              />
            )}
          </section>

          <section className="dv-card">
            <h2>Bank Verification Review</h2>

            <div className="dv-review-row">
              <strong>Bank status</strong>
              <span>{label(bank.status)}</span>
            </div>
            <div className="dv-review-row">
              <strong>Account number</strong>
              <span>
                {maskedBank ? (
                  <>
                    <span className="dv-copy-wrap">
                      <span className="dv-number-value">
                        {maskedBank}
                      </span>
                      <button
                        className="dv-button secondary small"
                        type="button"
                        onClick={() =>
                          void copy(
                            "bank",
                            maskedBank,
                          )
                        }
                      >
                        Copy
                      </button>
                    </span>
                    <small className="dv-copy-status">
                      {copyStatus.bank}
                    </small>
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>IFSC</strong>
              <span>{valueOrDash(bank.ifsc)}</span>
            </div>
            <div className="dv-review-row">
              <strong>Verified holder</strong>
              <span>
                {valueOrDash(bank.holder_name)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Bank</strong>
              <span>
                {valueOrDash(bank.bank_name)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Branch</strong>
              <span>
                {valueOrDash(bank.branch_name)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>IMPS reference</strong>
              <span>
                {valueOrDash(bank.imps_reference)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Surepass verified at</strong>
              <span>
                {valueOrDash(bank.verified_at)}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Submitted at</strong>
              <span>
                {valueOrDash(bank.submitted_at)}
              </span>
            </div>

            {review.bank_rejection_reason && (
              <div className="dv-alert danger">
                Previous rejection reason:{" "}
                {review.bank_rejection_reason}
              </div>
            )}

            {data.capabilities?.can_review_bank && (
              <DecisionForm
                title="Bank Decision"
                approveLabel="Approve Bank Details"
                rejectLabel="Reject Bank Details"
                working={working === "bank"}
                onDecision={decideBank}
              />
            )}
          </section>

          <section className="dv-card">
            <h2>Admin Review Information</h2>

            <div className="dv-review-row">
              <strong>KYC reviewed at</strong>
              <span>
                {valueOrDash(
                  review.kyc_reviewed_at,
                )}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>KYC reviewer ID</strong>
              <span>
                {valueOrDash(
                  review.kyc_reviewed_by,
                )}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Bank reviewed at</strong>
              <span>
                {valueOrDash(
                  review.bank_reviewed_at,
                )}
              </span>
            </div>
            <div className="dv-review-row">
              <strong>Bank reviewer ID</strong>
              <span>
                {valueOrDash(
                  review.bank_reviewed_by,
                )}
              </span>
            </div>
          </section>

          <section className="dv-card dv-review-full">
            <h2>Verification History</h2>

            {[...(verification.history || [])]
              .reverse()
              .map((entry, index) => (
                <article
                  className="dv-history-entry"
                  key={`${entry.status}-${entry.at}-${index}`}
                >
                  <div>
                    <strong>
                      {label(entry.status)}
                    </strong>
                    <small>{entry.note}</small>
                  </div>
                  <small>{entry.at}</small>
                </article>
              ))}

            {!verification.history?.length && (
              <p>
                No verification history is available.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
