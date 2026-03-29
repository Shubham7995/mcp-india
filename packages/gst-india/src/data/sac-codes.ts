import type { SacEntry } from "../types.js";

export const SAC_CODES: SacEntry[] = [
  // Group 9954: Construction services
  { code: "9954", description: "Construction services of buildings and civil engineering works", rate: 18, group: "99" },
  { code: "995411", description: "Construction of residential buildings", rate: 12, group: "99" },
  { code: "995421", description: "Construction of commercial buildings", rate: 18, group: "99" },
  { code: "995461", description: "Plumbing and HVAC installation", rate: 18, group: "99" },
  { code: "995462", description: "Electrical installation and wiring", rate: 18, group: "99" },

  // Group 9961-9962: Wholesale and retail trade
  { code: "9961", description: "Wholesale trade services", rate: 18, group: "99" },
  { code: "9962", description: "Retail trade services", rate: 18, group: "99" },

  // Group 9963: Accommodation and food
  { code: "9963", description: "Accommodation, food, and beverage services", rate: 18, group: "99" },
  { code: "996311", description: "Hotel room tariff (up to Rs 1000)", rate: 12, group: "99" },
  { code: "996312", description: "Hotel room tariff (Rs 1001 to Rs 7500)", rate: 18, group: "99" },
  { code: "996313", description: "Hotel room tariff (above Rs 7500)", rate: 28, group: "99" },
  { code: "996331", description: "Restaurant services (non-AC, without alcohol)", rate: 5, group: "99" },
  { code: "996332", description: "Restaurant services (AC or with alcohol license)", rate: 18, group: "99" },
  { code: "996333", description: "Outdoor catering services", rate: 18, group: "99" },

  // Group 9964: Passenger transport
  { code: "9964", description: "Passenger transportation services", rate: 18, group: "99" },
  { code: "996411", description: "Local land transport (taxi, auto-rickshaw)", rate: 5, group: "99" },
  { code: "996412", description: "Inter-city bus and coach transport", rate: 5, group: "99" },
  { code: "996421", description: "Railway passenger transport", rate: 5, group: "99" },
  { code: "996422", description: "Metro and urban rail transport", rate: 12, group: "99" },
  { code: "996431", description: "Domestic air passenger transport (economy)", rate: 5, group: "99" },
  { code: "996432", description: "Domestic air passenger transport (business)", rate: 12, group: "99" },

  // Group 9965: Goods transport
  { code: "9965", description: "Goods transport and logistics services", rate: 18, group: "99" },
  { code: "996511", description: "Road freight transport (GTA)", rate: 5, group: "99" },
  { code: "996521", description: "Rail freight transport", rate: 5, group: "99" },
  { code: "996531", description: "Sea and coastal freight transport", rate: 18, group: "99" },
  { code: "996541", description: "Air freight transport", rate: 18, group: "99" },

  // Group 9966: Vehicle rental
  { code: "9966", description: "Rental services of transport vehicles with operator", rate: 18, group: "99" },
  { code: "996601", description: "Car rental with chauffeur", rate: 18, group: "99" },

  // Group 9967: Supporting transport
  { code: "9967", description: "Supporting transport services (cargo, storage)", rate: 18, group: "99" },
  { code: "996711", description: "Cargo handling and warehouse services", rate: 18, group: "99" },
  { code: "996721", description: "Cold storage services", rate: 18, group: "99" },

  // Group 9968: Postal and courier
  { code: "9968", description: "Postal and courier services", rate: 18, group: "99" },
  { code: "996811", description: "India Post postal services", rate: 0, group: "99" },
  { code: "996812", description: "Private courier services", rate: 18, group: "99" },

  // Group 9969: Electricity, gas, water
  { code: "9969", description: "Electricity, gas, water, and waste services", rate: 18, group: "99" },
  { code: "996911", description: "Transmission and distribution of electricity", rate: 18, group: "99" },
  { code: "996921", description: "Gas distribution through pipeline", rate: 5, group: "99" },

  // Group 9971: Financial services
  { code: "9971", description: "Financial and related services", rate: 18, group: "99" },
  { code: "997111", description: "Banking services (deposits, loans, LC)", rate: 18, group: "99" },
  { code: "997113", description: "Credit card and payment processing", rate: 18, group: "99" },
  { code: "997131", description: "Stock broking and securities trading", rate: 18, group: "99" },
  { code: "997132", description: "Asset and portfolio management", rate: 18, group: "99" },
  { code: "997133", description: "Life insurance services", rate: 18, group: "99" },
  { code: "997134", description: "General insurance services", rate: 18, group: "99" },
  { code: "997135", description: "Health insurance services", rate: 18, group: "99" },
  { code: "997136", description: "Reinsurance services", rate: 18, group: "99" },
  { code: "997139", description: "Other financial services (NEC)", rate: 18, group: "99" },

  // Group 9972: Real estate
  { code: "9972", description: "Real estate services", rate: 18, group: "99" },
  { code: "997211", description: "Rental of residential property", rate: 0, group: "99" },
  { code: "997212", description: "Rental of commercial property", rate: 18, group: "99" },
  { code: "997221", description: "Real estate agency and brokerage", rate: 18, group: "99" },

  // Group 9973: Leasing and rental
  { code: "9973", description: "Leasing or rental services (without operator)", rate: 18, group: "99" },
  { code: "997311", description: "Machinery and equipment rental", rate: 18, group: "99" },
  { code: "997314", description: "IT equipment rental (computers, servers)", rate: 18, group: "99" },
  { code: "997319", description: "Other goods rental services", rate: 18, group: "99" },

  // Group 9981: Research and development
  { code: "9981", description: "Research and development services", rate: 18, group: "99" },
  { code: "998111", description: "R&D in natural sciences", rate: 18, group: "99" },
  { code: "998112", description: "R&D in social sciences", rate: 18, group: "99" },
  { code: "998113", description: "R&D in biotechnology", rate: 18, group: "99" },

  // Group 9982: Legal and accounting
  { code: "9982", description: "Legal and accounting services", rate: 18, group: "99" },
  { code: "998211", description: "Legal advisory and representation", rate: 18, group: "99" },
  { code: "998212", description: "Arbitration and mediation", rate: 18, group: "99" },
  { code: "998221", description: "Auditing and accounting services", rate: 18, group: "99" },
  { code: "998222", description: "Tax consulting and preparation", rate: 18, group: "99" },
  { code: "998224", description: "Insolvency and receivership", rate: 18, group: "99" },

  // Group 9983: Professional and consulting
  { code: "9983", description: "Other professional, technical, and business services", rate: 18, group: "99" },
  { code: "998311", description: "Management consulting services", rate: 18, group: "99" },
  { code: "998312", description: "Business consulting and advisory", rate: 18, group: "99" },
  { code: "998313", description: "IT consulting and strategy", rate: 18, group: "99" },
  { code: "998314", description: "Supply chain and logistics consulting", rate: 18, group: "99" },
  { code: "998321", description: "Architecture and urban planning", rate: 18, group: "99" },
  { code: "998322", description: "Engineering and design services", rate: 18, group: "99" },
  { code: "998331", description: "Scientific and technical consulting", rate: 18, group: "99" },
  { code: "998339", description: "Other technical and scientific services", rate: 18, group: "99" },
  { code: "998341", description: "Veterinary services", rate: 18, group: "99" },

  // Group 9984: Telecom and IT
  { code: "9984", description: "Telecommunications, broadcasting, and IT services", rate: 18, group: "99" },
  { code: "998411", description: "Wired telephone and internet services", rate: 18, group: "99" },
  { code: "998412", description: "Mobile and wireless telecom services", rate: 18, group: "99" },
  { code: "998413", description: "Internet access and ISP services", rate: 18, group: "99" },
  { code: "998421", description: "Online content and streaming", rate: 18, group: "99" },
  { code: "998431", description: "Radio and television broadcasting", rate: 18, group: "99" },

  // Group 9985: IT and computer services
  { code: "9985", description: "IT and computer-related services", rate: 18, group: "99" },
  { code: "998511", description: "IT consulting and support", rate: 18, group: "99" },
  { code: "998512", description: "Custom software development", rate: 18, group: "99" },
  { code: "998513", description: "Software licensing (SaaS, perpetual)", rate: 18, group: "99" },
  { code: "998514", description: "Website hosting and cloud services", rate: 18, group: "99" },
  { code: "998515", description: "IT infrastructure management", rate: 18, group: "99" },
  { code: "998516", description: "Data processing and database services", rate: 18, group: "99" },
  { code: "998519", description: "Other IT services (NEC)", rate: 18, group: "99" },

  // Group 9986: Business support
  { code: "9986", description: "Business support and auxiliary services", rate: 18, group: "99" },
  { code: "998611", description: "Employment and recruitment services", rate: 18, group: "99" },
  { code: "998614", description: "Security and investigation services", rate: 18, group: "99" },
  { code: "998615", description: "Cleaning and janitorial services", rate: 18, group: "99" },
  { code: "998616", description: "Packing and packaging services", rate: 18, group: "99" },
  { code: "998619", description: "Office admin and support services", rate: 18, group: "99" },

  // Group 9987: Maintenance and repair
  { code: "9987", description: "Maintenance, repair, and installation services", rate: 18, group: "99" },
  { code: "998711", description: "Repair of electronics and electrical", rate: 18, group: "99" },
  { code: "998712", description: "Repair of machinery and transport", rate: 18, group: "99" },
  { code: "998713", description: "Repair of personal and household goods", rate: 18, group: "99" },
  { code: "998714", description: "Building maintenance and facilities management", rate: 18, group: "99" },

  // Group 9988: Manufacturing/job work
  { code: "9988", description: "Manufacturing services on physical inputs owned by others", rate: 18, group: "99" },
  { code: "998810", description: "Job work in food products and textiles", rate: 5, group: "99" },
  { code: "998820", description: "Job work in metals and machinery", rate: 18, group: "99" },

  // Group 9989: Other manufacturing
  { code: "9989", description: "Other manufacturing and publishing services", rate: 18, group: "99" },
  { code: "998912", description: "Printing and publishing services", rate: 18, group: "99" },
  { code: "998913", description: "Coin and medal minting", rate: 18, group: "99" },

  // Group 9991-9992: Public admin, education
  { code: "9991", description: "Public administration and government services", rate: 0, group: "99" },
  { code: "9992", description: "Education services", rate: 0, group: "99" },
  { code: "999210", description: "Pre-primary and primary education", rate: 0, group: "99" },
  { code: "999220", description: "Secondary and higher secondary education", rate: 0, group: "99" },
  { code: "999230", description: "Higher education (degree, diploma)", rate: 0, group: "99" },
  { code: "999240", description: "Vocational and skill training", rate: 18, group: "99" },

  // Group 9993: Health
  { code: "9993", description: "Human health and social care services", rate: 0, group: "99" },
  { code: "999311", description: "Hospital inpatient services", rate: 0, group: "99" },
  { code: "999312", description: "Medical and dental outpatient", rate: 0, group: "99" },
  { code: "999322", description: "Residential care for elderly", rate: 0, group: "99" },

  // Group 9994: Sewage and waste
  { code: "9994", description: "Sewage and waste collection, treatment", rate: 0, group: "99" },

  // Group 9995: Recreation, culture, sports
  { code: "9995", description: "Recreational, cultural, and sporting services", rate: 18, group: "99" },
  { code: "999511", description: "Cinema exhibition (box office)", rate: 18, group: "99" },
  { code: "999531", description: "Amusement park and theme park", rate: 18, group: "99" },
  { code: "999532", description: "Gambling and betting services", rate: 28, group: "99" },

  // Group 9996: Personal care and beauty
  { code: "9996", description: "Services of membership organisations", rate: 18, group: "99" },
  { code: "999611", description: "Trade and business association", rate: 18, group: "99" },
  { code: "999612", description: "Professional membership bodies", rate: 18, group: "99" },

  // Group 9997: Other services
  { code: "9997", description: "Other personal services", rate: 18, group: "99" },
  { code: "999711", description: "Laundry and dry-cleaning services", rate: 18, group: "99" },
  { code: "999712", description: "Beauty and spa treatment services", rate: 18, group: "99" },
  { code: "999721", description: "Funeral, cremation, and burial services", rate: 0, group: "99" },
];

/** Search SAC codes by keyword or partial code. Case-insensitive, max 20 results. */
export function searchSacCodes(query: string): SacEntry[] {
  const q = query.toLowerCase();
  const results: SacEntry[] = [];

  for (const entry of SAC_CODES) {
    if (results.length >= 20) break;
    if (entry.code.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q)) {
      results.push(entry);
    }
  }

  return results;
}
