import React from 'react';
import { MainMenu } from '../components/MainMenu';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <MainMenu />
      
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Foodrient Privacy Policy</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: February 2025</p>

            <div className="prose prose-yellow max-w-none">
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Introduction</h2>
              <p className="text-gray-600 mb-4">
                Foodrient ("we," "us," "our") is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy outlines how we collect, use, store, and protect your data in compliance with the Nigeria Data Protection Regulation (NDPR) and global best practices. By using our platform, you consent to the practices described in this policy.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
              <p className="text-gray-600 mb-4">
                We collect and process the following types of personal information to provide and improve our services:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Personal Identification Information: Name, email address, phone number, and other contact details.</li>
                <li>Delivery Information: Delivery address, preferences, and location data.</li>
                <li>Payment Information: Payment details (e.g., card information, bank account details) processed through secure payment gateways.</li>
                <li>Usage Data: Information about how you interact with our platform, including IP address, device information, browsing behavior, and preferences.</li>
                <li>Other Information: Any additional information you voluntarily provide, such as feedback or survey responses.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-600 mb-4">We use your personal information for the following purposes:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Order Processing and Fulfillment: To process and fulfill your orders, including group buying transactions, delivery, and payment processing.</li>
                <li>Communication: To send you updates about your orders, group buys, delivery status, and promotional offers (with your consent).</li>
                <li>Service Improvement: To analyze usage patterns, improve our platform, and develop new features.</li>
                <li>Legal Compliance: To comply with applicable laws, regulations, and legal processes.</li>
                <li>Customer Support: To respond to your inquiries, resolve issues, and provide support.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Data Protection and Security</h2>
              <p className="text-gray-600 mb-4">
                We are committed to safeguarding your personal information and have implemented robust security measures to protect it. These measures include:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Encryption: All sensitive data, including payment information, is encrypted during transmission and storage.</li>
                <li>Access Controls: Access to your personal information is restricted to authorized personnel only.</li>
                <li>Regular Audits: We conduct regular security audits to ensure compliance with the NDPR and global data protection standards.</li>
                <li>Third-Party Partners: We work with trusted third-party service providers who adhere to strict data protection protocols.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Your Rights Under the NDPR</h2>
              <p className="text-gray-600 mb-4">
                In accordance with the Nigeria Data Protection Regulation (NDPR), you have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Right to Access: You can request a copy of the personal data we hold about you.</li>
                <li>Right to Correction: You can request that we correct any inaccurate or incomplete data.</li>
                <li>Right to Deletion: You can request the deletion of your personal data, subject to legal and contractual obligations.</li>
                <li>Right to Object: You can object to the processing of your data for specific purposes, such as marketing.</li>
                <li>Right to Data Portability: You can request that we transfer your data to another service provider in a structured, commonly used format.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
              <p className="text-gray-600 mb-4">
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Sharing of Information</h2>
              <p className="text-gray-600 mb-4">
                We do not sell, trade, or rent your personal information to third parties. However, we may share your data with:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Service Providers: Trusted partners who assist us in delivering our services (e.g., payment processors, delivery partners).</li>
                <li>Legal Authorities: When required by law or to protect our rights, property, or safety.</li>
                <li>Business Transfers: In the event of a merger, acquisition, or sale of assets, your data may be transferred to the new entity.</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. International Data Transfers</h2>
              <p className="text-gray-600 mb-4">
                If your data is transferred outside Nigeria, we ensure that it is protected by adequate safeguards, such as standard contractual clauses or compliance with international data protection standards.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Children's Privacy</h2>
              <p className="text-gray-600 mb-4">
                Our platform is not intended for individuals under the age of 18. We do not knowingly collect or process personal information from minors. If we become aware of such data, we will take steps to delete it promptly.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-gray-600 mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. The updated policy will be posted on our platform with the revised "Last Updated" date. We encourage you to review this policy periodically.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at:
              </p>
              <p className="text-gray-600">
                Email: <a href="mailto:support@foodrient.com" className="text-yellow-600 hover:text-yellow-700">support@foodrient.com</a><br />
                Phone: <a href="tel:0808 056 2857" className="text-yellow-600 hover:text-yellow-700">0808 056 2857</a>
              </p>

              <p className="text-gray-600 mt-8">
                Thank you for trusting Foodrient with your personal information. We are dedicated to protecting your privacy and providing a secure and seamless experience on our platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;