## Serverless REST Assignment.

__Name:__ Seamus McCarthy

__Video demonstration:__ [Demo](https://youtu.be/U0Rn4hKQfTk)

This repository contains an implementation of a serverless REST API for the AWS platform. The CDK framework is used to provision its infrastructure. The API's domain context is movie reviews.

### API endpoints.
 
+ POST /movies/reviews - add a movie review.
+ GET /movies/{movieId}/reviews - Get all the reviews for a movie with the specified id.
+ GET /movies/{movieId}/reviews?minRating=n - Get all the reviews for the film with the specified ID whose rating was higher than the minRating.
+ GET /movies/{movieId}/reviews/{reviewerName} - Get the review for the movie with the specified movie ID and written by the named reviewer.
+ PUT /movies/{movieId}/reviews/{reviewerName} - Update the text of a review.
+ GET /movies/{movieId}/reviews/{year} - Get the reviews written in a specific year for a specific movie.
+ GET /reviews/{reviewerName} - Get all the reviews written by a specific reviewer
+ GET /reviews/{reviewerName}/{movieId}/translation?language=code - Get a translated version of a movie review using the movie ID and refviewer name as the identifier.

![](./images/API_Gateway.png)

### Authentication.

![](./images/Cognito_user.png)

### Independent learning.

Ran into some problems adding the translation request as the IAM role being used by the lambda did not have the Amazon Translate permissions for TranslateReadOnly.
So I created a new 'translator' role which had the AWSLambdaBasicExecutionRole as well as TranslateReadOnly. I then needed to retrieve this role by the ARN in app-api.ts
and assigned this new role to the GetMovieReviewTranslatedFn function.

I also had to create a Global Secondary Index on the database table to accommodate the /reviews/{reviewerName} request where I didn't have any partition key value to work with.
