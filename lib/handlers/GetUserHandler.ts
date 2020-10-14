import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event, context) => {
  // get user

  return {
    statusCode: 200,
    body: 'OK'
  }
}
