-- Split UserRole into PlatformRole (User) and OrgRole (OrganizationMember).
--
-- Data migration runs FIRST. MySQL rejects narrowing an enum while rows still
-- hold a value the new definition lacks, so every 'OWNER' must leave User.role
-- before the ALTER at the bottom.

-- Step 1: an OWNER user with no membership would silently lose owner access,
-- because after this migration owner-ness is derived from OrganizationMember
-- alone. Give each one an organization. Ids are derived from the user id, which
-- is unique, so the generated ids and slugs cannot collide.
INSERT INTO `Organization` (`id`, `slug`, `name`, `contactEmail`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('org_mig_', u.`id`),
  CONCAT('host-', LOWER(u.`id`)),
  u.`name`,
  u.`email`,
  NOW(3),
  NOW(3)
FROM `User` u
WHERE u.`role` = 'OWNER'
  AND NOT EXISTS (SELECT 1 FROM `OrganizationMember` m WHERE m.`userId` = u.`id`);

INSERT INTO `OrganizationMember` (`id`, `orgId`, `userId`, `role`)
SELECT
  CONCAT('om_mig_', u.`id`),
  CONCAT('org_mig_', u.`id`),
  u.`id`,
  'OWNER'
FROM `User` u
WHERE u.`role` = 'OWNER'
  AND NOT EXISTS (SELECT 1 FROM `OrganizationMember` m WHERE m.`userId` = u.`id`);

-- Step 2: every former owner is now a player who happens to host.
UPDATE `User` SET `role` = 'PLAYER' WHERE `role` = 'OWNER';

-- Step 3: the old schema recorded org staff as 'ADMIN'. Anything that is
-- neither OWNER nor STAFF after this ('PLAYER', 'SUPER_ADMIN' — values the app
-- never wrote here) falls back to the column default so no row survives the
-- ALTER holding a value OrgRole lacks.
UPDATE `OrganizationMember` SET `role` = 'STAFF' WHERE `role` = 'ADMIN';
UPDATE `OrganizationMember` SET `role` = 'OWNER' WHERE `role` NOT IN ('OWNER', 'STAFF');

-- Step 4: now the columns can be narrowed.
ALTER TABLE `User`
  MODIFY `role` ENUM('PLAYER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'PLAYER';

ALTER TABLE `OrganizationMember`
  MODIFY `role` ENUM('OWNER', 'STAFF') NOT NULL DEFAULT 'OWNER';
