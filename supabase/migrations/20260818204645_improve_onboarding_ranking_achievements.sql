alter table public.profiles
  add column if not exists product_tour_completed boolean not null default false;

comment on column public.profiles.product_tour_completed is
  'Indica se o usuário concluiu ou pulou a apresentação guiada do aplicativo.';

-- Usuários já existentes não devem receber uma apresentação de "primeiro acesso".
update public.profiles set product_tour_completed = true;

alter table public.profiles alter column daily_goal_minutes set default 60;
update public.profiles set daily_goal_minutes = 60 where daily_goal_minutes = 45;

drop function if exists public.get_ranking(integer);
drop function if exists private.get_ranking_impl(integer);

create function private.get_ranking_impl(p_limit integer default 50)
returns table(
  rank_position bigint,
  user_id uuid,
  display_name text,
  avatar_path text,
  linkedin_handle text,
  total_xp bigint,
  total_seconds bigint,
  current_streak integer,
  completed_days bigint,
  level integer
)
language sql
security definer
set search_path = ''
as $$
  with allowed as (select private.assert_user()),
  completed as (
    select d.user_id, d.study_date,
      row_number() over (partition by d.user_id order by d.study_date desc) as rn,
      max(d.study_date) over (partition by d.user_id) as last_date
    from public.daily_progress d
    where d.is_completed
  ),
  streaks as (
    select user_id,
      count(*) filter (
        where last_date >= current_date - 1
          and study_date = last_date - (rn::integer - 1)
      )::integer as current_streak
    from completed
    group by user_id
  ),
  stats as (
    select p.id, p.full_name, p.display_name, p.avatar_url, p.linkedin_handle,
      p.ranking_visibility,
      coalesce(x.total_xp, 0)::bigint as total_xp,
      coalesce(d.total_seconds, 0)::bigint as total_seconds,
      coalesce(d.completed_days, 0)::bigint as completed_days,
      coalesce(s.current_streak, 0) as current_streak
    from public.profiles p
    cross join allowed
    left join lateral (
      select sum(amount)::bigint as total_xp
      from public.xp_transactions where user_id = p.id
    ) x on true
    left join lateral (
      select sum(total_duration_seconds)::bigint as total_seconds,
        count(*) filter (where is_completed)::bigint as completed_days
      from public.daily_progress where user_id = p.id
    ) d on true
    left join streaks s on s.user_id = p.id
    where p.ranking_visibility <> 'hidden'
  ),
  ranked as (
    select row_number() over (
      order by total_xp desc, completed_days desc, total_seconds desc, id
    ) as rank_position, *
    from stats
  )
  select rank_position, id,
    case ranking_visibility
      when 'anonymous' then 'Participante anônimo'
      when 'nickname' then coalesce(nullif(display_name, ''), 'Participante')
      when 'first_name' then split_part(full_name, ' ', 1)
      else full_name
    end,
    case when ranking_visibility = 'anonymous' then null else avatar_url end,
    case when ranking_visibility = 'anonymous' then null else linkedin_handle end,
    total_xp, total_seconds, current_streak, completed_days,
    case when total_xp >= 5500 then 7 when total_xp >= 3600 then 6
      when total_xp >= 2200 then 5 when total_xp >= 1250 then 4
      when total_xp >= 650 then 3 when total_xp >= 250 then 2 else 1 end
  from ranked
  limit least(greatest(p_limit, 1), 100);
$$;

create function public.get_ranking(p_limit integer default 50)
returns table(
  rank_position bigint, user_id uuid, display_name text, avatar_path text,
  linkedin_handle text, total_xp bigint, total_seconds bigint,
  current_streak integer, completed_days bigint, level integer
)
language sql security invoker set search_path = ''
as $$ select * from private.get_ranking_impl($1); $$;

revoke all on function public.get_ranking(integer) from public, anon;
grant execute on function public.get_ranking(integer) to authenticated;
revoke all on function private.get_ranking_impl(integer) from public, anon, authenticated;
grant execute on function private.get_ranking_impl(integer) to authenticated;

insert into public.achievements(slug,name,description,icon,xp_reward,condition_type,condition_value)
values
  ('first-checkin','Primeiro passo','Faça seu primeiro check-in','footprints',20,'checkins',1),
  ('streak-3','Aquecimento','Mantenha 3 dias consecutivos','flame',30,'streak',3),
  ('week-streak','Semana de fogo','Mantenha 7 dias consecutivos','calendar-check',70,'streak',7),
  ('streak-15','Ritmo imparável','Mantenha 15 dias consecutivos','badge-check',150,'streak',15),
  ('streak-30','Disciplina de aço','Mantenha 30 dias consecutivos','shield-check',300,'streak',30),
  ('first-hour','Primeira hora','Complete sua primeira hora de estudo','clock-3',50,'total_seconds',3600),
  ('hours-10','Dez horas de evolução','Acumule 10 horas de estudo','timer',100,'total_seconds',36000),
  ('hours-25','Mestre do foco','Acumule 25 horas de estudo','hourglass',200,'total_seconds',90000),
  ('hours-50','Alta performance','Acumule 50 horas de estudo','gauge',350,'total_seconds',180000),
  ('hours-100','Lenda das 100 horas','Acumule 100 horas de estudo','gem',700,'total_seconds',360000),
  ('top-10','Elite do Top 10','Entre para o Top 10 do ranking','medal',150,'rank_position',10),
  ('top-3','Pódio da comunidade','Entre para o Top 3 do ranking','crown',300,'rank_position',3),
  ('complete','Jornada lendária','Conclua os 100 dias da jornada','trophy',1000,'completed_days',100)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, icon = excluded.icon,
  xp_reward = excluded.xp_reward, condition_type = excluded.condition_type,
  condition_value = excluded.condition_value, is_active = true;

create or replace function private.evaluate_session_achievements()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_completed_sessions integer;
  v_minutes integer;
  v_total_seconds bigint;
  v_finish_hour integer;
  v_timezone text;
  v_achievement record;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  select coalesce(timezone, 'America/Sao_Paulo') into v_timezone
    from public.profiles where id = new.user_id;
  select count(*)::integer, coalesce(sum(effective_duration_seconds), 0)::bigint
    into v_completed_sessions, v_total_seconds
    from public.study_sessions where user_id = new.user_id and status = 'completed';
  v_minutes := floor(new.effective_duration_seconds / 60);
  v_finish_hour := extract(hour from new.finished_at at time zone v_timezone)::integer;
  for v_achievement in
    select id from public.achievements where is_active and (
      (condition_type = 'checkouts' and condition_value <= v_completed_sessions)
      or (condition_type = 'session_minutes' and condition_value <= v_minutes)
      or (condition_type = 'total_seconds' and condition_value <= v_total_seconds)
      or (condition_type = 'finish_hour_after' and v_finish_hour >= condition_value)
    )
  loop
    perform private.grant_achievement(new.user_id, v_achievement.id, new.id, new.challenge_id);
  end loop;
  return new;
end;
$$;

create function private.evaluate_ranking_achievements()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_position bigint;
  v_achievement record;
begin
  if new.transaction_type = 'achievement' then return new; end if;
  with scores as (
    select p.id,
      coalesce(sum(x.amount), 0)::bigint as xp,
      row_number() over (order by coalesce(sum(x.amount), 0) desc, p.id) as position
    from public.profiles p
    left join public.xp_transactions x on x.user_id = p.id
    where p.ranking_visibility <> 'hidden'
    group by p.id
  ) select position into v_position from scores where id = new.user_id;
  for v_achievement in
    select id from public.achievements
    where is_active and condition_type = 'rank_position' and condition_value >= v_position
  loop
    perform private.grant_achievement(new.user_id, v_achievement.id, new.session_id, new.challenge_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists xp_transactions_award_ranking_achievements on public.xp_transactions;
create trigger xp_transactions_award_ranking_achievements
after insert on public.xp_transactions
for each row execute function private.evaluate_ranking_achievements();

revoke all on function private.evaluate_session_achievements() from public, anon, authenticated;
revoke all on function private.evaluate_ranking_achievements() from public, anon, authenticated;
