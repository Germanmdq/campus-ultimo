-- Store Dropbox cursor for incremental sync
CREATE TABLE IF NOT EXISTS public.dropbox_state (
  id integer PRIMARY KEY DEFAULT 1,
  cursor text,
  updated_at timestamptz DEFAULT now()
);


