do $$
declare
  v_profile record;
  v_achievement record;
  v_checkins integer;
  v_streak integer;
  v_total_seconds bigint;
  v_position bigint;
  v_challenge uuid;
begin
  for v_profile in select id from public.profiles loop
    select count(*)::integer into v_checkins
      from public.daily_checkins where user_id = v_profile.id;

    with sequence as (
      select checkin_date,
        row_number() over (order by checkin_date desc) as row_number,
        max(checkin_date) over () as last_date
      from public.daily_checkins where user_id = v_profile.id
    )
    select count(*)::integer into v_streak from sequence
      where checkin_date = last_date - (row_number::integer - 1);

    select coalesce(sum(effective_duration_seconds), 0)::bigint into v_total_seconds
      from public.study_sessions
      where user_id = v_profile.id and status = 'completed';

    select id into v_challenge from public.challenges
      where user_id = v_profile.id order by created_at desc limit 1;

    for v_achievement in
      select id from public.achievements where is_active and (
        (condition_type in ('checkins', 'completed_days') and condition_value <= v_checkins)
        or (condition_type = 'streak' and condition_value <= v_streak)
        or (condition_type = 'total_seconds' and condition_value <= v_total_seconds)
      )
    loop
      perform private.grant_achievement(v_profile.id, v_achievement.id, null, v_challenge);
    end loop;
  end loop;

  for v_profile in
    with scores as (
      select p.id,
        row_number() over (order by coalesce(sum(x.amount), 0) desc, p.id) as position
      from public.profiles p
      left join public.xp_transactions x on x.user_id = p.id
      where p.ranking_visibility <> 'hidden'
      group by p.id
    ) select * from scores
  loop
    v_position := v_profile.position;
    select id into v_challenge from public.challenges
      where user_id = v_profile.id order by created_at desc limit 1;
    for v_achievement in
      select id from public.achievements
      where is_active and condition_type = 'rank_position' and condition_value >= v_position
    loop
      perform private.grant_achievement(v_profile.id, v_achievement.id, null, v_challenge);
    end loop;
  end loop;
end;
$$;
