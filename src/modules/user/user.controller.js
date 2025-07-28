import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import * as userService from "./service/user.service.js";
import * as validators from "./user.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import {
  fileValidations
} from "../../utilis/multer/local.multer.js";
import { uploadCloudFile } from "../../utilis/multer/cloud.multer.js";
import { endPoint } from "./user.authorization.js";
const router = Router();

router.get("/profile/dashboard", authentication(), authorization(endPoint.changeRoles), userService.dashboard);
router.patch("/:userId/profile/dashboard/role", authentication(), authorization(endPoint.changeRoles), userService.changeRoles);
router.get("/profile", authentication(), userService.profile);
router.get(
  "/profile/:profileId",
  validation(validators.shareProfile),
  authentication(),
  userService.shareProfile
);
router.patch(
  "/profile/email",
  validation(validators.updateEmail),
  authentication(),
  userService.updateEmail
);
router.patch(
  "/profile/reset-email",
  validation(validators.resetEmail),
  authentication(),
  userService.resetEmail
);
router.patch(
  "/profile/update-password",
  validation(validators.updatePassword),
  authentication(),
  userService.updatePassword
);
router.patch(
  "/profile",
  validation(validators.updateProfile),
  authentication(),
  userService.updateProfile
);
router.patch(
  "/profile/image",
  authentication(),
  uploadCloudFile(fileValidations.image).single("attachment"),
  validation(validators.profileImage),
  userService.updateProfileImage
);
router.patch(
  "/profile/image/cover",
  authentication(),
  uploadCloudFile(fileValidations.image).array("attachment", 3),
  userService.updateProfileCoverImage
);


export default router;
