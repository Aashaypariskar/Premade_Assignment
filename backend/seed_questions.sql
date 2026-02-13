-- Seeding Real Inspection Checklist Data
-- Category: Exterior of Coach
-- Setting up activities and their specific questions

-- 1. Identify or insert the Exterior Category
INSERT INTO categories (name, coach_id) SELECT 'Exterior', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Exterior' AND coach_id = 1);

-- 2. Insert Activities (Minor and Major)
-- Ensure they link to the Exterior category (assuming ID 1 for now, but we'll use a safer approach)
SET @ext_cat_id = (SELECT id FROM categories WHERE name = 'Exterior' LIMIT 1);

INSERT INTO activities (type, category_id) VALUES ('Minor', @ext_cat_id);
SET @minor_id = LAST_INSERT_ID();

INSERT INTO activities (type, category_id) VALUES ('Major', @ext_cat_id);
SET @major_id = LAST_INSERT_ID();

-- 3. Insert Minor Questions
INSERT INTO questions (text, activity_id) VALUES 
('Checking of boards for torn vinyl', @minor_id),
('Application of Vinyl on the board', @minor_id),
('Removal of boards from sick coaches', @minor_id),
('Fitment of boards as per location', @minor_id),
('Checking of Hand Rails', @minor_id),
('Attention to loose handrails', @minor_id),
('Checking foot steps for corrosion', @minor_id),
('Attention to loose footsteps', @minor_id),
('Checking Exterior Paint Condition', @minor_id),
('Checking Coach Number Marking', @minor_id);

-- 4. Insert Major Questions
INSERT INTO questions (text, activity_id) VALUES 
('Painting destination board', @major_id),
('Painting coach number plate', @major_id),
('Fitment of new handrail', @major_id),
('Fitment of new footstep', @major_id),
('Touch-up exterior painting', @major_id),
('Coach number marking', @major_id);
