const express = require('express');
const { 
    getAllDevelopers, 
    getDeveloperById, 
    saveDeveloperProfile 
} = require('../controllers/developerController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', getAllDevelopers);
router.get('/:id', getDeveloperById);
router.post('/profile', auth, saveDeveloperProfile);

module.exports = router;