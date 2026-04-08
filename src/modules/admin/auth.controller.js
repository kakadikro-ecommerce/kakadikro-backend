import { generateAccessToken } from "../../shared/auth/token.service.js";
import * as adminAuthService from "./auth.service.js";

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const loginAdmin = async (req, res, next) => {
  try {
    const result = await adminAuthService.loginAdmin(req.body);
    const accessToken = generateAccessToken(result.userDocument);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: sanitizeUser(result.userDocument),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logoutAdmin = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return next(error);
  }
};
