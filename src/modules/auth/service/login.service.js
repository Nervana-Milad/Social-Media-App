import { asyncHandler } from "../../../utilis/response/error.response.js";
import {
  providerTypes,
  roleTypes,
  userModel,
} from "../../../DB/model/User.model.js";
import {
  compareHash,
  generateHash,
} from "../../../utilis/security/hash.security.js";
import { successRespone } from "../../../utilis/response/success.response.js";
import {
  decodedToken,
  generateToken,
  tokenTypes,
} from "../../../utilis/security/token.security.js";
import { emailEvent } from "../../../utilis/events/email.event.js";
import { OAuth2Client } from "google-auth-library";
import * as dbService from "../../../DB/db.service.js";


export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await dbService.findOne({model: userModel, filter: {email, provider: providerTypes.system}});
  if (!user) {
    return next(new Error("In-valid account", { cause: 404 }));
  }
  if (!user.confirmEmail) {
    return next(new Error("Please verify your account first.", { cause: 400 }));
  }
  if (!compareHash({ plainText: password, hashValue: user.password })) {
    return next(new Error("Wrong password.", { cause: 400 }));
  }
  const accessToken = generateToken({
    payload: { id: user._id },
    signature: [roleTypes.admin, roleTypes.superAdmin].includes(user.role)
        ? process.env.ADMIN_ACCESS_TOKEN
        : process.env.USER_ACCESS_TOKEN,
  });

  const refreshToken = generateToken({
    payload: { id: user._id },
    signature: [roleTypes.admin, roleTypes.superAdmin].includes(user.role)
        ? process.env.ADMIN_REFRESH_TOKEN
        : process.env.USER_REFRESH_TOKEN,
    expiresIn: 31536000,
  });

  return successRespone({
    res,
    data: { token: { accessToken, refreshToken } },
  });
});

export const loginWithGmail = asyncHandler(async (req, res, next) => {
  const { idToken } = req.body;

  const client = new OAuth2Client();
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.WEB_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  }
  const payload = await verify();

  if (!payload.email_verified) {
    return next(new Error("In-valid account", { cause: 400 }));
  }

  let user = await dbService.findOne({model: userModel, filter: {email: payload.email} });
  if (!user) {
    user = await dbService.create({model: userModel, filter: {
      username: payload.name,
      email: payload.email,
      confirmEmail: payload.email_verified,
      image: payload.picture,
      provider: providerTypes.google,
    }});
  }

  if (user.provider != providerTypes.google) {
    return next(new Error("In-valid provider", { cause: 400 }));
  }

  const accessToken = generateToken({
    payload: { id: user._id },
    signature: [roleTypes.admin, roleTypes.superAdmin].includes(user.role)
        ? process.env.ADMIN_ACCESS_TOKEN
        : process.env.USER_ACCESS_TOKEN,
  });

  const refreshToken = generateToken({
    payload: { id: user._id },
    signature: [roleTypes.admin, roleTypes.superAdmin].includes(user.role)
        ? process.env.ADMIN_REFRESH_TOKEN
        : process.env.USER_REFRESH_TOKEN,
    expiresIn: 31536000,
  });

  return successRespone({
    res,
    data: { token: { accessToken, refreshToken } },
  });
});

export const refreshToken = asyncHandler(async (req, res, next) => {
  const { authorization } = req.headers;
  const user =  await decodedToken({authorization, tokenType: tokenTypes.refresh, next})

  const accessToken = generateToken({
    payload: { id: user._id },
    signature: [roleTypes.admin, roleTypes.superAdmin].includes(user.role)
        ? process.env.ADMIN_ACCESS_TOKEN
        : process.env.USER_ACCESS_TOKEN,
  });

  const refreshToken = generateToken({
    payload: { id: user._id },
    signature: [roleTypes.admin, roleTypes.superAdmin].includes(user.role)
        ? process.env.ADMIN_REFRESH_TOKEN
        : process.env.USER_REFRESH_TOKEN,
    expiresIn: 31536000,
  });

  return successRespone({
    res,
    data: { token: { accessToken, refreshToken } },
  });
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await dbService.findOne({model: userModel, filter: { email, isDeleted: false }});
  if (!user) {
    return next(new Error("In-valid account", { cause: 404 }));
  }
  if (!user.confirmEmail) {
    return next(new Error("Cofirm your account first", { cause: 400 }));
  }
  emailEvent.emit("forgotPassword", { id: user._id, email });
  return successRespone({ res });
});

export const validateForgotPassword = asyncHandler(async (req, res, next) => {
  const { email, code } = req.body;
  const user = await dbService.findOne({model: userModel, filter: { email, isDeleted: false }});
  if (!user) {
    return next(new Error("In-valid account", { cause: 404 }));
  }
  if (!user.confirmEmail) {
    return next(new Error("Cofirm your account first", { cause: 400 }));
  }
  if (!compareHash({ plainText: code, hashValue: user.resetPasswordOTP })) {
    return next(new Error("In-valid reset code", { cause: 400 }));
  }
  if (!user.otpExpires || user.otpExpires < Date.now()) {
    return next(new Error("OTP expired", { cause: 400 }));
  }
  return successRespone({ res });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, code, password } = req.body;
  const user = await dbService.findOne({model: userModel, filter: { email, isDeleted: false }});
  if (!user) {
    return next(new Error("In-valid account", { cause: 404 }));
  }
  if (!user.confirmEmail) {
    return next(new Error("Cofirm your account first", { cause: 400 }));
  }
  if (!user.otpExpires || user.otpExpires < Date.now()) {
    return next(new Error("OTP expired", { cause: 400 }));
  }
  if (!compareHash({ plainText: code, hashValue: user.resetPasswordOTP })) {
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
      password: generateHash({ plainText: password }),
      changeCredentialsTime: Date.now(),
      $unset: { resetPasswordOTP: 0, otpExpires: 1, otpAttempts: 1 },
    }
  });
  return successRespone({ res });
});
