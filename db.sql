CREATE TABLE users (
  id SERIAL,
  email VARCHAR,
  hashed_password VARCHAR,
  name VARCHAR,
  PRIMARY KEY (id, email)
);