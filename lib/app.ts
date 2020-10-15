import { App, ConcreteDependable } from "@aws-cdk/core";
import { EdgeStack } from "./edge-stack";
import { RestApiStack } from "./rest-api-stack";

export async function assembleApp() {
  const app = new App();

  const appRegion = "eu-west-1";

  const restApi = new RestApiStack(app, "RestApi", {
    stackName: "CdkExampleRestApi",
    env: { region: appRegion },
  });

  const edge = new EdgeStack(app, "Edge", {
    stackName: "CdkExampleEdge",
    env: { region: "us-east-1" },
    appRegion,
  });

  edge.addDependency(restApi);
}
