import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';

export class GuruCdkSetupStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketPrefix = "codeguru-reviewer-build-artifacts";

    const artifactBucket = new s3.Bucket(this, bucketPrefix, {
      bucketName: `${bucketPrefix}-${process.env.CDK_DEFAULT_ACCOUNT}-${process.env.CDK_DEFAULT_REGION}`,
      versioned: false
    });

    const openIdConnectProvider: iam.OpenIdConnectProvider =
    new iam.OpenIdConnectProvider(this, "GitHubOicdProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
      thumbprints: ["a031c46782e6e6c662c2c87c76da9aa62ccabd8e"],
    });

    const providerNames : string[] = this.node.tryGetContext('allowListedGithubOrgs');
    const transformedList : string[] = providerNames.map(repo => `repo:${repo}:*`);

    // IAM OIDC Principal
    const openIdConnectPrincipal: iam.OpenIdConnectPrincipal =
      new iam.OpenIdConnectPrincipal(openIdConnectProvider, {
        StringLike: 
        {
          "token.actions.githubusercontent.com:sub": transformedList
        },
      });

    
    // IAM Policy document
    const gitHubDeploymentPolicy: iam.PolicyDocument =
      new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: [
              "s3:PutObject", 
              "s3:GetObject", 
              "s3:ListBucket"],
            resources: [ `${artifactBucket.bucketArn}`, `${artifactBucket.bucketArn}/*` ],
          })         
        ],
      });

    // IAM Role
    const role: iam.Role = new iam.Role(this, "GitHubActionRole", {
      roleName: "GitHubActionRole",
      inlinePolicies: {
        GitHubDeploymentPolicy: gitHubDeploymentPolicy,
      },
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonCodeGuruReviewerFullAccess")
      ],
      assumedBy: openIdConnectPrincipal,
    });    
 
    new cdk.CfnOutput(this, "Role", {
      value: role.roleArn,
      description: "The ARN of the role that will be used in your CICD configuration.",
      exportName: "Role",
    });
    new cdk.CfnOutput(this, "Region", {
      value: this.region,
      description: "The Region that will be used in your CICD configuration.",
      exportName: "Region",
    });
    new cdk.CfnOutput(this, "Bucket", {
      value: artifactBucket.bucketName,
      description: "The name of the S3 Bucket that will be used in your CICD configuration.",
      exportName: "Bucket",
    });
  }
 
}
