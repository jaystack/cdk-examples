import { APIGatewayProxyHandler } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const { body, headers, pathParameters } = event;
  console.log(body, headers, pathParameters);
  return { statusCode: 200, body: "Hello world!" };
};
