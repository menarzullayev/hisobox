-- Payables ("Men qarzdarman"): what the shop owes, and the folders its customers are grouped in.
-- Phase 1 of the port from qarzapp.uz.
--
-- Until now every account in this schema was one the shop had lent to: `ledger_entry` counts what a
-- customer owes, and the only other side of it (`supplier_entry`, migration 0043) belongs to the stock
-- module, behind `stock_on`, and is about goods that came in. What the shop itself owes a person it
-- buys from on credit, or has borrowed from, was written down nowhere. Here it is: the same kind of
-- ledger, seen from the shop's side of the counter.
--
-- The payables reuse the engine the customers' ledger is built on (qarz.domain.ledger) and not a copy
-- of it: an account is a strictly ordered list of immutable entries, a wrong one is undone by an
-- opposite one, and the balance is the sum of what stands and is never stored (INV-2). What is new is
-- only the direction of the words: a `credit` entry is what the shop has undertaken to pay, a
-- `payment` is what it has paid back, so a balance above zero is what the shop owes and below zero it
-- has paid ahead of what it owes. Nothing here reads a customer's ledger; nothing there reads this.
--
-- Folders are the other half. A customer is in at most one folder; a folder that goes away leaves its
-- customers where they were, just unfiled -- there is a name for customers in no folder, so nothing is
-- lost by emptying one.
--
-- Money is whole minor units of its currency in a bigint, as everywhere else; so'm and dollars are two
-- books that share one sequence per account, as for a customer.

-- ---------------------------------------------------------------------------
-- Contacts: the people the shop owes
-- ---------------------------------------------------------------------------

-- A supplier or anyone else the shop owes money to, named the way the shop names them. Modeled on
-- `supplier` (migration 0043) without that one's link to another shop of the network.
CREATE TABLE contact (
  id          uuid PRIMARY KEY,
  shop_id     uuid NOT NULL REFERENCES shop(id),
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  name_norm   text NOT NULL,
  phone       text CHECK (phone ~ '^\+[0-9]{8,15}$'),
  note        text CHECK (length(note) <= 200),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name_norm),
  UNIQUE (shop_id, id)
);
CREATE INDEX contact_shop ON contact (shop_id, status);

-- What the shop owes one contact. Insert-only; a reversal repeats the amount of the entry it cancels,
-- as in the customers' ledger. `promised_date` is when the shop has undertaken to have paid: a debt
-- without one would be a debt nothing is ever overdue on. It is carried by the entry itself, not in a
-- history of `promise` rows (migration 0001), because nothing here moves one yet: the date is chosen
-- when the debt is written.
CREATE TABLE payable_entry (
  id             uuid PRIMARY KEY,
  shop_id        uuid NOT NULL REFERENCES shop(id),
  contact_id     uuid NOT NULL,
  seq            integer NOT NULL CHECK (seq > 0),
  kind           text NOT NULL CHECK (kind IN ('credit', 'opening', 'payment', 'reversal')),
  amount         bigint NOT NULL CHECK (amount > 0),
  currency       text NOT NULL DEFAULT 'UZS' CHECK (currency IN ('UZS', 'USD')),
  note           text CHECK (length(note) <= 200),
  reverses_id    uuid REFERENCES payable_entry(id),
  promised_date  date,
  author_id      uuid NOT NULL REFERENCES membership(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, seq),
  UNIQUE (reverses_id),                                 -- an entry is reversed at most once (INV-5)
  CHECK ((kind = 'reversal') = (reverses_id IS NOT NULL)),
  CHECK ((kind IN ('credit', 'opening')) = (promised_date IS NOT NULL)),
  FOREIGN KEY (shop_id, contact_id) REFERENCES contact (shop_id, id)
);
CREATE INDEX payable_entry_contact ON payable_entry (contact_id, seq);
CREATE INDEX payable_entry_shop_time ON payable_entry (shop_id, created_at);

-- ---------------------------------------------------------------------------
-- Folders: what a shop calls its groups of customers
-- ---------------------------------------------------------------------------

CREATE TABLE folder (
  id          uuid PRIMARY KEY,
  shop_id     uuid NOT NULL REFERENCES shop(id),
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  name_norm   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name_norm),
  UNIQUE (shop_id, id)
);

-- A customer is in at most one folder, and a folder that is deleted leaves its customers unfiled.
ALTER TABLE customer ADD COLUMN folder_id uuid REFERENCES folder(id) ON DELETE SET NULL;
CREATE INDEX customer_folder ON customer (shop_id, folder_id) WHERE folder_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Row-level security and rights
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contact', 'payable_entry', 'folder']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant ON %I USING (shop_id = nullif(current_setting(''qd.shop_id'', true), '''')::uuid) '
      'WITH CHECK (shop_id = nullif(current_setting(''qd.shop_id'', true), '''')::uuid)', t);
  END LOOP;
END $$;

-- The ordinary application. A contact is its to name and to rename, a folder its to make, rename and
-- delete; the payable ledger is insert-only for it, like the customers' ledger; and a customer's
-- folder is set with the customer, whose update rights already cover the column.
GRANT SELECT, INSERT ON contact TO qd_app;
GRANT UPDATE (name, name_norm, phone, note, status) ON contact TO qd_app;
GRANT SELECT, INSERT ON payable_entry TO qd_app;
GRANT SELECT, INSERT ON folder TO qd_app;
GRANT UPDATE (name, name_norm) ON folder TO qd_app;
GRANT DELETE ON folder TO qd_app;

-- The worker reads all of it for the owner's export of the shop's own data. The administrators' side
-- has nothing to do here.
GRANT SELECT ON contact, payable_entry, folder TO qd_worker;

-- ---------------------------------------------------------------------------
-- Erasing a shop
-- ---------------------------------------------------------------------------

-- The function as migrations 0048 and 0050 left it, with the three tables above: the payable ledger
-- before the contacts it belongs to, the folders before the customers that may sit in one. The lines
-- are added to the function as it stands, and the migration fails if it could not add them.
DO $$
DECLARE
  body text := pg_get_functiondef('erase_shop(uuid)'::regprocedure);
  customers constant text := 'DELETE FROM customer WHERE shop_id = p_shop_id;';
  added constant text :=
    'DELETE FROM payable_entry WHERE shop_id = p_shop_id;' || E'\n  ' ||
    'DELETE FROM contact WHERE shop_id = p_shop_id;' || E'\n  ' ||
    'DELETE FROM folder WHERE shop_id = p_shop_id;';
BEGIN
  IF position(customers IN body) = 0 THEN
    RAISE EXCEPTION 'erase_shop is not written as migration 0054 expects';
  END IF;
  body := replace(body, customers, added || E'\n  ' || customers);
  EXECUTE body;
END $$;
