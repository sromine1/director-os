-- Local development seed data for DirectorOS
-- Safe to reset. No production identifiers.

insert into public.executive_briefs (
 subject,sender,recipients,priority,category,executive_summary,
 action_items,decisions_required,risks,has_attachments
)
values
('PowerCo Steering Committee','vp@powerco.example','director@example.com','Critical','Customer','PowerCo requests executive approval before next steering committee.','Review proposal\nApprove funding','Approve implementation schedule','Delay may impact milestone',true),
('STIHL AI Search Update','product@stihl.example','director@example.com','High','AI','Algolia AI cost model requires executive review before rollout.','Validate cost assumptions','Approve pilot budget','Token costs may exceed forecast',false),
('Weekly Leadership Update','ceo@example.com','director@example.com','Medium','Operations','Routine leadership update with no immediate executive action.',null,null,null,false)
on conflict do nothing;