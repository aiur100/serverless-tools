# Aiur100's Serverless Tools

These are tools that make working with serverless applications a lot easier. 
This is really just intended for me, but obviously, I am making this public in-case anyone needs it. I may make this project a little cleaner, documented and more professional later on.  

* utils.js
    * `log` - A function that writes logs in a AWS Cloudwatch parseable format that includes the message, and a JSON meta-data block.
    * `dynamoDbClient` - Is a factory function that simply returns a DynamoDB client.  If you indicate that you are using DynamoDB local/offline (requires serverless dynamodb), this will return the DynamoDB client configured for the local environment.  
    * `buildResponse` - Builds a HTTP cors response given a payload, and any additional headers.

* HillDatabase.js
    * My own DynamoDB wrapper.