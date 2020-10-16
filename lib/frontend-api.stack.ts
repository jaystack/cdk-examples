import { join } from "path";
import { Construct, Duration, Stack, StackProps } from "@aws-cdk/core";
import { Code, LayerVersion, Runtime } from "@aws-cdk/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import { LambdaIntegration, RestApi } from "@aws-cdk/aws-apigateway";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { Bucket } from "@aws-cdk/aws-s3";
import { ParameterNames } from "./shared";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";

export type FrontendApiStackProps = StackProps;
export class FrontendApiStack extends Stack {
  api: RestApi;

  constructor(scope: Construct, id: string, props?: FrontendApiStackProps) {
    super(scope, id, props);

    this.api = new RestApi(this, "FrontendApi");

    new StringParameter(this, ParameterNames.FrontendApiDomainName, {
      stringValue: `${this.api.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
      parameterName: ParameterNames.FrontendApiDomainName,
    });
    new StringParameter(this, ParameterNames.FrontendApiOriginPath, {
      stringValue: `/${this.api.deploymentStage.stageName}`,
      parameterName: ParameterNames.FrontendApiOriginPath,
    });

    const runtime = Runtime.NODEJS_12_X;

    const packagedNexFolder = new LayerVersion(this, "PackagedNexFolderLayer", {
      code: Code.fromAsset(join(__dirname, "../frontend/.next"), {
        // assetHashType: AssetHashType.OUTPUT,
      }),
      compatibleRuntimes: [runtime],
      layerVersionName: "CdkExample-FrontendApi-PackagedNexFolder",
      description: "The build output of the frontend next.js app",
      license: "UNLICENSED",
    });

    const externalModules = ["aws-serverless-express", "debug"];
    const sharedHandlerProps: Partial<NodejsFunctionProps> = {
      runtime,
      memorySize: 1768, // 1vCPU
      timeout: Duration.seconds(30), // api gateway max timeout
      layers: [packagedNexFolder],
      awsSdkConnectionReuse: false,
      forceDockerBundling: true,
      environment: {
        DEBUG: "*,-follow-redirects*",
      },
      externalModules,
      nodeModules: externalModules,
      parcelEnvironment: {
        NODE_ENV: "production",
        PAGE_PATH: "users/[name].js",
      },
    };

    const usersResource = this.api.root.addResource("users");
    usersResource.addResource("{proxy+}").addMethod(
      "ANY",
      new LambdaIntegration(
        new NodejsFunction(this, "UserPage", {
          ...sharedHandlerProps,
          entry: join(__dirname, "./handlers/FrontendHandler.ts"),
        })
      )
    );


    // userResource.addMethod(
    //   "GET",
    //   new LambdaIntegration(
    //     new NodejsFunction(this, "GetUserHandler", {
    //       ...sharedHandlerProps,
    //       entry: join(__dirname, "./handlers/GetUserHandler.ts"),
    //     })
    //   )
    // );
    // userResource.addMethod(
    //   "PUT",
    //   new LambdaIntegration(
    //     new NodejsFunction(this, "UpdateUserHandler", {
    //       ...sharedHandlerProps,
    //       entry: join(__dirname, "./handlers/UpdateUserHandler.ts"),
    //     })
    //   )
    // );
    // userResource.addMethod(
    //   "DELETE",
    //   new LambdaIntegration(
    //     new NodejsFunction(this, "DeleteUserHandler", {
    //       ...sharedHandlerProps,
    //       entry: join(__dirname, "./handlers/DeleteUserHandler.ts"),
    //     })
    //   )
    // );
  }
}
