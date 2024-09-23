const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./mysql'); // Ensure mysql.js is configured correctly
const adminRoutes = require('./admin-routes');

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

// Middleware to prevent caching of sensitive pages
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    return res.redirect('/login');
  }
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
      return next(); // User is authenticated, proceed to the dashboard
  } else {
      return res.redirect('/admin-login.html'); // Redirect to admin login if not authenticated
  }
}

// report page
app.get('/overview', (req, res) => {
  res.sendFile(path.join(__dirname,  'overview.html'));
});



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
  const { fullname, username, email, phone_number, password } = req.body;

  // First, check if the email or username already exists
  db.query('SELECT email, username FROM users WHERE email = ? OR username = ?', [email, username], (err, results) => {
    if (err) {
      console.error('Error querying database for signup:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    // Check if the email or username is already taken
    if (results.length > 0) {
      const existingUser = results[0];
      if (existingUser.email === email) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ success: false, message: 'Username already taken. Choose another username if you haven’t signed up before, or reset your password if you already have an account.' });
      }
    }

    // If no user found, hash the password and insert the new user
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }

      db.query(
        'INSERT INTO users (fullname, username, email, phone_number, password) VALUES (?, ?, ?, ?, ?)', 
        [fullname, username, email, phone_number, hashedPassword], 
        (err) => {
          if (err) {
            console.error('Error inserting user into database:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
          }
          res.json({ success: true, message: 'Registration successful! You can now log in.', redirectUrl: '/login' });
        }
      );
    });
  });
});


// Admin Signup page
app.get('/admin-signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-signup.html'));
});

// Handle admin signup
app.post('/admin-signup', (req, res) => {
  const { username, password, email, fullName, phone } = req.body;

  db.query('SELECT email FROM admins WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error querying database for signup:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    } else {
      // Hash the password
      bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).json({ success: false, message: 'Server error' });
        }

        // Insert new admin into the database
        db.query('INSERT INTO admins (username, password, email, fullName, phone) VALUES (?, ?, ?, ?, ?)', 
          [username, hashedPassword, email, fullName, phone], (err) => {
            if (err) {
              console.error('Error inserting user into database:', err);
              return res.status(500).json({ success: false, message: 'Server error' });
            }
            res.json({ success: true, message: 'Admin created successfully!. They can Now Access The Dashboard', redirectUrl: '/adminLogin' });

          }
        );
      });
    }
  });
});

// Serve the admin signup page
app.get('/admin-signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-signup.html'));
});


// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Handle login
app.post('/login', (req, res) => {
  const { identifier, password } = req.body; // Use 'identifier' to accept either email or username

  db.query('SELECT * FROM users WHERE email = ? OR username = ?', [identifier, identifier], (err, results) => {
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
  const validResources = ['book1.pdf', 'book2.pdf', 'book3.pdf', 'paper1.pdf', 'paper2.pdf', 'paper3.pdf'];
  if (validResources.includes(resource)) {
    res.sendFile(path.join(__dirname, resource));
  } else {
    res.status(404).send('Resource not found');
  }
});
// Admin login page
app.get('/adminLogin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Handle admin login
app.post('/adminLogin', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM admins WHERE username = ?', [username], (err, results) => {
      if (err) {
          console.error('Error querying database for admin login:', err);
          return res.status(500).send('Server error');
      }

      if (results.length === 0) {
          return res.status(400).send('No admin found');
      }

      const user = results[0];
      if (bcrypt.compareSync(password, user.password)) {
          req.session.user = user;
          res.redirect('/admin-dashboard.html'); // Redirect to the admin dashboard
      } else {
          res.status(400).send('Incorrect password');
      }
  });
});



// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Server error');
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.redirect('/login'); // Redirect to login page after logout
  });
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next(); // User is authenticated, proceed to the next route
  }
  // Redirect to appropriate login page
  if (req.path === '/admin-dashboard.html') {
    res.redirect('/adminLogin');
  } else if (req.path === '/resources.html') {
    res.redirect('/login');
  } else {
    res.redirect('/login');
  }
}

// Middleware to check if the user is authenticated and determine user type
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next(); // Continue if authenticated
  }

  // If not authenticated, check if the user is trying to access admin or resources page
  if (req.path === '/admin-dashboard.html') {
    res.redirect('/adminLogin'); // Redirect to admin login
  } else if (req.path === '/resources.html') {
    res.redirect('/login'); // Redirect to regular user login
  } else {
    res.redirect('/login'); // Default to user login
  }
}

// Admin Dashboard Route (protected for admin users)
app.get('/admin-dashboard.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Resources Route (protected for regular users)
app.get('/resources.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'resources.html'));
});

// Single auth-check route for both admin-dashboard.html and resources.html
app.get('/auth-check', (req, res) => {
  if (req.session.user) {
    // Include userType to differentiate between admin and regular users
    res.json({ authenticated: true, userType: req.session.userType });
  } else {
    res.json({ authenticated: false });
  }
});

// Forgot password endpoint
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
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

    db.query('UPDATE users SET password = ? WHERE email = ?', [hash, email], (err, result) => {
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
// Admin login route
app.post('/adminLogin', (req, res) => {
  const { username, password } = req.body;

  // Query the admin table for matching username and password
  const sql = 'SELECT * FROM admins WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, results) => {
      if (err) throw err;

      if (results.length > 0) {
          // Successful login
          req.session.adminLoggedIn = true;
          res.redirect('/admin-dashboard.html');
      } else {
          // Invalid login
          res.send('Invalid username or password');
      }
  });
});

// Admin dashboard route (optional security check)

// admin Logout route
app.get('/adminLogout', (req, res) => {
  req.session.destroy((err) => {
      if (err) throw err;
      res.redirect('/admin-login.html');
  });
});
app.use('/admin', adminRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});