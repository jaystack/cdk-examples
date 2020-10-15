import { join } from "path";
import { CfnOutput, Construct, Duration, Stack, StackProps } from "@aws-cdk/core";
import { Bucket } from "@aws-cdk/aws-s3";
import {
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

export interface EdgeStackProps extends StackProps {
  apiPathPattern?: string;
  appRegion: string;
}

export class EdgeStack extends Stack {
  cfWebDistribution: CloudFrontWebDistribution;
  constructor(scope: Construct, id: string, props: EdgeStackProps) {
    super(scope, id, props);

    const ApiDomainName = new SSMParameterReader(this, ParameterNames.ApiDomainName, {
      parameterName: ParameterNames.ApiDomainName,
      region: props.appRegion,
    });
    const ApiOriginPath = new SSMParameterReader(this, ParameterNames.ApiOriginPath, {
      parameterName: ParameterNames.ApiOriginPath,
      region: props.appRegion,
    });

    const assetsBucket = new Bucket(this, "AssetsBucket");
    const bucketOriginConfig: SourceConfiguration = {
      s3OriginSource: {
        s3BucketSource: assetsBucket,
        // we use OAI so the bucket and its objects can be private
        originAccessIdentity: new OriginAccessIdentity(this, "S3OriginAccessIdentity"),
      },
      behaviors: [{ isDefaultBehavior: true }],
    };

    const role = new Role(this, "AllowLambdaServiceToAssumeRole", {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("lambda.amazonaws.com"),
        new ServicePrincipal("edgelambda.amazonaws.com")
      ),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    const edgeLambdaSharedProps: NodejsFunctionProps = {
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

    const apiOriginConfig: SourceConfiguration = {
      customOriginSource: {
        domainName: ApiDomainName.getParameterValue(),
        originPath: ApiOriginPath.getParameterValue(),
        allowedOriginSSLVersions: [OriginSslPolicy.TLS_V1_2, OriginSslPolicy.SSL_V3],
        originHeaders: {
          "X-CdkExample-Edge-Message": "hello from cloudfront!",
        },
      },
      behaviors: [
        {
          pathPattern: props.apiPathPattern ?? "/api*",
          allowedMethods: CloudFrontAllowedMethods.ALL,
          defaultTtl: Duration.seconds(0),
          minTtl: Duration.seconds(0),
          maxTtl: Duration.seconds(0),
          forwardedValues: { queryString: true, cookies: { forward: "all" } },
          lambdaFunctionAssociations: [
            {
              eventType: LambdaEdgeEventType.VIEWER_REQUEST,
              lambdaFunction: ApiViewerRequestHandler.currentVersion,
            },
          ],
        },
      ],
    };

    this.cfWebDistribution = new CloudFrontWebDistribution(this, "CFWebDistribution", {
      comment: "Cdk Example Web Distribution",
      originConfigs: [apiOriginConfig, bucketOriginConfig],
    });

    new CfnOutput(this, "CFWebDistributionDomainName", {
      value: this.cfWebDistribution.distributionDomainName,
      description: "The Cloudfront Distribution's domain name",
    });
  }
}
