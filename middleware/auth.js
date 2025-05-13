const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No authentication token provided.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findOne({ _id: decoded.userId });

            if (!user) {
                return res.status(401).json({ message: 'User not found.' });
            }

            req.user = user;
            req.token = token;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token has expired. Please log in again.' });
            }
            return res.status(401).json({ message: 'Invalid authentication token.' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};

const checkRole = (roles) => {
    return async (req, res, next) => {
        try {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
            }
            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ message: 'Server error during role verification.' });
        }
    };
};

const checkDepartmentLeader = async (req, res, next) => {
    try {
        if (req.user.role !== 'student_leader' || !req.user.isDepartmentLeader) {
            return res.status(403).json({ message: 'Access denied. Must be a department leader.' });
        }
        next();
    } catch (error) {
        console.error('Department leader check error:', error);
        res.status(500).json({ message: 'Server error during permission verification.' });
    }
};

const checkOrganizationLeader = async (req, res, next) => {
    try {
        if (req.user.role !== 'student_leader' || !req.user.isOrganizationLeader) {
            return res.status(403).json({ message: 'Access denied. Must be an organization leader.' });
        }
        next();
    } catch (error) {
        console.error('Organization leader check error:', error);
        res.status(500).json({ message: 'Server error during permission verification.' });
    }
};

module.exports = {
    auth,
    checkRole,
    checkDepartmentLeader,
    checkOrganizationLeader
}; 