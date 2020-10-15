import { join } from "path";
import { AssetHashType, CfnOutput, Construct, Duration, Stack, StackProps } from "@aws-cdk/core";
import { Code, LayerVersion, Runtime } from "@aws-cdk/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import { Cors, LambdaIntegration, RestApi } from "@aws-cdk/aws-apigateway";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { ServerlessDatabase } from "./constructs/db";
import { Network } from "./constructs/network";
import { EnvVarNames, ParameterNames } from "./shared";

export type RestApiStackProps = StackProps;
export class RestApiStack extends Stack {
  network: Network;
  db: ServerlessDatabase;
  api: RestApi;

  constructor(scope: Construct, id: string, props?: RestApiStackProps) {
    super(scope, id, props);

    this.network = new Network(this, "Network", {
      bastionIsPublic: true,
    });

    this.db = new ServerlessDatabase(this, "SlsDb", {
      securityGroupIds: [this.network.allowPublicAccessSecurityGroup.securityGroupId],
      subnetIds: this.network.databaseSubnets.subnetIds,
      secondsUntilAutoPause: Duration.hours(1).toSeconds(),
      databaseName: "cdk_examples",
    });

    this.api = new RestApi(this, "RestApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const runtime = Runtime.NODEJS_12_X;
    const providedPackages = ["pg", "pg-hstore", "sequelize"];

    const packagedDependenciesLayer = new LayerVersion(this, "PackagedDependenciesLayer", {
      code: this.createLayerCode(runtime),
      compatibleRuntimes: [runtime],
      layerVersionName: "CdkExample-RestApi-PackagedDependencies",
      description: "The dependencies needed for Sequelize with Postgres",
      license: "UNLICENSED",
    });

    const sharedHandlerProps: Partial<NodejsFunctionProps> = {
      runtime: Runtime.NODEJS_12_X,
      vpc: this.network.vpc,
      vpcSubnets: this.network.lambdaSubnets,
      securityGroups: [this.network.defaultSecurityGroup],
      memorySize: 1768, // 1vCPU
      timeout: Duration.seconds(30), // api gateway max timeout
      externalModules: ["aws-sdk", ...providedPackages],
      layers: [packagedDependenciesLayer],
      environment: {
        DEBUG: "*",
        [EnvVarNames.pgConfig]: JSON.stringify(this.db.dbSecretPayload),
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

    this.createParametersAndOutputs();
  }

  createParametersAndOutputs() {
    new StringParameter(this, ParameterNames.ApiDomainName, {
      stringValue: `${this.api.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
      parameterName: ParameterNames.ApiDomainName,
    });
    new StringParameter(this, ParameterNames.ApiOriginPath, {
      stringValue: `/${this.api.deploymentStage.stageName}`,
      parameterName: ParameterNames.ApiOriginPath,
    });
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
    new CfnOutput(this, "DbHost", {
      value: this.db.dbSecretPayload.host,
      description: "The host of the sls db",
    });
    new CfnOutput(this, "SendSSHPublicKeyCommand", {
      description: "The command to use to send ssh public key to the bastion host",
      value: `aws ec2-instance-connect send-ssh-public-key \\
      --instance-id ${this.network.bastion.instanceId} \\
      --instance-os-user ec2-user \\
      --availability-zone ${this.network.bastion.instanceAvailabilityZone} \\
      --ssh-public-key file://~/.ssh/id_rsa.pub`,
    });
  }

  createLayerCode(runtime: Runtime) {
    return Code.fromAsset(join(__dirname, "./layers/sequelize-dependencies"), {
      assetHashType: AssetHashType.OUTPUT,
      bundling: {
        image: runtime.bundlingDockerImage,
        user: "root",
        command: [
          "bash",
          "-c",
          "-v",
          `
# Building Sequelize & Postgres Dependencies layer
npm install --only=prod
mkdir -p /asset-output/nodejs/
cp -r ./node_modules /asset-output/nodejs/
# let other users clean the build dir created by root
chmod -R 777 /asset-output
`,
        ],
      },
    });
  }
}
