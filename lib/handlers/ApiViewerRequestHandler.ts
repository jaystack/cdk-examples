import { CloudFrontRequestHandler } from "aws-lambda";

const helloHeader = {
  key: "X-CdkExample-Edge-Lambda-Message",
  value: "Hello from Lambda@Edge!",
};
const buildTimestampHeader = {
  key: "X-CdkExample-Edge-Lambda-Build-Timestamp",
  value: process.env.BUILD_TIMESTAMP || "unknown",
};

export const handler: CloudFrontRequestHandler = async (event, context) => {
  const { config, request } = event.Records[0].cf;

  // remove /api prefix used to match origin
  request.uri = request.uri.replace(/^\/api/, "");

  // send message to origin using headers
  request.headers[helloHeader.key.toLowerCase()] = [helloHeader];
  request.headers[buildTimestampHeader.key.toLowerCase()] = [buildTimestampHeader];

  console.log(JSON.stringify({ request }, null, 2));
  return request;
};
