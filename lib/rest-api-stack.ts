import { join } from "path";
import { CfnOutput, Construct, Duration, Stack, StackProps } from "@aws-cdk/core";
import { Runtime } from "@aws-cdk/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import { Bucket } from "@aws-cdk/aws-s3";
import { Cors, LambdaIntegration, RestApi } from "@aws-cdk/aws-apigateway";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { ServerlessDatabase } from "./constructs/db";
import { Network } from "./constructs/network";
import { ParameterNames } from "./shared";

export type RestApiStackProps = StackProps;
export class RestApiStack extends Stack {
  network: Network;
  db: ServerlessDatabase;
  api: RestApi;
  assetsBucket: Bucket;

  constructor(scope: Construct, id: string, props?: RestApiStackProps) {
    super(scope, id, props);

    this.network = new Network(this, "Network", {
      bastionIsPublic: true,
    });

    this.db = new ServerlessDatabase(this, "SlsDb", {
      securityGroupIds: [this.network.allowPublicAccessSecurityGroup.securityGroupId],
      subnetIds: this.network.databaseSubnets.subnetIds,
      secondsUntilAutoPause: Duration.hours(1).toSeconds(),
    });

    this.api = new RestApi(this, "RestApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    // this.assetsBucket = new Bucket(this, "AssetsBucket");
    this.createParameters();

    const sharedHandlerProps: Partial<NodejsFunctionProps> = {
      runtime: Runtime.NODEJS_12_X,
      environment: {
        DEBUG: "*",
        POSTGRES_CONFIG: JSON.stringify(this.db.dbSecretPayload),
      },
    };

    const usersResource = this.api.root.addResource("users");
    const userResource = usersResource.addResource("{id}");

    usersResource.addMethod(
      "POST",
      new LambdaIntegration(
        new NodejsFunction(this, "CreateUserHandler", {
          ...sharedHandlerProps,
          entry: join(__dirname, "./handlers/CreateUserHandler.ts"),
        })
      )
    );
    userResource.addMethod(
      "GET",
      new LambdaIntegration(
        new NodejsFunction(this, "GetUserHandler", {
          ...sharedHandlerProps,
          entry: join(__dirname, "./handlers/GetUserHandler.ts"),
        })
      )
    );
    userResource.addMethod(
      "PUT",
      new LambdaIntegration(
        new NodejsFunction(this, "UpdateUserHandler", {
          ...sharedHandlerProps,
          entry: join(__dirname, "./handlers/UpdateUserHandler.ts"),
        })
      )
    );
    userResource.addMethod(
      "DELETE",
      new LambdaIntegration(
        new NodejsFunction(this, "DeleteUserHandler", {
          ...sharedHandlerProps,
          entry: join(__dirname, "./handlers/DeleteUserHandler.ts"),
        })
      )
    );
  }

  createParameters() {
    new StringParameter(this, ParameterNames.ApiDomainName, {
      stringValue: `${this.api.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
      parameterName: ParameterNames.ApiDomainName,
    });
    new StringParameter(this, ParameterNames.ApiOriginPath, {
      stringValue: `/${this.api.deploymentStage.stageName}`,
      parameterName: ParameterNames.ApiOriginPath,
    });
    // new StringParameter(this, ParameterNames.AssetsBucketName, {
    //   stringValue: this.assetsBucket.bucketName,
    //   parameterName: ParameterNames.AssetsBucketName,
    // });

    new CfnOutput(this, "BastionAz", {
      value: this.network.bastion.instanceAvailabilityZone,
      description: "The availability zone the host was launched in",
    });
    new CfnOutput(this, "BastionPublicDns", {
      value: this.network.bastion.instancePublicDnsName,
      description: "The public dns of the Bastion host",
    });
    new CfnOutput(this, "BastionPublicIp", {
      value: this.network.bastion.instancePublicIp,
      description: "The public ip of the Bastion host",
    });
    new CfnOutput(this, "BastionInstanceId", {
      value: this.network.bastion.instanceId,
      description: "The instance id of the Bastion host",
    });
  }
}
