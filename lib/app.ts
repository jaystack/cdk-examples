import { App } from "@aws-cdk/core";
import { EdgeStack } from "./edge-stack";
import { FrontendApiStack } from "./frontend-api.stack";
import { RestApiStack } from "./rest-api-stack";

export async function assembleApp() {
  const app = new App();

  const appRegion = "eu-west-1";

  const restApi = new RestApiStack(app, "RestApi", {
    stackName: "CdkExampleRestApi",
    env: { region: appRegion },
  });
  const frontendApi = new FrontendApiStack(app, "FrontendApi", {
    stackName: "CdkExampleFrontendApi",
    env: { region: appRegion },
  });

  const edge = new EdgeStack(app, "Edge", {
    stackName: "CdkExampleEdge",
    env: { region: "us-east-1" },
    appRegion,
    frontendPathPatterns: ["/users/*"],
  });

  // frontendApi.addDependency(restApi);
  edge.addDependency(restApi);
  edge.addDependency(frontendApi);
}
