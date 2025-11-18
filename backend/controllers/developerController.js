const pool = require('../config/database');

// Get all developers
const getAllDevelopers = async (req, res) => {
    try {
        const [developers] = await pool.execute(`
            SELECT d.*, u.name, u.email 
            FROM developers d 
            JOIN users u ON d.user_id = u.id
        `);

        // Get skills for each developer
        for (let developer of developers) {
            const [skills] = await pool.execute(
                'SELECT skill_name FROM developer_skills WHERE developer_id = ?',
                [developer.id]
            );
            developer.skills = skills.map(skill => skill.skill_name);

            const [projects] = await pool.execute(`
                SELECT p.*, 
                (SELECT GROUP_CONCAT(technology) FROM project_technologies WHERE project_id = p.id) as technologies
                FROM projects p WHERE p.developer_id = ?
            `, [developer.id]);

            developer.projects = projects.map(project => ({
                ...project,
                technologies: project.technologies ? project.technologies.split(',') : []
            }));
        }

        res.json(developers);
    } catch (error) {
        console.error('Get developers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get developer by ID
const getDeveloperById = async (req, res) => {
    try {
        const { id } = req.params;

        const [developers] = await pool.execute(`
            SELECT d.*, u.name, u.email 
            FROM developers d 
            JOIN users u ON d.user_id = u.id 
            WHERE d.id = ?
        `, [id]);

        if (developers.length === 0) {
            return res.status(404).json({ error: 'Developer tidak ditemukan' });
        }

        const developer = developers[0];

        // Get skills
        const [skills] = await pool.execute(
            'SELECT skill_name FROM developer_skills WHERE developer_id = ?',
            [id]
        );
        developer.skills = skills.map(skill => skill.skill_name);

        // Get projects with technologies
        const [projects] = await pool.execute(`
            SELECT p.* 
            FROM projects p 
            WHERE p.developer_id = ?
        `, [id]);

        for (let project of projects) {
            const [technologies] = await pool.execute(
                'SELECT technology FROM project_technologies WHERE project_id = ?',
                [project.id]
            );
            project.technologies = technologies.map(tech => tech.technology);
        }

        developer.projects = projects;

        res.json(developer);
    } catch (error) {
        console.error('Get developer error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create or update developer profile
const saveDeveloperProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const developerData = req.body;

        // Check if developer profile already exists
        const [existingDevelopers] = await pool.execute(
            'SELECT id FROM developers WHERE user_id = ?',
            [userId]
        );

        let developerId;

        if (existingDevelopers.length > 0) {
            // Update existing profile
            developerId = existingDevelopers[0].id;
            await pool.execute(`
                UPDATE developers 
                SET name = ?, title = ?, bio = ?, location = ?, experience = ?, 
                    email = ?, phone = ?, github_url = ?, linkedin_url = ?
                WHERE user_id = ?
            `, [
                developerData.name,
                developerData.title,
                developerData.bio,
                developerData.location,
                developerData.experience,
                developerData.email,
                developerData.phone,
                developerData.github,
                developerData.linkedin,
                userId
            ]);

            // Remove existing skills
            await pool.execute(
                'DELETE FROM developer_skills WHERE developer_id = ?',
                [developerId]
            );
        } else {
            // Create new profile
            const [result] = await pool.execute(`
                INSERT INTO developers 
                (user_id, name, title, bio, location, experience, email, phone, github_url, linkedin_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId,
                developerData.name,
                developerData.title,
                developerData.bio,
                developerData.location,
                developerData.experience,
                developerData.email,
                developerData.phone,
                developerData.github,
                developerData.linkedin
            ]);
            developerId = result.insertId;
        }

        // Add skills
        if (developerData.skills && developerData.skills.length > 0) {
            const skillValues = developerData.skills.map(skill => [developerId, skill]);
            await pool.query(
                'INSERT INTO developer_skills (developer_id, skill_name) VALUES ?',
                [skillValues]
            );
        }

        res.json({ 
            message: 'Profil berhasil disimpan', 
            developerId 
        });
    } catch (error) {
        console.error('Save profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getAllDevelopers,
    getDeveloperById,
    saveDeveloperProfile
};