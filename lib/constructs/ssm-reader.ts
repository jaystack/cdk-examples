import { Construct } from "@aws-cdk/core";
import { PolicyStatement, Effect } from "@aws-cdk/aws-iam";
import { AwsCustomResource, AwsSdkCall } from "@aws-cdk/custom-resources";

interface SSMParameterReaderProps {
  parameterName: string;
  region: string;
}

export class SSMParameterReader extends AwsCustomResource {
  constructor(scope: Construct, name: string, props: SSMParameterReaderProps) {
    const { parameterName, region } = props;

    const ssmAwsSdkCall: AwsSdkCall = {
      service: "SSM",
      action: "getParameter",
      parameters: {
        Name: parameterName,
      },
      region,

      physicalResourceId: { id: Date.now().toString() }, // Update physical id to always fetch the latest version
    };

    super(scope, name, {
      onUpdate: ssmAwsSdkCall,
      installLatestAwsSdk: true,
      onCreate: ssmAwsSdkCall,
      policy: {
        statements: [
          new PolicyStatement({
            resources: ["*"],
            actions: ["ssm:GetParameter"],
            effect: Effect.ALLOW,
          }),
        ],
      },
    });
  }

  public getParameterValue(): string {
    return this.getResponseField("Parameter.Value").toString();
  }
}
