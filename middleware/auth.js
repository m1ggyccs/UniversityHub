const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId });

        if (!user) {
            throw new Error();
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Please authenticate.' });
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
            res.status(500).json({ message: 'Server error' });
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
        res.status(500).json({ message: 'Server error' });
    }
};

const checkOrganizationLeader = async (req, res, next) => {
    try {
        if (req.user.role !== 'student_leader' || !req.user.isOrganizationLeader) {
            return res.status(403).json({ message: 'Access denied. Must be an organization leader.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    auth,
    checkRole,
    checkDepartmentLeader,
    checkOrganizationLeader
}; 