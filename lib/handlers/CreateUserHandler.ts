import { APIGatewayProxyHandler } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (event, context) => {
  // CreateUser

  return {
    statusCode: 200,
    body: JSON.stringify(event),
  };
};
