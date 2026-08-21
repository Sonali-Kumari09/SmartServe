/* seedData.js — demo data used to bootstrap the localStorage "DB" on first run */
const SeedData = (() => {

  const CONFIG = {
    TOTAL_STUDENTS: 640,                 // registered mess population, used as forecast ceiling
    PER_HEAD_GRAMS: { breakfast: 250, lunch: 420, dinner: 380 },
    PREP_BUFFER_PCT: 0.05,               // safety buffer added on top of forecast when recommending prep qty
    COST_PER_KG: 60,                     // ₹ per kg of cooked food (approx, for savings reports)
    CARBON_KG_CO2E_PER_KG: 2.5           // kg CO2e avoided per kg of food diverted from waste
  };

  const USERS = [
    { id: 'u_admin1', username: 'admin', password: 'admin123', role: 'admin', name: 'Mess Administrator' },
    { id: 'u_stu1', username: 'student', password: 'student123', role: 'student', name: 'Aarav Kumar' }
  ];

  const SHELTERS = [
    { id: 'sh_1', name: 'Asha Night Shelter', contact: '+91 90000 11122', capacityKg: 25, distanceKm: 2.1, eligibility: ['any'] },
    { id: 'sh_2', name: 'Prayas Old Age Home', contact: '+91 90000 33344', capacityKg: 15, distanceKm: 4.8, eligibility: ['veg'] },
    { id: 'sh_3', name: 'Umeed Children\'s Home', contact: '+91 90000 55566', capacityKg: 18, distanceKm: 3.5, eligibility: ['veg'] },
    { id: 'sh_4', name: 'Community Kitchen Trust', contact: '+91 90000 77788', capacityKg: 40, distanceKm: 6.2, eligibility: ['any'] }
  ];

  // Weekly menu template, keyed by weekday index (0=Sun ... 6=Sat)
  const WEEKLY_TEMPLATE = [
    { breakfast: ['Idli Sambhar', 'Coconut Chutney', 'Tea/Coffee'], lunch: ['Rice', 'Dal Tadka', 'Aloo Gobi', 'Salad'], dinner: ['Chapati', 'Paneer Bhurji', 'Rice', 'Curd'] },
    { breakfast: ['Poha', 'Sprouts', 'Tea/Coffee'], lunch: ['Rice', 'Rajma', 'Bhindi Fry', 'Papad'], dinner: ['Chapati', 'Mix Veg', 'Rice', 'Boondi Raita'] },
    { breakfast: ['Upma', 'Banana', 'Tea/Coffee'], lunch: ['Rice', 'Chana Dal', 'Cabbage Sabzi', 'Salad'], dinner: ['Chapati', 'Egg Curry / Soya Curry', 'Rice', 'Curd'] },
    { breakfast: ['Aloo Paratha', 'Curd', 'Pickle'], lunch: ['Rice', 'Dal Fry', 'Baingan Bharta', 'Salad'], dinner: ['Chapati', 'Kadhi Pakora', 'Rice', 'Papad'] },
    { breakfast: ['Bread Omelette / Sandwich', 'Tea/Coffee'], lunch: ['Veg Pulao', 'Dal Makhani', 'Raita', 'Salad'], dinner: ['Chapati', 'Chole', 'Rice', 'Gulab Jamun'] },
    { breakfast: ['Dosa', 'Sambhar', 'Chutney'], lunch: ['Rice', 'Dal', 'Seasonal Sabzi', 'Salad'], dinner: ['Chapati', 'Malai Kofta', 'Rice', 'Curd'] },
    { breakfast: ['Chole Bhature', 'Tea/Coffee'], lunch: ['Veg Biryani', 'Raita', 'Salad', 'Papad'], dinner: ['Chapati', 'Paneer Butter Masala', 'Rice', 'Kheer'] }
  ];

  /** Deterministic pseudo-random in [0,1) seeded by a string, so demo numbers are stable per date. */
  function seededRand(seedStr) {
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    return ((h % 1000) / 1000);
  }

  /** Generates ~28 days of past attendance history per meal, weekday-patterned, for forecast.js. */
  function buildHistory() {
    const history = [];
    const today = new Date();
    for (let i = 28; i >= 1; i--) {
      const d = DateUtils.addDays(today, -i);
      const dateKey = DateUtils.toKey(d);
      const weekday = d.getDay();
      const isWeekend = weekday === 0 || weekday === 6;
      ['breakfast', 'lunch', 'dinner'].forEach(meal => {
        const base = meal === 'lunch' ? 0.78 : meal === 'dinner' ? 0.7 : 0.5; // fraction of TOTAL_STUDENTS
        const weekendAdj = isWeekend ? -0.12 : 0;
        const noise = (seededRand(dateKey + meal) - 0.5) * 0.1;
        const attendanceFrac = Math.max(0.15, Math.min(0.95, base + weekendAdj + noise));
        const expected = Math.round(CONFIG.TOTAL_STUDENTS * (base + weekendAdj) );
        const actual = Math.round(CONFIG.TOTAL_STUDENTS * attendanceFrac);
        const perHeadKg = CONFIG.PER_HEAD_GRAMS[meal] / 1000;
        const preparedKg = Math.round(expected * perHeadKg * (1 + CONFIG.PREP_BUFFER_PCT));
        const consumedKg = Math.round(actual * perHeadKg);
        const wasteKg = Math.max(0, preparedKg - consumedKg);
        history.push({ date: dateKey, mealType: meal, expected, actual, preparedKg, consumedKg, wasteKg });
      });
    }
    return history;
  }

  function menuForDate(dateKey) {
    const holiday = HolidayData.byDate(dateKey);
    if (holiday && holiday.specialMenu) return holiday.specialMenu;
    const weekday = DateUtils.fromKey(dateKey).getDay();
    return WEEKLY_TEMPLATE[weekday];
  }

  /** Seeds the localStorage "DB" on first run only — never overwrites admin edits on revisit. */
  function seedDatabase() {
    DB.seedOnce('users', USERS);
    DB.seedOnce('shelters', SHELTERS);
    DB.seedOnce('history', buildHistory());
    DB.seedOnce('inventory', [
      { id: 'inv_1', name: 'Cooked Rice', qtyKg: 12, tempC: 3, location: 'Cold room A', storedAt: new Date(Date.now() - 20 * 3600000).toISOString() },
      { id: 'inv_2', name: 'Dal Tadka', qtyKg: 8, tempC: 65, location: 'Hot counter 1', storedAt: new Date(Date.now() - 1 * 3600000).toISOString() },
      { id: 'inv_3', name: 'Mixed Vegetables', qtyKg: 5, tempC: 22, location: 'Serving line', storedAt: new Date(Date.now() - 40 * 60000).toISOString() }
    ]);
    DB.seedOnce('surplus', []);
    DB.seedOnce('reports', { totalFoodSavedKg: 0, totalCostSavedRs: 0, totalCarbonSavedKg: 0, donationLog: [] });
  }

  return { CONFIG, USERS, SHELTERS, WEEKLY_TEMPLATE, buildHistory, menuForDate, seededRand, seedDatabase };
})();
