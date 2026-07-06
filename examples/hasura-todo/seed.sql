-- Two tiny tables with a foreign key, so Hasura can discover a relationship.

CREATE TABLE users (
  id    serial PRIMARY KEY,
  name  text NOT NULL
);

CREATE TABLE todos (
  id        serial PRIMARY KEY,
  title     text NOT NULL,
  done      boolean NOT NULL DEFAULT false,
  user_id   integer NOT NULL REFERENCES users(id)
);

INSERT INTO users (name) VALUES ('Andi'), ('Budi');

INSERT INTO todos (title, done, user_id) VALUES
  ('Belajar Hasura',        false, 1),
  ('Review PR',             true,  1),
  ('Prepare interview',     false, 2);
