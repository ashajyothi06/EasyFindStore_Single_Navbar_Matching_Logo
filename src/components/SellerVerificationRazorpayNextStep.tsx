import { Link } from "react-router-dom";

interface SellerVerificationRazorpayNextStepProps {
  verificationStatus?: string;
}

export function SellerVerificationRazorpayNextStep({
  verificationStatus,
}: SellerVerificationRazorpayNextStepProps) {
  if (verificationStatus !== "COMPLETED") {
    return null;
  }

  return (
    <section className="payment-card">
      <span className="razorpay-eyebrow">
        Next onboarding step
      </span>
      <h2>Configure Razorpay Payments</h2>
      <p>
        Your bank verification is complete. Add encrypted Razorpay
        credentials and submit them for administrator testing.
      </p>

      <Link
        className="razorpay-button primary"
        to="/seller/payments/razorpay"
      >
        Configure Razorpay
      </Link>
    </section>
  );
}
