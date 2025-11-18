const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Akses ditolak. Token tidak tersedia.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devhub-secret');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token tidak valid' });
    }
};

module.exports = auth;