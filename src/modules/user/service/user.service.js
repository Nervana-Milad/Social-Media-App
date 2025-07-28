import { asyncHandler } from "../../../utilis/response/error.response.js";
import { successRespone } from "../../../utilis/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { roleTypes, userModel } from "../../../DB/model/User.model.js";
import { emailEvent } from "../../../utilis/events/email.event.js";
import {
  compareHash,
  generateHash,
} from "../../../utilis/security/hash.security.js";
import { cloud } from "../../../utilis/multer/cloudinary.multer.js";
import { postModel } from "../../../DB/model/Post.model.js";

export const dashboard = asyncHandler(async (req, res, next) => {
  // To get all posts and users with viewers populated
  // Using Promise.allSettled to handle both promises concurrently in a little bit time
  const result = await Promise.allSettled([
    await dbService.find({
      model: postModel,
      filter: {},
    }),
    dbService.find({
      model: userModel,
      filter: {},
      populate: [
        {
          path: "viewers.userId",
          select: "username coverImage",
        },
      ],
    }),
  ]);

  return successRespone({ res, data: { result } });
});

export const changeRoles = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;

  const roles =
    req.user.role === roleTypes.superAdmin
      ? { role: { $nin: [roleTypes.superAdmin] } }
      : { role: { $nin: [roleTypes.superAdmin, roleTypes.admin] } };

  const useer = await dbService.findOneAndUpdate({
    model: userModel,
    filter: {
      _id: userId,
      ...roles,
    },
    data: {
      role,
      updatedBy: req.user._id,
    },
    options: { new: true },
  });
  return successRespone({ res, data: { useer, hi: "hoooooooo" } });
});

export const profile = asyncHandler(async (req, res, next) => {
  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: req.user._id },
    populate: [
      {
        path: "viewers.userId",
        select: "username coverImage",
      },
    ],
  });
  return successRespone({ res, data: { user } });
});

export const shareProfile = asyncHandler(async (req, res, next) => {
  const { profileId } = req.params;
  let user = null;
  if (profileId === req.user._id.toString()) {
    user = req.user;
  } else {
    user = await dbService.findOneAndUpdate({
      model: userModel,
      filter: { _id: profileId, isDeleted: false },
      data: {
        $push: { viewers: { userId: req.user._id, time: Date.now() } },
      },
      select: "username image email",
    });
  }
  return user
    ? successRespone({ res, data: { user } })
    : next(new Error("In-valid account", { cause: 404 }));
});

export const updateEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (await dbService.findOne({ model: userModel, filter: { email } })) {
    return next(new Error("Eamil exist", { cause: 409 }));
  }
  await dbService.updateOne({
    model: userModel,
    filter: { _id: req.user._id },
    data: { tempEmail: email },
  });
  emailEvent.emit("sendConfirmEmail", {
    id: req.user._id,
    email: req.user.email,
  });
  emailEvent.emit("updateEmail", { id: req.user._id, email });
  return successRespone({ res, data: {} });
});

export const resetEmail = asyncHandler(async (req, res, next) => {
  const { oldCode, newCode } = req.body;
  const user = await dbService.findOne({
    model: userModel,
    filter: { email: req.user.email },
  });
  if (
    !compareHash({ plainText: oldCode, hashValue: req.user.confirmEmailOTP }) ||
    !compareHash({ plainText: newCode, hashValue: req.user.tempEmailOTP })
  ) {
    const attemptsLeft = 4 - user.otpAttempts;
    if (user.otpAttempts >= 4) {
      await userModel.updateOne(
        { email: req.user.email },
        {
          otpBlockedUntil: new Date(Date.now() + 5 * 60 * 1000),
          otpAttempts: 0,
        }
      );
      return next(
        new Error(
          "Too many failed attempts. you can ask for resending a new OTP after in 5 minutes",
          { cause: 429 }
        )
      );
    } else {
      await userModel.updateOne(
        { email: req.user.email },
        { $inc: { otpAttempts: 1 } }
      );
      return next(
        new Error(`In-valid OTP code. ${attemptsLeft} attempts left`, {
          cause: 400,
        })
      );
    }
  }
  await dbService.updateOne({
    model: userModel,
    filter: { _id: req.user._id },
    data: {
      email: req.user.tempEmail,
      changeCredentialsTime: Date.now(),
      $unset: {
        tempEmail: 0,
        tempEmailOTP: 0,
        confirmEmailOTP: 0,
        otpAttempts: 0,
        otpExpires: 0,
      },
    },
  });
  return successRespone({ res, data: {} });
});

export const updatePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, password } = req.body;
  if (!compareHash({ plainText: oldPassword, hashValue: req.user.password })) {
    return next(new Error("In-valid old password", { cause: 400 }));
  }
  await dbService.updateOne({
    model: userModel,
    filter: { _id: req.user._id },
    data: {
      password: generateHash({ plainText: password }),
      changeCredentialsTime: Date.now(),
    },
  });
  return successRespone({ res, data: {} });
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  const user = await dbService.findOneAndUpdate({
    model: userModel,
    filter: { _id: req.user._id },
    data: req.body,
    options: { new: true },
  });
  return successRespone({ res, data: { user } });
});

export const updateProfileImage = asyncHandler(async (req, res, next) => {
  const { secure_url, public_id } = await cloud.uploader.upload(req.file.path, {
    folder: `${process.env.APP_NAME}/user/${req.user._id}/profile`,
  });
  const user = await dbService.findOneAndUpdate({
    model: userModel,
    filter: { _id: req.user._id },
    data: { image: { secure_url, public_id } },
    options: {
      new: false,
    },
  });
  if (user.image?.public_id) {
    await cloud.uploader.destroy(user.image.public_id);
  }

  return successRespone({ res, data: { user } });
});

export const updateProfileCoverImage = asyncHandler(async (req, res, nexr) => {
  let images = [];
  for (const file of req.files) {
    const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
      folder: `${process.env.APP_NAME}/user/${req.user._id}/profile/cover`,
    });
    images.push({ secure_url, public_id });
  }
  const user = await dbService.findOneAndUpdate({
    model: userModel,
    filter: { _id: req.user._id },
    data: {
      coverImage: images,
    },
    options: { new: true },
  });
  return successRespone({ res, data: { user } });
});
