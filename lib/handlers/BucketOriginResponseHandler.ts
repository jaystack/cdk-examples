import { CloudFrontResponseHandler } from "aws-lambda";

const notFoundPageHtml = process.env.NOT_FOUND_PAGE_HTML;

export const handler: CloudFrontResponseHandler = async (event, context) => {
  const { config, request, response } = event.Records[0].cf;

  if (/404/.test(response.status)) {
    return {
      ...response,
      status: "200",
      body: notFoundPageHtml,
      headers: {
        ...response.headers,
        "content-type": [{ value: "text/html", key: "Content-Type" }],
      },
    };
  }

  return response;
};
