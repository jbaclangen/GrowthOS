-- Guided onboarding answers (BI-12, D-021). Customer-provided provenance: entered by the owner,
-- never written by the analysis pipeline, so re-runs keep them. RLS on business_profiles already applies.
alter table public.business_profiles
  add column service_area text,
  add column current_tools text[] not null default '{}';

alter table public.business_profiles
  add constraint business_profiles_goals_length check (goals is null or char_length(goals) <= 300),
  add constraint business_profiles_service_area_length check (service_area is null or char_length(service_area) <= 200),
  add constraint business_profiles_current_tools_count check (cardinality(current_tools) <= 15);

comment on column public.business_profiles.goals is 'Customer-provided: the owner''s primary goal (guided onboarding, BI-12). Not written by the pipeline.';
comment on column public.business_profiles.service_area is 'Customer-provided: where the business serves customers (BI-12). Not written by the pipeline.';
comment on column public.business_profiles.current_tools is 'Customer-provided: tools the business already uses (BI-12). Not written by the pipeline.';
