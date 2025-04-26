import React from 'react';
import { MainMenu } from '../components/MainMenu';

const VendorTerms = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <MainMenu />
      
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Foodrient Vendor Terms and Conditions</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: February 2025</p>

            <div className="prose prose-yellow max-w-none">
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Vendor Eligibility</h2>
              <p className="text-gray-600 mb-4">To become a vendor on Foodrient, you must meet the following requirements:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Be a registered business entity or an individual operating legally in Nigeria.</li>
                <li>Provide valid identification and business documentation, including but not limited to:
                  <ul className="list-circle pl-6 mt-2">
                    <li>Certificate of Incorporation (for businesses).</li>
                    <li>Tax Identification Number (TIN).</li>
                    <li>Valid government-issued ID (for individuals).</li>
                  </ul>
                </li>
                <li>Maintain proper food handling understanding and comply with all relevant health and safety regulations.</li>
                <li>Demonstrate the ability to fulfill bulk orders consistently and meet delivery timelines.</li>
              </ul>
              <p className="text-gray-600 mb-4">Foodrient reserves the right to verify your eligibility and may request additional documentation at any time.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Platform Fees and Pricing</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Platform Fee: Foodrient charges a 5% platform fee on each successful transaction. Vendors receive 95% of the payment amount.</li>
                <li>Pricing: Vendors must factor the 5% platform fee into their base pricing to ensure transparency and avoid high costs, as our goal is to offer market competitive prices.</li>
                <li>Payment Processing: All payments are processed securely through Paystack. Vendors will receive payments directly into their designated bank accounts, subject to the agreed payment schedule.</li>
                <li>Taxes: Vendors are responsible for complying with all applicable tax laws in Nigeria, including Value Added Tax (VAT) and income tax.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Product Quality Standards</h2>
              <p className="text-gray-600 mb-4">Vendors must adhere to the following quality standards:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Food Safety: All products must comply with Nigerian food safety standards, including those set by the National Agency for Food and Drug Administration and Control (NAFDAC) and other relevant authorities.</li>
                <li>Labeling: Manufactured Food Products must be clearly labeled with ingredients, nutritional information, expiration dates, and any allergen warnings.</li>
                <li>Storage and Handling: Proper storage and handling procedures must be followed to ensure product quality and safety.</li>
                <li>Quality Audits: Foodrient may conduct regular quality audits to ensure compliance with these standards. Vendors must cooperate fully with such audits.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Delivery and Fulfillment</h2>
              <p className="text-gray-600 mb-4">Vendors are responsible for ensuring timely and safe delivery of products. The following terms apply:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>On-Time Delivery Rate: Vendors must maintain a 95% on-time delivery rate. Failure to meet this standard may result in penalties or account suspension.</li>
                <li>Packaging: Products must be packaged securely to prevent damage and ensure food safety during transport.</li>
                <li>Delivery Schedules: Vendors must communicate delivery schedules clearly to customers and Foodrient.</li>
                <li>Cold Chain Compliance: For perishable items, vendors must comply with cold chain requirements to maintain product quality.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Cancellation and Refunds</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Cancellations: Vendors must provide 24-hour notice for order cancellations. Failure to do so may result in penalties.</li>
                <li>Refunds: Vendors must adhere to Foodrient's refund policy, which includes:
                  <ul className="list-circle pl-6 mt-2">
                    <li>Full refunds for quality issues or customer dissatisfaction.</li>
                    <li>Clear documentation of refund processes and timelines.</li>
                    <li>Cooperation with Foodrient's dispute resolution procedures.</li>
                  </ul>
                </li>
                <li>Dispute Resolution: In the event of a dispute, vendors must work with Foodrient to resolve the issue promptly and fairly.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Account Suspension and Termination</h2>
              <p className="text-gray-600 mb-4">Foodrient reserves the right to suspend or terminate vendor accounts for the following reasons:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Repeated failure to meet quality standards or delivery timelines.</li>
                <li>Violation of Foodrient's policies or terms and conditions.</li>
                <li>Multiple customer complaints or negative reviews.</li>
                <li>Engagement in fraudulent activities or misrepresentation of products.</li>
                <li>Non-compliance with Nigerian laws and regulations.</li>
              </ul>
              <p className="text-gray-600 mb-4">In such cases, Foodrient will provide written notice and an opportunity to address the issue before taking action.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Insurance and Liability</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Business Insurance: Vendors must maintain appropriate business insurance, including liability coverage for food safety incidents.</li>
                <li>Compliance: Vendors must comply with all local regulations related to food safety, business operations, and insurance.</li>
                <li>Indemnification: Vendors agree to indemnify and hold Foodrient harmless from any third-party claims arising from their products or services.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Data Protection</h2>
              <p className="text-gray-600 mb-4">Vendors must comply with the Nigeria Data Protection Regulation (NDPR) and the following requirements:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Secure Handling of Customer Information: Vendors must protect customer data and use it only for the purposes of fulfilling orders.</li>
                <li>Confidentiality: Vendors must maintain the confidentiality of customer information and not share it with third parties without consent.</li>
                <li>Data Breach Notification: In the event of a data breach, vendors must notify Foodrient immediately and take steps to mitigate the impact.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Amendments to Terms</h2>
              <p className="text-gray-600 mb-4">Foodrient reserves the right to modify these Vendor Terms and Conditions at any time. Changes will be effective immediately upon posting on the platform. Vendors are responsible for reviewing the Terms periodically to stay informed of updates.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Governing Law</h2>
              <p className="text-gray-600 mb-4">These Vendor Terms and Conditions are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms shall be resolved in accordance with Nigerian law, and parties agree to submit to the jurisdiction of Nigerian courts.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Vendor Role in Referral & Affiliate Programs</h2>
              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">a. Supporting Customer Referrals</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Vendors must honor all Peps rewards earned by customers through referrals when used for purchases.</li>
                <li>Vendors may promote Foodrient's referral program to customers (e.g., via in-store signage or social media) but cannot issue unique referral links/codes.</li>
                <li>Fraudulent activity (e.g., artificially inflating referrals) will result in penalties, including account suspension.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">b. Affiliate Program Compliance</h3>
              <p className="text-gray-600 mb-4">Vendors may not enroll as affiliates but must:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Accept orders from customers referred by Foodrient-affiliated marketers.</li>
                <li>Fulfill orders paid with Peps or affiliate-linked discounts without discrimination.</li>
                <li>Foodrient will handle all affiliate payouts; vendors receive standard settlement (95% of order value).</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Peps Point Reward System for Vendors</h2>
              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">a. Acceptance of Peps</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Vendors must accept Peps as payment (1 Peps = ₦1) and will receive cash settlement (95% of redeemed value).</li>
                <li>No Peps Verification: Vendors are not responsible for validating Peps ownership or investigating fraud.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">b. Indemnification</h3>
              <p className="text-gray-600 mb-4">Vendors and Foodrient are indemnified against:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Claims from stolen Peps or unauthorized transactions.</li>
                <li>Disputes between users over Peps transfers/sales.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">c. Prohibited Actions</h3>
              <p className="text-gray-600 mb-4">Vendors cannot:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Buy, sell, or trade Peps directly with customers.</li>
                <li>Offer alternate rewards that conflict with Foodrient's Peps system.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Vendor Obligations for Reward Programs</h2>
              <p className="text-gray-600 mb-4">Promotional Support:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Vendors may display Foodrient-approved marketing materials for referral/affiliate programs.</li>
                <li>Must direct customers to official Foodrient channels (e.g., app, website) for program details.</li>
              </ul>

              <p className="text-gray-600 mb-4">Transparency:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Vendors must clearly communicate that Peps are issued and managed solely by Foodrient.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. Modifications & Compliance</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Foodrient may update program terms with 30 days' notice.</li>
                <li>Violations (e.g., circumventing referral restrictions) may result in fines or termination.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">15. Contact Us</h2>
              <p className="text-gray-600 mb-4">For questions or concerns regarding these Vendor Terms and Conditions, please contact us at:</p>
              <p className="text-gray-600">
                Email: <a href="mailto:support@gmail.com" className="text-yellow-600 hover:text-yellow-700">support@gmail.com</a><br />
                Phone: <a href="tel:0808 056 2857" className="text-yellow-600 hover:text-yellow-700">0808 056 2857</a>
              </p>

              <p className="text-gray-600 mt-8 font-medium">
                By registering as a vendor on Foodrient, you acknowledge that you have read, understood, and agreed to these Vendor Terms and Conditions. Thank you for partnering with Foodrient to deliver quality products and services to our customers!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorTerms;