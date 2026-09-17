-- Toph — development seed data.
--
-- Re-runnable: truncates first, so running this file always lands in the same
-- state. The numbers here are chosen so the dashboard's stat cards agree with
-- the Figma:
--   Todays Recordings  = 5   -> five logs dated today
--   ... of which "1 New"     -> one of them created within the last hour
--   Active Workers     = 12  -> twelve employees with is_active = true
--   Response Accuracy  = 90  -> avg(transcription_confidence) ~= 0.90
--   New Employee Logs  = 4   -> four logs with is_reviewed = false
--                               (the four rows shown in the Figma table)

truncate log_tags, tags, logs, chemicals, fields, employees, farms cascade;

-- ---------------------------------------------------------------------------
-- Farm
-- ---------------------------------------------------------------------------

insert into farms (id, name) values
  ('f0000000-0000-4000-8000-000000000001', 'Bays Ranch');

-- ---------------------------------------------------------------------------
-- Employees — 12 active (the "Active Workers" card) + 2 inactive, so the
-- is_active filter is provably doing something.
-- ---------------------------------------------------------------------------

insert into employees (farm_id, full_name, role, is_active)
select f.id, v.full_name, v.role, v.is_active
from (values
  ('Isaac Wang',    'Field Worker',         true),
  ('Maya Patel',    'Field Worker',         true),
  ('Liam Johnson',  'Equipment Operator',   true),
  ('Sophia Lee',    'Irrigation Tech',      true),
  ('Diego Ramirez', 'Field Worker',         true),
  ('Amara Okafor',  'Crew Lead',            true),
  ('Noah Kim',      'Field Worker',         true),
  ('Priya Nair',    'Agronomist',           true),
  ('Mateo Silva',   'Equipment Operator',   true),
  ('Hannah Brooks', 'Field Worker',         true),
  ('Omar Haddad',   'Pest Control Advisor', true),
  ('Grace Chen',    'Crew Lead',            true),
  ('Ethan Moore',   'Field Worker',         false),
  ('Lucia Ortiz',   'Field Worker',         false)
) as v(full_name, role, is_active)
cross join farms f
where f.name = 'Bays Ranch';

-- ---------------------------------------------------------------------------
-- Fields — real coordinates in the Central Valley near Fresno, CA, so the
-- satellite tiles under the map show actual farmland.
-- boundary is a GeoJSON Polygon ring: [[[lng, lat], ...]], closed.
-- ---------------------------------------------------------------------------

insert into fields (farm_id, name, center_lat, center_lng, boundary)
select f.id, v.name, v.lat, v.lng, v.boundary::jsonb
from (values
  ('FIELD A', 36.7520, -119.7750, '[[[-119.7795,36.7555],[-119.7705,36.7555],[-119.7705,36.7485],[-119.7795,36.7485],[-119.7795,36.7555]]]'),
  ('FIELD B', 36.7480, -119.7680, '[[[-119.7725,36.7515],[-119.7635,36.7515],[-119.7635,36.7445],[-119.7725,36.7445],[-119.7725,36.7515]]]'),
  ('FIELD C', 36.7440, -119.7760, '[[[-119.7805,36.7475],[-119.7715,36.7475],[-119.7715,36.7405],[-119.7805,36.7405],[-119.7805,36.7475]]]'),
  ('FIELD D', 36.7560, -119.7660, '[[[-119.7705,36.7595],[-119.7615,36.7595],[-119.7615,36.7525],[-119.7705,36.7525],[-119.7705,36.7595]]]'),
  ('FIELD E', 36.7400, -119.7700, '[[[-119.7745,36.7435],[-119.7655,36.7435],[-119.7655,36.7365],[-119.7745,36.7365],[-119.7745,36.7435]]]'),
  ('FIELD F', 36.7600, -119.7800, '[[[-119.7845,36.7635],[-119.7755,36.7635],[-119.7755,36.7565],[-119.7845,36.7565],[-119.7845,36.7635]]]')
) as v(name, lat, lng, boundary)
cross join farms f
where f.name = 'Bays Ranch';

-- ---------------------------------------------------------------------------
-- Chemicals — rei_hours is the regulated re-entry interval, the number a
-- compliance audit actually asks about.
-- ---------------------------------------------------------------------------

insert into chemicals (farm_id, name, category, rei_hours)
select f.id, v.name, v.category, v.rei
from (values
  ('Roundup PowerMAX',   'herbicide',   4),
  ('Lorsban Advanced',   'insecticide', 24),
  ('Quilt Xcel',         'fungicide',   12),
  ('UAN-32',             'fertilizer',  0),
  ('Bravo Weather Stik', 'fungicide',   12)
) as v(name, category, rei)
cross join farms f
where f.name = 'Bays Ranch';

-- ---------------------------------------------------------------------------
-- Logs
-- ---------------------------------------------------------------------------

insert into logs (
  farm_id, employee_id, field_id, chemical_id, activity,
  log_date, start_time, end_time,
  transcript, summary, transcription_confidence, audio_duration_seconds,
  is_reviewed, created_at
)
select
  f.id, e.id, fl.id, c.id, v.activity::activity_type,
  v.log_date, v.start_time, v.end_time,
  v.transcript, v.summary, v.conf, v.duration,
  v.reviewed, v.created_at
from (values

  -- The four rows shown in the Figma table. Unreviewed, so they are exactly
  -- what "New Employee Logs (4)" returns on a fresh load.
  --
  -- The Figma dates them April 19-22, 2026. They are seeded relative to today
  -- instead, because the "This Month" chip is a real filter: with April dates
  -- it would correctly match nothing and hide every row, which looks like a
  -- broken filter rather than a working one. The employees, fields, activities
  -- and times are exactly as designed.
  ('Isaac Wang', 'FIELD A', 'Roundup PowerMAX', 'spraying',
   current_date - 5, time '06:00', time '10:40',
   'Alright, starting on Field A a little after six. Got the sprayer loaded with Roundup PowerMAX, running about twenty gallons per acre. Wind is light out of the northwest, maybe three miles an hour, so no drift concerns. Covered the whole north block and about half the south before the tank ran dry. Refilled around nine and finished out. Wrapped up about ten forty.',
   'Applied Roundup PowerMAX across Field A at roughly 20 gal/acre. Light northwest wind, no drift risk noted. One tank refill mid-morning. Full coverage completed.',
   0.94, 47, false, now() - interval '5 days'),

  ('Maya Patel', 'FIELD B', null, 'harvesting',
   current_date - 4, time '07:30', time '11:15',
   'Starting harvest on Field B at seven thirty. Crew of four on the picking line. Yield looks strong on the east side, noticeably lighter near the drainage ditch on the west edge, probably the standing water from last week. Filled nine bins total. Knocked off at quarter past eleven.',
   'Harvested Field B with a four-person crew. Nine bins filled. Yield lighter along the western drainage edge, likely due to prior standing water.',
   0.91, 38, false, now() - interval '4 days'),

  ('Liam Johnson', 'FIELD C', null, 'planting',
   current_date - 3, time '08:00', time '12:00',
   'Planting Field C this morning, started right at eight. Running the twelve row planter, thirty inch spacing, seed depth set at an inch and three quarters. Soil moisture is just about perfect. Had to stop around ten to clear a plugged row unit, cost me maybe twenty minutes. Finished the field at noon.',
   'Planted Field C using the 12-row planter at 30 in spacing, 1.75 in seed depth. Soil moisture good. One 20-minute stop to clear a plugged row unit.',
   0.96, 52, false, now() - interval '3 days'),

  ('Sophia Lee', 'FIELD D', null, 'irrigation',
   current_date - 2, time '06:30', time '09:30',
   'Field D irrigation check, six thirty start. Walked all four laterals. Found two emitters plugged on lateral three near the head, swapped them out. Pressure is holding at twelve psi across the block. Ran the set for two and a half hours, shut it down at nine thirty.',
   'Irrigation run on Field D. Replaced two plugged emitters on lateral three. Pressure steady at 12 psi. Set ran 2.5 hours.',
   0.89, 41, false, now() - interval '2 days'),

  -- Five logs dated today -> "Todays Recordings (5)".
  -- The last one was created 40 minutes ago -> the "1 New" badge.
  ('Diego Ramirez', 'FIELD E', 'UAN-32', 'fertilizing',
   current_date, time '05:45', time '09:10',
   'Side dressing Field E with UAN thirty two, going out at thirty gallons an acre. Started before six to stay ahead of the heat.',
   'Side-dressed Field E with UAN-32 at 30 gal/acre. Early start to avoid heat.',
   0.92, 29, true, now() - interval '9 hours'),

  ('Amara Okafor', 'FIELD A', null, 'scouting',
   current_date, time '07:00', time '08:30',
   'Scouting pass on Field A. Seeing some aphid pressure in the northeast corner, maybe fifteen percent of plants. Nothing at threshold yet but worth another look Thursday.',
   'Scouted Field A. Aphid pressure at ~15% of plants in the northeast corner, below treatment threshold. Recommend re-scout Thursday.',
   0.88, 33, true, now() - interval '7 hours'),

  ('Noah Kim', 'FIELD B', null, 'irrigation',
   current_date, time '08:15', time '11:00',
   'Ran the irrigation set on Field B. All laterals flowing clean, no issues to report.',
   'Irrigation set completed on Field B. No issues.',
   0.90, 18, true, now() - interval '5 hours'),

  ('Mateo Silva', 'FIELD F', null, 'tilling',
   current_date, time '09:00', time '13:20',
   'Disking Field F ahead of planting. Ground is a little heavier than I expected on the south end, had to slow down and make a second pass.',
   'Disked Field F in preparation for planting. Second pass required on the heavier south end.',
   0.87, 26, true, now() - interval '3 hours'),

  ('Omar Haddad', 'FIELD C', 'Quilt Xcel', 'spraying',
   current_date, time '13:00', time '16:45',
   'Fungicide application on Field C, Quilt Xcel at the label rate. Conditions were good, calm and overcast. Re-entry is twelve hours so nobody back in until tomorrow morning.',
   'Applied Quilt Xcel fungicide to Field C at label rate. Calm, overcast conditions. 12-hour REI in effect until tomorrow morning.',
   0.93, 44, true, now() - interval '40 minutes'),

  -- Historical logs. Reviewed, spread across the past two months so date
  -- filters, sorting and search have real data to work against.
  ('Hannah Brooks', 'FIELD D', null, 'harvesting', current_date - 3, time '06:00', time '11:30',
   'Harvest on Field D, good clean run, twelve bins.',
   'Harvested Field D. 12 bins, no issues.', 0.91, 21, true, now() - interval '3 days'),

  ('Grace Chen', 'FIELD E', null, 'planting', current_date - 5, time '07:15', time '12:45',
   'Finished planting the back half of Field E today.',
   'Completed planting on the rear half of Field E.', 0.86, 19, true, now() - interval '5 days'),

  ('Priya Nair', 'FIELD A', null, 'scouting', current_date - 6, time '08:00', time '10:00',
   'Tissue samples pulled from Field A, sent to the lab.',
   'Pulled tissue samples from Field A for lab analysis.', 0.94, 24, true, now() - interval '6 days'),

  ('Isaac Wang', 'FIELD B', 'Lorsban Advanced', 'spraying', current_date - 8, time '05:30', time '09:45',
   'Insecticide on Field B, Lorsban, twenty four hour re-entry.',
   'Applied Lorsban Advanced to Field B. 24-hour REI.', 0.89, 31, true, now() - interval '8 days'),

  ('Liam Johnson', 'FIELD F', null, 'maintenance', current_date - 10, time '09:00', time '14:00',
   'Replaced the belt on the number two conveyor and greased everything.',
   'Replaced conveyor #2 belt and completed greasing.', 0.85, 28, true, now() - interval '10 days'),

  ('Maya Patel', 'FIELD C', null, 'irrigation', current_date - 12, time '06:45', time '09:15',
   'Irrigation on Field C, pressure was low on lateral one.',
   'Irrigated Field C. Low pressure observed on lateral one.', 0.90, 22, true, now() - interval '12 days'),

  ('Sophia Lee', 'FIELD E', null, 'irrigation', current_date - 15, time '06:00', time '08:30',
   'Standard irrigation set on Field E.',
   'Irrigation set completed on Field E.', 0.92, 16, true, now() - interval '15 days'),

  ('Diego Ramirez', 'FIELD A', null, 'tilling', current_date - 18, time '08:00', time '12:30',
   'Cultivated between the rows on Field A.',
   'Cultivated row middles on Field A.', 0.88, 20, true, now() - interval '18 days'),

  ('Noah Kim', 'FIELD D', 'Bravo Weather Stik', 'spraying', current_date - 21, time '05:45', time '10:15',
   'Bravo application on Field D, went out clean.',
   'Applied Bravo Weather Stik to Field D without issue.', 0.91, 27, true, now() - interval '21 days'),

  ('Amara Okafor', 'FIELD B', null, 'harvesting', current_date - 25, time '07:00', time '12:00',
   'Harvest crew on Field B, eight bins off the north block.',
   'Harvested north block of Field B. 8 bins.', 0.87, 23, true, now() - interval '25 days'),

  ('Mateo Silva', 'FIELD C', null, 'planting', current_date - 30, time '07:30', time '13:00',
   'Planted Field C, seed depth an inch and a half.',
   'Planted Field C at 1.5 in seed depth.', 0.93, 25, true, now() - interval '30 days'),

  ('Grace Chen', 'FIELD F', null, 'scouting', current_date - 34, time '09:00', time '11:00',
   'Walked Field F, weed pressure building along the south edge.',
   'Scouted Field F. Weed pressure building on the south edge.', 0.90, 30, true, now() - interval '34 days'),

  ('Hannah Brooks', 'FIELD E', 'UAN-32', 'fertilizing', current_date - 40, time '06:15', time '10:45',
   'UAN on Field E, twenty five gallons an acre.',
   'Applied UAN-32 to Field E at 25 gal/acre.', 0.89, 26, true, now() - interval '40 days'),

  ('Omar Haddad', 'FIELD A', null, 'scouting', current_date - 47, time '08:30', time '10:30',
   'Scouting Field A, everything looks clean this week.',
   'Scouted Field A. No pest or disease pressure observed.', 0.92, 17, true, now() - interval '47 days')

) as v(emp, fld, chem, activity, log_date, start_time, end_time,
       transcript, summary, conf, duration, reviewed, created_at)
cross join farms f
join employees e  on e.farm_id  = f.id and e.full_name = v.emp
join fields fl    on fl.farm_id = f.id and fl.name     = v.fld
left join chemicals c on c.farm_id = f.id and c.name   = v.chem
where f.name = 'Bays Ranch';

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

insert into tags (farm_id, label)
select f.id, v.label
from (values
  ('Needs Follow-up'),
  ('Compliance'),
  ('Equipment Issue'),
  ('Weather Delay')
) as v(label)
cross join farms f
where f.name = 'Bays Ranch';

-- A couple of pre-attached tags so the expanded entry does not start empty.
insert into log_tags (log_id, tag_id)
select l.id, t.id
from (values
  ('Isaac Wang',   current_date - 5, 'Compliance'),
  ('Liam Johnson', current_date - 3, 'Equipment Issue')
) as v(emp, log_date, label)
join employees e on e.full_name = v.emp
join logs l      on l.employee_id = e.id and l.log_date = v.log_date
join tags t      on t.label = v.label;
