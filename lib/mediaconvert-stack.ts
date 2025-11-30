import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

interface MediaConvertStackProps extends cdk.StackProps {
  projectName: string;
  uploadBucketName: string;
  transcodedBucketName: string;
}

export class MediaConvertStack extends cdk.Stack {
  public readonly mediaConvertRole: iam.Role;

  constructor(scope: Construct, id: string, props: MediaConvertStackProps) {
    super(scope, id, props);

    const { projectName, uploadBucketName, transcodedBucketName } = props;

    const uploadBucket = s3.Bucket.fromBucketName(
      this,
      'UploadBucket',
      uploadBucketName
    );

    const transcodedBucket = s3.Bucket.fromBucketName(
      this,
      'TranscodedBucket',
      transcodedBucketName
    );

    this.mediaConvertRole = new iam.Role(this, 'MediaConvertRole', {
      roleName: `${projectName}-mediaconvert-role`,
      assumedBy: new iam.ServicePrincipal('mediaconvert.amazonaws.com'),
      description: 'Role for MediaConvert to access S3 buckets',
    });

    this.mediaConvertRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [
          `arn:aws:s3:::${uploadBucketName}/*`,
          `arn:aws:s3:::${transcodedBucketName}/*`,
        ],
      })
    );

    this.mediaConvertRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['mediaconvert:*'],
        resources: ['*'],
      })
    );

    const transcodeTriggerHandler = new lambda.Function(this, 'TranscodeTriggerHandler', {
      functionName: `${projectName}-transcode-trigger`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200 })'),
      environment: {
        MEDIACONVERT_ROLE_ARN: this.mediaConvertRole.roleArn,
        UPLOAD_BUCKET: uploadBucketName,
        TRANSCODED_BUCKET: transcodedBucketName,
      },
      timeout: cdk.Duration.seconds(60),
    });

    transcodeTriggerHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['mediaconvert:CreateJob', 'mediaconvert:GetJob'],
        resources: ['*'],
      })
    );

    transcodeTriggerHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [`arn:aws:s3:::${uploadBucketName}/*`],
      })
    );

    transcodeTriggerHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.mediaConvertRole.roleArn],
      })
    );

    new cdk.CfnOutput(this, 'MediaConvertRoleArn', {
      value: this.mediaConvertRole.roleArn,
      exportName: `${projectName}-mediaconvert-role-arn`,
    });

    new cdk.CfnOutput(this, 'TranscodeTriggerFunctionName', {
      value: transcodeTriggerHandler.functionName,
      exportName: `${projectName}-transcode-trigger-function`,
    });
  }
}
