import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 50,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 10,
            select: false,
        },

        role: {
            type: String,
            enum: ["user"],
            default: "user",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

userSchema.virtual("products", {
    ref: "Product",
    localField: "_id",
    foreignField: "createdBy",
});

userSchema.virtual("cart", {
    ref: "Cart",
    localField: "_id",
    foreignField: "user",
    justOne: true,
});

userSchema.virtual("orders", {
    ref: "Order",
    localField: "_id",
    foreignField: "user",
});

const User = mongoose.model("User", userSchema);

export default User;
