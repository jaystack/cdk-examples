import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event, context) => {

  // DeleteUser
  return {
    statusCode: 200,
    body: 'OK'
  }
}
