-- ViralForge — Video-to-Viral Blueprint
-- À exécuter une fois, après 0005 (Supabase Dashboard → SQL Editor).

-- Les scripts sauvegardés acceptent les blueprints.
alter table public.saved_scripts drop constraint if exists saved_scripts_tool_check;
alter table public.saved_scripts
  add constraint saved_scripts_tool_check
  check (tool in ('clone', 'antidropoff', 'series', 'hooks', 'blueprint'));
