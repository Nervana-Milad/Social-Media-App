import mongoose, { Schema, Types, model } from "mongoose";
import { generateHash } from "../../utilis/security/hash.security.js";

export const genderTypes = { male: "male", female: "female" };
export const roleTypes = { user: "user", admin: "admin", superAdmin: "superAdmin" };
export const providerTypes = {google: "google", system : "system"};

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
      trim: true,
    },
    email: { type: String, required: true, unique: true },
    confirmEmailOTP: String,
    tempEmail: String,
    tempEmailOTP: String,
    otpExpires: Date,
    otpAttempts: { type: Number, default: 0 },
    otpBlockedUntil: Date,
    password: { type: String, required: (data)=>{
      return data?.providor === providerTypes.google ? false : true
    } },
    resetPasswordOTP: String,
    phone: String,
    address: String,
    DOB: Date,
    image: {secure_url: String, public_id: String},
    coverImage: [{secure_url: String, public_id: String}],
    gender: {
      type: String,
      enum: Object.values(genderTypes),
      default: genderTypes.male,
    },
    role: {
      type: String,
      enum: Object.values(roleTypes),
      default: roleTypes.user,
    },
    provider: {
      type: String,
      enum: Object.values(providerTypes),
      default: providerTypes.system,
    },
    viewers: [{
      userId: {type: Types.ObjectId, ref: 'User'},
      time: Date
    }],
    confirmEmail: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    changeCredentialsTime: Date,
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },{ timeseries: true }
);

userSchema.pre("save", function(next, doc) {
  this.password = generateHash({plainText: this.password});
  next();
});

userSchema.post("save", function(doc, next){
  next();
})

export const userModel = mongoose.models.User || model("User", userSchema);
