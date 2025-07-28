import { Router } from "express";
import commentController from "../comment/comment.controller.js";
import * as postService from "./service/post.service.js";
import * as validators from "./post.validation.js";
import { endPoint } from "./post.authorization.js";
import { validation } from "../../middleware/validation.middleware.js";
import { authentication, authorization} from "../../middleware/auth.middleware.js";
import { fileValidations, uploadCloudFile } from "../../utilis/multer/cloud.multer.js";

const router = Router();

router.use("/:postId/comment", 
    commentController)

router.get("/",
    authentication(),
    postService.getAllPosts
)

router.post("/",
  authentication(),
  authorization(endPoint.createPost),
  uploadCloudFile(fileValidations.image).array("attachment", 2),
  validation(validators.createPost),
  postService.createPost
);

router.patch("/:postId",
    authentication(),
    authorization(endPoint.createPost),
    uploadCloudFile(fileValidations.image).array('attachment', 2),
    validation(validators.updatePost),
    postService.updatePost
);

router.delete("/:postId",
    authentication(),
    authorization(endPoint.freezePost),
    validation(validators.freezePost),
    postService.freezePost
);

router.patch("/:postId/restore",
    authentication(),
    authorization(endPoint.freezePost),
    validation(validators.freezePost),
    postService.unfreezePost
);

router.patch("/:postId/like",
    authentication(),
    authorization(endPoint.likePost),
    validation(validators.likePost),
    postService.likePost
);

router.delete("/:postId/undo-post", 
    authentication(),
    authorization(endPoint.undoPost),
    validation(validators.undoPost),
    postService.undoPost
);

router.patch("/:postId/archive-post", 
    authentication(),
    authorization(endPoint.archivePost),
    validation(validators.archivePost),
    postService.archivePost
);


export default router;
