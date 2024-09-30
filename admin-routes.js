const express = require('express');
const path = require('path');
const axios = require('axios');
const router = express.Router();
const db = require('./mysql'); // Your MySQL configuration file
const bcrypt = require('bcryptjs');

// Constants for OneDrive API
const ONEDRIVE_API_BASE = 'https://graph.microsoft.com/v1.0/me/drive';
const ONE_DRIVE_UPLOAD_URL = `${ONEDRIVE_API_BASE}/root:/prof-uploads/`; // Upload path to 'prof-uploads'
const ONEDRIVE_ACCESS_TOKEN = 'EwB4A8l6BAAUbDba3x2OMJElkF7gJ4z/VbCPEz0AAbzCXXe3fDU4s44AOMTfrkeL4qgrfJFNdqekR7/xNubPcUdw3ji63iy6+V0ea8MTZS2E2BJ4YxELCDr0ZtLCmVpKPvaIZgFuEFRDr59oPJ5eDwhCUhKnaTas34UCMYL4huOFScAAAr7y1DDprwR4mQiontJCjNPhtGiluCuWLsD548ytZcHQq18fYlD7C4eraLEo3Dz5gNsXPRhsxr76f/t7LNAqUTjGWcXFia9Zl9ltx2ng6omUvkFqPr98JyRs3DeFuvNnXYAzPG4npXMlWvERUY0UqfnRzEiW9AwckUT5ptcD8yCd5nAq+Ox6oiDwJ/izFfOoG/Y/r1XMVFqHpSIQZgAAEARYQ5Do71WnP6OyggfzTtBAAgGBuRePl0GbMmK9yobXZV0KwcEnso/32G0m99oyyra1IwEEsW9eha2gcxG+gGMbS+dvmm/pP0fZjodOi5z+jn7y/nJh00X1phNP9UrrpuqBYzZ7T4rcRuXBVb9zdyT5X75baC0nXtjRaF/UHif7YKC2v4siMzDGkGluhRg9s6MVyPDIL3Nyn4PHMuPb217K1PxRg/Lv2/d1OHEVoUMBl5YkNnH/4FUwlMRAclNqy1cgl66KVit8V6GyeLiPjHtj4ZlRmiffAHClzBnU1hc90gJ0pfh+6FsP3USVrpC76P113jr6YLFYKN8B3R1ROQdt3LmHOVRYLucySZoPBM5/BnO+F4w6+YLvV5P9NezYdeHQ1+i17VcIREC2WWueNwOZrQl5Da20CxYPDBR3SGZk/5y4l9LrcL5YAgAI+NzLJdGsqON2P7mdMCfZHHeGpVKcr++vfZrHTpAjrt3SOQeWUhKm6gUR02XHW3xL3JEuOJpa1b0A4pJB1BONzxVMZ1xb7cRvBJkbchKfH39Zbdol4uVxIWqgKtAUnQdhURjJfWz2jOukp3Cvlb1Bt9LOtsqFWtGSCgemdzbrYp4F0MOfUhgd09ernTq+Nn7i/Y5/IZ/zHERmUvnZKTIWHUUyxWrTJXfL65v8wVWu+vQCcEynoOibfm3h+yYsMsCuGsTIzTW7Qrk9eRhjubO48g/nNvBu/2+lZ/9eT8UVXXpB5dtUUfBFhKAxTOZ1DkR8E3oYEFVpiiEEIeJO1MpwDBIP5g4qjYAC';

// Helper function to upload file to OneDrive
async function uploadToOneDrive(fileName, fileBuffer, folderName) {
    try {
        const uploadUrl = `${ONE_DRIVE_UPLOAD_URL}${folderName}/${fileName}:/content`;

        const response = await axios.put(uploadUrl, fileBuffer, {
            headers: {
                'Authorization': `Bearer ${ONEDRIVE_ACCESS_TOKEN}`,
                'Content-Type': 'application/octet-stream',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading to OneDrive:', error.response?.data || error.message);
        throw new Error('Failed to upload to OneDrive');
    }
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

// Route to add a book (OneDrive upload)
router.post('/addBook', async (req, res) => {
    const { bookTitle, username, password, fileBuffer, imageBuffer } = req.body; // File buffers for book and image

    const dateAdded = new Date();

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

        // Check if the book title already exists in the database
        const sqlCheckBook = 'SELECT * FROM books WHERE bookTitle = ?';
        db.query(sqlCheckBook, [bookTitle], async (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                return res.status(400).json({ message: 'Book with this title already exists' });
            }

            // Upload book file and image to OneDrive
            try {
                const bookFile = await uploadToOneDrive(bookTitle + '.pdf', fileBuffer, 'Books');
                const bookImage = await uploadToOneDrive(bookTitle + '-image.jpg', imageBuffer, 'BookImages');

                // Insert book details into database
                const sqlInsertBook = 'INSERT INTO books (bookTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
                db.query(sqlInsertBook, [bookTitle, bookFile.id, dateAdded, bookImage.id], (err) => {
                    if (err) throw err;
                    res.status(201).json({ message: 'Book added successfully!' });
                });
            } catch (error) {
                res.status(500).json({ message: 'Failed to upload book to OneDrive' });
            }
        });
    });
});

// Route to add a paper (OneDrive upload)
router.post('/addPaper', async (req, res) => {
    const { paperTitle, username, password, fileBuffer, imageBuffer } = req.body;

    const dateAdded = new Date();

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

        // Check if the paper title already exists in the database
        const sqlCheckPaper = 'SELECT * FROM papers WHERE paperTitle = ?';
        db.query(sqlCheckPaper, [paperTitle], async (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                return res.status(400).json({ message: 'Paper with this title already exists' });
            }

            // Upload paper file and image to OneDrive
            try {
                const paperFile = await uploadToOneDrive(paperTitle + '.pdf', fileBuffer, 'Papers');
                const paperImage = await uploadToOneDrive(paperTitle + '-image.jpg', imageBuffer, 'PaperImages');

                // Insert paper details into database
                const sqlInsertPaper = 'INSERT INTO papers (paperTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
                db.query(sqlInsertPaper, [paperTitle, paperFile.id, dateAdded, paperImage.id], (err) => {
                    if (err) throw err;
                    res.status(201).json({ message: 'Paper added successfully!' });
                });
            } catch (error) {
                res.status(500).json({ message: 'Failed to upload paper to OneDrive' });
            }
        });
    });
});

// Route to remove a book
router.delete('/removeBook/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM books WHERE id = ?';
    db.query(sql, [id], (err) => {
        if (err) throw err;
        res.status(204).send();
    });
});

// Route to remove a paper
router.delete('/removePaper/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM papers WHERE id = ?';
    db.query(sql, [id], (err) => {
        if (err) throw err;
        res.status(204).send();
    });
});

// Route for admin logout
router.get('/adminLogout', (req, res) => {
    req.session.isAdmin = false; // Mark the admin as logged out
    res.status(200).json({ message: 'Admin logged out successfully' });
});

module.exports = router;
