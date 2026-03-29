import type { HsnEntry } from "../types.js";

export const HSN_CODES: HsnEntry[] = [
  // Chapter 01-05: Live animals and animal products
  { code: "0102", description: "Live bovine animals (cattle, buffalo)", rate: 0, chapter: "01", schedule: "Exempt" },
  { code: "0201", description: "Fresh or chilled beef meat", rate: 0, chapter: "02", schedule: "Exempt" },
  { code: "0207", description: "Fresh or chilled poultry meat", rate: 0, chapter: "02", schedule: "Exempt" },
  { code: "0301", description: "Live fish", rate: 0, chapter: "03", schedule: "Exempt" },
  { code: "0401", description: "Fresh milk and pasteurised milk", rate: 0, chapter: "04", schedule: "Exempt" },
  { code: "0406", description: "Cheese and curd", rate: 12, chapter: "04", schedule: "II" },
  { code: "0407", description: "Birds eggs in shell, fresh or preserved", rate: 0, chapter: "04", schedule: "Exempt" },
  { code: "0409", description: "Natural honey", rate: 0, chapter: "04", schedule: "Exempt" },
  { code: "0504", description: "Animal guts, bladders, stomachs (non-edible)", rate: 5, chapter: "05", schedule: "I" },

  // Chapter 06-14: Vegetable products
  { code: "0701", description: "Potatoes, fresh or chilled", rate: 0, chapter: "07", schedule: "Exempt" },
  { code: "0702", description: "Tomatoes, fresh or chilled", rate: 0, chapter: "07", schedule: "Exempt" },
  { code: "0703", description: "Onions, garlic, leeks, fresh", rate: 0, chapter: "07", schedule: "Exempt" },
  { code: "0713", description: "Dried leguminous vegetables (pulses)", rate: 0, chapter: "07", schedule: "Exempt" },
  { code: "0801", description: "Coconuts, Brazil nuts, cashew nuts", rate: 5, chapter: "08", schedule: "I" },
  { code: "0803", description: "Bananas, fresh or dried", rate: 0, chapter: "08", schedule: "Exempt" },
  { code: "0805", description: "Citrus fruits (oranges, lemons)", rate: 0, chapter: "08", schedule: "Exempt" },
  { code: "0901", description: "Coffee beans, roasted or unroasted", rate: 5, chapter: "09", schedule: "I" },
  { code: "0902", description: "Tea (green, black, herbal)", rate: 5, chapter: "09", schedule: "I" },
  { code: "0904", description: "Pepper and chillies, dried", rate: 5, chapter: "09", schedule: "I" },
  { code: "0910", description: "Ginger, saffron, turmeric, cumin", rate: 5, chapter: "09", schedule: "I" },
  { code: "1001", description: "Wheat and meslin", rate: 0, chapter: "10", schedule: "Exempt" },
  { code: "1005", description: "Maize (corn)", rate: 0, chapter: "10", schedule: "Exempt" },
  { code: "1006", description: "Rice (paddy, husked, milled)", rate: 0, chapter: "10", schedule: "Exempt" },
  { code: "1101", description: "Wheat or meslin flour (atta)", rate: 0, chapter: "11", schedule: "Exempt" },
  { code: "1201", description: "Soya beans", rate: 5, chapter: "12", schedule: "I" },
  { code: "1202", description: "Groundnuts (peanuts)", rate: 5, chapter: "12", schedule: "I" },
  { code: "1207", description: "Mustard seeds and other oil seeds", rate: 0, chapter: "12", schedule: "Exempt" },

  // Chapter 15-16: Fats, oils, and prepared foods
  { code: "1501", description: "Pig fat (lard) and poultry fat", rate: 12, chapter: "15", schedule: "II" },
  { code: "1507", description: "Soya bean oil, refined", rate: 5, chapter: "15", schedule: "I" },
  { code: "1509", description: "Olive oil", rate: 5, chapter: "15", schedule: "I" },
  { code: "1511", description: "Palm oil, refined", rate: 5, chapter: "15", schedule: "I" },
  { code: "1515", description: "Groundnut oil, mustard oil, sesame oil", rate: 5, chapter: "15", schedule: "I" },
  { code: "1601", description: "Sausages and prepared meat", rate: 12, chapter: "16", schedule: "II" },
  { code: "1604", description: "Prepared or preserved fish (canned)", rate: 12, chapter: "16", schedule: "II" },

  // Chapter 17-21: Sugar, cocoa, prepared foods
  { code: "1701", description: "Cane or beet sugar", rate: 5, chapter: "17", schedule: "I" },
  { code: "1704", description: "Sugar confectionery (sweets, toffee)", rate: 18, chapter: "17", schedule: "III" },
  { code: "1806", description: "Chocolate and cocoa preparations", rate: 18, chapter: "18", schedule: "III" },
  { code: "1901", description: "Malt extract and infant food preparations", rate: 18, chapter: "19", schedule: "III" },
  { code: "1902", description: "Pasta, noodles, and vermicelli", rate: 12, chapter: "19", schedule: "II" },
  { code: "1905", description: "Bread, biscuits, cakes, and pastries", rate: 18, chapter: "19", schedule: "III" },
  { code: "2001", description: "Pickles and vegetables preserved in vinegar", rate: 12, chapter: "20", schedule: "II" },
  { code: "2006", description: "Jams, jellies, and marmalades", rate: 12, chapter: "20", schedule: "II" },
  { code: "2101", description: "Instant coffee and tea extracts", rate: 18, chapter: "21", schedule: "III" },
  { code: "2104", description: "Soups and broths (packaged)", rate: 18, chapter: "21", schedule: "III" },
  { code: "2106", description: "Namkeen, bhujia, and similar snacks", rate: 12, chapter: "21", schedule: "II" },

  // Chapter 22: Beverages
  { code: "2201", description: "Mineral water and packaged drinking water", rate: 18, chapter: "22", schedule: "III" },
  { code: "2202", description: "Aerated and sweetened drinks (cola, soda)", rate: 28, chapter: "22", schedule: "IV" },
  { code: "2204", description: "Wine of fresh grapes", rate: 28, chapter: "22", schedule: "IV" },
  { code: "2207", description: "Ethyl alcohol and spirits", rate: 18, chapter: "22", schedule: "III" },

  // Chapter 23-24: Residues, tobacco
  { code: "2302", description: "Bran, husks, and other cereal residues", rate: 5, chapter: "23", schedule: "I" },
  { code: "2401", description: "Unmanufactured tobacco", rate: 28, chapter: "24", schedule: "IV" },
  { code: "2402", description: "Cigars, cigarettes, and tobacco products", rate: 28, chapter: "24", schedule: "IV" },
  { code: "2403", description: "Pan masala and gutkha", rate: 28, chapter: "24", schedule: "IV" },

  // Chapter 25-27: Mineral products, fuels
  { code: "2501", description: "Salt (including table salt)", rate: 0, chapter: "25", schedule: "Exempt" },
  { code: "2515", description: "Marble and travertine", rate: 12, chapter: "25", schedule: "II" },
  { code: "2523", description: "Portland cement and similar cements", rate: 28, chapter: "25", schedule: "IV" },
  { code: "2701", description: "Coal, briquettes, and solid fuels", rate: 5, chapter: "27", schedule: "I" },
  { code: "2710", description: "Petroleum oils and fuels", rate: 18, chapter: "27", schedule: "III" },
  { code: "2711", description: "LPG and natural gas", rate: 5, chapter: "27", schedule: "I" },

  // Chapter 28-29: Chemicals
  { code: "2801", description: "Chlorine, iodine, fluorine", rate: 18, chapter: "28", schedule: "III" },
  { code: "2836", description: "Carbonates (sodium bicarbonate, soda ash)", rate: 18, chapter: "28", schedule: "III" },
  { code: "2853", description: "Hydrogen peroxide", rate: 18, chapter: "28", schedule: "III" },
  { code: "2901", description: "Hydrocarbons (methane, ethylene)", rate: 18, chapter: "29", schedule: "III" },
  { code: "2936", description: "Vitamins and provitamins", rate: 5, chapter: "29", schedule: "I" },

  // Chapter 30: Pharmaceuticals
  { code: "3001", description: "Glands, organs for therapeutic use", rate: 5, chapter: "30", schedule: "I" },
  { code: "3003", description: "Medicaments (not in dosage form)", rate: 12, chapter: "30", schedule: "II" },
  { code: "3004", description: "Medicaments in measured doses (tablets, capsules)", rate: 12, chapter: "30", schedule: "II" },
  { code: "3005", description: "Bandages, plasters, and wound dressings", rate: 12, chapter: "30", schedule: "II" },
  { code: "3006", description: "Blood, vaccines, and diagnostic reagents", rate: 5, chapter: "30", schedule: "I" },

  // Chapter 31-33: Fertilizers, tanning, essential oils
  { code: "3101", description: "Animal or vegetable fertilizers", rate: 5, chapter: "31", schedule: "I" },
  { code: "3105", description: "Mineral or chemical fertilizers", rate: 5, chapter: "31", schedule: "I" },
  { code: "3208", description: "Paints and varnishes (non-aqueous)", rate: 28, chapter: "32", schedule: "IV" },
  { code: "3209", description: "Paints and varnishes (aqueous/water-based)", rate: 18, chapter: "32", schedule: "III" },
  { code: "3213", description: "Artists colours and drawing inks", rate: 18, chapter: "32", schedule: "III" },
  { code: "3301", description: "Essential oils (perfumery, aromatherapy)", rate: 18, chapter: "33", schedule: "III" },
  { code: "3304", description: "Beauty and makeup preparations", rate: 18, chapter: "33", schedule: "III" },
  { code: "3305", description: "Hair oil, shampoo, and hair preparations", rate: 18, chapter: "33", schedule: "III" },
  { code: "3306", description: "Toothpaste and oral hygiene products", rate: 18, chapter: "33", schedule: "III" },
  { code: "3307", description: "Perfumes, deodorants, and room fresheners", rate: 28, chapter: "33", schedule: "IV" },

  // Chapter 34-38: Soap, wax, plastics precursors
  { code: "3401", description: "Soap bars and organic cleaning products", rate: 18, chapter: "34", schedule: "III" },
  { code: "3402", description: "Detergents and washing preparations", rate: 18, chapter: "34", schedule: "III" },
  { code: "3406", description: "Candles, tapers, and similar products", rate: 12, chapter: "34", schedule: "II" },
  { code: "3605", description: "Matches (safety matches)", rate: 12, chapter: "36", schedule: "II" },
  { code: "3808", description: "Insecticides, pesticides, fungicides", rate: 18, chapter: "38", schedule: "III" },

  // Chapter 39-40: Plastics and rubber
  { code: "3917", description: "Plastic tubes, pipes, and hoses", rate: 18, chapter: "39", schedule: "III" },
  { code: "3923", description: "Plastic containers, boxes, bottles", rate: 18, chapter: "39", schedule: "III" },
  { code: "3924", description: "Plastic tableware, kitchenware, household articles", rate: 18, chapter: "39", schedule: "III" },
  { code: "3926", description: "Plastic articles not elsewhere specified", rate: 18, chapter: "39", schedule: "III" },
  { code: "4011", description: "New pneumatic tyres (rubber)", rate: 28, chapter: "40", schedule: "IV" },
  { code: "4014", description: "Rubber contraceptives (condoms)", rate: 0, chapter: "40", schedule: "Exempt" },
  { code: "4015", description: "Rubber gloves and surgical gloves", rate: 12, chapter: "40", schedule: "II" },

  // Chapter 41-43: Leather and furskins
  { code: "4104", description: "Tanned or crust hides (bovine)", rate: 5, chapter: "41", schedule: "I" },
  { code: "4202", description: "Leather trunks, suitcases, handbags", rate: 18, chapter: "42", schedule: "III" },
  { code: "4203", description: "Leather gloves, belts, and clothing", rate: 12, chapter: "42", schedule: "II" },

  // Chapter 44-49: Wood, paper, printed matter
  { code: "4401", description: "Fuel wood and wood charcoal", rate: 5, chapter: "44", schedule: "I" },
  { code: "4410", description: "Particle board (MDF, plywood)", rate: 18, chapter: "44", schedule: "III" },
  { code: "4418", description: "Builders joinery (doors, windows) of wood", rate: 18, chapter: "44", schedule: "III" },
  { code: "4802", description: "Uncoated paper for writing or printing", rate: 12, chapter: "48", schedule: "II" },
  { code: "4818", description: "Toilet paper, tissues, napkins", rate: 18, chapter: "48", schedule: "III" },
  { code: "4819", description: "Cartons, boxes, and paper packaging", rate: 18, chapter: "48", schedule: "III" },
  { code: "4820", description: "Registers, notebooks, and diaries", rate: 12, chapter: "48", schedule: "II" },
  { code: "4901", description: "Printed books, brochures, and leaflets", rate: 0, chapter: "49", schedule: "Exempt" },
  { code: "4902", description: "Newspapers, journals, and periodicals", rate: 0, chapter: "49", schedule: "Exempt" },

  // Chapter 50-63: Textiles
  { code: "5007", description: "Woven fabrics of silk", rate: 5, chapter: "50", schedule: "I" },
  { code: "5208", description: "Woven fabrics of cotton", rate: 5, chapter: "52", schedule: "I" },
  { code: "5407", description: "Woven fabrics of synthetic filament", rate: 5, chapter: "54", schedule: "I" },
  { code: "5501", description: "Synthetic filament tow (polyester, nylon)", rate: 18, chapter: "55", schedule: "III" },
  { code: "5608", description: "Knotted netting and fishing nets", rate: 5, chapter: "56", schedule: "I" },
  { code: "5701", description: "Carpets (knotted, handmade)", rate: 5, chapter: "57", schedule: "I" },
  { code: "5911", description: "Textile products for technical use", rate: 12, chapter: "59", schedule: "II" },
  { code: "6101", description: "Knitted overcoats and jackets", rate: 12, chapter: "61", schedule: "II" },
  { code: "6109", description: "T-shirts, vests, knitted", rate: 12, chapter: "61", schedule: "II" },
  { code: "6203", description: "Men's suits, trousers, and shorts", rate: 12, chapter: "62", schedule: "II" },
  { code: "6204", description: "Women's suits, dresses, and skirts", rate: 12, chapter: "62", schedule: "II" },
  { code: "6302", description: "Bed linen, table linen, towels", rate: 12, chapter: "63", schedule: "II" },
  { code: "6305", description: "Sacks and bags for packing goods", rate: 12, chapter: "63", schedule: "II" },

  // Chapter 64-67: Footwear, headgear
  { code: "6401", description: "Waterproof footwear (rubber/plastic)", rate: 18, chapter: "64", schedule: "III" },
  { code: "6402", description: "Sports footwear (rubber/plastic)", rate: 18, chapter: "64", schedule: "III" },
  { code: "6403", description: "Leather footwear", rate: 18, chapter: "64", schedule: "III" },
  { code: "6506", description: "Safety helmets and headgear", rate: 18, chapter: "65", schedule: "III" },
  { code: "6601", description: "Umbrellas and sun umbrellas", rate: 12, chapter: "66", schedule: "II" },

  // Chapter 68-70: Stone, ceramic, glass
  { code: "6802", description: "Monumental or building stone (granite, marble)", rate: 18, chapter: "68", schedule: "III" },
  { code: "6810", description: "Concrete articles (blocks, bricks, tiles)", rate: 18, chapter: "68", schedule: "III" },
  { code: "6902", description: "Refractory bricks and blocks", rate: 18, chapter: "69", schedule: "III" },
  { code: "6907", description: "Ceramic tiles and paving blocks", rate: 18, chapter: "69", schedule: "III" },
  { code: "6911", description: "Ceramic tableware and kitchenware", rate: 12, chapter: "69", schedule: "II" },
  { code: "7005", description: "Float glass and polished glass", rate: 18, chapter: "70", schedule: "III" },
  { code: "7010", description: "Glass bottles, jars, and containers", rate: 18, chapter: "70", schedule: "III" },
  { code: "7013", description: "Glassware for table or kitchen", rate: 18, chapter: "70", schedule: "III" },

  // Chapter 71: Precious metals and gems
  { code: "7101", description: "Pearls, natural or cultured", rate: 3, chapter: "71", schedule: "Special" },
  { code: "7106", description: "Silver (unwrought, semi-manufactured)", rate: 3, chapter: "71", schedule: "Special" },
  { code: "7108", description: "Gold (unwrought, semi-manufactured)", rate: 3, chapter: "71", schedule: "Special" },
  { code: "7113", description: "Gold and silver jewellery", rate: 3, chapter: "71", schedule: "Special" },
  { code: "7117", description: "Imitation jewellery (costume jewellery)", rate: 18, chapter: "71", schedule: "III" },

  // Chapter 72-73: Iron and steel
  { code: "7207", description: "Semi-finished iron or steel products", rate: 18, chapter: "72", schedule: "III" },
  { code: "7210", description: "Flat-rolled iron or steel (coated)", rate: 18, chapter: "72", schedule: "III" },
  { code: "7213", description: "Bars and rods of iron or steel", rate: 18, chapter: "72", schedule: "III" },
  { code: "7308", description: "Iron or steel structures and parts", rate: 18, chapter: "73", schedule: "III" },
  { code: "7310", description: "Iron or steel tanks, drums, containers", rate: 18, chapter: "73", schedule: "III" },
  { code: "7318", description: "Screws, bolts, nuts, and rivets", rate: 18, chapter: "73", schedule: "III" },
  { code: "7321", description: "Iron or steel stoves, cookers, BBQs", rate: 18, chapter: "73", schedule: "III" },
  { code: "7323", description: "Iron or steel table and kitchen articles", rate: 18, chapter: "73", schedule: "III" },
  { code: "7326", description: "Iron or steel articles not specified", rate: 18, chapter: "73", schedule: "III" },

  // Chapter 74-81: Other base metals
  { code: "7403", description: "Refined copper and copper alloys", rate: 18, chapter: "74", schedule: "III" },
  { code: "7411", description: "Copper tubes and pipes", rate: 18, chapter: "74", schedule: "III" },
  { code: "7604", description: "Aluminium bars, rods, and profiles", rate: 18, chapter: "76", schedule: "III" },
  { code: "7607", description: "Aluminium foil", rate: 18, chapter: "76", schedule: "III" },
  { code: "7612", description: "Aluminium containers (cans, drums)", rate: 18, chapter: "76", schedule: "III" },

  // Chapter 82-83: Tools and metal articles
  { code: "8201", description: "Hand tools (spades, shovels, axes)", rate: 18, chapter: "82", schedule: "III" },
  { code: "8205", description: "Hand tools (hammers, pliers, screwdrivers)", rate: 18, chapter: "82", schedule: "III" },
  { code: "8211", description: "Knives with cutting blades", rate: 18, chapter: "82", schedule: "III" },
  { code: "8214", description: "Razors and razor blades", rate: 18, chapter: "82", schedule: "III" },
  { code: "8301", description: "Padlocks and locks (key or combination)", rate: 18, chapter: "83", schedule: "III" },

  // Chapter 84: Nuclear reactors, boilers, machinery
  { code: "8401", description: "Nuclear reactors and fuel elements", rate: 18, chapter: "84", schedule: "III" },
  { code: "8407", description: "Spark-ignition internal combustion engines", rate: 28, chapter: "84", schedule: "IV" },
  { code: "8413", description: "Pumps for liquids", rate: 18, chapter: "84", schedule: "III" },
  { code: "8414", description: "Air or vacuum pumps, compressors, fans", rate: 18, chapter: "84", schedule: "III" },
  { code: "8415", description: "Air conditioning machines", rate: 28, chapter: "84", schedule: "IV" },
  { code: "8418", description: "Refrigerators and freezers", rate: 18, chapter: "84", schedule: "III" },
  { code: "8419", description: "Machinery for treatment by temperature", rate: 18, chapter: "84", schedule: "III" },
  { code: "8421", description: "Centrifuges and filtering machinery", rate: 18, chapter: "84", schedule: "III" },
  { code: "8422", description: "Dish washing machines", rate: 28, chapter: "84", schedule: "IV" },
  { code: "8424", description: "Spraying and dispersing machinery", rate: 18, chapter: "84", schedule: "III" },
  { code: "8428", description: "Lifting, handling, and loading machinery", rate: 18, chapter: "84", schedule: "III" },
  { code: "8429", description: "Bulldozers, excavators, and earthmoving machines", rate: 18, chapter: "84", schedule: "III" },
  { code: "8431", description: "Parts for construction and mining machinery", rate: 18, chapter: "84", schedule: "III" },
  { code: "8432", description: "Agricultural machinery (ploughs, seeders)", rate: 12, chapter: "84", schedule: "II" },
  { code: "8433", description: "Harvesting and threshing machinery", rate: 12, chapter: "84", schedule: "II" },
  { code: "8436", description: "Agricultural and horticultural machinery", rate: 12, chapter: "84", schedule: "II" },
  { code: "8437", description: "Machines for cleaning, sorting grain/seed", rate: 12, chapter: "84", schedule: "II" },
  { code: "8443", description: "Printing machinery and printers", rate: 18, chapter: "84", schedule: "III" },
  { code: "8450", description: "Household washing machines", rate: 18, chapter: "84", schedule: "III" },
  { code: "8452", description: "Sewing machines", rate: 12, chapter: "84", schedule: "II" },
  { code: "8471", description: "Computers, laptops, and data processing machines", rate: 18, chapter: "84", schedule: "III" },
  { code: "8473", description: "Parts and accessories for computers", rate: 18, chapter: "84", schedule: "III" },

  // Chapter 85: Electrical machinery and equipment
  { code: "8501", description: "Electric motors and generators", rate: 18, chapter: "85", schedule: "III" },
  { code: "8502", description: "Electric generating sets (diesel/petrol)", rate: 18, chapter: "85", schedule: "III" },
  { code: "8504", description: "Electrical transformers and converters", rate: 18, chapter: "85", schedule: "III" },
  { code: "8506", description: "Primary cells and batteries", rate: 18, chapter: "85", schedule: "III" },
  { code: "8507", description: "Electric accumulators (lead-acid, li-ion)", rate: 18, chapter: "85", schedule: "III" },
  { code: "8508", description: "Vacuum cleaners", rate: 18, chapter: "85", schedule: "III" },
  { code: "8509", description: "Electromechanical domestic appliances", rate: 18, chapter: "85", schedule: "III" },
  { code: "8516", description: "Electric water heaters, hair dryers, irons", rate: 18, chapter: "85", schedule: "III" },
  { code: "8517", description: "Telephones, smartphones, and modems", rate: 18, chapter: "85", schedule: "III" },
  { code: "8518", description: "Microphones, headphones, speakers", rate: 18, chapter: "85", schedule: "III" },
  { code: "8519", description: "Sound recording and reproducing apparatus", rate: 18, chapter: "85", schedule: "III" },
  { code: "8521", description: "Video recording and reproducing apparatus", rate: 18, chapter: "85", schedule: "III" },
  { code: "8523", description: "Discs, tapes, USB drives, memory cards", rate: 18, chapter: "85", schedule: "III" },
  { code: "8525", description: "TV cameras, digital cameras, webcams", rate: 18, chapter: "85", schedule: "III" },
  { code: "8527", description: "Radio broadcast receivers", rate: 18, chapter: "85", schedule: "III" },
  { code: "8528", description: "Monitors, projectors, and TVs", rate: 18, chapter: "85", schedule: "III" },
  { code: "8534", description: "Printed circuits (PCBs)", rate: 18, chapter: "85", schedule: "III" },
  { code: "8536", description: "Electrical switches, plugs, sockets", rate: 18, chapter: "85", schedule: "III" },
  { code: "8539", description: "Electric lamps and LEDs", rate: 18, chapter: "85", schedule: "III" },
  { code: "8541", description: "Semiconductor devices (diodes, transistors)", rate: 18, chapter: "85", schedule: "III" },
  { code: "8542", description: "Electronic integrated circuits (chips)", rate: 18, chapter: "85", schedule: "III" },
  { code: "8544", description: "Insulated wire, cables, and optical fibre", rate: 18, chapter: "85", schedule: "III" },

  // Chapter 86-89: Vehicles, aircraft, vessels
  { code: "8601", description: "Rail locomotives (electric/diesel)", rate: 12, chapter: "86", schedule: "II" },
  { code: "8703", description: "Motor cars and passenger vehicles", rate: 28, chapter: "87", schedule: "IV" },
  { code: "8704", description: "Motor vehicles for goods transport (trucks)", rate: 28, chapter: "87", schedule: "IV" },
  { code: "8711", description: "Motorcycles and scooters", rate: 28, chapter: "87", schedule: "IV" },
  { code: "8712", description: "Bicycles and non-motorised cycles", rate: 12, chapter: "87", schedule: "II" },
  { code: "8714", description: "Parts and accessories for bicycles", rate: 12, chapter: "87", schedule: "II" },

  // Chapter 90: Optical, medical, measuring instruments
  { code: "9001", description: "Optical fibres and fibre bundles", rate: 18, chapter: "90", schedule: "III" },
  { code: "9003", description: "Frames for spectacles and goggles", rate: 18, chapter: "90", schedule: "III" },
  { code: "9004", description: "Spectacles, goggles, and sunglasses", rate: 18, chapter: "90", schedule: "III" },
  { code: "9018", description: "Medical instruments and appliances", rate: 12, chapter: "90", schedule: "II" },
  { code: "9021", description: "Orthopaedic appliances and hearing aids", rate: 12, chapter: "90", schedule: "II" },
  { code: "9025", description: "Thermometers and barometers", rate: 18, chapter: "90", schedule: "III" },
  { code: "9027", description: "Instruments for physical or chemical analysis", rate: 18, chapter: "90", schedule: "III" },
  { code: "9028", description: "Gas, liquid, or electricity meters", rate: 18, chapter: "90", schedule: "III" },
  { code: "9029", description: "Revolution counters and speedometers", rate: 18, chapter: "90", schedule: "III" },
  { code: "9030", description: "Oscilloscopes, spectrum analysers", rate: 18, chapter: "90", schedule: "III" },
  { code: "9032", description: "Automatic regulating instruments", rate: 18, chapter: "90", schedule: "III" },

  // Chapter 91: Clocks and watches
  { code: "9101", description: "Wrist watches (precious metal case)", rate: 18, chapter: "91", schedule: "III" },
  { code: "9102", description: "Wrist watches (non-precious metal)", rate: 18, chapter: "91", schedule: "III" },
  { code: "9105", description: "Wall clocks, desk clocks, alarm clocks", rate: 18, chapter: "91", schedule: "III" },

  // Chapter 92: Musical instruments
  { code: "9201", description: "Pianos, harpsichords, and keyboard instruments", rate: 18, chapter: "92", schedule: "III" },
  { code: "9205", description: "Wind instruments (flute, trumpet, tabla)", rate: 18, chapter: "92", schedule: "III" },
  { code: "9206", description: "Percussion instruments (drums, cymbals)", rate: 18, chapter: "92", schedule: "III" },
  { code: "9207", description: "Electronic musical instruments", rate: 18, chapter: "92", schedule: "III" },

  // Chapter 93: Arms and ammunition
  { code: "9302", description: "Revolvers and pistols", rate: 28, chapter: "93", schedule: "IV" },
  { code: "9306", description: "Bombs, grenades, ammunition", rate: 18, chapter: "93", schedule: "III" },

  // Chapter 94: Furniture, mattresses, lighting
  { code: "9401", description: "Seats and chairs (office, domestic)", rate: 18, chapter: "94", schedule: "III" },
  { code: "9403", description: "Office and domestic furniture", rate: 18, chapter: "94", schedule: "III" },
  { code: "9404", description: "Mattresses and bedding", rate: 18, chapter: "94", schedule: "III" },
  { code: "9405", description: "Lamps, light fittings, and chandeliers", rate: 18, chapter: "94", schedule: "III" },

  // Chapter 95: Toys, games, sports goods
  { code: "9503", description: "Toys (dolls, models, puzzles, action figures)", rate: 12, chapter: "95", schedule: "II" },
  { code: "9504", description: "Video game consoles and arcade machines", rate: 28, chapter: "95", schedule: "IV" },
  { code: "9506", description: "Sports equipment (cricket bats, balls, gym)", rate: 12, chapter: "95", schedule: "II" },

  // Chapter 96: Miscellaneous manufactured articles
  { code: "9603", description: "Brooms, brushes, and mops", rate: 18, chapter: "96", schedule: "III" },
  { code: "9608", description: "Ball-point pens and markers", rate: 18, chapter: "96", schedule: "III" },
  { code: "9609", description: "Pencils, crayons, and pastels", rate: 12, chapter: "96", schedule: "II" },
  { code: "9613", description: "Cigarette lighters", rate: 18, chapter: "96", schedule: "III" },
  { code: "9619", description: "Sanitary pads, diapers, and napkins", rate: 12, chapter: "96", schedule: "II" },
];

/** Search HSN codes by keyword or partial code. Case-insensitive, max 20 results. */
export function searchHsnCodes(query: string): HsnEntry[] {
  const q = query.toLowerCase();
  const results: HsnEntry[] = [];

  for (const entry of HSN_CODES) {
    if (results.length >= 20) break;
    if (entry.code.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q)) {
      results.push(entry);
    }
  }

  return results;
}
