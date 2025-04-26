import React, { useState } from 'react';
import { MainMenu } from '../components/MainMenu';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string | JSX.Element;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const FAQ = () => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleItem = (question: string) => {
    setOpenItems(prev => ({ ...prev, [question]: !prev[question] }));
  };

  const faqSections: FAQSection[] = [
    {
      title: "General Questions",
      items: [
        {
          question: "What is Foodrient?",
          answer: "Foodrient is a platform that revolutionizes group food buying in Nigeria. By connecting buyers, we help you save money, reduce waste, and build community through collective purchasing. Join the smart food shopping revolution today!"
        },
        {
          question: "What is group buying?",
          answer: "Group buying is a purchasing strategy where multiple buyers come together to buy products in bulk. This allows everyone in the group to access better prices and deals than they could get individually."
        },
        {
          question: "How does Foodrient work?",
          answer: "You can join a group to buy food items in bulk or you can pick products randomly from multiple vendors in your location. Either way, once the group reaches the required size, the deal is activated, and you can enjoy discounted prices. Payments are made securely, and delivery options are provided."
        }
      ]
    },
    {
      title: "PEPS and Rewards",
      items: [
        {
          question: "What are PEPS?",
          answer: "PEPS (Points Earned Per Sale) are our platform's reward points. You earn PEPS through various activities like successful referrals. 1 PEP = ₦1 in value."
        },
        {
          question: "How do I earn PEPS?",
          answer: (
            <div>
              <p>You can earn PEPS in several ways:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>0.5% of transaction value for successful referrals</li>
                <li>Participating in special group buys</li>
                <li>Refunds by vendors</li>
                <li>Special promotions and events</li>
              </ul>
            </div>
          )
        },
        {
          question: "How can I use my PEPS?",
          answer: "PEPS can be used to pay for purchases on Foodrient. You can use them exclusively or combine them with other payment methods. PEPS are automatically applied at checkout when available."
        }
      ]
    },
    {
      title: "Affiliate Marketing & Referrals",
      items: [
        {
          question: "How does the referral program work?",
          answer: (
            <div>
              <p>Our referral program rewards you for bringing new customers to Foodrient:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Share your unique referral link with friends</li>
                <li>When they make their first purchase, you earn PEPS worth 0.5% of their transaction</li>
                <li>There's no limit to how many people you can refer</li>
                <li>Referral rewards are automatically credited to your PEPS balance</li>
              </ul>
            </div>
          )
        },
        {
          question: "Where can I find my referral link?",
          answer: "Your unique referral link can be found in your account dashboard under the 'Referrals' section. You can share this link directly or use our social sharing buttons to spread the word."
        }
      ]
    },
    {
      title: "Price Tiers and Group Buying",
      items: [
        {
          question: "How do price tiers work?",
          answer: (
            <div>
              <p>Price tiers are structured discounts based on group size:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>The more people join, the lower the price gets</li>
                <li>Each tier has a minimum participant requirement</li>
                <li>Prices are automatically adjusted when new tiers are reached</li>
                <li>You always pay the lowest achieved price tier</li>
              </ul>
            </div>
          )
        },
        {
          question: "What happens if a price tier isn't reached?",
          answer: "If a higher price tier isn't reached, you'll still get the discount from the highest achieved tier. You're never charged more than the price tier that was actually reached."
        }
      ]
    },
    {
      title: "Payment and Delivery",
      items: [
        {
          question: "What payment methods are accepted?",
          answer: (
            <div>
              <p>We accept multiple payment methods:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Bank transfers</li>
                <li>Debit/Credit cards</li>
                <li>PEPS (platform reward points)</li>
                <li>Mixed payment (PEPS + other methods)</li>
              </ul>
            </div>
          )
        },
        {
          question: "How is delivery handled?",
          answer: (
            <div>
              <p>We offer three delivery options:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Pickup from designated locations</li>
                <li>Door-step delivery (additional fee applies)</li>
                <li>Stockpiling for non-perishable items (up to 2 weeks)</li>
              </ul>
            </div>
          )
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <MainMenu />
      
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-xl text-gray-600">
              Everything you need to know about Foodrient
            </p>
          </div>

          <div className="space-y-6">
            {faqSections.map((section) => (
              <div
                key={section.title}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-150"
                >
                  <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                  {openSections[section.title] ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {openSections[section.title] && (
                  <div className="px-6 py-4 space-y-4">
                    {section.items.map((item) => (
                      <div key={item.question} className="border-b border-gray-200 last:border-0">
                        <button
                          onClick={() => toggleItem(item.question)}
                          className="w-full py-4 flex items-center justify-between text-left"
                        >
                          <h3 className="text-base font-medium text-gray-900 pr-8">{item.question}</h3>
                          {openItems[item.question] ? (
                            <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          )}
                        </button>
                        
                        {openItems[item.question] && (
                          <div className="pb-4 prose prose-sm max-w-none text-gray-600">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600">
              Still have questions? {' '}
              <a href="mailto:support@foodrient.com" className="text-yellow-600 hover:text-yellow-700 font-medium">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;