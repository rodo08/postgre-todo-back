CREATEDATABASE todoapp

CREATE TABLE todos (
    id VARCHAR(255) PRIMARY KEY,
    user_email VARCHAR(255),
    title VARCHAR(30),
    progress INT,
    description TEXT,
    date VARCHAR(255)
);

CREATE TABLE users (
    email VARCHAR(255) PRIMARY KEY,
    hashed_password VARCHAR(255)
);

CREATE TABLE wallmessages (
  id VARCHAR(255) PRIMARY KEY,
  user_email VARCHAR(255),
  message VARCHAR(300),
 date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
