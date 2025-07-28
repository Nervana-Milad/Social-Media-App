import joi from 'joi';
import { generalFields } from '../../middleware/validation.middleware.js';

export const createPost = joi.object().keys({
    content: joi.string().min(2).max(50000).trim(),
    file: joi.array().items(generalFields.file) 
}).or('content', 'file');

export const updatePost = joi.object().keys({
    postId: generalFields.id.required(),
    content: joi.string().min(2).max(50000).trim(),
    file: joi.array().items(generalFields.file) 
}).or('content', 'file');

export const freezePost =  joi.object().keys({
    postId: generalFields.id.required(),
}).required();

export const likePost =   joi.object().keys({
    action: joi.string().valid('like', 'unLike'),
    postId: generalFields.id.required(),
}).required();

export const undoPost =  freezePost;

export const archivePost =  freezePost;