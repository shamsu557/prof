const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./mysql'); // Ensure mysql.js is configured correctly

const app = express();
const saltRounds = 10; // Define salt rounds for bcrypt hashing

// Set up session
app.use(session({
  secret: 'YBdLcGmLbdsYrw9S4PNnaCW3SuHhZ6M0',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Change to true in production with HTTPS
}));

// Middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (HTML, CSS, JS, etc.) from the root directory
app.use(express.static(path.join(__dirname)));

// Home page (e.g., books/papers display)
app.get('/', (req, res) => {
  db.query('SELECT * FROM books', (err, books) => {
    if (err) {
      console.error('Error fetching books:', err);
      return res.status(500).send('Server error');
    }
    db.query('SELECT * FROM papers', (err, papers) => {
      if (err) {
        console.error('Error fetching papers:', err);
        return res.status(500).send('Server error');
      }
      res.sendFile(path.join(__dirname, 'index.html'));
    });
  });
});

// Signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});
// Handle sign up
app.post('/signup', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT email FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error querying database for signup:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    } else {
      bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).json({ success: false, message: 'Server error' });
        }

        db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err) => {
          if (err) {
            console.error('Error inserting user into database:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
          }
          res.json({ success: true, message: 'Registration successful! You can now log in.',redirectUrl: '/login' });
        });
      });
    }
  });
});


// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Handle login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error querying database for login:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(400).send('No user found');
    }

    const user = results[0];
    if (bcrypt.compareSync(password, user.password)) {
      req.session.user = user;

      // Redirect to resources page after successful login
      res.redirect('/resources.html');
    } else {
      res.status(400).send('Incorrect password');
    }
  });
});

// Handle resource request from resources.html
app.post('/request-resource', (req, res) => {
  const { resource, action } = req.body;

  // Store the requested resource in session
  req.session.resource = resource;

  // Determine the correct type of response based on the action
  if (action === 'read') {
    res.redirect(`/read/${resource}`);
  } else {
    res.redirect(`/download/${resource}`);
  }
});

// Handle download request
app.get('/download/:resource', (req, res) => {
  const resource = req.params.resource;

  // Ensure the resource is valid before sending it
  const validResources = ['book1.pdf', 'book2.pdf', 'book3.pdf', 'paper1.pdf', 'paper2.pdf', 'paper3.pdf'];
  if (validResources.includes(resource)) {
    res.download(path.join(__dirname, resource));
  } else {
    res.status(404).send('Resource not found');
  }
});

// Handle read request
app.get('/read/:resource', (req, res) => {
  const resource = req.params.resource;

  // Ensure the resource is valid before sending it
  const validResources = ['book1.pdf', 'book2.pdf', 'book3.pdf','paper1.pdf', 'paper2.pdf', 'paper3.pdf'];
  if (validResources.includes(resource)) {
    res.sendFile(path.join(__dirname, resource));
  } else {
    res.status(404).send('Resource not found');
  }
});

// Handle logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Server error');
    }
    res.redirect('/'); // Redirect to the homepage after logout
  });
});

// Forgot password endpoint
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
  db.query(checkEmailQuery, [email], (err, result) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).send('Server error');
    }

    if (result.length > 0) {
      res.json({ success: true, message: 'Email found. Please enter your new password.' });
    } else {
      res.json({ success: false, message: 'Email does not exist.' });
    }
  });
});

// Reset password endpoint
app.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;

  bcrypt.hash(newPassword, saltRounds, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).send('Server error');
    }

    const updatePasswordQuery = 'UPDATE users SET password = ? WHERE email = ?';
    db.query(updatePasswordQuery, [hash, email], (err, result) => {
      if (err) {
        console.error('Error updating password:', err);
        return res.status(500).send('Server error');
      }

      if (result.affectedRows > 0) {
        res.json({ success: true, message: 'Password updated successfully!', redirectUrl: '/login' });
      } else {
        res.json({ success: false, message: 'Failed to update password. Try again later.' });
      }
    });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
