-- Remove the bookings created by the load-test suites, including everything a
-- confirmed payment writes. Children first: the schema has FKs from
-- payments/transactions/ledger_entries/bookings back up the chain.
--
-- Runs as one session, so the temporary table survives between statements.
-- Safe to re-run: every statement is scoped to the `k6 load test` marker.

DROP TEMPORARY TABLE IF EXISTS tmp_lt_bookings;
CREATE TEMPORARY TABLE tmp_lt_bookings (id CHAR(36) PRIMARY KEY, hold_id CHAR(36));

INSERT INTO tmp_lt_bookings (id, hold_id)
SELECT id, hold_id FROM bookings WHERE special_requests LIKE 'k6 load test%';

SELECT COUNT(*) AS load_test_bookings FROM tmp_lt_bookings;

DELETE le FROM ledger_entries le
  JOIN tmp_lt_bookings t ON t.id = le.booking_id;

DELETE le FROM ledger_entries le
  JOIN transactions tx ON tx.id = le.transaction_id
  JOIN tmp_lt_bookings t ON t.id = tx.booking_id;

DELETE i FROM invoices i
  JOIN transactions tx ON tx.id = i.transaction_id
  JOIN tmp_lt_bookings t ON t.id = tx.booking_id;

DELETE pi FROM payout_items pi
  JOIN transactions tx ON tx.id = pi.transaction_id
  JOIN tmp_lt_bookings t ON t.id = tx.booking_id;

DELETE p FROM payouts p
  JOIN transactions tx ON tx.id = p.transaction_id
  JOIN tmp_lt_bookings t ON t.id = tx.booking_id;

DELETE r FROM refunds r
  JOIN transactions tx ON tx.id = r.transaction_id
  JOIN tmp_lt_bookings t ON t.id = tx.booking_id;

DELETE p FROM payments p
  JOIN transactions tx ON tx.id = p.transaction_id
  JOIN tmp_lt_bookings t ON t.id = tx.booking_id;

DELETE tx FROM transactions tx
  JOIN tmp_lt_bookings t ON t.id = tx.booking_id;

DELETE r FROM reviews r
  JOIN tmp_lt_bookings t ON t.id = r.booking_id;

DELETE pr FROM promotion_redemptions pr
  JOIN tmp_lt_bookings t ON t.id = pr.booking_id;

DELETE c FROM conversations c
  JOIN tmp_lt_bookings t ON t.id = c.booking_id;

DELETE br FROM booking_rooms br
  JOIN tmp_lt_bookings t ON t.id = br.booking_id;

-- Bookings reference holds, so the booking rows go first.
DELETE b FROM bookings b
  JOIN tmp_lt_bookings t ON t.id = b.id;

DELETE hr FROM hold_rooms hr
  JOIN tmp_lt_bookings t ON t.hold_id = hr.hold_id;

DELETE h FROM holds h
  JOIN tmp_lt_bookings t ON t.hold_id = h.id;

SELECT COUNT(*) AS remaining_bookings
  FROM bookings WHERE special_requests LIKE 'k6 load test%';

DROP TEMPORARY TABLE IF EXISTS tmp_lt_bookings;
