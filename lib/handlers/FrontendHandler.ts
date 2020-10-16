// import { APIGatewayProxyHandler } from "aws-lambda";
import Debug from "debug";
import sls from "serverless-http";
// import { createServer, proxy } from "aws-serverless-express";
const debug = Debug(`FE`);

const pagePath = process.env.PAGE_PATH;

// debug("requiring page at %s", pagePath);
const app = require(`/opt/serverless/pages/${pagePath}`);
console.log(JSON.stringify({ asd: Object.keys(app) }, null, 2));

const handle = sls({ handle: app.render });

export const handler = async (event, context) => {
  debug("handling page request: %s");
  const response = await handle(event, context);
  debug("done handling page request: %d %j", response.statusCode, response.headers);
  return response;
};

// debug("creating http server", pagePath);
// const server = createServer((req, res) => {
//   debug("Rendering page");
//   page.render(req, res);
//   res.once("finish", () => {
//     debug("Done Rendering page");
//   });
// });

// export const handler: APIGatewayProxyHandler = async (event, context) => {
//   debug("handling page request: %s", event.path);
//   const { body, headers, statusCode } = await proxy(server, event, context, "PROMISE").promise;
//   debug("done handling page request: %d %j", statusCode, headers);
//   return { body, headers, statusCode };
// };
