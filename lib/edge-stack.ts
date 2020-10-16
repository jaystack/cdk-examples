import { join } from "path";
import { AssetHashType, CfnOutput, Construct, Duration, Stack, StackProps } from "@aws-cdk/core";
import { Bucket } from "@aws-cdk/aws-s3";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import {
  Behavior,
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution,
  LambdaEdgeEventType,
  OriginAccessIdentity,
  OriginSslPolicy,
  SourceConfiguration,
} from "@aws-cdk/aws-cloudfront";
import { NodejsFunction, NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import { SSMParameterReader } from "./constructs/ssm-reader";
import { Role, CompositePrincipal, ServicePrincipal, ManagedPolicy } from "@aws-cdk/aws-iam";
import { ParameterNames } from "./shared";
import { Runtime } from "@aws-cdk/aws-lambda";
import { readFileSync } from "fs";

export interface EdgeStackProps extends StackProps {
  apiPathPattern?: string;
  frontendPathPatterns: string[];
  appRegion: string;
}

export class EdgeStack extends Stack {
  cfWebDistribution: CloudFrontWebDistribution;
  constructor(scope: Construct, id: string, props: EdgeStackProps) {
    super(scope, id, props);

    const ApiDomainName = new SSMParameterReader(this, ParameterNames.ApiDomainName, {
      parameterName: ParameterNames.ApiDomainName,
      region: props.appRegion,
    }).getParameterValue();
    const ApiOriginPath = new SSMParameterReader(this, ParameterNames.ApiOriginPath, {
      parameterName: ParameterNames.ApiOriginPath,
      region: props.appRegion,
    }).getParameterValue();
    const FrontendApiDomainName = new SSMParameterReader(this, ParameterNames.FrontendApiDomainName, {
      parameterName: ParameterNames.FrontendApiDomainName,
      region: props.appRegion,
    }).getParameterValue();
    const FrontendApiOriginPath = new SSMParameterReader(this, ParameterNames.FrontendApiOriginPath, {
      parameterName: ParameterNames.FrontendApiOriginPath,
      region: props.appRegion,
    }).getParameterValue();

    const assetsBucket = new Bucket(this, "AssetsBucket");

    const role = new Role(this, "AllowLambdaServiceToAssumeRole", {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("lambda.amazonaws.com"),
        new ServicePrincipal("edgelambda.amazonaws.com")
      ),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    const runtime = Runtime.NODEJS_12_X;
    const edgeLambdaSharedProps: NodejsFunctionProps = {
      runtime,
      role,
      environment: {},
      awsSdkConnectionReuse: false,
      memorySize: 128,
    };

    const ApiViewerRequestHandler = new NodejsFunction(this, "ApiViewerRequestHandler", {
      ...edgeLambdaSharedProps,
      entry: join(__dirname, "./handlers/ApiViewerRequestHandler.ts"),
      parcelEnvironment: {
        NODE_ENV: "production",
        // BUILD_TIMESTAMP: new Date().toISOString(),
      },
    });
    const EdgeRendererHandler = new NodejsFunction(this, "EdgeRendererHandler", {
      ...edgeLambdaSharedProps,
      entry: join(__dirname, "./handlers/EdgeRendererHandler.ts"),
      parcelEnvironment: {
        NODE_ENV: "production",
        // BUILD_TIMESTAMP: new Date().toISOString(),
      },
    });
    const BucketOriginResponseHandler = new NodejsFunction(this, "BucketOriginResponseHandler", {
      ...edgeLambdaSharedProps,
      entry: join(__dirname, "./handlers/BucketOriginResponseHandler.ts"),
      parcelEnvironment: {
        NODE_ENV: "production",
        NOT_FOUND_PAGE_HTML: readFileSync(
          join(__dirname, "../frontend/.next/serverless/pages/404.html"),
          "utf-8"
        ),
        // BUILD_TIMESTAMP: new Date().toISOString(),
      },
    });

    const bucketOriginConfig: SourceConfiguration = {
      s3OriginSource: {
        s3BucketSource: assetsBucket,

        // we use OAI so the bucket and its objects can be private
        originAccessIdentity: new OriginAccessIdentity(this, "S3OriginAccessIdentity"),
      },
      behaviors: [
        {
          isDefaultBehavior: true,
          lambdaFunctionAssociations: [
            {
              eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
              lambdaFunction: BucketOriginResponseHandler.currentVersion,
            },
          ],
        },
        {
          pathPattern: "/users-edge/*",
          lambdaFunctionAssociations: [
            {
              eventType: LambdaEdgeEventType.VIEWER_REQUEST,
              lambdaFunction: EdgeRendererHandler.currentVersion,
            },
          ],
        },
      ],
    };

    const sharedBehaviorOpts: Behavior = {
      allowedMethods: CloudFrontAllowedMethods.ALL,
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(0),
      forwardedValues: { queryString: true, cookies: { forward: "all" } },
    };

    const apiOriginConfig: SourceConfiguration = {
      customOriginSource: {
        domainName: ApiDomainName,
        originPath: ApiOriginPath,
        allowedOriginSSLVersions: [OriginSslPolicy.TLS_V1_2, OriginSslPolicy.SSL_V3],
        originHeaders: {
          "X-CdkExample-Edge-Message": "hello from cloudfront!",
        },
      },
      behaviors: [
        {
          ...sharedBehaviorOpts,
          pathPattern: props.apiPathPattern ?? "/api*",
          lambdaFunctionAssociations: [
            {
              eventType: LambdaEdgeEventType.VIEWER_REQUEST,
              lambdaFunction: ApiViewerRequestHandler.currentVersion,
            },
          ],
        },
      ],
    };

    const frontendOriginConfig: SourceConfiguration = {
      customOriginSource: { domainName: FrontendApiDomainName, originPath: FrontendApiOriginPath },
      behaviors: props.frontendPathPatterns?.map((pathPattern) => ({
        ...sharedBehaviorOpts,
        pathPattern,
      })),
    };

    this.cfWebDistribution = new CloudFrontWebDistribution(this, "CFWebDistribution", {
      comment: "Cdk Example Web Distribution",

      originConfigs: [apiOriginConfig, frontendOriginConfig, bucketOriginConfig],
    });

    new BucketDeployment(this, "LatestAssets", {
      destinationBucket: assetsBucket,
      sources: [
        Source.asset(join(__dirname, "../frontend"), {
          assetHashType: AssetHashType.OUTPUT,
          bundling: {
            image: runtime.bundlingDockerImage,
            command: [
              "bash",
              "-c",
              "-v",
              `
cp ./.next/serverless/pages/*.html /asset-output
mkdir -p /asset-output/_next
cp -r ./.next/static/. /asset-output/_next/static/
cp -r ./public/. /asset-output
chmod -R 777 /asset-output
`,
            ],
          },
        }),
      ],
      // destinationKeyPrefix: "_next",
      // prune: false,
      distribution: this.cfWebDistribution,
    });

    new CfnOutput(this, "CFWebDistributionDomainName", {
      value: this.cfWebDistribution.distributionDomainName,
      description: "The Cloudfront Distribution's domain name",
    });
  }
}
