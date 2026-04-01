import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRE || "15m";

export const generateAccessToken = (user) => {
  try {
    if (!user || !user._id || !user.role) {
      const error = new Error("Invalid user data for access token generation");
      error.statusCode = 400;
      throw error;
    }

    if (!process.env.JWT_SECRET) {
      const error = new Error("JWT_SECRET is not defined");
      error.statusCode = 500;
      throw error;
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    return token;
  } catch (error) {
    console.error("Access Token Generation Error:", {
      message: error.message,
      stack: error.stack,
    });

    const customError = new Error("Failed to generate access token");
    customError.statusCode = error.statusCode || 500;

    throw customError;
  }
};

export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);
