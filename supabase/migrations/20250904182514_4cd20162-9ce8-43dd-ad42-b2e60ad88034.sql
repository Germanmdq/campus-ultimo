-- Delete any test/demo lessons
DELETE FROM lessons WHERE title LIKE '%demo%' OR title LIKE '%test%' OR title = 'ghfghd';