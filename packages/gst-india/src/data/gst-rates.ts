import type { RateSlab } from "../types.js";

export const GST_RATE_SLABS: RateSlab[] = [
  {
    rate: 0,
    schedule: "Exempt",
    description: "Essential goods and services exempt from GST",
    example_categories: [
      "Fresh fruits and vegetables",
      "Milk, eggs, and natural honey",
      "Unprocessed cereals, pulses, and flour",
      "Fresh meat, fish, and poultry",
      "Books, newspapers, and journals",
      "Healthcare and education services",
    ],
  },
  {
    rate: 5,
    schedule: "I",
    description: "Basic necessities and essential packaged goods",
    example_categories: [
      "Packaged and branded food items",
      "Sugar, tea, coffee, and edible oils",
      "Medicines and pharmaceutical products",
      "Transport services (rail, air economy)",
      "Fertilizers and organic manure",
      "Small restaurants (non-AC, turnover < 1.5 Cr)",
    ],
  },
  {
    rate: 12,
    schedule: "II",
    description: "Standard goods including processed food and electronics",
    example_categories: [
      "Processed and frozen food items",
      "Mobile phones and basic electronics",
      "Sewing machines and hand tools",
      "Preparations of vegetables and fruits",
      "Umbrellas and walking sticks",
      "Business class air travel",
    ],
  },
  {
    rate: 18,
    schedule: "III",
    description: "Most manufactured goods and services (default slab)",
    example_categories: [
      "Computers, laptops, and printers",
      "Capital goods and industrial machinery",
      "Most services (IT, consulting, telecom)",
      "Restaurants with AC or alcohol license",
      "Chocolates, pastries, and ice cream",
      "Hair oil, shampoo, and toiletries",
    ],
  },
  {
    rate: 28,
    schedule: "IV",
    description: "Luxury, sin, and demerit goods",
    example_categories: [
      "Automobiles (cars, SUVs, luxury vehicles)",
      "Tobacco, cigarettes, and pan masala",
      "Aerated drinks and energy beverages",
      "Cement and paints",
      "Air conditioners and dishwashers",
      "Gambling, betting, and casino services",
    ],
  },
  {
    rate: 3,
    schedule: "Special",
    description: "Special rate for gold, silver, and precious metals",
    example_categories: [
      "Gold bars, coins, and ornaments",
      "Silver articles and jewelry",
      "Platinum and precious metals",
      "Rough precious and semi-precious stones",
    ],
  },
];
