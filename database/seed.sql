-- File: backend/database/seed.sql
-- Run after schema.sql. Passwords are bcrypt hashes for: password123
INSERT INTO users (name, email, password, role)
VALUES ('Demo Admin', 'admin@example.com', '$2a$10$vDmU3g.6fiHzdLwh6eWFuOI.KN09ZCkeq1As/yjRq60iTzWWKwMLe', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Demo student (password123) so attendance/RSVP flow can be tried immediately
INSERT INTO users (name, email, password, role)
VALUES ('Demo Student', 'student@example.com', '$2a$10$vDmU3g.6fiHzdLwh6eWFuOI.KN09ZCkeq1As/yjRq60iTzWWKwMLe', 'student')
ON CONFLICT (email) DO NOTHING;

INSERT INTO recipients (name, contact_person, city, capacity_kg)
VALUES ('Community Food Center', 'Demo Contact', 'Springfield', 100)
ON CONFLICT DO NOTHING;

-- Dummy menus for today through +13 days (weekly rotation)
-- Items are JSONB arrays of { name, category, portionsPlanned }
WITH days AS (
  SELECT generate_series(CURRENT_DATE, CURRENT_DATE + 13, interval '1 day')::date AS d
),
tpl AS (
  SELECT * FROM (VALUES
    (0, 'Idli Sambhar, Coconut Chutney, Tea/Coffee', 'Rice, Dal Tadka, Aloo Gobi, Salad', 'Chapati, Paneer Bhurji, Rice, Curd'),
    (1, 'Poha, Sprouts, Tea/Coffee', 'Rice, Rajma, Bhindi Fry, Papad', 'Chapati, Mix Veg, Rice, Boondi Raita'),
    (2, 'Upma, Banana, Tea/Coffee', 'Rice, Chana Dal, Cabbage Sabzi, Salad', 'Chapati, Egg Curry / Soya Curry, Rice, Curd'),
    (3, 'Aloo Paratha, Curd, Pickle', 'Rice, Dal Fry, Baingan Bharta, Salad', 'Chapati, Kadhi Pakora, Rice, Papad'),
    (4, 'Bread Omelette / Sandwich, Tea/Coffee', 'Veg Pulao, Dal Makhani, Raita, Salad', 'Chapati, Chole, Rice, Gulab Jamun'),
    (5, 'Dosa, Sambhar, Chutney', 'Rice, Dal, Seasonal Sabzi, Salad', 'Chapati, Malai Kofta, Rice, Curd'),
    (6, 'Chole Bhature, Tea/Coffee', 'Veg Biryani, Raita, Salad, Papad', 'Chapati, Paneer Butter Masala, Rice, Kheer')
  ) AS t(dow, breakfast, lunch, dinner)
),
expanded AS (
  SELECT
    days.d AS menu_date,
    EXTRACT(DOW FROM days.d)::int AS dow,
    tpl.breakfast,
    tpl.lunch,
    tpl.dinner
  FROM days
  JOIN tpl ON tpl.dow = EXTRACT(DOW FROM days.d)::int
)
INSERT INTO menus (date, meal_type, items, baseline_attendance)
SELECT menu_date, meal_type, items::jsonb, baseline
FROM expanded
CROSS JOIN LATERAL (
  VALUES
    ('breakfast', (
      SELECT jsonb_agg(jsonb_build_object('name', trim(x), 'category', 'Main', 'portionsPlanned', 320))
      FROM unnest(string_to_array(breakfast, ',')) AS x
    ), 320),
    ('lunch', (
      SELECT jsonb_agg(jsonb_build_object('name', trim(x), 'category', 'Main', 'portionsPlanned', 500))
      FROM unnest(string_to_array(lunch, ',')) AS x
    ), 500),
    ('dinner', (
      SELECT jsonb_agg(jsonb_build_object('name', trim(x), 'category', 'Main', 'portionsPlanned', 450))
      FROM unnest(string_to_array(dinner, ',')) AS x
    ), 450)
) AS m(meal_type, items, baseline)
ON CONFLICT (date, meal_type) DO NOTHING;
