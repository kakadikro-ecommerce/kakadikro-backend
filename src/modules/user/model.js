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
            minlength: 6,
            select: false,
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        refreshTokens: [
            {
                tokenHash: {
                    type: String,
                    required: true,
                },
                expiresAt: {
                    type: Date,
                    required: true,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
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
