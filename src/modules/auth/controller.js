import * as authService from "./service.js";
import { generateAccessToken } from "../../shared/auth/token.service.js";
import { unauthorized } from "../../shared/errors/http-error.js";

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const registerUser = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    const user = result.userDocument;

    if (!user) {
      throw unauthorized("Unauthorized");
    }

    const accessToken = generateAccessToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return next(error);
  }
};
