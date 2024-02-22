const jwt = require('jsonwebtoken')
const dotenv = require("dotenv")
dotenv.config()
const bcrypt = require("bcrypt")

import { NextFunction, Request, Response } from "express"


export const jwtAuth = async (payload: object): Promise<string> => {
    try {
        const key = process.env.secretKey;
        const token = jwt.sign(payload, key);
        return token
    } catch (error) {
        console.error('Error generating JWT token:', error);
        throw error;
    }
};

export const VerifyJwt = async (req: Request, res: Response, next: NextFunction) => {
    const authorizationHeader = req.headers["authorization"];
    if (!authorizationHeader) {
        return res.status(400).json({ message: "Invalid Token" })
    } else {
        const key = process.env.secretKey
        try {
            const decoded = jwt.verify(authorizationHeader, key);
            if (!decoded) {
                return res.status(400).json({ message: "Unauthorized user" })
            } else {
                next()
            }
        } catch (error) {
            return res.status(400).json({ message: error })
        }
    }

};



export const hashPassword = async (password: string): Promise<string> => {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Internal server error');
    }
};

export const comparePasswords = async (plaintextPassword: string, hashedPassword: string): Promise<boolean> => {
    try {
        // Compare the plaintext password with the hashed password
        const match = await bcrypt.compare(plaintextPassword, hashedPassword);
        return match; // Return true if passwords match, false otherwise
    } catch (error) {
        // Handle any errors
        console.error('Error comparing passwords:', error);
        return false; // Return false in case of error
    }
}

// export interface ValidatedRequest extends Request {
//     validatedData?: typeof accountDetailsSchema._output;
// }

// export function validateDataMiddleware(req: ValidatedRequest, res: Response, next: NextFunction) {
//     const validationResult = accountDetailsSchema.safeParse(req.body);
//     if (validationResult.success) {
//       req.validatedData = validationResult.data;
//       next();
//     } else {
//       return res.status(400).json({ error: validationResult.error.errors });
//     }
// }


