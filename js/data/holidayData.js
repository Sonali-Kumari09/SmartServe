/* holidayData.js — holiday calendar used by holiday.js, calendar.js and forecast.js
 * demandFactor multiplies expected attendance for forecasting:
 *   < 1  -> fewer people expected (students go home)
 *   > 1  -> more people expected (special-menu / festival day, guests join)
 * A few entries are generated relative to "today" so the demo always has
 * something upcoming to show; replace with your institution's real calendar. */
const HolidayData = (() => {
  const key = (d) => DateUtils.toKey(d);
  const today = new Date();

  const list = [
    {
      date: key(DateUtils.addDays(today, 3)),
      name: 'Founders\' Day',
      tagline: 'Campus holiday — mess open only for lunch, festive thali',
      specialMenu: {
        breakfast: [],
        lunch: ['Veg Pulao', 'Paneer Butter Masala', 'Kadhi', 'Boondi Raita', 'Gulab Jamun'],
        dinner: ['Khichdi', 'Papad', 'Curd']
      },
      demandFactor: 0.55
    },
    {
      date: key(DateUtils.addDays(today, 10)),
      name: 'Sports Meet',
      tagline: 'High footfall expected — extra lunch counters open',
      specialMenu: {
        breakfast: ['Poha', 'Banana', 'Tea'],
        lunch: ['Rajma Chawal', 'Mix Veg', 'Salad', 'Sweet Lassi'],
        dinner: ['Chapati', 'Chana Masala', 'Rice', 'Kheer']
      },
      demandFactor: 1.35
    },
    {
      date: key(DateUtils.addDays(today, 21)),
      name: 'Autumn Break Begins',
      tagline: 'Most students depart by noon — dinner headcount will be low',
      specialMenu: {
        breakfast: ['Aloo Paratha', 'Curd', 'Pickle'],
        lunch: ['Regular menu'],
        dinner: []
      },
      demandFactor: 0.3
    }
  ];

  function all() { return list; }
  function byDate(dateKey) { return list.find(h => h.date === dateKey) || null; }

  return { all, byDate };
})();
