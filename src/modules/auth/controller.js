import * as authService from "./service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  hashRefreshToken,
  verifyRefreshToken,
} from "../../shared/auth/token.service.js";
import { forbidden, unauthorized } from "../../shared/errors/http-error.js";

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const pruneExpiredRefreshTokens = (refreshTokens = []) =>
  refreshTokens.filter(({ expiresAt }) => expiresAt > new Date());

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const persistRefreshToken = async (user, refreshToken) => {
  user.refreshTokens = pruneExpiredRefreshTokens(user.refreshTokens);
  user.refreshTokens.push({
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: getRefreshTokenExpiryDate(),
  });
  await user.save();
};

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
    const refreshToken = generateRefreshToken(user);

    await persistRefreshToken(user, refreshToken);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

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

export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw forbidden("Refresh token is missing");
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await authService.findUserByIdForRefresh(decoded.id);

    if (!user) {
      throw forbidden("Invalid refresh token");
    }

    const currentTokenHash = hashRefreshToken(refreshToken);
    const matchingToken = pruneExpiredRefreshTokens(user.refreshTokens).find(
      ({ tokenHash }) => tokenHash === currentTokenHash
    );

    if (!matchingToken) {
      console.log("Token mismatch detected");

      user.refreshTokens = [];
      await user.save();

      throw forbidden("Invalid refresh token");
    }

    const accessToken = generateAccessToken(user);
    // const newRefreshToken = generateRefreshToken(user);
    const newRefreshToken = refreshToken;

    user.refreshTokens = pruneExpiredRefreshTokens(user.refreshTokens).filter(
      (tokenEntry) => tokenEntry.tokenHash !== currentTokenHash
    );

    user.refreshTokens.push({
      tokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: getRefreshTokenExpiryDate(),
    });

    await user.save();
    res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(forbidden("Invalid or expired refresh token"));
    }

    return next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await authService.findUserByIdForRefresh(decoded.id);

      if (user) {
        const currentTokenHash = hashRefreshToken(refreshToken);
        user.refreshTokens = pruneExpiredRefreshTokens(user.refreshTokens).filter(
          ({ tokenHash }) => tokenHash !== currentTokenHash
        );
        await user.save();
      }
    }

    res.clearCookie("refreshToken", refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      res.clearCookie("refreshToken", refreshTokenCookieOptions);

      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    }

    return next(error);
  }
};
