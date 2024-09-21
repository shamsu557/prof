const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const mysql = require('./mysql'); // Ensure this path is correct
const multer = require('multer');
const routes = require('./routes');
const staffRoute = require('./staffRoute');
const secondPaymntRoute = require('./pay2Route');
const firstPayRoute = require('./pay1Route');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();

app.use(session({
    secret: 'YBdLcGmLbdsYrw9S4PNnaCW3SuHhZ6M0', // Replace with your own secret
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1 * 60 * 1000 } // Session expires after 1  minutes
}));

// Multer storage configuration for profile pictures
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './'); // Destination folder for profile pictures
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // File naming convention
    }
});

const upload = multer({ storage: storage });

// Middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve HTML files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/app_payment', (req, res) => res.sendFile(path.join(__dirname, 'app_payment.html')));
app.get('/firstPay', (req, res) => res.sendFile(path.join(__dirname, 'firstPay.html')));
app.get('/secondPay', (req, res) => res.sendFile(path.join(__dirname, 'secondPay.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/firstTest', (req, res) => res.sendFile(path.join(__dirname, 'firstTest.html')));
app.get('/secondTest', (req, res) => res.sendFile(path.join(__dirname, 'secondTest.html')));
app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, 'upload.html')));
app.get('/apply', (req, res) => res.sendFile(path.join(__dirname, 'apply.html')));
app.get('/staffLogin', (req, res) => res.sendFile(path.join(__dirname, 'slogin.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));

// Endpoint to handle staff login
app.post('/staffLogin', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM staff_data WHERE (username = ? OR staff_id = ?) AND password = ?';
    mysql.query(query, [username, username, password], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ success: false, message: 'Internal server error' });
            return;
        }

        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.staff = results[0];
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    });
});

// Endpoint to handle forgot password requests
app.post('/forgotPassword', (req, res) => {
    const { usernameOrId } = req.body;

    const query = 'SELECT security_question FROM staff_data WHERE username = ? OR staff_id = ?';
    mysql.query(query, [usernameOrId, usernameOrId], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ success: false, message: 'Internal server error' });
            return;
        }

        if (results.length > 0) {
            res.json({ success: true, securityQuestion: results[0].security_question });
        } else {
            res.json({ success: false });
        }
    });
});
// Endpoint to handle password reset requests
app.post('/resetPassword', (req, res) => {
    const { securityAnswer, newPassword } = req.body;

    // Convert security answer to uppercase and trim
    const securityAnswerUpper = securityAnswer.toUpperCase().trim();

    // First, validate the security answer
    const validateQuery = 'SELECT * FROM staff_data WHERE security_answer = ?';
    mysql.query(validateQuery, [securityAnswerUpper], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ success: false, message: 'Internal server error' });
            return;
        }

        if (results.length > 0) {
            // Security answer is correct, now update the password
            const updateQuery = 'UPDATE staff_data SET password = ? WHERE security_answer = ?';
            mysql.query(updateQuery, [newPassword, securityAnswerUpper], (err) => {
                if (err) {
                    console.error('Database update error:', err);
                    res.status(500).json({ success: false, message: 'Internal server error' });
                    return;
                }

                res.json({ success: true });
            });
        } else {
            res.json({ success: false });
        }
    });
});


// Endpoint to handle file uploads for credentials
app.post('/upload_credentials', upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'primaryCertificate', maxCount: 1 },
    { name: 'higherInstitutionCertificate', maxCount: 1 },
    { name: 'computerCertificate', maxCount: 1 }
]), (req, res) => {
    const applicationNumber = req.body.applicationNumber;
    const profilePicture = req.files['profilePicture'] ? req.files['profilePicture'][0].path : null;
    const primaryCertificate = req.files['primaryCertificate'] ? req.files['primaryCertificate'][0].path : null;
    const higherInstitutionCertificate = req.files['higherInstitutionCertificate'] ? req.files['higherInstitutionCertificate'][0].path : null;
    const computerCertificate = req.files['computerCertificate'] ? req.files['computerCertificate'][0].path : null;

    if (!profilePicture || !primaryCertificate) {
        return res.status(400).json({ success: false, message: 'Required files not uploaded' });
    }

    const sql = `UPDATE form_data SET profile_picture_url = ?, primaryCertificate = ?, higherInstitutionCertificate = ?, computerCertificate = ? WHERE applicationNumber = ?`;
    const values = [profilePicture, primaryCertificate, higherInstitutionCertificate, computerCertificate, applicationNumber];

    mysql.query(sql, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Database error' });
        } else {
            res.redirect(`/upload_success/${applicationNumber}`);
        }
    });
});

// Serve the upload success page
app.get('/upload_success/:applicationNumber', (req, res) => {
    const applicationNumber = req.params.applicationNumber;
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Upload Successful</title>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                .message {
                    width: 80%;
                    max-width: 600px;
                    margin: auto;
                }
            </style>
        </head>
        <body>
            <div class="message">
                <p>Your files have been uploaded successfully.</p>
                <p>Click <a href="/application_form/${applicationNumber}" target="_blank">here</a> to download or print your application form.</p>
                <p>Click continue to proceed to payment of application Fee</p>
                <form action="/app_payment" method="GET">
                    <input type="hidden" name="applicationNumber" value="${applicationNumber}">
                    <button type="submit">Continue</button>
                </form>
            </div>
        </body>
        </html>
    `);
});



// Serve the staff dashboard
app.get('/staff_dashboard', (req, res) => {
    if (!req.session.loggedin) {
        return res.redirect('/slogin.html');
    }
    res.sendFile(path.join(__dirname, 'staff_dashboard.html'));
});

// Check session for staff and profile picture 
app.get('/session', (req, res) => {
    if (req.session.loggedin) {
        // Add the profile picture URL to the session data
        const staff = req.session.staff;
        const profilePicUrl = staff.staffpic; // URL or path to the profile picture
        res.json({ 
            loggedin: true, 
            staff: { ...staff, profilePicUrl } 
        });
    } else {
        res.json({ loggedin: false });
    }
});
// Logout endpoint for staff
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out.');
        }
        res.redirect('/slogin.html');
    });
});

// Check session for user
app.get('/checkSession', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

module.exports = myrouter;
