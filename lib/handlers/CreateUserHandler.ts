import {
  AppError,
  composeDecoratedHandler,
  ErrorCodes,
  withAppErrorResponse,
  withOkResponse,
  withParsedBody,
} from "@jaystack/sls-core";
import { withSequelize, isSequelizeUniqueConstraintError } from "@jaystack/sls-sequelize-pg";
import { pgConfig } from "./config";
import { initUser, User } from "./User.model";

export const handler = composeDecoratedHandler(
  async (event, context, { parsedBody }) => {
    console.log("parsedBody", JSON.stringify({ parsedBody }, null, 2));

    try {
      const createdUser = await User.create(parsedBody);
      return createdUser.toJSON();
    } catch (error) {
      console.error(error);
      console.log("eee", error.name);
      const message = isSequelizeUniqueConstraintError(error)
        ? `Email or username already taken.`
        : `Could not create user!`;
      throw new AppError(ErrorCodes.VALIDATION, message, error);
    }
  },
  withAppErrorResponse(),
  withOkResponse(),
  withParsedBody(),
  withSequelize({ ...pgConfig, initModelsCallback: initUser, shouldSync: true })
);
