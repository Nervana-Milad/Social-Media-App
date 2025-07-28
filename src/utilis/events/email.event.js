import { EventEmitter } from "node:events";
import { customAlphabet } from "nanoid";
import { generateHash } from "../security/hash.security.js";
import { userModel } from "../../DB/model/User.model.js";
import { sendEmail } from "../email/send.email.js";
import { verifyAccountTemplate } from "../email/template/verifyAccount.template.js";
import * as dbService from "../../DB/db.service.js";

export const emailEvent = new EventEmitter();

const emailSubject = {
  confirmEmail: "Confirm-email",
  resetPassword: "Reset-password",
  updateEmail: "updateEmail",
};

export const sendCode = async ({data = {}, subject = emailSubject.confirmEmail} = {}) => {
  const { id, email } = data;
  const otp = customAlphabet("0123456789", 4)();
  const hashOTP = generateHash({ plainText: otp });

  let updateData = {};
  switch (subject) {
    case emailSubject.confirmEmail:
      updateData = { confirmEmailOTP: hashOTP, otpExpires: new Date(Date.now()+2*60*1000), otpAttempts: 0, $unset: {otpBlockedUntil: 0} };
      break;
    case emailSubject.resetPassword:
      updateData = { resetPasswordOTP: hashOTP, otpExpires: new Date(Date.now()+2*60*1000), otpAttempts: 0, $unset: {otpBlockedUntil: 0} };
      break;
    case emailSubject.updateEmail:
      updateData = { tempEmailOTP: hashOTP, otpExpires: new Date(Date.now()+2*60*1000), otpAttempts: 0, $unset: {otpBlockedUntil: 0} };
      break;
    default:
      break;
  }

  await dbService.updateOne({model: userModel, filter:{ _id: id },data: updateData});
  const html = verifyAccountTemplate({ otpCode: otp });
  await sendEmail({ to: email, subject, html });
};

emailEvent.on("sendConfirmEmail", async (data) => {
  await sendCode({ data });
});

emailEvent.on("updateEmail", async (data) => {
  await sendCode({ data, subject: emailSubject.updateEmail });
});

emailEvent.on("forgotPassword", async (data) => {
  await sendCode({ data, subject: emailSubject.resetPassword });
});
