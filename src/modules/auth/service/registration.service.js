import { asyncHandler } from "../../../utilis/response/error.response.js";
import { userModel } from "../../../DB/model/User.model.js";
import {
  compareHash,
  generateHash,
} from "../../../utilis/security/hash.security.js";
import { emailEvent } from "../../../utilis/events/email.event.js";
import { successRespone } from "../../../utilis/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { customAlphabet } from "nanoid";


export const signup = asyncHandler(async (req, res, next) => {
  const { username, email, password } = req.body;

  if (await dbService.findOne({ model: userModel, filter: { email } })) {
    return next(new Error("Email Exists", { cause: 409 }));
  }
  // const hashPassword = generateHash({ plainText: password });
  const user = await dbService.create({
    model: userModel,
    data: {
      username,
      email,
      password,
    },
  });

  emailEvent.emit("sendConfirmEmail", { id: user._id, email });

  return successRespone({
    res,
    message: "Signup seccessfully",
    statusCode: 201,
    data:{user}
  });
});

export const confirmEmail = asyncHandler(async (req, res, next) => {
  const { email, code } = req.body;

  const user = await dbService.findOne({ model: userModel, filter: { email } });
  if (!user) {
    return next(new Error("In-valid account", { cause: 404 }));
  }
  if (user.confirmEmail) {
    return next(new Error("Already verified", { cause: 409 }));
  }
  if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
    return next(
      new Error("Too many failed attempts, you are blocked for 5 minutes", {
        cause: 429,
      })
    );
  }
  if (!user.otpExpires || user.otpExpires < Date.now()) {
    return next(new Error("OTP expired", { cause: 400 }));
  }
  if (!compareHash({ plainText: code, hashValue: user.confirmEmailOTP })) {
    const attemptsLeft = 4 - user.otpAttempts;
    if (user.otpAttempts >= 4) {
      await userModel.updateOne(
        { email },
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
      await userModel.updateOne({ email }, { $inc: { otpAttempts: 1 } });
      return next(
        new Error(`In-valid OTP code. ${attemptsLeft} attempts left`, {
          cause: 400,
        })
      );
    }
  }

  await dbService.updateOne({
    model: userModel,
    filter: { email },
    data: {
      confirmEmail: true,
      $unset: {
        confirmEmailOTP: 1,
        otpExpires: 1,
        otpAttempts: 1,
        otpBlockedUntil: 1,
      },
    },
  });
  return successRespone({ res });
});

export const resendOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await dbService.findOne({ model: userModel, filter: { email } });
  if (!user) {
    return next(new Error("Invalid account", { cause: 404 }));
  }
  if (user.confirmEmail) {
    return next(new Error("Email already verified", { cause: 409 }));
  }

  // Check if the user is still blocked
  if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
    return next(
      new Error(`You can ask for a new otp after ${user.otpBlockedUntil}.`, { cause: 429 })
    );
  }

  // Generate a new OTP
  const newOTP = customAlphabet("0123456789", 4)();
  const hashedOTP = generateHash({ plainText: newOTP });

  // Set OTP expiration time (valid for 10 minutes)
  const otpExpires = Date.now() + 10 * 60 * 1000;

  // Update OTP and reset attempts
  await dbService.updateOne({
    model: userModel,
    filter: { email },
    data: {
      confirmEmailOTP: hashedOTP,
      otpAttempts: 0,
      otpExpires,
      $unset: { otpBlockedUntil: 1 },
    },
  });

  // Send OTP to user
  emailEvent.emit("sendConfirmEmail", { id: user._id, email });
  return successRespone({ res, message: "OTP resent successfully" });
});
