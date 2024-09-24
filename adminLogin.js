// const express = require('express');
// const loginRouter = express.Router();
// const path = require('path');
// const db = require('./mysql'); // Ensure this is set up to connect to your database
// const bcrypt = require('bcryptjs');

// // Serve the admin login page
// loginRouter.get('/admin-login.html', (req, res) => {
//     res.sendFile(path.join(__dirname, 'admin-login.html'));
// });

// // Handle login post request
// loginRouter.post('/admin-login', (req, res) => {
//     const { username, password } = req.body;

//     db.query('SELECT * FROM admins WHERE username = ?', [username], (err, results) => {
//         if (err) {
//             console.error('Database error:', err);
//             return res.status(500).json({ success: false });
//         }

//         if (results.length === 0) {
//             return res.json({ success: false }); // Invalid username
//         }

//         const admin = results[0];

//         // Compare the password
//         if (bcrypt.compareSync(password, admin.password)) {
//             // Redirect to the admin dashboard
//             res.json({ success: true, redirect: '/admin-dashboard.html' });
//         } else {
//             res.json({ success: false }); // Invalid password
//         }
//     });
// });


// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });