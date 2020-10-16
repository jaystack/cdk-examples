import { APIGatewayProxyEvent } from "aws-lambda";
import { composeDecoratedHandler, withAppErrorResponse, withOkResponse } from "@jaystack/sls-core";
import { withSequelize } from "@jaystack/sls-sequelize-pg";
import { pgConfig } from "./config";
import { initUser, User } from "./User.model";
import { FindOptions } from "sequelize/types";

export const handler = composeDecoratedHandler(
  async (event: APIGatewayProxyEvent) => {
    const { email } = event.queryStringParameters ?? {};

    const findOptions = { limit: 100 } as FindOptions;

    if (email) {
      findOptions.where = { email };
    }

    const userList = await User.findAll(findOptions);

    return userList.map((user) => user.toJSON());
  },
  withAppErrorResponse(),
  withOkResponse(),
  withSequelize({ ...pgConfig, initModelsCallback: initUser, shouldSync: true })
);
