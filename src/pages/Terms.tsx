import React from 'react';
import { MainMenu } from '../components/MainMenu';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <MainMenu />
      
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Foodrient Terms and Conditions</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: February 2025</p>

            <div className="prose prose-yellow max-w-none">
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-600 mb-4">By accessing or using the Foodrient platform, you agree to be bound by these Terms and Conditions ("Terms"). These Terms are governed by the laws of the Federal Republic of Nigeria, including but not limited to the Consumer Protection Council Act, the Nigeria Data Protection Regulation (NDPR), and other relevant legislation. If you do not agree to these Terms, you must not use our platform.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Eligibility</h2>
              <p className="text-gray-600 mb-4">To use Foodrient, you must:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Be at least 18 years old.</li>
                <li>Have the legal capacity to enter into a binding agreement.</li>
                <li>Provide accurate and complete information during registration.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Group Buying Process</h2>
              <p className="text-gray-600 mb-4">Foodrient facilitates group buying, allowing users to purchase products in group and in bulk at discounted prices. The following terms apply:</p>

              <p className="text-gray-600 mb-4">Minimum Participant Requirements: Each group buy has a minimum number of participants required for the deal to proceed. This requirement will be clearly stated on the product page.</p>

              <p className="text-gray-600 mb-4">Payment Terms:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Payment must be made 2 days before the product sharing day.</li>
                <li>A 2.5% transaction fee will be charged to buyers for every payment processed through the platform.</li>
                <li>We accept payments through secure methods, including bank transfers and card payments via Paystack.</li>
              </ul>

              <p className="text-gray-600 mb-4">Cancellations:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Customers may cancel their participation in a group buy at least 3 days before the purchase window closes to be eligible for a refund.</li>
                <li>If the minimum participant requirement is not met, the group buy will/may be canceled, and all payments will be refunded.</li>
                <li>Vendors may cancel a group buy due to unforeseen circumstances. In such cases, customers will be notified, and refunds will be processed.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Delivery and Pickup</h2>
              <p className="text-gray-600 mb-4">Foodrient offers the following delivery options:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Pickup from Designated Locations: Customers may collect their orders from specified pickup points at no additional cost.</li>
                <li>Door-Step Delivery: Orders can be delivered directly to your address. Additional delivery fees may apply, depending on your location and the product's weight.</li>
                <li>Stockpiling: For non-perishable items only, customers may opt to store their orders for future use.</li>
              </ul>
              <p className="text-gray-600 mb-4">Delivery timelines and fees will be communicated during the checkout process. Foodrient is not responsible for delays caused by factors beyond vendor's control, such as weather conditions or logistical issues.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Refund Policy</h2>
              <p className="text-gray-600 mb-4">Refunds will be processed within 3-5 business days under the following circumstances:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>The group buy does not meet the minimum participant requirement.</li>
                <li>The vendor cancels the order.</li>
                <li>The customer cancels their participation at least 3 days before the purchase window closes.</li>
              </ul>
              <p className="text-gray-600 mb-4">Refunds will be issued to the original payment method used during the transaction. For assistance with refunds, please contact our support team.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Vendor Responsibilities</h2>
              <p className="text-gray-600 mb-4">Vendors using the Foodrient platform agree to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Provide accurate and complete information about their products, including pricing, descriptions, and availability.</li>
                <li>Fulfill orders in a timely manner and maintain the quality of products as advertised.</li>
                <li>Comply with all applicable laws, including food safety regulations and the NDPR.</li>
                <li>Pay a 5% platform fee for each successful group buy, with the remaining 95% of the payment transferred to the vendor's account.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. User Responsibilities</h2>
              <p className="text-gray-600 mb-4">As a user of Foodrient, you agree to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Provide accurate and up-to-date information during registration and transactions.</li>
                <li>Use the platform only for lawful purposes and in compliance with these Terms.</li>
                <li>Not engage in fraudulent activities, including but not limited to false claims, unauthorized transactions, or misuse of payment methods.</li>
                <li>Respect the intellectual property rights of Foodrient and its vendors.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Dispute Resolution</h2>
              <p className="text-gray-600 mb-4">In the event of a dispute, Foodrient is committed to resolving issues fairly and efficiently. The following steps will be taken:</p>
              <ol className="list-decimal pl-6 mb-4 text-gray-600">
                <li>Internal Resolution: Contact our support team at support@foodrient.com/08080562857 to report the issue. We will investigate and attempt to resolve the matter within 7 business days.</li>
                <li>Mediation: If the issue remains unresolved, parties may opt for mediation through a neutral third party.</li>
                <li>Legal Action: If mediation fails, disputes will be resolved in accordance with Nigerian law. Users have the right to file complaints with the Consumer Protection Council or seek redress through the appropriate courts in Nigeria.</li>
              </ol>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">Foodrient shall not be liable for:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Any indirect, incidental, or consequential damages arising from the use of our platform.</li>
                <li>Delays or failures in delivery caused by vendors, third-party logistics providers or unforeseen circumstances.</li>
                <li>Loss or damage to products after they have been delivered to the customer or picked up from the designated location.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Intellectual Property</h2>
              <p className="text-gray-600 mb-4">All content on the Foodrient platform, including logos, text, graphics, and software, is the property of Foodrient or its licensors and is protected by Nigerian and international intellectual property laws. You may not use, reproduce, or distribute any content without prior written consent from Foodrient.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Amendments to Terms</h2>
              <p className="text-gray-600 mb-4">Foodrient reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting on the platform. Your continued use of Foodrient after any changes constitutes your acceptance of the revised Terms.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Governing Law</h2>
              <p className="text-gray-600 mb-4">These Terms and Conditions are governed by the laws of the Federal Republic of Nigeria. Any legal actions or proceedings arising out of or related to these Terms shall be brought exclusively in the courts of Nigeria.</p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Referral & Affiliate Program</h2>
              <p className="text-gray-600 mb-4">By participating in Foodrient's Referral or Affiliate Program, you agree to the following terms:</p>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">a. Referral Rewards</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Users may refer friends to Foodrient using a unique referral link/code.</li>
                <li>A successful referral is counted when the referred user makes their first eligible purchase (minimum value may apply).</li>
                <li>Rewards (Peps) will be credited to the referrer's account within 48 hours of the referred user's qualifying purchase.</li>
                <li>Fraudulent referrals (e.g., fake accounts, self-referrals) will result in forfeiture of rewards and possible account suspension.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">b. Affiliate Program</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>All registered users are automatically approved as affiliates and may earn commissions for driving sales to foodrient.com</li>
                <li>Commissions are paid in Peps and Peps can be used in making purchase on the webapp</li>
                <li>Affiliates must comply with Nigeria's Advertising Regulations and disclose their affiliate relationship where required.</li>
                <li>Foodrient reserves the right to modify or terminate the affiliate program at any time.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. Peps Point Reward System</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">a. Earning & Value</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>1 Peps = ₦1 (Nigerian Naira).</li>
                <li>Peps can be earned through:
                  <ul className="list-circle pl-6 mt-2">
                    <li>Purchases (e.g., 5% back in Peps are may be determined by the vendor from time to time).</li>
                    <li>Referrals & affiliate commissions.</li>
                    <li>Promotional campaigns as maybe determined Foodrient team from time to time.</li>
                  </ul>
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">b. Redemption & Usage</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Peps can be used to partially or fully pay for orders on Foodrient.</li>
                <li>Users may transfer or sell Peps to other members, but:
                  <ul className="list-circle pl-6 mt-2">
                    <li>Foodrient is not liable for disputes between users.</li>
                    <li>Fraudulent transfers (e.g., stolen accounts) may result in Peps forfeiture.</li>
                    <li>When accounts are suspended or deleted, as a result of fraudulent practices or activities, Peps associated with such accounts are automatically forfeited to foodrient.com</li>
                  </ul>
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">c. Vendor Obligations</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Vendors must accept Peps as payment for group buys.</li>
                <li>Foodrient will settle vendors in cash for Peps redeemed, minus applicable fees.</li>
                <li>Vendors are not responsible for verifying Peps ownership and are therefore indemnified against any claims where stolen Peps are used in making payments to them</li>
                <li>Foodrient is also indemnified against any claims where stolen Peps are used in making payments to on the platform.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">d. User Responsibility</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Users must safeguard login details—unauthorized Peps spending due to compromised accounts will not be refunded.</li>
                <li>Peps have no cash value outside Foodrient unless sold peer-to-peer (at users' risk).</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">15. Modifications to Reward Programs</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Foodrient may adjust Peps values, earning rates, or program rules with 30 days' notice.</li>
                <li>Continued use of the platform constitutes acceptance of changes.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">16. Disputes & Liability</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Peps-related disputes between users (e.g., failed transfers) must be resolved privately—Foodrient will not mediate.</li>
                <li>Foodrient is only liable to vendors for Peps redemption, not user-to-user transactions.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">17. Contact Us</h2>
              <p className="text-gray-600 mb-4">For questions, concerns, or assistance regarding these Terms and Conditions, please contact us at:</p>
              <p className="text-gray-600">
                Email: <a href="mailto:support@foodrient.com" className="text-yellow-600 hover:text-yellow-700">support@foodrient.com</a><br />
                Phone: <a href="tel:0808 056 2857" className="text-yellow-600 hover:text-yellow-700">0808 056 2857</a>
              </p>

              <p className="text-gray-600 mt-8 font-medium">
                By using Foodrient, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.<br />
                Thank you for choosing Foodrient!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;