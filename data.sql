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
  user_email VARCHAR(255) NOT NULL,
  message VARCHAR(300) NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  like_count INTEGER DEFAULT 0;
);

CREATE INDEX user_email_idx ON wallmessages(user_email);

CREATE TABLE replies (
  id VARCHAR(255) PRIMARY KEY,
  message_id VARCHAR(255),
  user_email VARCHAR(255) NOT NULL,
  reply_message VARCHAR(300) NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES wallmessages(id) ON DELETE CASCADE
);

CREATE TABLE user_likes (
  user_email VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (user_email, message_id),  -- Clave primaria compuesta para asegurar un solo "like" por usuario por mensaje
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES wallmessages(id) ON DELETE CASCADE
);
