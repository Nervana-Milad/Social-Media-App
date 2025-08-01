import mongoose, { Schema, Types, model } from "mongoose";

const postSchema = new Schema(
  {
    content: {
      type: String,
      minlength: 2,
      maxlength: 5000,
      trim: true,
      required: function () {
        return this.attachments?.length ? false : true;
      },
    },
    attachments: [{ secure_url: String, public_id: String }],
    likes: [{ type: Types.ObjectId, ref: "User" }],
    tags: [{ type: Types.ObjectId, ref: "User" }],
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    deletedBy: { type: Types.ObjectId, ref: "User" },
    isDeleted: Date,
    isArchived: Date,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

postSchema.virtual("comments", {
  localField: "_id",
  foreignField: "postId",
  ref: "Comment",
  justOne: true,
});

export const postModel = mongoose.models.Post || model("Post", postSchema);
