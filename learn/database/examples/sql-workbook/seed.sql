DROP SCHEMA IF EXISTS wb CASCADE;
CREATE SCHEMA wb;
SET search_path = wb;
SET timezone = 'Asia/Jakarta';

CREATE TABLE category (
  id        int PRIMARY KEY,
  name      text NOT NULL,
  parent_id int REFERENCES category(id)
);
CREATE TABLE store (
  id         int PRIMARY KEY,
  name       text NOT NULL,
  city       text NOT NULL,
  joined_at  date NOT NULL
);
CREATE TABLE product (
  id           int PRIMARY KEY,
  name         text NOT NULL,
  category_id  int NOT NULL REFERENCES category(id),
  price        numeric(12,2) NOT NULL
);
CREATE TABLE orders (
  id          int PRIMARY KEY,
  store_id    int NOT NULL REFERENCES store(id),
  status      text NOT NULL CHECK (status IN ('PENDING','PAID','SHIPPED','CANCELLED')),
  total       numeric(12,2) NOT NULL,
  created_at  timestamptz NOT NULL
);
CREATE TABLE order_item (
  order_id    int NOT NULL REFERENCES orders(id),
  product_id  int NOT NULL REFERENCES product(id),
  qty         int NOT NULL CHECK (qty > 0),
  unit_price  numeric(12,2) NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
CREATE TABLE point_ledger (
  id          int PRIMARY KEY,
  store_id    int NOT NULL REFERENCES store(id),
  delta       int NOT NULL,
  reason      text NOT NULL,
  source_id   text NOT NULL,
  created_at  timestamptz NOT NULL
);
CREATE TABLE store_login (
  store_id    int NOT NULL REFERENCES store(id),
  login_date  date NOT NULL,
  PRIMARY KEY (store_id, login_date)
);
CREATE TABLE webhook_event (
  id          int PRIMARY KEY,
  provider    text NOT NULL,
  event_id    text NOT NULL,
  payload     jsonb NOT NULL,
  received_at timestamptz NOT NULL
);
CREATE TABLE job (
  id          int PRIMARY KEY,
  kind        text NOT NULL,
  status      text NOT NULL DEFAULT 'queued',
  locked_by   text,
  run_at      timestamptz NOT NULL
);
CREATE TABLE daily_store_stats (
  store_id    int NOT NULL,
  day         date NOT NULL,
  order_count int NOT NULL,
  revenue     numeric(12,2) NOT NULL,
  PRIMARY KEY (store_id, day)
);

INSERT INTO category VALUES
 (1,'Building materials',NULL),(2,'Cement',1),(3,'Paint',1),(4,'Exterior paint',3);
INSERT INTO store VALUES
 (1,'Toko Maju','Jakarta','2026-01-05'),
 (2,'Toko Jaya','Bandung','2026-01-20'),
 (3,'Toko Sentosa','Jakarta','2026-02-03'),
 (4,'Toko Baru','Surabaya','2026-02-14'),
 (5,'Toko Diam','Medan','2026-03-01');
INSERT INTO product VALUES
 (1,'Semen 50kg',2,65000),(2,'Semen Putih',2,90000),
 (3,'Cat Tembok 5L',3,150000),(4,'Cat Kayu 1L',3,60000),
 (5,'Cat Luar 5L',4,210000);
INSERT INTO orders VALUES
 (1,1,'PAID',     650000,'2026-01-10 09:00+07'),
 (2,1,'SHIPPED',  450000,'2026-02-02 10:00+07'),
 (3,1,'PAID',     300000,'2026-03-15 11:00+07'),
 (4,2,'PAID',     900000,'2026-01-25 08:30+07'),
 (5,2,'CANCELLED',150000,'2026-02-10 14:00+07'),
 (6,2,'SHIPPED',  420000,'2026-03-03 16:00+07'),
 (7,3,'PENDING',  210000,'2026-02-05 09:15+07'),
 (8,3,'PAID',     630000,'2026-02-20 13:00+07'),
 (9,3,'PAID',     195000,'2026-04-02 10:00+07'),
 (10,4,'PAID',   1050000,'2026-02-15 15:00+07'),
 (11,1,'PAID',    120000,'2026-03-15 18:00+07');
INSERT INTO order_item VALUES
 (1,1,10,65000),
 (2,3,3,150000),
 (3,3,2,150000),
 (4,2,10,90000),
 (5,3,1,150000),
 (6,5,2,210000),
 (7,5,1,210000),
 (8,1,6,65000),(8,4,4,60000),
 (9,1,3,65000),
 (10,5,5,210000),
 (11,4,2,60000);
INSERT INTO point_ledger VALUES
 (1,1, 650,'EARN','order:1','2026-01-10 09:05+07'),
 (2,1, 450,'EARN','order:2','2026-02-02 10:05+07'),
 (3,1,-500,'REDEEM','reward:9','2026-02-20 12:00+07'),
 (4,1, 300,'EARN','order:3','2026-03-15 11:05+07'),
 (5,2, 900,'EARN','order:4','2026-01-25 08:35+07'),
 (6,2,-800,'REDEEM','reward:3','2026-02-01 09:00+07'),
 (7,2, 800,'REFUND','tada:evt_77','2026-02-01 12:00+07'),
 (8,3, 630,'EARN','order:8','2026-02-20 13:05+07');
INSERT INTO store_login VALUES
 (1,'2026-03-01'),(1,'2026-03-02'),(1,'2026-03-03'),(1,'2026-03-05'),(1,'2026-03-06'),
 (2,'2026-03-01'),(2,'2026-03-03'),(2,'2026-03-04'),(2,'2026-03-05'),(2,'2026-03-06'),
 (3,'2026-03-02');
INSERT INTO webhook_event VALUES
 (1,'tada','evt_75','{"type":"redeem_ok","store_id":1,"amount":500}','2026-02-20 12:00:01+07'),
 (2,'tada','evt_76','{"type":"redeem_failed","store_id":2,"amount":800}','2026-02-01 11:59:00+07'),
 (3,'tada','evt_77','{"type":"refund","store_id":2,"amount":800}','2026-02-01 12:00:00+07'),
 (4,'tada','evt_77','{"type":"refund","store_id":2,"amount":800}','2026-02-01 12:00:00.4+07'),
 (5,'tada','evt_78','{"type":"refund","store_id":3,"amount":200}','2026-03-01 10:00:00+07'),
 (6,'tada','evt_78','{"type":"refund","store_id":3,"amount":200}','2026-03-01 10:00:02+07'),
 (7,'tada','evt_78','{"type":"refund","store_id":3,"amount":200}','2026-03-01 10:00:05+07');
INSERT INTO job VALUES
 (1,'send_email','queued',NULL,'2026-03-01 09:00+07'),
 (2,'sync_points','queued',NULL,'2026-03-01 09:01+07'),
 (3,'send_email','queued',NULL,'2026-03-01 09:02+07'),
 (4,'send_email','done',NULL,'2026-02-28 09:00+07');
