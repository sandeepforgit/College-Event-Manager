const express = require('express');
const admin = require('firebase-admin');
const ejs = require('ejs');
const bodyParser = require('body-parser');

const bcrypt = require('bcrypt');

const app = express();

const serviceAccount = require('./key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));
app.set('view engine', 'ejs');


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/home.html');
});

app.get("/signup", function (req, res) {
  const errors = [];
  res.render("signup",  {errors});
});

app.post("/signupsubmit", function (req, res) {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirm_password;
  const errors = [];

  if (password.length < 8) {
      errors.push("Password must be at least 8 characters long.");
  }

  if (password !== confirmPassword) {
      errors.push("Password and confirm password do not match.");
  }

  db.collection("users")
      .where("email", "==", email)
      .get()
      .then(async function (docs) { 
          if (docs.size > 0) {
              errors.push("Email already exists");
          }

          if (errors.length > 0) {
              res.render("signup", { errors });
          } else {
              try {
                  const hashedPassword = await bcrypt.hash(password, 10);
                  db.collection("users").add({
                      username: username,
                      email: email,
                      password: hashedPassword,
                  })
                  .then(function () {
                      res.redirect("/dashboard");
                  })
                  .catch(function (error) {
                      res.status(500).send(`Error creating user: ${error.message}`);
                  });
              } catch (error) {
                  res.status(500).send(`Error hashing password: ${error.message}`);
              }
          }
      })
      .catch(function (error) {
          res.status(500).send(`Error checking for existing user: ${error.message}`);
      });
});






app.get("/login", function (req, res) {
  const errors = [];
  res.render("login", {errors});
});

app.post("/loginsubmit", async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const errors = [];

  if (!username || !password) {
      errors.push("Username and password are required.");
  }

  const userQuery = await db.collection("users")
      .where("username", "==", username)
      .get();

  if (userQuery.size === 0) {
      errors.push("User not found. Please create an account.");
  } else {
      const userData = userQuery.docs[0].data();
      const hashedPassword = userData.password;

      const isPasswordValid = await bcrypt.compare(password, hashedPassword);

      if (!isPasswordValid) {
          errors.push("Incorrect password. Please try again.");
      }
  }

  if (errors.length > 0) {
      res.render("login", { errors });
  } else {
      res.redirect("/dashboard");
  }
});


app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/addEvent', (req, res) => {
  res.sendFile(__dirname + '/views/addEvent.html');
});

app.post('/addEvent', (req, res) => {
  const { eventName, eventDate, eventStartTime, eventEndTime, eventDescription, eventLocation } = req.body;
  const eventsRef = db.collection('events');

  eventsRef.add({
    name: eventName,
    date: eventDate,
    startTime: eventStartTime,
    endTime: eventEndTime,
    description: eventDescription,
    location: eventLocation,
  })
    .then(() => {
      res.redirect('/events');
    })
    .catch(error => {
      res.send('Error adding event: ' + error);
    });
});


app.get('/events', (req, res) => {
  const eventsRef = db.collection('events');

  eventsRef.get()
    .then(snapshot => {
      const events = [];
      snapshot.forEach(doc => {
        events.push(doc.data());
      });

      res.render('events', { events });
    })
    .catch(error => {
      res.send('Error getting events: ' + error);
    });
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
