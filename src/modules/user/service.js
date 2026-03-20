import bcrypt from "bcrypt";
import User from "./model.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";

export const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const updateUserProfile = async (userId, data) => {
  const { name } = data;

  const user = await User.findById(userId);

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

  const user = await User.findById(id).select("+password");

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

export const getAllUsers = async (query) => {
  const {
    search = "",
    sortBy = "createdAt",
    order = "desc",
  } = query;

  const { page, limit, skip } = normalizePagination(query);

  const searchFilter = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const roleFilter = {
    role: { $ne: "admin" },
  };

  const filter = {
    ...searchFilter,
    ...roleFilter,
  };

  const sort = {
    [sortBy]: order === "asc" ? 1 : -1,
  };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),

    User.countDocuments(filter),
  ]);

  return {
    pagination: buildPaginationMeta({ total, page, limit }),
    users,
  };
}; 

export const getUserById = async (id) => {
  const user = await User.findById(id).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const updateUser = async (id, data) => {
  const user = await User.findById(id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.name = data.name || user.name;
  user.role = data.role || user.role;
  user.isActive = data.isActive ?? user.isActive;

  await user.save();

  return user;
};

export const deleteUser = async (id) => {
  const user = await User.findById(id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await user.deleteOne();

  return { message: "User deleted successfully" };
};
