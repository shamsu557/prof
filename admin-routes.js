const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('./mysql'); // Your MySQL configuration file

// Serve static files (HTML, CSS, JS)
router.use(express.static(path.join(__dirname))); // Serving static files

// API to fetch user and resource counts for the admin dashboard
router.get('/stats', (req, res) => {
    const sqlUsersCount = 'SELECT COUNT(*) AS count FROM users';
    const sqlBooksCount = 'SELECT COUNT(*) AS count FROM books';
    const sqlPapersCount = 'SELECT COUNT(*) AS count FROM papers';

    db.query(sqlUsersCount, (err, userResult) => {
        if (err) throw err;

        db.query(sqlBooksCount, (err, booksResult) => {
            if (err) throw err;

            db.query(sqlPapersCount, (err, papersResult) => {
                if (err) throw err;

                res.json({
                    usersCount: userResult[0].count,
                    booksCount: booksResult[0].count,
                    papersCount: papersResult[0].count,
                });
            });
        });
    });
});

// Admin login route
router.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    // Hardcoded admin credentials
    const adminUsername = 'Admin';
    const adminPassword = 'password001';

    if (username === adminUsername && password === adminPassword) {
        // Store admin login status in session
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Middleware to protect the admin dashboard
function ensureAdminAuthenticated(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.redirect('/admin-login.html'); // Redirect to admin login if not authenticated
    }
}

// Admin dashboard route (this serves the dashboard HTML file)
router.get('/admin-dashboard.html', ensureAdminAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Logout route
router.get('/admin-logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out.');
        }
        res.redirect('/admin-login.html'); // Redirect to admin login page
    });
});

// Serve admin login page
router.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html')); // Adjust path if needed
});

module.exports = router;
