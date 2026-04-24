CREATE TABLE public.app_data (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.app_data FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.app_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.app_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete access" ON public.app_data FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER app_data_updated_at BEFORE UPDATE ON public.app_data
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();