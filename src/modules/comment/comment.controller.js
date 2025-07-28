import {Router} from "express";
import * as commentService from "./service/comment.service.js"
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { endPoint } from "./comment.authorization.js";
import { fileValidations, uploadCloudFile } from "../../utilis/multer/cloud.multer.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as validators from "./comment.validation.js";

const router = Router({
    mergeParams: true,
    strict: true,
    caseSensitive: true,
});

router.post("/:commentId?", 
    authentication(),
    authorization(endPoint.createComment),
    uploadCloudFile(fileValidations.image).array('attachment', 2),
    validation(validators.createComment),
    commentService.createComment);

router.patch("/:commentId", 
    authentication(),
    authorization(endPoint.updateComment),
    uploadCloudFile(fileValidations.image).array('attachment', 2),
    validation(validators.updateComment),
    commentService.updateComment);

router.delete("/:commentId/freeze", 
    authentication(),
    authorization(endPoint.freezeComment),
    validation(validators.freezeComment),
    commentService.freezeComment);

router.patch("/:commentId/un-freeze", 
    authentication(),
    authorization(endPoint.freezeComment),
    validation(validators.freezeComment),
    commentService.unfreezeComment);

router.patch("/:commentId/like",
    authentication(),
    authorization(endPoint.likeComment),
    validation(validators.likeComment),
    commentService.likeComment
);
export default  router;