import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { movieReviews } from "../seed/movieReviews";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class EwdAssignment1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const EwdAssignment1Fn = new lambdanode.NodejsFunction(
      this,
      "EwdAssignment1Fn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/EwdAssignment1.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
      }
    );

    const EwdAssignment1FnURL = EwdAssignment1Fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      cors: {
        allowedOrigins: ["*"],
      },
    });

    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewerName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });

    movieReviewsTable.addLocalSecondaryIndex({
      indexName: "dateIx",
      sortKey: { name: "reviewDate", type: dynamodb.AttributeType.STRING },
    });

    movieReviewsTable.addLocalSecondaryIndex({
      indexName: "ratingIx",
      sortKey: { name: "rating", type: dynamodb.AttributeType.NUMBER },
    });

    new custom.AwsCustomResource(this, "movieReviewsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [movieReviewsTable.tableName]: generateBatch(movieReviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of(
          "movieReviewsddbInitData"
        ), //.of(Date.now().toString()),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [movieReviewsTable.tableArn],
      }),
    });

    const api = new apig.RestApi(this, "ReviewsAPI", {
      description: "Movie Review API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    //  Functions .....
    const getMovieReviewsFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieReviewsFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getMovieReviews.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieReviewsTable.tableName,
          REGION: "eu-west-1",
        },
      }
    );

    const getMovieReviewsURL = getMovieReviewsFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
      },
    });

    // Permissions ......
    movieReviewsTable.grantReadData(getMovieReviewsFn);

    // Routes
    const moviesEndpoint = api.root.addResource("movies"); // /movies
    const moviesReviewsEndpoint = moviesEndpoint.addResource("reviews"); // /movies/reviews   PUT

    const movieEndpoint = moviesEndpoint.addResource("{movieId}"); // /movies/{movieId}
    const movieReviewsEndpoint = movieEndpoint.addResource("reviews"); // /movies/{movieId}/reviews   GET
    const movieReviewsNameEndpoint =
      movieReviewsEndpoint.addResource("{reviewerName}"); // /movies/{movieId}/reviews/{reviewerName}  GET
    // const movieReviewsDateEndpoint = movieReviewsEndpoint.addResource("{year}"); // /movies/{movieId}/reviews/{year}  GET

    const reviewsEndpoint = api.root.addResource("reviews"); // /reviews
    const reviewsNameEndpoint = reviewsEndpoint.addResource("{reviewerName}"); // /reviews/{reviewerName}
    const reviewsNameMovieEndpoint =
      reviewsNameEndpoint.addResource("{movieId}"); // /reviews/{reviewerName}/{movieId}
    const reviewsNameMovieTranslateEndpoint =
      reviewsNameMovieEndpoint.addResource("translation"); // /reviews/{reviewerName}/{movieId}/translation

    // Add lambdas to routes
    movieReviewsEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieReviewsFn, { proxy: true })
    );

    new cdk.CfnOutput(this, "EwdAssignment1 Function Url", {
      value: EwdAssignment1FnURL.url,
    });
  }
}
