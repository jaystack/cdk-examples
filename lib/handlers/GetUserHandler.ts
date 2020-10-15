import { APIGatewayProxyEvent } from "aws-lambda";
import {
  AppError,
  composeDecoratedHandler,
  ErrorCodes,
  withAppErrorResponse,
  withOkResponse,
} from "@jaystack/sls-core";
import { withSequelize } from "@jaystack/sls-sequelize-pg";
import { pgConfig } from "./config";
import { initUser, User } from "./User.model";

export const handler = composeDecoratedHandler(
  async (event: APIGatewayProxyEvent) => {
    const { id } = event.pathParameters!;

    const foundUser = await User.findByPk(id);

    if (!foundUser) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, `User not found: ${id}`);
    }

    return foundUser.toJSON();
  },
  withAppErrorResponse(),
  withOkResponse(),
  withSequelize({ ...pgConfig, initModelsCallback: initUser, shouldSync: true })
);
