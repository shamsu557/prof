const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios'); // For making API calls
const router = express.Router();
const db = require('./mysql'); // Your MySQL configuration file
const bcrypt = require('bcryptjs');

const clientId = '55d85c04-778f-4e52-9f5d-5079b7b12d35'; // From Microsoft Azure
const clientSecret = 'pN.8Q~ct6YO1uBiaADsa-yd12.~9Y3pdIdUe0blR'; // From Microsoft Azure
const tenantId = 'a8d3019e-aba7-4627-886e-fcd4128c8656'; // From Microsoft Azure
const redirectUri = 'https://prof-publications.onrender.com/auth/callback'; // Your redirect URI
const folderName = 'prof-upload'; // OneDrive folder

// Serve static files (HTML, CSS, JS)
router.use(express.static(path.join(__dirname)));

// Multer setup for handling file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// Function to get access token for OneDrive API
async function getAccessToken() {
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    try {
        const response = await axios.post(tokenEndpoint, params);
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Failed to get access token');
    }
}

// API to fetch user and resource counts for the admin dashboard
router.get('/stats', (req, res) => {
    const sqlQueries = {
        usersCount: 'SELECT COUNT(*) AS count FROM users',
        booksCount: 'SELECT COUNT(*) AS count FROM books',
        papersCount: 'SELECT COUNT(*) AS count FROM papers',
    };

    Promise.all(
        Object.values(sqlQueries).map(sql => new Promise((resolve, reject) => {
            db.query(sql, (err, result) => {
                if (err) return reject(err);
                resolve(result[0].count);
            });
        }))
    )
    .then(([usersCount, booksCount, papersCount]) => {
        res.json({ usersCount, booksCount, papersCount });
    })
    .catch(err => {
        console.error('Error fetching stats:', err);
        res.status(500).json({ message: 'Error fetching stats' });
    });
});

// Middleware to check if admin is authenticated
router.get('/is-logged-in', (req, res) => {
    res.json({ isLoggedIn: !!req.session.isAdmin });
});

// Route to get all books
router.get('/getBooks', (req, res) => {
    db.query('SELECT * FROM books', (err, results) => {
        if (err) {
            console.error('Error fetching books:', err);
            return res.status(500).json({ message: 'Error fetching books' });
        }
        res.json(results);
    });
});

// Route to get all papers
router.get('/getPapers', (req, res) => {
    db.query('SELECT * FROM papers', (err, results) => {
        if (err) {
            console.error('Error fetching papers:', err);
            return res.status(500).json({ message: 'Error fetching papers' });
        }
        res.json(results);
    });
});

// Function to check admin credentials
async function verifyAdminCredentials(username, password) {
    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';
    return new Promise((resolve, reject) => {
        db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
            if (err || adminResult.length === 0) {
                return reject('Invalid admin credentials');
            }
            const admin = adminResult[0];
            const match = await bcrypt.compare(password, admin.password);
            if (!match) {
                return reject('Invalid admin credentials');
            }
            resolve();
        });
    });
}

// Example route for file upload
router.post('/upload', async (req, res) => {
    const accessToken = req.session.accessToken; // Get the access token from session

    if (!accessToken) {
        return res.status(401).json({ message: 'Unauthorized: No access token available. Please log in.' });
    }

    const bookFile = req.files.bookFile; // Ensure you have file upload middleware (like multer) set up

    try {
        const uploadedBookFile = await uploadToOneDrive(bookFile.data, bookFile.name, accessToken);
        res.status(200).json({ message: 'File uploaded successfully', id: uploadedBookFile.id });
    } catch (error) {
        console.error('Upload failed:', error);
        res.status(500).json({ message: 'Failed to upload file to OneDrive' });
    }
});

async function uploadToOneDrive(fileBuffer, fileName, accessToken) {
    const uploadEndpoint = `https://graph.microsoft.com/v1.0/me/drive/root:/${folderName}/${fileName}:/content`;

    try {
        const response = await axios.put(uploadEndpoint, fileBuffer, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/octet-stream',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading file to OneDrive:', error.response ? error.response.data : error.message);
        throw new Error('Failed to upload file to OneDrive');
    }
}

// Route to add a paper and upload it to OneDrive
router.post('/addPaper', upload.fields([{ name: 'paperFile' }, { name: 'paperImage' }]), async (req, res) => {
    const { paperTitle, username, password } = req.body;
    const paperFile = req.files['paperFile']?.[0];
    const paperImage = req.files['paperImage']?.[0];
    const dateAdded = new Date();

    if (!paperFile || !paperImage) {
        return res.status(400).json({ message: 'Both paper file and image are required' });
    }

    try {
        await verifyAdminCredentials(username, password);

        const sqlCheckPaper = 'SELECT * FROM papers WHERE paperTitle = ?';
        db.query(sqlCheckPaper, [paperTitle], async (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                return res.status(400).json({ message: 'Paper with this title already exists' });
            }

            const accessToken = await getAccessToken();

            const uploadedPaperFile = await uploadToOneDrive(paperFile.buffer, paperFile.originalname, accessToken);
            const uploadedPaperImage = await uploadToOneDrive(paperImage.buffer, paperImage.originalname, accessToken);

            const sqlInsertPaper = 'INSERT INTO papers (paperTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
            db.query(sqlInsertPaper, [paperTitle, uploadedPaperFile.id, dateAdded, uploadedPaperImage.id], (err) => {
                if (err) {
                    console.error('Error inserting paper into database:', err);
                    return res.status(500).json({ message: 'Error inserting paper into database' });
                }
                res.status(201).json({ message: 'Paper added successfully!', file: uploadedPaperFile, image: uploadedPaperImage });
            });
        });
    } catch (error) {
        console.error('Error processing paper upload:', error);
        res.status(500).json({ message: error.message || 'Error uploading paper to OneDrive' });
    }
});

// Route to get all users
router.get('/getUsers', (req, res) => {
    db.query('SELECT id, fullname, email, created_at FROM users', (err, results) => {
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
    const { username, password } = req.body;

    try {
        await verifyAdminCredentials(username, password);

        const sqlDeleteUser = 'DELETE FROM users WHERE id = ?';
        db.query(sqlDeleteUser, [userId], (err) => {
            if (err) {
                console.error('Error removing user:', err);
                return res.status(500).json({ message: 'Error removing user' });
            }
            res.json({ message: 'User removed successfully' });
        });
    } catch (error) {
        console.error('Error removing user:', error);
        res.status(500).json({ message: error.message || 'Error removing user' });
    }
});

module.exports = router;
