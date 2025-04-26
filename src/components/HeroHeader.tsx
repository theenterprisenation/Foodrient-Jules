import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
}

const heroSlides: HeroSlide[] = [
  {
    image: 'https://wealthacademy.stellawealth.co/foodrient/img/tomatoes.jpg',
    title: 'Together! Shop Smarter.',
    subtitle: 'Unlock Bigger Savings',
    description: 'Join the food-buying revolution in Nigeria. Team up, buy in bulk, and slash costs while enjoying top-quality groceries.',
    cta: 'Start Saving Big'
  },
  {
    image: 'https://wealthacademy.stellawealth.co/foodrient/img/potatoes.jpg',
    title: 'Strength in Numbers!',
    subtitle: 'Savings on Your Plate',
    description: 'We revolutionize how Nigeria shops for food. Connect with neighbors, buy collectively, and enjoy fresh food for less.',
    cta: 'Explore Varieties'
  },
  {
    image: 'https://wealthacademy.stellawealth.co/foodrient/img/peppers.jpg',
    title: 'More Food, Less Waste, Maximum Savings!',
    subtitle: 'Spicy Deals',
    description: 'Be part of a smarter way to shop. Group buying means lower prices, fresher meals, and a stronger community.',
    cta: 'Find Your Heat'
  },
  {
    image: 'https://wealthacademy.stellawealth.co/foodrient/img/fish.webp',
    title: 'You sell for Less!',
    subtitle: 'When You Buy Together',
    description: 'Team up with other RESTAURANTS, unlock bulk discounts, and enjoy competitive edge. Group buying is the smarter way to run a restaurant.',
    cta: 'Catch of the Day'
  }
];

export const HeroHeader: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 21000); // Changed to 21 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-[600px] overflow-hidden">
      {/* Background Slides */}
      {heroSlides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute inset-0">
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
          </div>
        </div>
      ))}

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-full flex items-center">
          <div className="max-w-xl">
            {heroSlides.map((slide, index) => (
              <div
                key={index}
                className={`transition-all duration-1000 absolute ${
                  index === currentSlide
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
              >
                <span className="block text-yellow-400 text-sm font-semibold tracking-wide uppercase mb-2">
                  {slide.subtitle}
                </span>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {slide.title}
                </h1>
                <p className="mt-4 text-xl text-gray-300">
                  {slide.description}
                </p>
                <div className="mt-8">
                  <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-500 transition-colors duration-200">
                    {slide.cta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-yellow-400 w-8'
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};