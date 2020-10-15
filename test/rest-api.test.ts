import { expect as expectCDK, matchTemplate, MatchStyle } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as RestApi from "../lib/rest-api-stack";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new RestApi.RestApiStack(app, "MyTestStack");
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
