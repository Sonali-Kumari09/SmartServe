-- File: backend/database/seed.sql
-- Run after schema.sql. Passwords are bcrypt hashes for: password123
INSERT INTO users (name, email, password, role)
VALUES ('Demo Admin', 'admin@example.com', '$2a$10$vDmU3g.6fiHzdLwh6eWFuOI.KN09ZCkeq1As/yjRq60iTzWWKwMLe', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO recipients (name, contact_person, city, capacity_kg)
VALUES ('Community Food Center', 'Demo Contact', 'Springfield', 100)
ON CONFLICT DO NOTHING;
