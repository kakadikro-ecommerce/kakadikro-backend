import bcrypt from "bcrypt";
import User from "./user.model.js";


export const getUserProfile = async (userId) => {
  const user = await User.findOne({ _id: userId, isActive: true }).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const updateUserProfile = async (userId, data) => {
  const { name } = data;

  const user = await User.findOne({ _id: userId, isActive: true });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.name = name || user.name;

  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
  };
};

export const changePassword = async (id, data) => {
  const { currentPassword, newPassword } = data;

  const user = await User.findOne({ _id: id, isActive: true }).select("+password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  await user.save();

  return { message: "Password updated successfully" };
};
