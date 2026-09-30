-- TravelNest canonical baseline schema (MySQL 8).
--
-- GENERATED FILE - do not edit by hand.
-- Regenerate with: node scripts/dump-schema.js --from-sync --out infra/database/schema/baseline.sql
--
-- Statements are separated by a line containing only: -- @@schema-statement@@

-- amenities
CREATE TABLE IF NOT EXISTS `amenities` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique code for the amenity (e.g., FREE_WIFI, POOL, PARKING)',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display name of the amenity',
  `icon` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Icon identifier (e.g., FontAwesome icon name, emoji, or URL)',
  `category` enum('general','room_features','bathroom','food_drink','services','business','wellness','transportation','entertainment','safety','bedding','technology','comfort','view','kitchen','accessibility') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Category for grouping amenities',
  `applicable_to` enum('hotel','room','both') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'both' COMMENT 'Where this amenity can be applied',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Detailed description of the amenity',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether this amenity is active and can be assigned',
  `display_order` int DEFAULT '0' COMMENT 'Order for displaying amenities in UI',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_code` (`code`) USING BTREE,
  KEY `idx_category` (`category`) USING BTREE,
  KEY `idx_applicable_to` (`applicable_to`) USING BTREE,
  KEY `idx_active` (`is_active`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `actor_user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User who performed the action (null for system actions)',
  `actor_type` enum('user','system','api_token') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Machine-readable action, e.g. review.status_changed',
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Affected entity type, e.g. review, booking, payout',
  `entity_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Affected entity identifier',
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Hotel context for hotel-scoped actions',
  `before` json DEFAULT NULL,
  `after` json DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `request_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_actor_user_id` (`actor_user_id`) USING BTREE,
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`) USING BTREE,
  KEY `idx_audit_logs_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_audit_logs_action` (`action`) USING BTREE,
  KEY `idx_audit_logs_created_at` (`created_at`) USING BTREE,
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- auth_accounts
CREATE TABLE IF NOT EXISTS `auth_accounts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'User that this authentication method belongs to',
  `provider` enum('local','google','facebook','twitter','apple') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Authentication provider (local or social)',
  `provider_user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Provider-specific user identifier (email for local, sub for OAuth)',
  `password_hash` text COLLATE utf8mb4_unicode_ci COMMENT 'Password hash for local accounts; null for social logins',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_auth_accounts_provider_user_unique` (`provider`,`provider_user_id`) USING BTREE,
  KEY `idx_auth_accounts_user_id` (`user_id`) USING BTREE,
  CONSTRAINT `auth_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- booking_rooms
CREATE TABLE IF NOT EXISTS `booking_rooms` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `booking_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `nightly_price_snapshot` json DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_rooms_booking_id` (`booking_id`) USING BTREE,
  KEY `idx_booking_rooms_room_id` (`room_id`) USING BTREE,
  CONSTRAINT `booking_rooms_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `booking_rooms_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- bookings
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `buyer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Legacy primary room pointer. New bookings use booking_rooms.',
  `hold_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Hold ID for temporary locking',
  `booking_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `number_of_guests` int NOT NULL DEFAULT '1',
  `quantity` int NOT NULL DEFAULT '1' COMMENT 'Number of rooms booked',
  `total_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `service_fee_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `platform_commission_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `status` enum('pending','pending_payment','confirmed','payment_failed','expired','checked_in','completed','cancelled','no_show') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `special_requests` text COLLATE utf8mb4_unicode_ci,
  `guest_details` json DEFAULT NULL,
  `price_breakdown` json DEFAULT NULL,
  `cancellation_policy_snapshot` json DEFAULT NULL,
  `payment_due_at` datetime DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_code_unique` (`booking_code`) USING BTREE,
  KEY `buyer_id` (`buyer_id`) USING BTREE,
  KEY `hotel_id` (`hotel_id`) USING BTREE,
  KEY `room_id` (`room_id`) USING BTREE,
  KEY `status` (`status`) USING BTREE,
  KEY `check_in_date` (`check_in_date`) USING BTREE,
  KEY `idx_bookings_status_expires_at` (`status`,`expires_at`) USING BTREE,
  KEY `hold_id` (`hold_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`hold_id`) REFERENCES `holds` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- cities
CREATE TABLE IF NOT EXISTS `cities` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'City name',
  `country_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK to countries.id',
  `slug` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SEO-friendly slug, unique per city',
  `latitude` decimal(10,7) DEFAULT NULL COMMENT 'Latitude for map search and distance calculations',
  `longitude` decimal(10,7) DEFAULT NULL COMMENT 'Longitude for map search and distance calculations',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_city_name_country` (`name`,`country_id`) USING BTREE,
  UNIQUE KEY `idx_city_slug` (`slug`) USING BTREE,
  KEY `idx_city_country` (`country_id`) USING BTREE,
  KEY `idx_city_coordinates` (`latitude`,`longitude`) USING BTREE,
  CONSTRAINT `cities_ibfk_1` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- connected_payment_accounts
CREATE TABLE IF NOT EXISTS `connected_payment_accounts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Owner user who receives payouts through this connected account',
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Optional hotel-specific payout routing target',
  `provider` enum('stripe') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stripe' COMMENT 'External payment provider for the connected account',
  `provider_account_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Provider connected account ID, e.g. Stripe acct_xxx',
  `account_type` enum('express','standard','custom') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'express' COMMENT 'Connected account type at the provider',
  `country` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `charges_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `payouts_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `details_submitted` tinyint(1) NOT NULL DEFAULT '0',
  `onboarding_status` enum('not_started','pending','completed','restricted','disabled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_started' COMMENT 'Local summary of provider onboarding and payout readiness',
  `disabled_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requirements_currently_due` json DEFAULT NULL,
  `requirements_eventually_due` json DEFAULT NULL,
  `capabilities` json DEFAULT NULL COMMENT 'Provider capability payload used for payout readiness checks',
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Preferred payout account for this owner or hotel; enforced at application level',
  `last_synced_at` datetime DEFAULT NULL COMMENT 'Last time provider account status was synced',
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_connected_payment_accounts_provider_account_unique` (`provider`,`provider_account_id`) USING BTREE,
  KEY `idx_connected_payment_accounts_user_id` (`user_id`) USING BTREE,
  KEY `idx_connected_payment_accounts_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_connected_payment_accounts_payout_ready` (`payouts_enabled`,`onboarding_status`) USING BTREE,
  KEY `idx_connected_payment_accounts_default` (`user_id`,`hotel_id`,`is_default`) USING BTREE,
  CONSTRAINT `connected_payment_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `connected_payment_accounts_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- countries
CREATE TABLE IF NOT EXISTS `countries` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Country display name',
  `iso_code` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ISO 3166-1 alpha-2 or alpha-3 code',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_country_name` (`name`) USING BTREE,
  UNIQUE KEY `idx_country_iso_code` (`iso_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- destinations
CREATE TABLE IF NOT EXISTS `destinations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('city','country') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Destination type (city or country)',
  `city_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FK to cities.id when type = city',
  `country_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FK to countries.id when type = country',
  `display_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Destination name shown to users',
  `normalized_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Lowercased, accent-stripped name for fast search',
  `slug` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SEO-friendly slug for URLs',
  `country_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Denormalized country name for display',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether destination is active/available for search',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_destination_slug` (`slug`) USING BTREE,
  KEY `idx_destination_type_city` (`type`,`city_id`) USING BTREE,
  KEY `idx_destination_type_country` (`type`,`country_id`) USING BTREE,
  KEY `idx_destination_normalized_name` (`normalized_name`) USING BTREE,
  KEY `idx_destination_active` (`is_active`) USING BTREE,
  KEY `city_id` (`city_id`),
  KEY `country_id` (`country_id`),
  CONSTRAINT `destinations_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `destinations_ibfk_2` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- hold_rooms
CREATE TABLE IF NOT EXISTS `hold_rooms` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hold_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `quantity` int NOT NULL DEFAULT '1' COMMENT 'Number of rooms of this type held',
  PRIMARY KEY (`id`),
  KEY `idx_hold_rooms_hold_id` (`hold_id`) USING BTREE,
  KEY `room_id` (`room_id`),
  CONSTRAINT `hold_rooms_ibfk_1` FOREIGN KEY (`hold_id`) REFERENCES `holds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `hold_rooms_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- holds
CREATE TABLE IF NOT EXISTS `holds` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `number_of_guests` int NOT NULL DEFAULT '1',
  `quantity` int NOT NULL DEFAULT '1' COMMENT 'Number of rooms booked',
  `total_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `service_fee_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `platform_commission_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `price_breakdown` json DEFAULT NULL,
  `cancellation_policy_snapshot` json DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Hotel for quick lookup',
  `expires_at` datetime NOT NULL COMMENT 'When the hold expires (e.g. 15 min from creation)',
  `status` enum('active','released','expired','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `released_at` datetime DEFAULT NULL,
  `booking_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_holds_user_status` (`user_id`,`status`) USING BTREE,
  KEY `idx_holds_expires_at` (`expires_at`) USING BTREE,
  KEY `hotel_id` (`hotel_id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `holds_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `holds_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `holds_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- hotel_amenities
CREATE TABLE IF NOT EXISTS `hotel_amenities` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amenity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Reference to the amenities table',
  `is_available` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether the amenity is currently available at this hotel',
  `is_free` tinyint(1) DEFAULT '1' COMMENT 'Whether the amenity is free or requires payment',
  `additional_info` text COLLATE utf8mb4_unicode_ci COMMENT 'Additional information specific to this hotel (e.g., "Pool open 6am-10pm")',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_hotel_amenity_unique` (`hotel_id`,`amenity_id`) USING BTREE,
  KEY `idx_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_amenity_id` (`amenity_id`) USING BTREE,
  KEY `idx_available` (`is_available`) USING BTREE,
  CONSTRAINT `hotel_amenities_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `hotel_amenities_ibfk_2` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- hotel_cancellation_rules
CREATE TABLE IF NOT EXISTS `hotel_cancellation_rules` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Null means hotel-wide default rule',
  `is_refundable` tinyint(1) NOT NULL DEFAULT '1',
  `free_cancellation_until_hours_before_checkin` int DEFAULT NULL COMMENT 'Hours before check-in when full free cancellation ends',
  `refund_percent_before_deadline` decimal(5,2) NOT NULL DEFAULT '100.00',
  `refund_percent_after_deadline` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cancellation_fee_type` enum('none','percentage') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `cancellation_fee_value` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_hotel_cancellation_rules_scope_unique` (`hotel_id`,`room_id`) USING BTREE,
  KEY `idx_hotel_cancellation_rules_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_hotel_cancellation_rules_room_id` (`room_id`) USING BTREE,
  KEY `idx_hotel_cancellation_rules_active` (`hotel_id`,`is_active`) USING BTREE,
  CONSTRAINT `hotel_cancellation_rules_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `hotel_cancellation_rules_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- hotel_policies
CREATE TABLE IF NOT EXISTS `hotel_policies` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Hotel this policy belongs to',
  `policy_type` enum('cancellation','children','pets','payment','smoking','damage','age_restriction','internet','parking','breakfast','group_booking','additional_fees','other') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Type of policy (cancellation, children, pets, etc.)',
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Policy title (e.g., "Cancellation Policy")',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Detailed policy description',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether this policy is currently active',
  `display_order` int NOT NULL DEFAULT '0' COMMENT 'Order in which policies should be displayed',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Icon identifier for UI display',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_hotel_policy_type` (`hotel_id`,`policy_type`) USING BTREE,
  KEY `idx_hotel_active_order` (`hotel_id`,`is_active`,`display_order`) USING BTREE,
  CONSTRAINT `hotel_policies_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- hotel_rating_summaries
CREATE TABLE IF NOT EXISTS `hotel_rating_summaries` (
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'One-to-one relationship with hotels',
  `overall_rating` decimal(3,2) NOT NULL DEFAULT '0.00' COMMENT 'Weighted average rating (0.00 to 10.00)',
  `total_reviews` int NOT NULL DEFAULT '0' COMMENT 'Total number of reviews',
  `rating_10` int NOT NULL DEFAULT '0' COMMENT 'Count of 10-star reviews (9.50-10.00)',
  `rating_9` int NOT NULL DEFAULT '0' COMMENT 'Count of 9-star reviews (8.50-9.49)',
  `rating_8` int NOT NULL DEFAULT '0' COMMENT 'Count of 8-star reviews (7.50-8.49)',
  `rating_7` int NOT NULL DEFAULT '0' COMMENT 'Count of 7-star reviews (6.50-7.49)',
  `rating_6` int NOT NULL DEFAULT '0' COMMENT 'Count of 6-star reviews (5.50-6.49)',
  `rating_5` int NOT NULL DEFAULT '0' COMMENT 'Count of 5-star reviews (4.50-5.49)',
  `rating_4` int NOT NULL DEFAULT '0' COMMENT 'Count of 4-star reviews (3.50-4.49)',
  `rating_3` int NOT NULL DEFAULT '0' COMMENT 'Count of 3-star reviews (2.50-3.49)',
  `rating_2` int NOT NULL DEFAULT '0' COMMENT 'Count of 2-star reviews (1.50-2.49)',
  `rating_1` int NOT NULL DEFAULT '0' COMMENT 'Count of 1-star reviews (0.00-1.49)',
  `total_rating_sum` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Sum of all ratings (for recalculating average)',
  `last_review_date` datetime DEFAULT NULL COMMENT 'Date of the most recent review',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`hotel_id`),
  KEY `idx_overall_rating` (`overall_rating`) USING BTREE,
  KEY `idx_total_reviews` (`total_reviews`) USING BTREE,
  KEY `idx_rating_reviews_composite` (`overall_rating`,`total_reviews`) USING BTREE,
  KEY `idx_last_review_date` (`last_review_date`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- hotel_search_snapshots
CREATE TABLE IF NOT EXISTS `hotel_search_snapshots` (
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'One-to-one with hotels table',
  `hotel_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Hotel name for display and search',
  `city_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FK to cities.id for normalized location',
  `city` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'City for location filtering',
  `country_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FK to countries.id for normalized country',
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Country for global search filtering',
  `latitude` decimal(10,7) NOT NULL COMMENT 'Latitude for map search and distance calculations',
  `longitude` decimal(10,7) NOT NULL COMMENT 'Longitude for map search and distance calculations',
  `min_price` decimal(10,2) DEFAULT NULL COMMENT 'Lowest available room price (updated from room_inventory)',
  `max_price` decimal(10,2) DEFAULT NULL COMMENT 'Highest room price for range displays',
  `avg_rating` decimal(3,2) DEFAULT '0.00' COMMENT 'Average rating for sorting and filtering',
  `review_count` int NOT NULL DEFAULT '0' COMMENT 'Total review count for popularity sorting',
  `hotel_class` int DEFAULT NULL COMMENT 'Star rating (1-5) for filtering',
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'Hotel status for filtering out unavailable hotels',
  `amenity_codes` json DEFAULT NULL COMMENT 'Array of amenity codes for fast filtering without joins',
  `has_free_cancellation` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether hotel offers free cancellation on any rooms',
  `is_available` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Quick availability flag to short-circuit unavailable hotels',
  `has_available_rooms` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether hotel has any available rooms in inventory',
  `primary_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Primary hotel image URL for quick display',
  `total_bookings` int NOT NULL DEFAULT '0' COMMENT 'Total completed bookings for popularity scoring',
  `view_count` int NOT NULL DEFAULT '0' COMMENT 'Total views for trending/popularity calculations',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL COMMENT 'Timestamp for tracking when snapshot was last updated',
  PRIMARY KEY (`hotel_id`),
  KEY `idx_coordinates` (`latitude`,`longitude`) USING BTREE,
  KEY `idx_city` (`city`) USING BTREE,
  KEY `idx_city_id_hss` (`city_id`) USING BTREE,
  KEY `idx_country` (`country`) USING BTREE,
  KEY `idx_country_id_hss` (`country_id`) USING BTREE,
  KEY `idx_min_price` (`min_price`) USING BTREE,
  KEY `idx_avg_rating` (`avg_rating`) USING BTREE,
  KEY `idx_review_count` (`review_count`) USING BTREE,
  KEY `idx_hotel_class` (`hotel_class`) USING BTREE,
  KEY `idx_status` (`status`) USING BTREE,
  KEY `idx_is_available` (`is_available`) USING BTREE,
  KEY `idx_search_composite` (`status`,`is_available`,`city`,`avg_rating`) USING BTREE,
  KEY `idx_price_rating` (`min_price`,`avg_rating`) USING BTREE,
  KEY `idx_popularity` (`total_bookings`,`view_count`) USING BTREE,
  KEY `idx_updated_at` (`updated_at`) USING BTREE,
  CONSTRAINT `hotel_search_snapshots_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `hotel_search_snapshots_ibfk_2` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- hotel_users
CREATE TABLE IF NOT EXISTS `hotel_users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Hotel this user is associated with',
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'User who has a role at this hotel',
  `role_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Hotel-specific role (owner, manager, or staff) for this user at this hotel',
  `is_primary_owner` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Marks the main owner for the hotel. Should be true for at most one user per hotel.',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_hotel_user_unique` (`hotel_id`,`user_id`) USING BTREE,
  KEY `idx_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_user_id` (`user_id`) USING BTREE,
  KEY `idx_role_id` (`role_id`) USING BTREE,
  KEY `idx_primary_owner_per_hotel` (`hotel_id`,`is_primary_owner`) USING BTREE,
  CONSTRAINT `hotel_users_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `hotel_users_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `hotel_users_ibfk_3` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- hotels
CREATE TABLE IF NOT EXISTS `hotels` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FK to cities.id',
  `country_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FK to countries.id',
  `phone_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL COMMENT 'Latitude with 7 decimal places (~1.11cm precision)',
  `longitude` decimal(10,7) NOT NULL COMMENT 'Longitude with 7 decimal places (~1.11cm precision)',
  `hotel_class` int DEFAULT NULL COMMENT 'Star rating (1-5)',
  `check_in_time` time DEFAULT '14:00:00' COMMENT 'Standard check-in time',
  `check_out_time` time DEFAULT '12:00:00' COMMENT 'Standard check-out time',
  `check_in_policy` text COLLATE utf8mb4_unicode_ci COMMENT 'Check-in policy details (e.g., late check-in available)',
  `check_out_policy` text COLLATE utf8mb4_unicode_ci COMMENT 'Check-out policy details',
  `min_price` decimal(10,2) DEFAULT NULL COMMENT 'Minimum room price for rapid filtering',
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'Hotel operational status',
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IANA timezone identifier (e.g., America/New_York)',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_coordinates` (`latitude`,`longitude`) USING BTREE,
  KEY `idx_city_id` (`city_id`) USING BTREE,
  KEY `idx_country_id` (`country_id`) USING BTREE,
  KEY `idx_status` (`status`) USING BTREE,
  KEY `idx_min_price` (`min_price`) USING BTREE,
  KEY `idx_search_composite` (`status`,`city_id`) USING BTREE,
  CONSTRAINT `hotels_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `hotels_ibfk_2` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- idempotency_keys
CREATE TABLE IF NOT EXISTS `idempotency_keys` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `idempotency_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `response_body` json DEFAULT NULL,
  `status` enum('processing','completed','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'processing',
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_idempotency_keys_user_key` (`user_id`,`idempotency_key`) USING BTREE,
  CONSTRAINT `idempotency_keys_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- image_variants
CREATE TABLE IF NOT EXISTS `image_variants` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `image_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `variant_type` enum('thumbnail','small','medium','large','thumbnail_webp','small_webp','medium_webp','large_webp') COLLATE utf8mb4_unicode_ci NOT NULL,
  `bucket_name` varchar(63) COLLATE utf8mb4_unicode_ci NOT NULL,
  `object_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint NOT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_image_variant` (`image_id`,`variant_type`) USING BTREE,
  KEY `image_id` (`image_id`) USING BTREE,
  CONSTRAINT `image_variants_ibfk_1` FOREIGN KEY (`image_id`) REFERENCES `images` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- images
CREATE TABLE IF NOT EXISTS `images` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `entity_type` enum('hotel','user_avatar','room','review','city','country') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `bucket_name` varchar(63) COLLATE utf8mb4_unicode_ci NOT NULL,
  `object_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` bigint NOT NULL,
  `mime_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `has_thumbnail` tinyint(1) DEFAULT '0',
  `has_compressed` tinyint(1) DEFAULT '0',
  `display_order` int DEFAULT '0',
  `is_primary` tinyint(1) DEFAULT NULL,
  `status` enum('active','processing','deleted') COLLATE utf8mb4_unicode_ci DEFAULT 'processing',
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_primary` (`entity_type`,`entity_id`,`is_primary`,`status`) USING BTREE,
  KEY `idx_entity` (`entity_type`,`entity_id`,`status`) USING BTREE,
  KEY `idx_bucket_key` (`bucket_name`,`object_key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- invoices
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transaction_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `invoice_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Human-readable invoice number',
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `subtotal` decimal(10,2) NOT NULL,
  `status` enum('draft','issued','paid','partially_paid','overdue','cancelled','void') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `due_date` datetime DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `invoice_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL to download/view invoice PDF',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number_unique` (`invoice_number`) USING BTREE,
  KEY `transaction_id` (`transaction_id`) USING BTREE,
  KEY `hotel_id` (`hotel_id`) USING BTREE,
  KEY `status` (`status`) USING BTREE,
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- ledger_accounts
CREATE TABLE IF NOT EXISTS `ledger_accounts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `account_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Deterministic unique key for account type, owner, and currency',
  `account_type` enum('platform_cash','platform_revenue','customer_receivable','hotel_owner_payable','refund_liability','payment_provider_clearing') COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_type` enum('platform','user','hotel','provider') COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User, hotel, or provider ID depending on owner_type; null for platform',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_ledger_accounts_account_key` (`account_key`) USING BTREE,
  KEY `idx_ledger_accounts_owner` (`owner_type`,`owner_id`) USING BTREE,
  KEY `idx_ledger_accounts_type_currency` (`account_type`,`currency`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- ledger_entries
CREATE TABLE IF NOT EXISTS `ledger_entries` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ledger_account_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `entry_group_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Shared ID for all debit and credit rows in one accounting event',
  `entry_group_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Stable event key used to make ledger posting idempotent',
  `direction` enum('debit','credit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `event_type` enum('payment_succeeded','refund_succeeded','payout_created','payout_paid','payout_failed','platform_fee_recognized','manual_adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `transaction_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `payment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `refund_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `payout_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `buyer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `owner_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `provider` enum('stripe') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_event_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_balance_transaction_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `posted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_ledger_entries_idempotency_key` (`idempotency_key`) USING BTREE,
  KEY `idx_ledger_entries_account_id` (`ledger_account_id`) USING BTREE,
  KEY `idx_ledger_entries_group_id` (`entry_group_id`) USING BTREE,
  KEY `idx_ledger_entries_group_key` (`entry_group_key`) USING BTREE,
  KEY `idx_ledger_entries_refs` (`booking_id`,`transaction_id`) USING BTREE,
  KEY `idx_ledger_entries_refund_id` (`refund_id`) USING BTREE,
  KEY `idx_ledger_entries_payout_id` (`payout_id`) USING BTREE,
  KEY `idx_ledger_entries_hotel_posted` (`hotel_id`,`posted_at`) USING BTREE,
  KEY `transaction_id` (`transaction_id`),
  KEY `payment_id` (`payment_id`),
  KEY `buyer_id` (`buyer_id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `ledger_entries_ibfk_1` FOREIGN KEY (`ledger_account_id`) REFERENCES `ledger_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_ibfk_3` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_ibfk_4` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_ibfk_5` FOREIGN KEY (`refund_id`) REFERENCES `refunds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_ibfk_6` FOREIGN KEY (`payout_id`) REFERENCES `payouts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_ibfk_7` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_ibfk_8` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_ibfk_9` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- nearby_places
CREATE TABLE IF NOT EXISTS `nearby_places` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Hotel this nearby place is associated with',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Name of the place (e.g., "Central Park", "JFK Airport")',
  `category` enum('restaurant','cafe','bar','shopping','attraction','museum','park','beach','airport','train_station','bus_station','hospital','pharmacy','bank','atm','gas_station','parking','gym','spa','entertainment','landmark','religious','school','other') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Category of the place',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Optional description of the place',
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Street address of the place',
  `latitude` decimal(10,7) NOT NULL COMMENT 'Latitude with 7 decimal places (~1.11cm precision)',
  `longitude` decimal(10,7) NOT NULL COMMENT 'Longitude with 7 decimal places (~1.11cm precision)',
  `distance_km` decimal(6,2) NOT NULL COMMENT 'Distance from hotel in kilometers',
  `travel_time_minutes` int DEFAULT NULL COMMENT 'Estimated travel time from hotel in minutes',
  `travel_mode` enum('walking','driving','public_transport') COLLATE utf8mb4_unicode_ci DEFAULT 'walking' COMMENT 'Mode of transportation for travel time estimate',
  `rating` decimal(2,1) DEFAULT NULL COMMENT 'Rating of the place (0-5 stars)',
  `google_place_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Google Places API place ID for integration',
  `website_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Official website URL',
  `phone_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Contact phone number',
  `opening_hours` text COLLATE utf8mb4_unicode_ci COMMENT 'Opening hours information (can be JSON string)',
  `price_level` int DEFAULT NULL COMMENT 'Price level indicator (1=cheap, 4=expensive)',
  `is_verified` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether this place has been verified by staff',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether this place should be displayed',
  `display_order` int NOT NULL DEFAULT '0' COMMENT 'Order in which places should be displayed',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Icon identifier for UI display',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_google_place_id` (`google_place_id`) USING BTREE,
  KEY `idx_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_hotel_category` (`hotel_id`,`category`) USING BTREE,
  KEY `idx_hotel_active_distance` (`hotel_id`,`is_active`,`distance_km`) USING BTREE,
  KEY `idx_coordinates` (`latitude`,`longitude`) USING BTREE,
  CONSTRAINT `nearby_places_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `receiver_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'User receiving the notification (customer or hotel owner)',
  `sender_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User who triggered the notification (null for system notifications)',
  `notification_type` enum('booking_new','booking_confirmed','booking_cancelled','booking_completed','booking_status_update','booking_expired','payment_success','payment_failed','payment_refund','payout_completed','payout_failed','review_new','review_response','message_new','system_alert','promotion','account_update') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Type of notification for categorization and filtering',
  `category` enum('booking','payment','review','message','system','marketing') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system' COMMENT 'High-level category for UI grouping',
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT 'Priority level affects display order and UI treatment',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Short notification title/subject',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full notification message body',
  `metadata` json DEFAULT NULL COMMENT 'Additional data: booking_id, amount, dates, etc.',
  `related_entity_type` enum('booking','payment','transaction','review','hotel','room','user','refund','payout') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Type of related entity',
  `related_entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ID of related entity (booking_id, transaction_id, etc.)',
  `action_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Deep link or URL for user to take action',
  `action_label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Label for action button (e.g., "View Booking", "Reply")',
  `is_read` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether notification has been read',
  `read_at` datetime DEFAULT NULL COMMENT 'Timestamp when notification was read',
  `is_sent` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether notification was successfully sent via socket',
  `sent_at` datetime DEFAULT NULL COMMENT 'Timestamp when notification was sent',
  `email_sent` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether email notification was sent',
  `push_sent` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether push notification was sent',
  `expires_at` datetime DEFAULT NULL COMMENT 'Optional expiry date for time-sensitive notifications',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft delete timestamp',
  `reciever_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `receiver_id_idx` (`receiver_id`) USING BTREE,
  KEY `receiver_unread_idx` (`receiver_id`,`is_read`) USING BTREE,
  KEY `receiver_created_idx` (`receiver_id`,`created_at`) USING BTREE,
  KEY `type_category_idx` (`notification_type`,`category`) USING BTREE,
  KEY `related_entity_idx` (`related_entity_type`,`related_entity_id`) USING BTREE,
  KEY `expires_at_idx` (`expires_at`) USING BTREE,
  KEY `sender_id_idx` (`sender_id`) USING BTREE,
  KEY `reciever_id` (`reciever_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `notifications_ibfk_3` FOREIGN KEY (`reciever_id`) REFERENCES `hotels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transaction_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `payment_method` enum('card','bank_transfer','wallet','cash','gift_card') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g., card, bank_transfer, wallet',
  `payment_status` enum('pending','processing','succeeded','failed','cancelled','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `stripe_payment_method_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `card_brand` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'e.g., visa, mastercard, amex',
  `card_last4` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `card_exp_month` int DEFAULT NULL,
  `card_exp_year` int DEFAULT NULL,
  `failure_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_message` text COLLATE utf8mb4_unicode_ci,
  `receipt_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `paid_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`) USING BTREE,
  KEY `payment_status` (`payment_status`) USING BTREE,
  KEY `stripe_payment_method_id` (`stripe_payment_method_id`) USING BTREE,
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- payout_items
CREATE TABLE IF NOT EXISTS `payout_items` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `payout_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `booking_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transaction_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `platform_fee_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_payout_items_booking_id` (`booking_id`) USING BTREE,
  KEY `idx_payout_items_payout_id` (`payout_id`) USING BTREE,
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `payout_items_ibfk_1` FOREIGN KEY (`payout_id`) REFERENCES `payouts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payout_items_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payout_items_ibfk_3` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- payouts
CREATE TABLE IF NOT EXISTS `payouts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `owner_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Hotel owner or vendor receiving the payout',
  `connected_payment_account_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transaction_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Optional customer payment transaction this payout settles',
  `provider` enum('stripe') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stripe',
  `provider_payout_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'External provider payout ID, if provider creates a payout object',
  `provider_transfer_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'External provider transfer ID to the connected account',
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `platform_fee_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Platform commission or retained amount for this settlement',
  `status` enum('pending','processing','paid','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `period_start` datetime DEFAULT NULL,
  `period_end` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `failure_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_message` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_payouts_provider_payout_id` (`provider_payout_id`) USING BTREE,
  UNIQUE KEY `idx_payouts_provider_transfer_id` (`provider_transfer_id`) USING BTREE,
  KEY `idx_payouts_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_payouts_owner_id` (`owner_id`) USING BTREE,
  KEY `idx_payouts_connected_payment_account_id` (`connected_payment_account_id`) USING BTREE,
  KEY `idx_payouts_transaction_id` (`transaction_id`) USING BTREE,
  KEY `idx_payouts_status` (`status`) USING BTREE,
  KEY `idx_payouts_period` (`period_start`,`period_end`) USING BTREE,
  CONSTRAINT `payouts_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payouts_ibfk_2` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `payouts_ibfk_3` FOREIGN KEY (`connected_payment_account_id`) REFERENCES `connected_payment_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payouts_ibfk_4` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Machine-readable permission key following pattern resource.action (e.g., "hotel.read", "hotel.manage_staff", "user.manage.roles").',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Human-readable description of what this permission allows.',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_permission_name` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- refunds
CREATE TABLE IF NOT EXISTS `refunds` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `booking_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transaction_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `buyer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `provider` enum('stripe') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stripe',
  `provider_refund_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'External refund ID from the payment provider',
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `status` enum('pending','processing','succeeded','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reason` enum('free_cancellation','customer_request','hotel_cancelled','duplicate','fraudulent','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer_request',
  `eligibility` enum('eligible','ineligible','manual_review') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual_review',
  `free_cancellation_deadline` datetime DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  `failure_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_message` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_refunds_provider_refund_id` (`provider_refund_id`) USING BTREE,
  KEY `idx_refunds_booking_id` (`booking_id`) USING BTREE,
  KEY `idx_refunds_transaction_id` (`transaction_id`) USING BTREE,
  KEY `idx_refunds_buyer_id` (`buyer_id`) USING BTREE,
  KEY `idx_refunds_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_refunds_status` (`status`) USING BTREE,
  CONSTRAINT `refunds_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `refunds_ibfk_2` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `refunds_ibfk_3` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `refunds_ibfk_4` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- review_helpful_votes
CREATE TABLE IF NOT EXISTS `review_helpful_votes` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `review_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `is_helpful` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'True = helpful, False = not helpful',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_review_user_unique` (`review_id`,`user_id`) USING BTREE,
  KEY `idx_review_id` (`review_id`) USING BTREE,
  KEY `idx_user_id` (`user_id`) USING BTREE,
  CONSTRAINT `review_helpful_votes_ibfk_1` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `review_helpful_votes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- review_media
CREATE TABLE IF NOT EXISTS `review_media` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `review_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `media_type` enum('image','video') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'image',
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'URL or storage path of the media',
  `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Thumbnail URL for videos or large images',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_review_id` (`review_id`) USING BTREE,
  KEY `idx_review_order` (`review_id`,`display_order`) USING BTREE,
  CONSTRAINT `review_media_ibfk_1` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- review_replies
CREATE TABLE IF NOT EXISTS `review_replies` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `review_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'One reply per review',
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Hotel manager or admin who replied',
  `reply_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_review_id_unique` (`review_id`) USING BTREE,
  KEY `idx_user_id` (`user_id`) USING BTREE,
  CONSTRAINT `review_replies_ibfk_1` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `review_replies_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- reviews
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `booking_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Optional link to booking (verified review)',
  `rating_overall` decimal(3,1) NOT NULL COMMENT 'Overall rating 1.0-10.0',
  `rating_cleanliness` decimal(3,1) DEFAULT NULL,
  `rating_location` decimal(3,1) DEFAULT NULL,
  `rating_service` decimal(3,1) DEFAULT NULL,
  `rating_value` decimal(3,1) DEFAULT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `status` enum('published','hidden','deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'published',
  `is_verified` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'True if linked to a completed booking',
  `helpful_count` int NOT NULL DEFAULT '0' COMMENT 'Denormalized count of helpful votes',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  KEY `idx_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_user_id` (`user_id`) USING BTREE,
  KEY `idx_hotel_status` (`hotel_id`,`status`) USING BTREE,
  KEY `idx_hotel_rating` (`hotel_id`,`rating_overall`) USING BTREE,
  KEY `idx_created_at` (`created_at`) USING BTREE,
  KEY `idx_reviews_status_created_at` (`status`,`created_at`) USING BTREE,
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `role_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Role this permission is granted to.',
  `permission_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Permission granted to this role.',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_role_permission_unique` (`role_id`,`permission_id`) USING BTREE,
  KEY `idx_role_id` (`role_id`) USING BTREE,
  KEY `idx_permission_id` (`permission_id`) USING BTREE,
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` enum('guest','user','admin','support_agent','owner','manager','staff') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Role identifier. Includes global roles (guest, admin, etc.) and hotel-specific roles (owner, manager, staff).',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Human readable description of the role.',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_name` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- room_amenities
CREATE TABLE IF NOT EXISTS `room_amenities` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amenity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Reference to the amenities table',
  `is_available` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether the amenity is currently available in this room',
  `additional_info` text COLLATE utf8mb4_unicode_ci COMMENT 'Additional information specific to this room (e.g., "King size bed")',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_room_amenity_unique` (`room_id`,`amenity_id`) USING BTREE,
  KEY `idx_room_id` (`room_id`) USING BTREE,
  KEY `idx_amenity_id` (`amenity_id`) USING BTREE,
  KEY `idx_available` (`is_available`) USING BTREE,
  CONSTRAINT `room_amenities_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `room_amenities_ibfk_2` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- room_inventory
CREATE TABLE IF NOT EXISTS `room_inventory` (
  `room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Composite primary key part 1',
  `date` date NOT NULL COMMENT 'Composite primary key part 2 - specific date for inventory',
  `total_rooms` int NOT NULL DEFAULT '0' COMMENT 'Total number of rooms available for this date',
  `booked_rooms` int NOT NULL DEFAULT '0' COMMENT 'Number of rooms already reserved for this date',
  `held_rooms` int NOT NULL DEFAULT '0' COMMENT 'Number of rooms currently held for this date',
  `status` enum('open','close','sold_out','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open' COMMENT 'Availability status for this date',
  `price_per_night` decimal(10,2) NOT NULL COMMENT 'Price per night for this specific date (allows dynamic pricing)',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD' COMMENT 'Currency for price per night',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`room_id`,`date`),
  KEY `idx_date` (`date`) USING BTREE,
  KEY `idx_status` (`status`) USING BTREE,
  KEY `idx_date_status` (`date`,`status`) USING BTREE,
  KEY `idx_price` (`price_per_night`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `room_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Room name or type (e.g., Deluxe King Room)',
  `max_guests` int NOT NULL DEFAULT '2' COMMENT 'Maximum number of guests allowed',
  `room_size` int DEFAULT NULL COMMENT 'Room size in square meters',
  `room_type` enum('single','double','twin','suite','deluxe','family','studio') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Standardized room type classification',
  `quantity` int NOT NULL DEFAULT '1' COMMENT 'Total number of rooms of this type',
  `status` enum('active','inactive','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'Room operational status',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hotel_id` (`hotel_id`) USING BTREE,
  KEY `idx_hotel_status` (`hotel_id`,`status`) USING BTREE,
  KEY `idx_room_type` (`room_type`) USING BTREE,
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- saved_hotels
CREATE TABLE IF NOT EXISTS `saved_hotels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `saved_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`hotel_id`) USING BTREE,
  KEY `fk_hotel` (`hotel_id`) USING BTREE,
  CONSTRAINT `saved_hotels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `saved_hotels_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- transactions
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `booking_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `buyer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `status` enum('pending','processing','completed','failed','cancelled','refunded','partially_refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `transaction_type` enum('payment','refund','payout') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'payment',
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'e.g., card, bank_transfer, wallet',
  `stripe_payment_intent_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripe_charge_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripe_customer_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripe_refund_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_message` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL COMMENT 'Additional transaction metadata',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_payment_intent_id` (`stripe_payment_intent_id`) USING BTREE,
  KEY `booking_id` (`booking_id`) USING BTREE,
  KEY `buyer_id` (`buyer_id`) USING BTREE,
  KEY `hotel_id` (`hotel_id`) USING BTREE,
  KEY `status` (`status`) USING BTREE,
  KEY `transaction_type` (`transaction_type`) USING BTREE,
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- user_roles
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'User this role assignment belongs to',
  `role_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Global role assigned to this user',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_role_unique` (`user_id`,`role_id`) USING BTREE,
  KEY `idx_user_id` (`user_id`) USING BTREE,
  KEY `idx_role_id` (`role_id`) USING BTREE,
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- users
CREATE TABLE IF NOT EXISTS `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keycloak_user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Stable Keycloak subject identifier mapped to this local application user.',
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Phone number in E.164 format (e.g., +12025550123). Validation enforced at application level.',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `connect_account_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_picture_url` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive','banned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'Account status used for authentication/authorization checks',
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','non_binary','other','prefer_not_to_say') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL COMMENT 'Timestamp of the user last successful login',
  `email_verified_at` datetime DEFAULT NULL COMMENT 'When the user verified their email address',
  `phone_verified_at` datetime DEFAULT NULL COMMENT 'When the user verified their phone number',
  `terms_accepted_at` datetime DEFAULT NULL COMMENT 'When the user accepted the latest terms of service',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`) USING BTREE,
  UNIQUE KEY `keycloak_user_id_UNIQUE` (`keycloak_user_id`),
  UNIQUE KEY `connect_account_id_UNIQUE` (`connect_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- viewed_hotels
CREATE TABLE IF NOT EXISTS `viewed_hotels` (
  `view_id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `hotel_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `viewed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`view_id`),
  KEY `user_id` (`user_id`) USING BTREE,
  KEY `hotel_id` (`hotel_id`) USING BTREE,
  CONSTRAINT `viewed_hotels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `viewed_hotels_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@schema-statement@@
-- webhook_event_logs
CREATE TABLE IF NOT EXISTS `webhook_event_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique event ID from payment provider (e.g., Stripe event ID)',
  `event_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Event type (e.g., payment_intent.succeeded)',
  `provider` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Payment provider (stripe, paypal, etc.)',
  `payload` longtext COLLATE utf8mb4_unicode_ci COMMENT 'Full event payload for debugging',
  `processed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('processing','processed','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'processed',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_id_unique` (`event_id`) USING BTREE,
  KEY `provider_event_type` (`provider`,`event_type`) USING BTREE,
  KEY `processed_at` (`processed_at`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
