-- Verificar qué columnas tiene la tabla events
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- Si ves tanto 'visibility' como 'target_scope', ejecuta esto para eliminar la columna vieja:
-- ALTER TABLE events DROP COLUMN IF EXISTS visibility;

-- Si no ves 'target_scope', ejecuta esto para agregarla:
-- ALTER TABLE events ADD COLUMN target_scope TEXT NOT NULL DEFAULT 'all' CHECK (target_scope IN ('all', 'students', 'teachers'));

-- Si tienes datos en 'visibility' y quieres migrarlos a 'target_scope':
-- UPDATE events SET target_scope = visibility WHERE target_scope IS NULL;
