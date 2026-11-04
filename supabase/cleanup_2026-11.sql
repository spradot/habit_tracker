-- HabitTrack — limpieza de datos sucios (noviembre 2026)
-- NO se ha ejecutado. Revisa la sección PREVIEW y luego ejecuta la sección DELETE.
-- Todo es seguro de re-ejecutar: la segunda vez no encuentra nada que borrar.

-- ── PREVIEW (solo lectura) ───────────────────────────────────────────────────
-- 1) Puntajes diarios fantasma: fecha sin pasos, ejercicio ni comida.
--    Son datos derivados; la app los recalcula desde la actividad real.
select 'score_fantasma' as tipo, d.date, d.points::text as detalle
from day_scores d
where not exists (select 1 from steps_entries    s where s.date = d.date)
  and not exists (select 1 from exercise_entries e where e.date = d.date)
  and not exists (select 1 from food_entries     f where f.date = d.date);

-- 2) Mediciones corporales duplicadas por fecha: se conserva la más completa
--    y, en empate, la más reciente.
select 'medida_duplicada' as tipo, date, id as detalle from (
  select id, date, row_number() over (
    partition by date
    order by (  (waist_cm is not null)::int + (belly_cm is not null)::int
              + (chest_cm is not null)::int + (left_arm_cm is not null)::int
              + (right_arm_cm is not null)::int + (hips_and_buttocks_cm is not null)::int) desc,
             created_at desc) as rn
  from body_measurements
) x where rn > 1;

-- 3) Pesos duplicados con la misma fecha y hora: se conserva el más reciente.
select 'peso_duplicado' as tipo, date, id || ' (' || weight || ' kg)' as detalle from (
  select id, date, weight,
         row_number() over (partition by date, time order by created_at desc) as rn
  from weight_entries
) x where rn > 1;

-- 4) Comidas importadas con el formato antiguo (un total por día).
select 'comida_formato_antiguo' as tipo, date, id as detalle
from food_entries where id like 'hc_cal_%';

-- ── DELETE ───────────────────────────────────────────────────────────────────
begin;

delete from day_scores d
where not exists (select 1 from steps_entries    s where s.date = d.date)
  and not exists (select 1 from exercise_entries e where e.date = d.date)
  and not exists (select 1 from food_entries     f where f.date = d.date);

delete from body_measurements where id in (
  select id from (
    select id, row_number() over (
      partition by date
      order by (  (waist_cm is not null)::int + (belly_cm is not null)::int
                + (chest_cm is not null)::int + (left_arm_cm is not null)::int
                + (right_arm_cm is not null)::int + (hips_and_buttocks_cm is not null)::int) desc,
               created_at desc) as rn
    from body_measurements
  ) x where rn > 1
);

delete from weight_entries where id in (
  select id from (
    select id, row_number() over (partition by date, time order by created_at desc) as rn
    from weight_entries
  ) x where rn > 1
);

delete from food_entries where id like 'hc_cal_%';

commit;
