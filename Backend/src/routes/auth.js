const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();
const router = express.Router();
const { PrismaClient } = require("@prisma/client/edge");
const { withAccelerate } = require("@prisma/extension-accelerate");
const cors = require('cors');
const cookieParser = require('cookie-parser');

const prisma = new PrismaClient().$extends(withAccelerate());
router.use(cookieParser());

const generateAccessToken = (user) => {
    jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '60m' }, (err, token) => {
        if (err) {
            console.error('Error generating token:', err);
            return null;
        }
        return token;
    });
}

const generateRefreshToken = (user) => {
    jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' }, (err, token) => {
        if (err) {
            console.error('Error generating token:', err);
            return null;
        }
        return token;
    });
}

// login signup routes
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const user = await prisma.User.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const accessToken = generateAccessToken({ id: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

        const updatedUser = await prisma.User.update({
            where: { id: user.id },
            data: { refreshToken },
        });
        if (!updatedUser) {
            return res.status(500).json({ message: 'Error updating user with refresh token.' });
        }

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })
        .json({ accessToken, user: { id: user.id, email: user.email } });
        
    }
    catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

router.post('/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!email || !password || !username) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const existingUser = await prisma.User.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({ message: 'Email already exists.' });
        }
    }
    catch (error) {
        console.error('Error checking existing user:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.User.create({
            data: {
                email,
                password: hashedPassword,
            },
        });

        const accessToken = generateAccessToken({ id: newUser.id, email: newUser.email });
        const refreshToken = generateRefreshToken({ id: newUser.id, email: newUser.email });

        const updatedUser = await prisma.User.update({
            where: { id: newUser.id },
            data: { refreshToken },
        });
        if (!updatedUser) {
            return res.status(500).json({ message: 'Error updating user with refresh token.' });
        }

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: (process.env.NODE_ENV === 'production'),
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })
        .json({ accessToken, user: { id: newUser.id, email: newUser.email } });
        
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

router.get('/refresh-token', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not found.' });
    }
    try{
        const user = await prisma.User.findUnique({
            where: { refreshToken },
        });
        if (!user) {
            return res.status(403).json({ message: 'Invalid refresh token.' });
        }
    }
    catch (error) {
        console.error('Error checking refresh token:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid refresh token.' });
        }

        const accessToken = generateAccessToken({ id: user.id, email: user.email });
        res.json({ accessToken: accessToken, user: { id: user.id, email: user.email } });
    });
});

router.post('/auth/logout', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not found.' });
    }

    try {
        await prisma.User.update({
            where: { refreshToken },
            data: { refreshToken: null },
        });
        res.clearCookie('refreshToken').json({ message: 'Logged out successfully.' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

module.exports = router;