const PORT = process.env.PORT ?? 8000;
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const app = express();
const pool = require("./db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
  const { user_email, title, progress, date } = req.body;
  try {
    const editToDo = await pool.query(
      "UPDATE todos SET user_email = $1, title = $2, progress = $3, description = $4, date = $5 WHERE id = $6;",
      [user_email, title, progress, description, date, id]
    );
    res.json(editToDo);
  } catch (err) {
    console.error(err);
  }
});

//delete todo

app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const deleteToDo = await pool.query("DELETE FROM todos WHERE id = $1", [id]);
  res.json(deleteToDo);
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

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
