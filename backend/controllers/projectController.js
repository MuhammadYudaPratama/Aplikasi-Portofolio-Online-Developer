const pool = require('../config/database');

// Add project
const addProject = async (req, res) => {
    try {
        const userId = req.user.userId;
        const projectData = req.body;

        // Get developer ID
        const [developers] = await pool.execute(
            'SELECT id FROM developers WHERE user_id = ?',
            [userId]
        );

        if (developers.length === 0) {
            return res.status(400).json({ error: 'Anda harus membuat profil developer terlebih dahulu' });
        }

        const developerId = developers[0].id;

        // Insert project
        const [result] = await pool.execute(`
            INSERT INTO projects (developer_id, name, description, demo_url, code_url)
            VALUES (?, ?, ?, ?, ?)
        `, [
            developerId,
            projectData.name,
            projectData.description,
            projectData.demo,
            projectData.code
        ]);

        const projectId = result.insertId;

        // Add technologies
        if (projectData.technologies && projectData.technologies.length > 0) {
            const techValues = projectData.technologies.map(tech => [projectId, tech]);
            await pool.query(
                'INSERT INTO project_technologies (project_id, technology) VALUES ?',
                [techValues]
            );
        }

        res.status(201).json({ 
            message: 'Proyek berhasil ditambahkan', 
            projectId 
        });
    } catch (error) {
        console.error('Add project error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get projects by developer
const getProjectsByDeveloper = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [projects] = await pool.execute(`
            SELECT p.* 
            FROM projects p 
            JOIN developers d ON p.developer_id = d.id 
            WHERE d.user_id = ?
        `, [userId]);

        for (let project of projects) {
            const [technologies] = await pool.execute(
                'SELECT technology FROM project_technologies WHERE project_id = ?',
                [project.id]
            );
            project.technologies = technologies.map(tech => tech.technology);
        }

        res.json(projects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete project
const deleteProject = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { projectId } = req.params;

        // Verify project ownership
        const [projects] = await pool.execute(`
            SELECT p.id 
            FROM projects p 
            JOIN developers d ON p.developer_id = d.id 
            WHERE p.id = ? AND d.user_id = ?
        `, [projectId, userId]);

        if (projects.length === 0) {
            return res.status(404).json({ error: 'Proyek tidak ditemukan' });
        }

        await pool.execute('DELETE FROM projects WHERE id = ?', [projectId]);

        res.json({ message: 'Proyek berhasil dihapus' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    addProject,
    getProjectsByDeveloper,
    deleteProject
};