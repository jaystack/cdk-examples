import { Construct } from "@aws-cdk/core";
import {
  BastionHostLinux,
  SubnetType,
  GatewayVpcEndpointAwsService,
  SecurityGroup,
  Peer,
  Port,
  ISecurityGroup,
  SelectedSubnets,
  Vpc,
} from "@aws-cdk/aws-ec2";

export interface NetworkProps {
  vpcCidr?: string;
  subnetBitMask?: number;
  bastionClientCidrs?: string[];
  bastionIsPublic?: boolean;
  natGateways?: number;
}
export enum SubnetGroupName {
  app = "app",
  lambda = "lambda",
  db = "db",
  ingress = "ingress",
}

export class Network extends Construct {
  private props: NetworkProps;
  vpc: Vpc;
  defaultSecurityGroup: ISecurityGroup;
  databaseSubnets: SelectedSubnets;
  appSubnets: SelectedSubnets;
  lambdaSubnets: SelectedSubnets;
  ingressSubnets: SelectedSubnets;
  bastion: BastionHostLinux;
  allowPublicAccessSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkProps = {}) {
    super(scope, id);
    this.props = props;
    this.createVpc();
    this.createBastion();
  }

  createVpc() {
    const cidr = this.props.vpcCidr ?? "10.0.0.0/16";
    const cidrMask = this.props.subnetBitMask ?? 20;
    const natGateways = this.props.natGateways ?? 1;

    this.vpc = new Vpc(this, "vpc", {
      cidr,
      maxAzs: 4,
      natGateways,
      subnetConfiguration: [
        {
          name: SubnetGroupName.ingress,
          subnetType: SubnetType.PUBLIC,
          cidrMask,
        },
        {
          name: SubnetGroupName.app,
          subnetType: SubnetType.PRIVATE,
          cidrMask,
        },
        {
          name: SubnetGroupName.lambda,
          subnetType: SubnetType.PRIVATE,
          cidrMask,
        },
        {
          // reserved: true,
          name: SubnetGroupName.db,
          subnetType: SubnetType.ISOLATED,
          cidrMask,
        },
      ],
      gatewayEndpoints: {
        S3: {
          service: GatewayVpcEndpointAwsService.S3,
        },
        DynamoDb: {
          service: GatewayVpcEndpointAwsService.DYNAMODB,
        },
      },
    });

    this.databaseSubnets = this.vpc.selectSubnets({ subnetGroupName: SubnetGroupName.db });
    this.appSubnets = this.vpc.selectSubnets({ subnetGroupName: SubnetGroupName.app });
    this.lambdaSubnets = this.vpc.selectSubnets({ subnetGroupName: SubnetGroupName.lambda });
    this.ingressSubnets = this.vpc.selectSubnets({ subnetGroupName: SubnetGroupName.ingress });

    this.defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      "DefaultSg",
      this.vpc.vpcDefaultSecurityGroup
    );

    this.defaultSecurityGroup.addIngressRule(
      Peer.ipv4(this.vpc.vpcCidrBlock),
      Port.allTraffic(),
      "Allow all from within VPC by CIDR"
    );

    this.allowPublicAccessSecurityGroup = new SecurityGroup(this, "AllowPublicAccessSecurityGroup", {
      vpc: this.vpc,
      allowAllOutbound: true,
      description: "Allows all ingress on all ports",
    });

    this.allowPublicAccessSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic());
  }

  createBastion() {
    this.bastion = new BastionHostLinux(this, "BastionHost", {
      vpc: this.vpc,
      subnetSelection: this.ingressSubnets,
    });

    if (this.props.bastionIsPublic) {
      this.bastion.allowSshAccessFrom(Peer.anyIpv4());
      // this.bastion.allowSshAccessFrom(Peer.anyIpv6())
    } else if (this.props.bastionClientCidrs?.length) {
      this.bastion.allowSshAccessFrom(...this.props.bastionClientCidrs.map(Peer.ipv4));
    }
  }
}
