import { APIGatewayProxyEvent } from "aws-lambda";
import {
  AppError,
  composeDecoratedHandler,
  ErrorCodes,
  withAppErrorResponse,
  withOkResponse,
  withParsedBody,
} from "@jaystack/sls-core";
import { withSequelize } from "@jaystack/sls-sequelize-pg";
import { pgConfig } from "./config";
import { initUser, User } from "./User.model";

export const handler = composeDecoratedHandler(
  async (event: APIGatewayProxyEvent, context, { parsedBody }) => {
    const { id } = event.pathParameters!;
    console.log(JSON.stringify({ parsedBody, id }, null, 2));

    const [updatedCount, [updatedUser]] = await User.update(parsedBody, {
      where: { id },
      returning: true,
    });

    if (updatedCount !== 1) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, `User not found: ${id}`);
    }

    return updatedUser.toJSON();
  },
  withAppErrorResponse(),
  withOkResponse(),
  withParsedBody(),
  withSequelize({ ...pgConfig, initModelsCallback: initUser, shouldSync: true })
);
