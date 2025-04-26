import React from 'react';
import { ShoppingBag, Users, TrendingUp, Truck, ShieldCheck, CreditCard, Star, ChevronRight, Sparkles, Scale, HandCoins, Leaf } from 'lucide-react';
import { MainMenu } from '../components/MainMenu';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <MainMenu />

      {/* Hero Section with Gradient Overlay */}
      <div className="relative bg-gradient-to-r from-yellow-500 to-yellow-600 py-24">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&w=2000&q=80"
            alt="Food market background"
            className="w-full h-full object-cover mix-blend-multiply opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-base font-semibold text-yellow-200 tracking-wide uppercase mb-3">
              Welcome to Foodrient
            </p>
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Revolutionizing Food Shopping
              <span className="block text-yellow-200 mt-2">One Group Buy at a Time</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-yellow-100">
              Join thousands of Nigerians who are transforming how they shop for food, saving money, and building stronger communities.
            </p>
          </div>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Our Mission
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              To make quality food accessible and affordable for every Nigerian household while supporting local farmers and reducing food waste through the power of collective purchasing.
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: HandCoins,
                  title: "Cost Savings",
                  description: "Up to 30% savings on your food purchases through group buying power"
                },
                {
                  icon: Scale,
                  title: "Quality Assurance",
                  description: "Direct partnerships with trusted vendors for premium quality"
                },
                {
                  icon: Leaf,
                  title: "Sustainability",
                  description: "Reducing food waste through efficient bulk purchasing"
                },
                {
                  icon: Sparkles,
                  title: "Community",
                  description: "Building stronger communities through collective buying"
                }
              ].map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mx-auto">
                    <feature.icon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="mt-6 text-lg font-medium text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-base text-gray-500">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Story Section with Timeline */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Our Journey</h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              From a simple idea to Nigeria's leading group food buying platform
            </p>
          </div>

          <div className="relative">
            {/* Timeline */}
            <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gray-200"></div>

            <div className="space-y-12">
              {[
                {
                  year: "2024",
                  title: "The Beginning",
                  description: "In 2024, Nigeria faced one of its toughest economic challenges—skyrocketing inflation surpassing 42%, with food prices hitting hardest. As an ordinary citizen, the impact was unavoidable. Requests for help from friends and neighbors quadrupled, often accompanied by heartbreaking pleas like, 'My children haven't eaten since yesterday'. Then, a viral video shook the nation—a grown man breaking down in tears at a market after realizing he couldn't afford food for his family. Moved by his plight, strangers rallied to help. Days later, I witnessed a similar scene and joined in contributing. But afterward, a pressing question lingered: How long will we rely on spontaneous generosity? The answer was clear—we needed a sustainable solution, not just goodwill or government promises. That's how Foodrient was born."
                },
                {
                  year: "2025",
                  title: "Innovation",
                  description: "By 2025, our team had turned this vision into reality with a SaaS-powered food demand aggregation and group-buying platform. Foodrient connects households and restaurants, enabling bulk purchases of quality food at affordable prices—cutting out inefficiencies and ensuring no one has to beg or weep in the market just to eat. This is more than a business. it's an ecosystem, it's a response to Nigeria's pain—a lifeline built by the people, for the people. And this is only the beginning. #Foodrient #FoodGroupBuy"
                }
              ].map((milestone, index) => (
                <div key={milestone.year} className={`relative lg:flex ${index % 2 === 0 ? 'lg:justify-start' : 'lg:justify-end'}`}>
                  <div className="lg:w-1/2 lg:px-8">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                      <div className="flex items-center">
                        <Star className="h-6 w-6 text-yellow-500" />
                        <span className="ml-3 text-lg font-semibold text-yellow-600">{milestone.year}</span>
                      </div>
                      <h3 className="mt-3 text-xl font-medium text-gray-900">{milestone.title}</h3>
                      <p className="mt-2 text-gray-600">{milestone.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">How It Works</h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Join the food revolution in three simple steps
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "Join a Group Buy",
                  description: "Browse food produce or active group buys. Connect with others looking to save on the same items."
                },
                {
                  icon: TrendingUp,
                  title: "Unlock Better Prices",
                  description: "Share links of food group-buys to earn. And as more people join, watch the prices drop. The bigger the group, the bigger the savings. You make your payment and wait for share date."
                }, 
                {
                  icon: Truck,
                  title: "Receive Your Order",
                  description: "Once the group buy target is reached, your order is processed and you will pick up or have it delivered fresh to your doorstep."
                }
              ].map((step, index) => (
                <div key={step.title} className="relative">
                  <div className="bg-white rounded-lg shadow-lg p-8 h-full">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-yellow-500 text-white mb-6">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-4">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                    {index < 2 && (
                      <div className="hidden md:block absolute top-1/2 left-full transform -translate-y-1/2 translate-x-4">
                        <ChevronRight className="h-6 w-6 text-yellow-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">See Foodrient in Action</h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Watch how our platform is changing the way Nigeria shops for food
            </p>
          </div>

          <div className="max-w-[80%] mx-auto relative pt-[45%] rounded-xl overflow-hidden shadow-lg">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/your-video-id"
              title="Foodrient Platform Overview"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-yellow-500">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Ready to start saving?
            </h2>
            <p className="mt-4 text-lg leading-6 text-yellow-100">
              Join thousands of Nigerians already saving on their food shopping.
            </p>
            <div className="mt-8">
              <a
                href="/auth"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-yellow-600 bg-white hover:bg-yellow-50"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;