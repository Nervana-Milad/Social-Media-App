import { roleTypes } from "../../DB/model/User.model.js";


export const endPoint = {
    createComment: [roleTypes.user],
    updateComment: [roleTypes.user],
    freezeComment: [roleTypes.user, roleTypes.admin],
    likeComment: [roleTypes.user, roleTypes.admin],

    
}