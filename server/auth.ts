import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import type { DecodedIdToken } from "firebase-admin/auth";
import "./firebase-admin";
import { logger } from "./logger";

declare global {
    namespace Express {
        interface Request {
            firebaseUser?: DecodedIdToken;
        }
    }
}

export const requireFirebaseAuth = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const authorization = req.header("authorization");
    const token = authorization?.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : null;

    if (!token) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    try {
        req.firebaseUser = await getAuth().verifyIdToken(token);
        next();
    } catch (error) {
        logger.warn("auth.invalid_token", { error });
        res.status(401).json({ error: "Invalid authentication token." });
    }
};
