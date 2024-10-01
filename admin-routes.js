const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('./mysql'); // Your MySQL configuration file
const bcrypt = require('bcryptjs');
const fs = require('fs');
const mime = require('mime');
const request = require('request');
const multer = require('multer');
const upload = multer({ dest: 'prof-uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
    res.send('File uploaded successfully');
});

// Function to upload a file to OneDrive
function uploadToOneDrive(filePath, folderName, fileName, onedrive_client_id, onedrive_client_secret, onedrive_refresh_token, callback) {
    request.post({
        url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        form: {
            redirect_uri: 'http://localhost/dashboard',
            client_id: '55d85c04-778f-4e52-9f5d-5079b7b12d35',
            client_secret: '57bfbedf-c735-4fe6-a7f3-94ba8893e4c2',
            refresh_token: 'EwB4A8l6BAAUbDba3x2OMJElkF7gJ4z/VbCPEz0AAbzCXXe3fDU4s44AOMTfrkeL4qgrfJFNdqekR7/xNubPcUdw3ji63iy6+V0ea8MTZS2E2BJ4YxELCDr0ZtLCmVpKPvaIZgFuEFRDr59oPJ5eDwhCUhKnaTas34UCMYL4huOFScAAAr7y1DDprwR4mQiontJCjNPhtGiluCuWLsD548ytZcHQq18fYlD7C4eraLEo3Dz5gNsXPRhsxr76f/t7LNAqUTjGWcXFia9Zl9ltx2ng6omUvkFqPr98JyRs3DeFuvNnXYAzPG4npXMlWvERUY0UqfnRzEiW9AwckUT5ptcD8yCd5nAq+Ox6oiDwJ/izFfOoG/Y/r1XMVFqHpSIQZgAAEARYQ5Do71WnP6OyggfzTtBAAgGBuRePl0GbMmK9yobXZV0KwcEnso/32G0m99oyyra1IwEEsW9eha2gcxG+gGMbS+dvmm/pP0fZjodOi5z+jn7y/nJh00X1phNP9UrrpuqBYzZ7T4rcRuXBVb9zdyT5X75baC0nXtjRaF/UHif7YKC2v4siMzDGkGluhRg9s6MVyPDIL3Nyn4PHMuPb217K1PxRg/Lv2/d1OHEVoUMBl5YkNnH/4FUwlMRAclNqy1cgl66KVit8V6GyeLiPjHtj4ZlRmiffAHClzBnU1hc90gJ0pfh+6FsP3USVrpC76P113jr6YLFYKN8B3R1ROQdt3LmHOVRYLucySZoPBM5/BnO+F4w6+YLvV5P9NezYdeHQ1+i17VcIREC2WWueNwOZrQl5Da20CxYPDBR3SGZk/5y4l9LrcL5YAgAI+NzLJdGsqON2P7mdMCfZHHeGpVKcr++vfZrHTpAjrt3SOQeWUhKm6gUR02XHW3xL3JEuOJpa1b0A4pJB1BONzxVMZ1xb7cRvBJkbchKfH39Zbdol4uVxIWqgKtAUnQdhURjJfWz2jOukp3Cvlb1Bt9LOtsqFWtGSCgemdzbrYp4F0MOfUhgd09ernTq+Nn7i/Y5/IZ/zHERmUvnZKTIWHUUyxWrTJXfL65v8wVWu+vQCcEynoOibfm3h+yYsMsCuGsTIzTW7Qrk9eRhjubO48g/nNvBu/2+lZ/9eT8UVXXpB5dtUUfBFhKAxTOZ1DkR8E3oYEFVpiiEEIeJO1MpwDBIP5g4qjYAC',
            grant_type: 'refresh_token'
        }
    }, function(error, response, body) {
        if (error) {
            return callback(error);
        }
        const accessToken = JSON.parse(body).access_token;

        fs.readFile(filePath, function(err, fileData) {
            if (err) {
                return callback(err);
            }

            request.put({
                url: 'https://graph.microsoft.com/v1.0/drive/root:/' + folderName + '/' + fileName + ':/content',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': mime.getType(filePath),
                },
                body: fileData
            }, function(err, response, body) {
                if (err) {
                    return callback(err);
                }
                callback(null, body);
            });
        });
    });
}
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

// Middleware to check if admin is authenticated
router.get('/is-logged-in', (req, res) => {
    if (req.session.isAdmin) {
        res.json({ isLoggedIn: true });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// Route to get all books
router.get('/getBooks', (req, res) => {
    const sql = 'SELECT * FROM books';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Route to get all papers
router.get('/getPapers', (req, res) => {
    const sql = 'SELECT * FROM papers';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Route to add a book
router.post('/addBook', upload.fields([{ name: 'bookFile' }, { name: 'bookImage' }]), async (req, res) => {
    const { bookTitle, username, password, onedrive_client_id, onedrive_client_secret, onedrive_refresh_token } = req.body; // Expecting OneDrive tokens in the request body
    const fileName = req.files['bookFile'][0].filename;
    const imageName = req.files['bookImage'][0].filename;
    const dateAdded = new Date();

    // Check if admin exists and verify password
    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';
    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }
        const admin = adminResult[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        // Check if the book title already exists in the database
        const sqlCheckBook = 'SELECT * FROM books WHERE bookTitle = ?';
        db.query(sqlCheckBook, [bookTitle], (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                return res.status(400).json({ message: 'Book with this title already exists' });
            }

            // If no duplicate, proceed to upload the book to OneDrive
            const filePath = path.join(__dirname, fileName);
            const onedrive_folder = 'prof-uploads'; // OneDrive folder to store books
            uploadToOneDrive(filePath, onedrive_folder, fileName, onedrive_client_id, onedrive_client_secret, onedrive_refresh_token, (err, onedriveResponse) => {
                if (err) {
                    return res.status(500).json({ message: 'Error uploading to OneDrive' });
                }

                // Proceed to add the book in the database
                const sqlInsertBook = 'INSERT INTO books (bookTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
                db.query(sqlInsertBook, [bookTitle, fileName, dateAdded, imageName], (err) => {
                    if (err) throw err;
                    res.status(201).json({ message: 'Book added and uploaded to OneDrive successfully!' });
                });
            });
        });
    });
});

// Route to add a paper (similar to the book route)
router.post('/addPaper', upload.fields([{ name: 'paperFile' }, { name: 'paperImage' }]), async (req, res) => {
    const { paperTitle, username, password, onedrive_client_id, onedrive_client_secret, onedrive_refresh_token } = req.body;
    const fileName = req.files['paperFile'][0].filename;
    const imageName = req.files['paperImage'][0].filename;
    const dateAdded = new Date();

    // Check if admin exists and verify passwor
    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';
    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }
        const admin = adminResult[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        // Check if the paper title already exists in the database
        const sqlCheckPaper = 'SELECT * FROM papers WHERE paperTitle = ?';
        db.query(sqlCheckPaper, [paperTitle], (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                return res.status(400).json({ message: 'Paper with this title already exists' });
            }

            // If no duplicate, proceed to upload the paper to OneDrive
            const filePath = path.join(__dirname, fileName);
            const onedrive_folder = 'prof-uploads'; // OneDrive folder to store papers
            uploadToOneDrive(filePath, onedrive_folder, fileName, onedrive_client_id, onedrive_client_secret, onedrive_refresh_token, (err, onedriveResponse) => {
                if (err) {
                    return res.status(500).json({ message: 'Error uploading to OneDrive' });
                }

                // Proceed to add the paper in the database
                const sqlInsertPaper = 'INSERT INTO papers (paperTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
                db.query(sqlInsertPaper, [paperTitle, fileName, dateAdded, imageName], (err) => {
                    if (err) throw err;
                    res.status(201).json({ message: 'Paper added and uploaded to OneDrive successfully!' });
                });
            });
        });
    });
});

// Route to get all users
router.get('/getUsers', (req, res) => {
    const sql = 'SELECT id, fullname, email, created_at FROM users';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ message: 'Error fetching users' });
        }
        res.json(results);
    });
});

// Route to remove a user
router.delete('/removeUser/:id', async (req, res) => {
    const userId = req.params.id;
    const { username, password } = req.body; // Expecting username and password in the request body

    // Check if admin exists and verify password
    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';

    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const admin = adminResult[0];

        // Compare the provided password with the hashed password in the database
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        // If admin is valid, proceed to delete the user
        const sqlDeleteUser = 'DELETE FROM users WHERE id = ?';
        db.query(sqlDeleteUser, [userId], (err) => {
            if (err) {
                console.error('Error removing user:', err);
                return res.status(500).json({ message: 'Error removing user' });
            }
            res.json({ message: 'User removed successfully!' });
        });
    });
});

// Route to remove a book
router.delete('/removeBook/:id', async (req, res) => {
    const bookId = req.params.id;
    const { username, password } = req.body;

    // Log incoming request details
    console.log(`Removing book with ID: ${bookId}, Username: ${username}`);

    // Check if admin exists and verify password
    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';

    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const admin = adminResult[0];

        // Compare the provided password with the hashed password in the database
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        // If admin is valid, proceed to delete the book
        const sqlDeleteBook = 'DELETE FROM books WHERE id = ? ';
        db.query(sqlDeleteBook, [bookId], (err, result) => {
            if (err) {
                console.error('Error removing book:', err);
                return res.status(500).json({ message: 'Error removing book' });
            }
            console.log(`Book with ID ${bookId} removed successfully.`);
            res.json({ message: 'Book removed successfully!' });
        });
    });
});

// Route to remove a paper
router.delete('/removePaper/:id', async (req, res) => {
    const paperId = req.params.id;
    const { username, password } = req.body;

    // Log incoming request details
    console.log(`Removing paper with ID: ${paperId}, Username: ${username}`);

    // Check if admin exists and verify password
    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';

    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const admin = adminResult[0];

        // Compare the provided password with the hashed password in the database
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        // If admin is valid, proceed to delete the paper
        const sqlDeletePaper = 'DELETE FROM papers WHERE id = ?';
        db.query(sqlDeletePaper, [paperId], (err, result) => {
            if (err) {
                console.error('Error removing paper:', err);
                return res.status(500).json({ message: 'Error removing paper' });
            }
            console.log(`Paper with ID ${paperId} removed successfully.`);
            res.json({ message: 'Paper removed successfully!' });
        });
    });
});

module.exports = router;