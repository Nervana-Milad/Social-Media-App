import connectDB from "./DB/connection.js";
import path from "node:path";
import authController from "./modules/auth/auth.controller.js";
import userController from "./modules/user/user.controller.js";
import postController from "./modules/post/post.controller.js";
import { globalErrorHandling } from "./utilis/response/error.response.js";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";


const limiter = rateLimit({
  limit: 2,
  windowMs: 2 * 60 * 1000,
  handler:(req, res, next)=>{
    return next(new Error("Game over, Rate limit reached", {cause:429}))
  },
  legacyHeaders: true,
  standardHeaders: "draft-8"
})

const bootstrap = (app, express) => {

  app.use(cors());
  app.use(helmet());
  app.use("/auth", limiter);


  app.use("/uploads", express.static(path.resolve('./src/uploads')));
  app.use(express.json());

  app.get("/", (req, res) => {
    res.send("Hello social media app");
  });
  app.use("/auth", authController);
  app.use("/user", userController);
  app.use("/post", postController)
  app.all("*", (req, res, next) => {
    return res.status(404).json({ message: "Invalid routing" });
  });
  app.use(globalErrorHandling);
  connectDB();
};
export default bootstrap;
