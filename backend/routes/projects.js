const express = require('express');
const { 
    addProject, 
    getProjectsByDeveloper, 
    deleteProject 
} = require('../controllers/projectController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, addProject);
router.get('/my-projects', auth, getProjectsByDeveloper);
router.delete('/:projectId', auth, deleteProject);

module.exports = router;