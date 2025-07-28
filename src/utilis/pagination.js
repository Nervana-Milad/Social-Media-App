import * as dbService from '../DB/db.service.js'

export const paginate = async ({
    page, size, model, populate=[], filter={}, select=""
} = {}) => {
        page = parseInt(page < 1 ? process.env.PAGE : page);
        size = parseInt(size < 1 ? process.env.SIZE : size);
        const skip = (page - 1) * size;
    
        const count = await model.find(filter).countDocuments();
        const data = await dbService.find({
            model,
            filter,
            populate,
            select,
            limit: size,
            skip,
        });

        return {
            data, page, size, count
        }
    
}