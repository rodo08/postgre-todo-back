const PORT = process.env.PORT ?? 8000;
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const app = express();
const pool = require("./db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_KEY);
require("dotenv").config();
// test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("Connected to the database successfully!");
    client.release();
  } catch (err) {
    console.error("Failed to connect to the database:", err);

    process.exit(1);
  }
}
testConnection();

app.use(cors());
app.use(express.json());

//get all todos
app.get("/todos/:userEmail", async (req, res) => {
  console.log(req);
  const { userEmail } = req.params;

  try {
    const todos = await pool.query(
      "SELECT * FROM todos WHERE user_email = $1",
      [userEmail]
    );
    res.json(todos.rows);
  } catch (err) {
    console.error(err);
  }
});

//create new todo

app.post("/todos", async (req, res) => {
  const { user_email, title, description, progress, date } = req.body;
  console.log(user_email, title, description, progress, date);
  // Verificar si los campos están vacíos
  if (!user_email || !title || !description || !progress || !date) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const id = uuidv4();

  try {
    const newToDo = await pool.query(
      `INSERT INTO todos(id, user_email, title, progress, description, date) VALUES($1, $2, $3, $4, $5, $6)`,
      [id, user_email, title, progress, description, date]
    );

    res.json(newToDo);
  } catch (err) {
    console.error(err);
  }
});

//edit todo

app.put("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { user_email, title, description, progress } = req.body;
  const date = new Date(); // Fecha actual del servidor
  const updatedTitle = `${title} (edited)`;

  try {
    const editToDo = await pool.query(
      "UPDATE todos SET user_email = $1, title = $2, progress = $3, description = $4, date = $5 WHERE id = $6;",
      [user_email, updatedTitle, progress, description, date, id]
    );
    res.json(editToDo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Error al actualizar la tarea" });
  }
});

//delete todo

app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deleteToDo = await pool.query("DELETE FROM todos WHERE id = $1", [
      id,
    ]);
    res.json(deleteToDo);
  } catch (err) {
    console.error(err);
  }
});

//sign up
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const salt = await bcrypt.genSaltSync(10);
  const hashedPassword = await bcrypt.hashSync(password, salt);

  if (!email || !password) {
    return res.status(400).json({ detail: "Email and Password are required" });
  }

  try {
    const signUp = await pool.query(
      `INSERT INTO users (email, hashed_password) VALUES($1, $2)`,
      [email, hashedPassword]
    );

    const token = jwt.sign({ email }, "secret", { expiresIn: "1hr" });

    res.json({ email, token });
  } catch (err) {
    console.error(err);
    if (err) {
      res.json({ detail: err.detail });
    }
  }
});

//log in
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ detail: "Email and Password are required" });
  }

  try {
    const users = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);

    if (!users.rows.length) {
      return res.json({ detail: "User does not exist" });
    }
    const success = await bcrypt.compare(
      password,
      users.rows[0].hashed_password
    );
    const token = jwt.sign({ email }, "secret", { expiresIn: "1hr" });

    if (success) {
      res.json({ email: users.rows[0].email, token });
    } else {
      res.json({ detail: "Password is incorrect" });
    }
  } catch (err) {
    console.error(err);
  }
});

app.post("/wallmessages", async (req, res) => {
  const { user_email, message } = req.body;
  console.log(user_email, message);

  if (!message) {
    return res.status(400).json({ detail: "Message is required" });
  }

  const id = uuidv4();

  try {
    const newMessage = await pool.query(
      `INSERT INTO wallmessages(id, user_email, message, date) VALUES($1, $2, $3, $4)`,
      [id, user_email, message, new Date()]
    );

    res.json(newMessage);
  } catch (err) {
    console.error(err);
  }
});

app.get("/wallmessages", async (req, res) => {
  try {
    const wallmessages = await pool.query(
      "SELECT * FROM wallmessages ORDER BY date DESC"
    );
    res.json(wallmessages.rows);
  } catch (err) {
    console.error(err);
  }
});

//get a message
app.get("/wallmessages/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM wallmessages WHERE id = $1",
      [id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

//like messages

app.post("/wallmessages/:id/like", async (req, res) => {
  const { id } = req.params;
  const { user_email } = req.body;

  try {
    const likeCheck = await pool.query(
      "SELECT * FROM user_likes WHERE user_email = $1 AND message_id = $2",
      [user_email, id]
    );

    if (likeCheck.rows.length > 0) {
      await pool.query(
        "DELETE FROM user_likes WHERE user_email = $1 AND message_id = $2",
        [user_email, id]
      );

      await pool.query(
        "UPDATE wallmessages SET like_count = like_count - 1 WHERE id = $1",
        [id]
      );

      res.json({ message: "Like removed" });
    } else {
      await pool.query(
        "INSERT INTO user_likes (user_email, message_id) VALUES ($1, $2)",
        [user_email, id]
      );

      await pool.query(
        "UPDATE wallmessages SET like_count = like_count + 1 WHERE id = $1",
        [id]
      );

      res.json({ message: "Like added" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Error processing like action" });
  }
});

// Get like count for a message
app.get("/wallmessages/:id/likes", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT like_count FROM wallmessages WHERE id = $1",
      [id]
    );

    res.json({ like_count: result.rows[0].like_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Error retrieving like count" });
  }
});

// Create a new reply
app.post("/replies", async (req, res) => {
  const { message_id, user_email, reply_message } = req.body;

  // Verificar si los campos obligatorios están presentes
  if (!message_id || !user_email || !reply_message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const id = uuidv4(); // Generar un ID único para la respuesta

  try {
    const newReply = await pool.query(
      `INSERT INTO replies (id, message_id, user_email, reply_message, date) VALUES ($1, $2, $3, $4, $5)`,
      [id, message_id, user_email, reply_message, new Date()]
    );

    res
      .status(201)
      .json({ message: "Reply created successfully", reply: newReply.rows[0] });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while creating the reply" });
  }
});

// Get all replies for a specific message
app.get("/replies/:message_id", async (req, res) => {
  const { message_id } = req.params;

  try {
    const replies = await pool.query(
      "SELECT * FROM replies WHERE message_id = $1 ORDER BY date ASC",
      [message_id]
    );

    res.json(replies.rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving the replies" });
  }
});

//gemini
app.post("/gemini", async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const msg = req.body.message;

    const result = await model.generateContent(msg);
    const response = await result.response;
    const text = await response.text();

    res.send(text);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

//middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ detail: "Error interno del servidor" });
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
