import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "cocheche",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "cocheche", color: "teal" },
  { id: 2, name: "buithuy", color: "powderblue" },
];

async function checkVisisted() {
  //  take all visited_countries based on user id
  const newQuery =
    "select country_code from users join visited_countries on users.id = user_id where user_id = $1";
  const result = await db.query(newQuery, [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("select * from users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

// get the countryCode from user input, then insert it into the visited_countries table.
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      console.log(currentUserId);
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  // define whether the button is Add or Member
  const data = req.body;
  if (data.add === "new") {
    res.render("new.ejs");
  } else {
    // find id of user and redirect to homepage
    currentUserId = parseInt(data.user);
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const data = req.body;
  const newUser = data.name;
  const newUserColor = data.color;

  // create a query
  const newQuery = "insert into users(name,color) values ($1, $2) RETURNING *";
  const result = await db.query(newQuery, [newUser, newUserColor]);
  currentUserId = result.rows[0].id;

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
