import { Router } from "express";
import * as registrationService from "./service/registration.service.js";
import * as loginService from "./service/login.service.js";

import * as validators from "./auth.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
const router = Router();

router.post("/signup", validation(validators.signup), registrationService.signup);
router.patch("/confirm-email", validation(validators.confirmEmail), registrationService.confirmEmail);
router.post("/resend-otp", validation(validators.resendOTP), registrationService.resendOTP)
router.post("/login", validation(validators.login), loginService.login);
router.post("/login-with-gmail", loginService.loginWithGmail);

router.get("/refresh-token", loginService.refreshToken);
router.patch("/forgot-password", validation(validators.forgotPassword), loginService.forgotPassword);
router.patch("/validate-forgot-password", validation(validators.validateForgotPassword), loginService.validateForgotPassword);
router.patch("/reset-password", validation(validators.resetPassword), loginService.resetPassword);

export default router;