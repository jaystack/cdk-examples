import { APIGatewayProxyHandler } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (event, context) => {
  // DeleteUserdf
  return {
    statusCode: 200,
    body: "OK",
  };
};
