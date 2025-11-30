import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface DynamoStackProps extends cdk.StackProps {
  projectName: string;
}

export class DynamoStack extends cdk.Stack {
  public readonly tables: {
    users: dynamodb.Table;
    channels: dynamodb.Table;
    videos: dynamodb.Table;
    subscriptions: dynamodb.Table;
  };

  constructor(scope: Construct, id: string, props: DynamoStackProps) {
    super(scope, id, props);

    const { projectName } = props;

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `${projectName}-users`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const channelsTable = new dynamodb.Table(this, 'ChannelsTable', {
      tableName: `${projectName}-channels`,
      partitionKey: { name: 'channelId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const videosTable = new dynamodb.Table(this, 'VideosTable', {
      tableName: `${projectName}-videos`,
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    videosTable.addGlobalSecondaryIndex({
      indexName: 'channelIdIndex',
      partitionKey: { name: 'channelId', type: dynamodb.AttributeType.STRING },
    });

    const subscriptionsTable = new dynamodb.Table(this, 'SubscriptionsTable', {
      tableName: `${projectName}-subscriptions`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'channelId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.tables = {
      users: usersTable,
      channels: channelsTable,
      videos: videosTable,
      subscriptions: subscriptionsTable,
    };

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      exportName: `${projectName}-users-table-name`,
    });

    new cdk.CfnOutput(this, 'ChannelsTableName', {
      value: channelsTable.tableName,
      exportName: `${projectName}-channels-table-name`,
    });

    new cdk.CfnOutput(this, 'VideosTableName', {
      value: videosTable.tableName,
      exportName: `${projectName}-videos-table-name`,
    });

    new cdk.CfnOutput(this, 'SubscriptionsTableName', {
      value: subscriptionsTable.tableName,
      exportName: `${projectName}-subscriptions-table-name`,
    });
  }
}
