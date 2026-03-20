import jwt from "jsonwebtoken";

const generateToken = (user) => {
  try {
    if (!user || !user._id || !user.role) {
      const error = new Error("Invalid user data for token generation");
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
      { expiresIn: "7d" }
    );

    return token;

  } catch (error) {
    console.error("Token Generation Error:", {
      message: error.message,
      stack: error.stack,
    });

    const customError = new Error("Failed to generate authentication token");
    customError.statusCode = error.statusCode || 500;

    throw customError;
  }
};

export default generateToken;