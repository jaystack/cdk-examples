/* eslint-disable @typescript-eslint/ban-ts-comment */
import { APIGatewayProxyResult, CloudFrontRequestHandler, CloudFrontRequestResult } from "aws-lambda";
import Debug from "debug";
import { gzipSync } from "zlib";
import sls from "serverless-http";

const debug = Debug(`FE@edge`);
debug.enabled = true;

const page = require("../../frontend/.next/serverless/pages/users-edge/[name].js");

const handle = sls({ handle: page.render });

export const handler: CloudFrontRequestHandler = async (event, context) => {
  debug("handling page request: %s");
  const response = await handle(event as any, context);
  debug("done handling page request: %d %j", response.statusCode, response.headers);
  const result = mapResponse(response as APIGatewayProxyResult);
  debug("mapped response, all done!");
  return result;
};

const CfRequestReadOnlyHeaders = [
  "host",
  "accept-encoding",
  "content-length",
  "if-modified-since",
  "if-none-Match",
  "if-range",
  "if-unmodified-since",
  "range",
  "transfer-encoding",
  "via",
];

function mapResponse(response: APIGatewayProxyResult): CloudFrontRequestResult {
  const { statusCode, body, headers } = response;

  return {
    status: String(statusCode),
    statusDescription: "OK",
    body: gzipSync(body).toString("base64"),
    bodyEncoding: "base64",
    headers: Object.entries(headers || {}).reduce(
      (acc, [key, value]) => {
        const lcKey = key.toLowerCase();
        return CfRequestReadOnlyHeaders.includes(lcKey) ? acc : { ...acc, [lcKey]: [{ key, value }] };
      },
      {
        "content-encoding": [{ key: "content-encoding", value: "gzip" }],
      }
    ),
  };
}
