const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer untuk file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/profiles/';
        // Buat folder jika belum ada
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diizinkan!'), false);
        }
    }
});

// Endpoint untuk upload foto profil
app.post('/api/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
    try {
        console.log('Upload request received');
        console.log('File:', req.file);
        console.log('User ID:', req.body.userId);

        if (!req.file) {
            return res.status(400).json({ error: 'Tidak ada file yang diupload' });
        }

        const { userId } = req.body;
        
        if (!userId) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'User ID diperlukan' });
        }

        const profilePicturePath = req.file.filename;
        const profilePictureUrl = `http://localhost:5000/uploads/profiles/${profilePicturePath}`;

        console.log('File saved:', profilePicturePath);

        //PERBAIKI: CEK APAKAH DEVELOPER SUDAH ADA
        const existingResult = await query('SELECT id, profile_picture FROM developers WHERE user_id = ?', [userId]);
        
        let developerId;
        
        if (existingResult && existingResult.length > 0) {
            //DEVELOPER SUDAH ADA - UPDATE SAJA
            developerId = existingResult[0].id;
            
            // Hapus foto lama jika ada
            if (existingResult[0].profile_picture) {
                const oldPath = path.join('uploads/profiles/', existingResult[0].profile_picture);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                    console.log('Old picture deleted:', existingResult[0].profile_picture);
                }
            }

            await query(
                'UPDATE developers SET profile_picture = ? WHERE user_id = ?',
                [profilePicturePath, userId]
            );
            console.log('Profile picture updated for existing developer');
            
        } else {
            //DEVELOPER BELUM ADA - BUAT BARU TAPI PAKAI DATA YANG SUDAH ADA
            console.log('Creating new developer profile for user:', userId);
            
            // Dapatkan data user untuk nama default
            const userResult = await query('SELECT name, email FROM users WHERE id = ?', [userId]);
            const userName = userResult.length > 0 ? userResult[0].name : 'New Developer';
            const userEmail = userResult.length > 0 ? userResult[0].email : '';
            
            //CEK APAKAH ADA DATA LAINNYA YANG SUDAH DIISI 
            const existingDeveloperData = await query('SELECT * FROM developers WHERE user_id = ?', [userId]);
            
            if (existingDeveloperData.length > 0) {
                // Update yang sudah ada
                developerId = existingDeveloperData[0].id;
                await query(
                    'UPDATE developers SET profile_picture = ? WHERE user_id = ?',
                    [profilePicturePath, userId]
                );
                console.log('Updated existing developer with profile picture');
            } else {
                // Buat baru dengan data minimal
                const result = await query(
                    'INSERT INTO developers (user_id, profile_picture, name, email) VALUES (?, ?, ?, ?)',
                    [userId, profilePicturePath, userName, userEmail]
                );
                developerId = result.insertId;
                console.log('New developer profile created with ID:', developerId);
            }
        }

        res.json({
            success: true,
            message: 'Foto profil berhasil diupload!',
            profilePicture: profilePicturePath,
            profilePictureUrl: profilePictureUrl,
            developerId: developerId
        });

    } catch (error) {
        console.error('Upload error:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            success: false,
            error: 'Server error: ' + error.message 
        });
    }
});

// DELETE PROFILE PICTURE
app.delete('/api/developer/profile-picture/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log('Deleting profile picture for user:', userId);
        
        // Check if profile exists
        const existing = await query('SELECT id, profile_picture FROM developers WHERE user_id = ?', [userId]);
        
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Profile developer tidak ditemukan' 
            });
        }
        
        const developer = existing[0];
        
        if (!developer.profile_picture) {
            return res.status(400).json({ 
                success: false,
                error: 'Tidak ada foto profil untuk dihapus' 
            });
        }
        
        // Hapus file dari sistem file
        const filePath = path.join('uploads/profiles/', developer.profile_picture);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('File deleted from server:', developer.profile_picture);
        } else {
            console.log('File not found on server:', developer.profile_picture);
        }
        
        // Update database - set profile_picture to NULL
        const updateResult = await query(
            'UPDATE developers SET profile_picture = NULL WHERE user_id = ?',
            [userId]
        );
        
        console.log('Database updated - Affected rows:', updateResult.affectedRows);
        
        res.json({ 
            success: true,
            message: 'Foto profil berhasil dihapus!',
            affectedRows: updateResult.affectedRows
        });
        
    } catch (error) {
        console.error('Delete profile picture error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error: ' + error.message 
        });
    }
});

// Endpoint untuk serve static files (akses foto)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'devhub'
};

// Create connection pool (lebih baik dari single connection)
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper function for promises
function query(sql, params) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// Initialize database tables
async function initializeDatabase() {
    try {
        console.log('Initializing database tables...');
        
        // Create users table
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Users table ready');

        // Create developers table
        await query(`
            CREATE TABLE IF NOT EXISTS developers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                title VARCHAR(100),
                bio TEXT,
                location VARCHAR(100),
                experience INT,
                email VARCHAR(100),
                phone VARCHAR(20),
                github_url VARCHAR(255),
                linkedin_url VARCHAR(255),
                profile_picture VARCHAR(255),
                skills TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Developers table ready');

        // Create projects table DENGAN KOLOM technologies
        await query(`
            CREATE TABLE IF NOT EXISTS projects (
                id INT PRIMARY KEY AUTO_INCREMENT,
                developer_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                technologies TEXT, -- PASTIKAN KOLOM INI ADA
                demo_url VARCHAR(255),
                code_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Projects table ready');

        console.log('Database initialization completed!');
        
        // Cek struktur tabel
        await checkTableStructure();
        
    } catch (error) {
        console.error('Database initialization failed:', error);
    }
}

// Function untuk cek struktur tabel
async function checkTableStructure() {
    try {
        console.log('Checking table structure...');
        
        // Cek kolom projects table
        const projectsColumns = await query(`
            SHOW COLUMNS FROM projects
        `);
        
        console.log('Projects table columns:');
        projectsColumns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type})`);
        });
        
        // Cek jika kolom technologies tidak ada, tambahkan
        const hasTechnologies = projectsColumns.some(col => col.Field === 'technologies');
        if (!hasTechnologies) {
            console.log('Adding technologies column to projects table...');
            await query('ALTER TABLE projects ADD COLUMN technologies TEXT AFTER description');
            console.log('Technologies column added');
        }
        
    } catch (error) {
        console.error('Error checking table structure:', error);
    }
}

// REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        console.log('Register attempt:', { name, email });
        
        // Check if user exists
        const users = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(400).json({ error: 'Email sudah terdaftar' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const result = await query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        
        const userId = result.insertId;
        
        //AUTO CREATE DEVELOPER PROFILE SETELAH REGISTRASI
        try {
            const developerResult = await query(`
                INSERT INTO developers (user_id, name, email) 
                VALUES (?, ?, ?)
            `, [userId, name, email]);
            
            console.log('Auto-created developer profile with ID:', developerResult.insertId);
        } catch (devError) {
            console.error('Auto-create developer failed (non-critical):', devError);
            // Lanjutkan proses registrasi meskipun auto-create gagal
        }
        
        // Generate token
        const token = jwt.sign(
            { userId: userId, email },
            'devhub-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Registrasi berhasil! Profil developer telah dibuat otomatis.',
            token,
            user: { id: userId, name, email }
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt:', { email });
        
        // Find user
        const users = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Email atau password salah' });
        }
        
        const user = users[0];
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Email atau password salah' });
        }
        
        // Generate token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            'devhub-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login berhasil!',
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// GET ALL DEVELOPERS
app.get('/api/developers', async (req, res) => {
    try {
        const developers = await query(`
            SELECT d.*, u.name, u.email 
            FROM developers d 
            JOIN users u ON d.user_id = u.id
            WHERE d.name IS NOT NULL
        `);
        
        // Parse skills and get projects
        for (let developer of developers) {
            developer.skills = developer.skills ? JSON.parse(developer.skills) : [];
            
            // BUILD PROFILE PICTURE URL
            if (developer.profile_picture) {
                developer.profile_picture_url = `http://localhost:5000/uploads/profiles/${developer.profile_picture}`;
            }
            
            // Get projects
            const projects = await query(
                'SELECT * FROM projects WHERE developer_id = ?',
                [developer.id]
            );
            
            developer.projects = projects.map(project => ({
                ...project,
                technologies: project.technologies ? JSON.parse(project.technologies) : []
            }));
        }
        
        console.log('Developers loaded:', developers.length);
        res.json(developers);
        
    } catch (error) {
        console.error('Get developers error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// SAVE DEVELOPER PROFILE
app.post('/api/developer/profile', async (req, res) => {
    try {
        const { userId, name, title, bio, location, experience, email, phone, github, linkedin, skills } = req.body;
        
        console.log('CREATE profile request for user:', userId);
        console.log('Data:', { name, title, email });
        
        // Check if profile already exists
        const existing = await query('SELECT id FROM developers WHERE user_id = ?', [userId]);
        
        if (existing.length > 0) {
            console.log('Profile already exists, use UPDATE instead');
            return res.status(400).json({ 
                success: false,
                error: 'Profile sudah ada. Gunakan update.' 
            });
        }
        
        // Create new profile
        console.log('Creating new developer profile...');
        const result = await query(`
            INSERT INTO developers 
            (user_id, name, title, bio, location, experience, email, phone, github_url, linkedin_url, skills)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, name, title, bio, location, experience, email, phone, github, linkedin, JSON.stringify(skills)]);
        
        const developerId = result.insertId;
        console.log('New profile created with ID:', developerId);
        
        res.json({ 
            success: true,
            message: 'Profil developer berhasil dibuat!', 
            developerId: developerId
        });
        
    } catch (error) {
        console.error('Create profile error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error: ' + error.message 
        });
    }
});

app.put('/api/developer/profile', async (req, res) => {
    try {
        const { userId, name, title, bio, location, experience, email, phone, github, linkedin, skills } = req.body;
        
        console.log('Updating profile for user:', userId);
        console.log('Update data - Name:', name, 'Title:', title);
        
        // Debug: Cek data yang diterima
        console.log('Full request body:', req.body);
        
        // Check if profile exists
        const existing = await query('SELECT id, name, title FROM developers WHERE user_id = ?', [userId]);
        
        console.log('Existing profile:', existing);
        
        if (existing.length === 0) {
            console.log('Profile not found for user:', userId);
            return res.status(404).json({ error: 'Profile developer tidak ditemukan' });
        }
        
        const developerId = existing[0].id;
        console.log('Developer ID:', developerId);
        
        // Update profile - PASTIKAN NAMA DIUPDATE
        const updateResult = await query(`
            UPDATE developers 
            SET name = ?, title = ?, bio = ?, location = ?, experience = ?, email = ?, phone = ?, github_url = ?, linkedin_url = ?, skills = ?
            WHERE user_id = ?
        `, [name, title, bio, location, experience, email, phone, github, linkedin, JSON.stringify(skills), userId]);
        
        console.log('Update result - Affected rows:', updateResult.affectedRows);
        console.log('Update result - Changed rows:', updateResult.changedRows);
        
        // Verifikasi perubahan dengan query SELECT
        const afterUpdate = await query('SELECT name, title FROM developers WHERE user_id = ?', [userId]);
        console.log('After update - Name:', afterUpdate[0].name, 'Title:', afterUpdate[0].title);
        
        res.json({ 
            success: true,
            message: 'Profil developer berhasil diperbarui!', 
            developerId: developerId,
            affectedRows: updateResult.affectedRows,
            changedRows: updateResult.changedRows
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false,
            error: 'Server error: ' + error.message 
        });
    }
});

// ADD PROJECT
app.post('/api/projects', async (req, res) => {
    try {
        const { developerId, name, description, technologies, demo, code } = req.body;
        
        console.log('Adding project for developer:', developerId);
        
        const result = await query(`
            INSERT INTO projects (developer_id, name, description, technologies, demo_url, code_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [developerId, name, description, JSON.stringify(technologies), demo, code]);
        
        res.json({ 
            message: 'Proyek berhasil ditambahkan!', 
            projectId: result.insertId 
        });
        
    } catch (error) {
        console.error('Add project error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// GET DEVELOPER BY USER ID
app.get('/api/developer/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const developers = await query(`
            SELECT d.*, u.name, u.email 
            FROM developers d 
            JOIN users u ON d.user_id = u.id 
            WHERE d.user_id = ?
        `, [userId]);
        
        if (developers.length === 0) {
            return res.status(404).json({ error: 'Developer profile not found' });
        }
        
        const developer = developers[0];
        developer.skills = developer.skills ? JSON.parse(developer.skills) : [];
        
        // Get projects
        const projects = await query(
            'SELECT * FROM projects WHERE developer_id = ?',
            [developer.id]
        );
        
        developer.projects = projects.map(project => ({
            ...project,
            technologies: project.technologies ? JSON.parse(project.technologies) : []
        }));
        
        res.json(developer);
        
    } catch (error) {
        console.error('Get developer error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'DevHub API is working!',
        timestamp: new Date().toISOString()
    });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await query('SELECT 1 + 1 AS solution');
        res.json({ 
            message: 'Database connection successful!',
            solution: result[0].solution 
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Database connection failed: ' + error.message 
        });
    }
});

// Start server
const PORT = 5000;

// Initialize database and start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`API Test: http://localhost:${PORT}/api/test`);
        console.log(`Database Test: http://localhost:${PORT}/api/test-db`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

// DELETE PROJECT
app.delete('/api/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        console.log('Deleting project:', projectId);
        
        // Delete project dari database
        const result = await query('DELETE FROM projects WHERE id = ?', [projectId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Project tidak ditemukan' });
        }
        
        res.json({ 
            message: 'Project berhasil dihapus!'
        });
        
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// UPDATE PROJECT
app.put('/api/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description, technologies, demo, code } = req.body;
        
        console.log('Updating project:', projectId);
        console.log('Data received:', { name, description, technologies, demo, code });
        
        // Validasi data
        if (!name || !description) {
            return res.status(400).json({ error: 'Nama dan deskripsi project harus diisi' });
        }
        
        const result = await query(`
            UPDATE projects 
            SET name=?, description=?, technologies=?, demo_url=?, code_url=?
            WHERE id=?
        `, [name, description, JSON.stringify(technologies), demo, code, projectId]);
        
        console.log('Update result:', result);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Project tidak ditemukan' });
        }
        
        res.json({ 
            message: 'Project berhasil diperbarui!',
            affectedRows: result.affectedRows
        });
        
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// AUTO CREATE DEVELOPER PROFILE AFTER REGISTRATION
app.post('/api/auto-create-developer', async (req, res) => {
    try {
        const { userId, name, email } = req.body;
        
        console.log('Auto-creating developer profile for user:', userId);
        
        // Check if developer profile already exists
        const existing = await query('SELECT id FROM developers WHERE user_id = ?', [userId]);
        
        if (existing.length > 0) {
            console.log('Developer profile already exists');
            return res.json({ 
                success: true, 
                message: 'Profil developer sudah ada',
                developerId: existing[0].id 
            });
        }
        
        // Create basic developer profile
        const result = await query(`
            INSERT INTO developers (user_id, name, email) 
            VALUES (?, ?, ?)
        `, [userId, name, email]);
        
        console.log('Auto-created developer profile with ID:', result.insertId);
        
        res.json({ 
            success: true,
            message: 'Profil developer berhasil dibuat otomatis!',
            developerId: result.insertId
        });
        
    } catch (error) {
        console.error('Auto-create developer error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Gagal membuat profil developer otomatis: ' + error.message 
        });
    }
});