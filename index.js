import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import multer from "multer";
import bcrypt from "bcrypt";
import path from "path";
import session from "express-session";
import passport from "passport";

import { Strategy } from "passport-local";
import env from 'dotenv';



const app = express();
const port = 3000;
const salting_rounds = 10;
env.config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // Destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = 'post' + '-' + uniqueSuffix + fileExtension;
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

const db = new pg.Client({
  user: process.env.PG_USER,
  host:process.env.PG_HOST ,
  database:process.env.PG_DATABASE ,
  password:process.env.PG_PASSWORD ,
  port:process.env.PG_PORT,
});
db.connect();



app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret:process.env.SECRET ,
  resave: false,
  saveUninitialized: true,

}))

app.use(passport.initialize());
app.use(passport.session());

app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    var user = req.user;
    console.log(user)
    try {
      const blog_data = await db.query("SELECT * FROM blog_data")
      res.render("index.ejs", { blog_data: blog_data.rows, user: user });
    } catch (error) {
      console.log(error)
    }
  } else {
    try {
      const blog_data = await db.query("SELECT * FROM blog_data")
      res.render("index.ejs", { blog_data: blog_data.rows });
    } catch (error) {
      console.log(error)
    }
  }
});



app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/contact", async (req, res) => {
  res.render("contact.ejs");
});

app.get("/register", async (req, res) => {
  res.render("register.ejs");
});

app.get("/add_blog", async (req, res) => {
  if (req.isAuthenticated()) {
    var user = req.user;
    res.render("add_blog.ejs", {user:user});
  } 
});

app.get("/post", async (req, res) => {
  if (req.isAuthenticated()) {
    var user = req.user;
    const id = req.query.id;
    const blog_data = await db.query("SELECT * FROM blog_data WHERE id=$1",
      [id])
    res.render("post.ejs", { blog_data: blog_data.rows, user:user });
  } else {
    const id = req.query.id;
    const blog_data = await db.query("SELECT * FROM blog_data WHERE id=$1",
      [id])
    res.render("post.ejs", { blog_data: blog_data.rows });
  }

});



app.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login"
}));


app.get("/logout", (req, res) => {
  var user = req.user;
  req.logOut(user, (err) => {
    console.log(err);
    res.redirect("/")
  })

})

app.post("/register", async (req, res) => {
  const name = req.body["name"];
  const password = req.body["password"];
  const email = req.body["email"];

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, salting_rounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          const result = await db.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
            [name, email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log(err);
            res.redirect("/")
          })
        }
      });
    }
  } catch (err) {
    console.log(err);
  }

});


app.post("/add", upload.single("image"), async (req, res) => {
  let title = req.body["title"];
  let subtitle = req.body["subtitle"];
  let blog = req.body["blog"];
  var user = req.user.name;
  var filename = req.file.filename;
  try {
    const result = await db.query(
      "INSERT INTO blog_data (name, title, subtitle, blog, image_name) VALUES ($1, $2, $3, $4,$5)",
      [user, title, subtitle, blog, filename]
    )
    res.redirect("/");
  } catch (error) {
    console.log(error)
  }
});


passport.use(new Strategy(async function verify(username, password, cb) {
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      bcrypt.compare(password, storedHashedPassword, (err, result) => {
        if (err) {
          return cb(err)
        } else {
          if (result) {
            return cb(null, user)
          } else {
            return cb(null, false)
          }
        }
      });
    } else {
      return cb("user not found")
    }
  } catch (err) {
    return cb(err)
  }
}));


passport.serializeUser((user, cb) => {
  cb(null, user);
})

passport.deserializeUser((user, cb) => {
  cb(null, user);
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});