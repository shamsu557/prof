const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./mysql'); // Ensure mysql.js is configured correctly
const adminRoutes = require('./admin-routes');
const fs = require('fs');
const app = express();
const saltRounds = 10; // Define salt rounds for bcrypt hashing

// Set up session
app.use(session({
  secret: 'YBdLcGmLbdsYrw9S4PNnaCW3SuHhZ6M0',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true,
    maxAge:   60 * 60 * 1000 // 1 year session expiration
  }
}));

// Middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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

// Middleware to check if the user is authenticated as admin
function isAdminAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next(); // User is authenticated, proceed to the dashboard
  } else {
    return res.redirect('/adminLogin'); // Redirect to admin login if not authenticated
  }
}


// Serve static files (HTML, CSS, JS, etc.) from the root directory
app.use(express.static(path.join(__dirname)));

// Serve index.html at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
// about page 
app.get('/About', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});


// User Signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

// Handle User Signup
app.post('/signup', (req, res) => {
  const { fullname, email, phone_number, password } = req.body;

  // Check if the email already exists
  db.query('SELECT email FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error querying database for signup:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    // Check if the email is already taken
    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Hash the password and insert the new user
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }

      db.query(
        'INSERT INTO users (fullname, email, phone_number, password) VALUES (?, ?, ?, ?)', 
        [fullname, email, phone_number, hashedPassword], 
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

// User Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Handle User Login
app.post('/login', (req, res) => {
  const { identifier, password } = req.body; // Use 'identifier' to accept either email or username

  db.query('SELECT * FROM users WHERE email = ?', [identifier], (err, results) => {
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
      res.redirect('/resources.html'); // Redirect to resources page after successful login
    } else {
      res.status(400).send('Incorrect password');
    }
  });
});
// Forgot password endpoint
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  db.query('SELECT email FROM users WHERE email = ?', [email], (err, result) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).send('Server error');
    }

    if (result.length > 0) {
      res.json({ success: true, message: 'Email found. You may now reset your password.' });
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

// Admin creation login route (only allows Admin001 with 'default' password)
app.post('/admin-creation-login', (req, res) => {
  const { username, password } = req.body;

  // Hardcoded credentials
  const validUsername = 'Admin';
  const validPassword = 'password';

  // Check the credentials
  if (username === validUsername && password === validPassword) {
    // Credentials are correct, allow access to the admin signup page
    return res.json({ success: true, message: 'Login successful! You can now create a new admin.' });
  } else {
    // Invalid credentials
    return res.json({ success: false, message: 'Invalid credentials! You do not have permission to create admins.' });
  }
});

// Admin Signup page
app.get('/admin-signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-signup.html'));
});

// Handle admin signup
app.post('/admin-signup', (req, res) => {
  const { username, password, email, fullName, phone } = req.body;

  // Check if the email already exists
  db.query('SELECT email FROM admins WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error querying database for signup:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    // Check if the email is already taken
    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    } 

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
            console.error('Error inserting admin into database:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
          }
          res.json({ success: true, message: 'Admin created successfully! They can now access the dashboard.', redirectUrl: '/adminLogin' });
        }
      );
    });
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
app.get('/admin-dashboard.html', isAdminAuthenticated, (req, res) => {
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

// API Endpoint to fetch books
app.get('/api/books', (req, res) => {
  const query = 'SELECT id, bookTitle, file_name, image FROM books ORDER BY date_added DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching books:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(results);
  });
});

// API Endpoint to fetch papers
app.get('/api/papers', (req, res) => {
  const query = 'SELECT id, paperTitle, file_name, image FROM papers ORDER BY date_added DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching papers:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(results);
  });
});

// Serve book or paper files for reading
app.get('/view/:fileName', (req, res) => {
  const filePath = path.join(__dirname, req.params.fileName); // Serve directly from the current folder
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('File not found');
    }
    res.sendFile(filePath);
  });
});

// Serve files for download
app.get('/files/:fileName', (req, res) => {
  const filePath = path.join(__dirname, req.params.fileName); // Serve directly from the current folder
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('File not found');
    }
    res.download(filePath);
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
// admin Logout route
app.get('/adminLogout', (req, res) => {
  req.session.destroy((err) => {
      if (err) throw err;
      res.redirect('/admin-login.html');
  });
});

app.use('/admin', adminRoutes);


// Server listening on port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
