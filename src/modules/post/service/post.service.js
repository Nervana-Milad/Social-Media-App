import { cloud } from "../../../utilis/multer/cloudinary.multer.js";
import { asyncHandler } from "../../../utilis/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { postModel } from "../../../DB/model/Post.model.js";
import { successRespone } from "../../../utilis/response/success.response.js";
import { roleTypes } from "../../../DB/model/User.model.js";
import { paginate } from "../../../utilis/pagination.js";

export const getAllPosts = asyncHandler(async (req, res, next) => {
  let { page, size } = req.query;

  const data = await paginate({
    page,
    size,
    model: postModel,
    filter: {
      isDeleted: { $exists: false },
    },
    populate: [
      {
        path: "createdBy",
        select: "username image",
      },
      {
        path: "likes",
        select: "username image",
      },
      {
        path: "comments",
        match: { isDeleted: { $exists: false }, commentId: { $exists: false } },
        populate: [
          {
            path: "reply",
            match: { isDeleted: { $exists: false } },
          },
        ],
      },
    ],
  });

  return successRespone({ res, statusCode: 200, data });
});

export const createPost = asyncHandler(async (req, res, next) => {
  const { content } = req.body;
  let attachments = [];
  for (const file of req.files) {
    const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
      folder: `${process.env.APP_NAME}/POST`,
    });
    attachments.push({ secure_url, public_id });
  }
  const post = await dbService.create({
    model: postModel,
    data: {
      content,
      attachments,
      createdBy: req.user._id,
    },
  });
  return successRespone({ res, statusCode: 201, data: { post } });
});

export const updatePost = asyncHandler(async (req, res, next) => {
  let attachments = [];
  if (req.files.length) {
    for (const file of req.files) {
      const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
        folder: `${process.env.APP_NAME}/POST`,
      });
      attachments.push({ secure_url, public_id });
    }
    req.body.attachments = attachments;
  }

  const post = await dbService.findOneAndUpdate({
    model: postModel,
    filter: {
      _id: req.params.postId,
      isDeleted: { $exists: false },
      createdBy: req.user._id,
    },
    data: {
      ...req.body,
      updatedBy: req.user._id,
    },
    options: { new: true },
  });
  return post
    ? successRespone({ res, statusCode: 200, data: { post } })
    : next(new Error("Post not found", { cause: 404 }));
});

export const freezePost = asyncHandler(async (req, res, next) => {
  const owner =
    req.user.role === roleTypes.admin ? {} : { createdBy: req.user._id };
  const post = await dbService.findOneAndUpdate({
    model: postModel,
    filter: {
      _id: req.params.postId,
      isDeleted: { $exists: false },
      ...owner,
    },
    data: {
      isDeleted: true,
      updatedBy: req.user._id,
      deletedBy: req.user._id,
    },
    options: { new: true },
  });
  return post
    ? successRespone({ res, statusCode: 200, data: { post } })
    : next(new Error("Post not found", { cause: 404 }));
});

export const unfreezePost = asyncHandler(async (req, res, next) => {
  const post = await dbService.findOneAndUpdate({
    model: postModel,
    filter: {
      _id: req.params.postId,
      isDeleted: { $exists: true },
      deletedBy: req.user._id,
    },
    data: {
      $unset: {
        isDeleted: 0,
        deletedBy: 0,
      },
      updatedBy: req.user._id,
    },
    options: { new: true },
  });
  return post
    ? successRespone({ res, statusCode: 200, data: { post } })
    : next(new Error("Post not found", { cause: 404 }));
});

export const likePost = asyncHandler(async (req, res, next) => {
  const data =
    req.query.action === "unLike"
      ? { $pull: { likes: req.user._id } }
      : { $addToSet: { likes: req.user._id } };
  const post = await dbService.findOneAndUpdate({
    model: postModel,
    filter: {
      _id: req.params.postId,
      isDeleted: { $exists: false },
    },
    data,
    options: { new: true },
  });
  return post
    ? successRespone({ res, statusCode: 200, data: { post } })
    : next(new Error("Post not found", { cause: 404 }));
});

export const undoPost = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const post = await dbService.findOne({
    model: postModel,
    filter: {
      _id: postId,
      createdBy: req.user._id,
      isDeleted: { $exists: false },
    },
  });
  if (!post) {
    return next(
      new Error("Post not found or unauthorized action", { cause: 404 })
    );
  }

  let now = new Date();
  let createdAt = new Date(post.createdAt);
  let timeDiff = (now - createdAt) / (1000 * 60);

  if (timeDiff > 2) {
    return next(
      new Error(
        "Undo action is allowed only within 2 minutes of post creation",
        { cause: 403 }
      )
    );
  }
  const updatedPost = await dbService.findOneAndUpdate({
    model: postModel,
    filter: { _id: postId },
    data: { isDeleted: Date.now() },
    options: { new: true },
  });
  return successRespone({ res, statusCode: 200, data: { post: updatedPost } });
});

export const archivePost = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const post = await dbService.findOne({
    model: postModel,
    filter: {
      _id: postId,
      createdBy: req.user._id,
      isArchived: { $exists: false },
    },
  });
  if (!post) {
    return next(
      new Error("Post not found or unauthorized action", { cause: 404 })
    );
  }

  let now = new Date();
  let createdAt = new Date(post.createdAt);
  let timeDiff = (now - createdAt) / (1000 * 60 * 60);

  if (timeDiff < 24) {
    return next(
      new Error("You can only archive a post after 24 hours of its creation", {
        cause: 403,
      })
    );
  }
  const updatedPost = await dbService.findOneAndUpdate({
    model: postModel,
    filter: { _id: postId },
    data: { isArchived: Date.now() },
    options: { new: true },
  });
  return successRespone({ res, statusCode: 200, data: { post: updatedPost } });
});
