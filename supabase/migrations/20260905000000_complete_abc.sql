-- Existing unowned companies remain inaccessible until an administrator assigns them.
ALTER TABLE public.companies ADD COLUMN owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.companies ALTER COLUMN owner_id SET DEFAULT auth.uid();
CREATE UNIQUE INDEX companies_owner_unique ON public.companies(owner_id);
CREATE UNIQUE INDEX periods_company_month ON public.periods(company_id, start_date);
ALTER TABLE public.resources ADD CONSTRAINT resources_cost_valid CHECK (total_cost >= 0);
ALTER TABLE public.resource_distributions ADD CONSTRAINT resource_percentage_valid CHECK (percentage BETWEEN 0 AND 1);
ALTER TABLE public.activity_distributions ADD CONSTRAINT activity_percentage_valid CHECK (percentage BETWEEN 0 AND 1);
ALTER TABLE public.resource_distributions ADD CONSTRAINT resource_distribution_unique UNIQUE(resource_id, activity_id);
ALTER TABLE public.activity_distributions ADD CONSTRAINT activity_distribution_unique UNIQUE(activity_id, cost_object_id);

CREATE POLICY company_owner ON public.companies FOR ALL TO authenticated
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY period_owner ON public.periods FOR ALL TO authenticated
USING (company_id IN (SELECT id FROM public.companies))
WITH CHECK (company_id IN (SELECT id FROM public.companies));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['resources','activities','cost_objects'] LOOP
    EXECUTE format('CREATE POLICY owner_access ON public.%I FOR ALL TO authenticated USING
      (company_id IN (SELECT id FROM public.companies) AND period_id IN (SELECT id FROM public.periods WHERE company_id = %I.company_id))
      WITH CHECK (company_id IN (SELECT id FROM public.companies) AND period_id IN (SELECT id FROM public.periods WHERE company_id = %I.company_id))', t, t, t);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT nonempty_name CHECK (length(trim(name)) > 0)', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['resource_drivers','activity_drivers'] LOOP
    EXECUTE format('CREATE POLICY owner_access ON public.%I FOR ALL TO authenticated USING (company_id IN (SELECT id FROM public.companies)) WITH CHECK (company_id IN (SELECT id FROM public.companies))', t);
  END LOOP;
END $$;

CREATE POLICY resource_distribution_owner ON public.resource_distributions FOR ALL TO authenticated
USING (resource_id IN (SELECT id FROM public.resources))
WITH CHECK (EXISTS (SELECT 1 FROM public.resources r JOIN public.activities a ON a.period_id = r.period_id WHERE r.id = resource_id AND a.id = activity_id));
CREATE POLICY activity_distribution_owner ON public.activity_distributions FOR ALL TO authenticated
USING (activity_id IN (SELECT id FROM public.activities))
WITH CHECK (EXISTS (SELECT 1 FROM public.activities a JOIN public.cost_objects c ON c.period_id = a.period_id WHERE a.id = activity_id AND c.id = cost_object_id));

CREATE OR REPLACE FUNCTION public.open_abc_period(p_month date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE c uuid; p public.periods;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  SELECT id INTO c FROM companies WHERE owner_id = auth.uid();
  IF c IS NULL THEN INSERT INTO companies(name) VALUES ('Mi empresa') RETURNING id INTO c; END IF;
  p_month := date_trunc('month', p_month)::date;
  INSERT INTO periods(company_id, name, start_date, end_date)
  VALUES(c, to_char(p_month, 'YYYY-MM'), p_month, (p_month + interval '1 month - 1 day')::date)
  ON CONFLICT(company_id, start_date) DO NOTHING;
  SELECT * INTO p FROM periods WHERE company_id = c AND start_date = p_month;
  RETURN to_jsonb(p);
END $$;

-- Replacement is transactional, including clearing all distributions with [].
CREATE OR REPLACE FUNCTION public.save_abc_distributions(p_kind text, p_source uuid, p_rows jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE p uuid;
BEGIN
  IF p_kind = 'resource' THEN SELECT period_id INTO p FROM resources WHERE id = p_source;
  ELSIF p_kind = 'activity' THEN SELECT period_id INTO p FROM activities WHERE id = p_source;
  ELSE RAISE EXCEPTION 'Tipo de asignación inválido'; END IF;
  IF p IS NULL THEN RAISE EXCEPTION 'Origen no disponible'; END IF;
  PERFORM 1 FROM periods WHERE id = p FOR UPDATE;
  IF jsonb_typeof(p_rows) <> 'array' OR p_rows IS NULL THEN RAISE EXCEPTION 'Asignaciones inválidas'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) x WHERE (x->>'percentage') IS NULL OR (x->>'percentage')::numeric NOT BETWEEN 0 AND 1)
    OR (SELECT coalesce(sum((x->>'percentage')::numeric),0) FROM jsonb_array_elements(p_rows) x) > 1
  THEN RAISE EXCEPTION 'El total debe estar entre 0 y 100%%'; END IF;
  IF p_kind = 'resource' THEN
    DELETE FROM resource_distributions WHERE resource_id = p_source;
    INSERT INTO resource_distributions(resource_id, activity_id, percentage)
      SELECT p_source, (x->>'activity_id')::uuid, (x->>'percentage')::numeric FROM jsonb_array_elements(p_rows) x;
  ELSE
    DELETE FROM activity_distributions WHERE activity_id = p_source;
    INSERT INTO activity_distributions(activity_id, cost_object_id, percentage)
      SELECT p_source, (x->>'cost_object_id')::uuid, (x->>'percentage')::numeric FROM jsonb_array_elements(p_rows) x;
  END IF;
END $$;

-- Any input change invalidates both stages so reports cannot display stale totals.
CREATE OR REPLACE FUNCTION public.invalidate_abc_results()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE p uuid;
BEGIN
  IF TG_TABLE_NAME IN ('resources','activities','cost_objects') THEN
    IF TG_OP = 'DELETE' THEN p := OLD.period_id; ELSE p := NEW.period_id; END IF;
  ELSIF TG_TABLE_NAME = 'resource_distributions' THEN
    SELECT period_id INTO p FROM resources WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.resource_id ELSE NEW.resource_id END;
  ELSE
    SELECT period_id INTO p FROM activities WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.activity_id ELSE NEW.activity_id END;
  END IF;
  PERFORM 1 FROM periods WHERE id = p FOR UPDATE;
  UPDATE resource_distributions SET assigned_cost = NULL WHERE resource_id IN (SELECT id FROM resources WHERE period_id = p);
  UPDATE activity_distributions SET assigned_cost = NULL WHERE activity_id IN (SELECT id FROM activities WHERE period_id = p);
  RETURN NULL;
END $$;
CREATE TRIGGER invalidate_resources AFTER INSERT OR UPDATE OR DELETE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.invalidate_abc_results();
CREATE TRIGGER invalidate_activities AFTER INSERT OR UPDATE OR DELETE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.invalidate_abc_results();
CREATE TRIGGER invalidate_products AFTER INSERT OR UPDATE OR DELETE ON public.cost_objects FOR EACH ROW EXECUTE FUNCTION public.invalidate_abc_results();
CREATE TRIGGER invalidate_resource_distribution AFTER INSERT OR DELETE OR UPDATE OF percentage, resource_id, activity_id ON public.resource_distributions FOR EACH ROW EXECUTE FUNCTION public.invalidate_abc_results();
CREATE TRIGGER invalidate_activity_distribution AFTER INSERT OR DELETE OR UPDATE OF percentage, activity_id, cost_object_id ON public.activity_distributions FOR EACH ROW EXECUTE FUNCTION public.invalidate_abc_results();

CREATE OR REPLACE FUNCTION public.calculate_abc_period(p_period_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM periods WHERE id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Período no disponible'; END IF;
  IF NOT EXISTS(SELECT 1 FROM resources WHERE period_id = p_period_id) THEN RAISE EXCEPTION 'Agrega recursos al período'; END IF;
  IF EXISTS(SELECT r.id FROM resources r LEFT JOIN resource_distributions d ON d.resource_id = r.id
    WHERE r.period_id = p_period_id GROUP BY r.id HAVING coalesce(sum(d.percentage),0) <> 1)
  THEN RAISE EXCEPTION 'Asigna el 100%% de cada recurso'; END IF;
  IF EXISTS(SELECT a.id FROM activities a LEFT JOIN activity_distributions d ON d.activity_id = a.id
    WHERE a.period_id = p_period_id GROUP BY a.id HAVING coalesce(sum(d.percentage),0) <> 1)
  THEN RAISE EXCEPTION 'Asigna el 100%% de cada actividad'; END IF;
  -- Cumulative rounding preserves the original cost to the cent in each stage.
  WITH amounts AS (
    SELECT d.id, r.total_cost,
      sum(d.percentage) OVER(PARTITION BY r.id ORDER BY d.id) AS running, d.percentage
    FROM resource_distributions d JOIN resources r ON r.id = d.resource_id WHERE r.period_id = p_period_id
  ) UPDATE resource_distributions d SET assigned_cost = round(a.total_cost*a.running,2) - round(a.total_cost*(a.running-a.percentage),2)
    FROM amounts a WHERE a.id = d.id;
  WITH costs AS (
    SELECT a.id, coalesce(sum(d.assigned_cost),0) AS total_cost FROM activities a
    LEFT JOIN resource_distributions d ON d.activity_id = a.id WHERE a.period_id = p_period_id GROUP BY a.id
  ), amounts AS (
    SELECT d.id, c.total_cost, d.percentage, sum(d.percentage) OVER(PARTITION BY c.id ORDER BY d.id) AS running
    FROM activity_distributions d JOIN costs c ON c.id = d.activity_id
  ) UPDATE activity_distributions d SET assigned_cost = round(a.total_cost*a.running,2) - round(a.total_cost*(a.running-a.percentage),2)
    FROM amounts a WHERE a.id = d.id;
END $$;

REVOKE ALL ON FUNCTION public.open_abc_period(date), public.save_abc_distributions(text,uuid,jsonb), public.calculate_abc_period(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_abc_period(date), public.save_abc_distributions(text,uuid,jsonb), public.calculate_abc_period(uuid) TO authenticated;
