const uuidv4 = require('uuid/v4');
const HillDatabase = require("./HillDatabase");

function dbFactory(tableName,dynamoDbClient)
{
    return new HillDatabase(tableName,dynamoDbClient);
}
function log(event,metaData=null,type="info")
{
    if(!["info","warn","error"].includes(type))
    {
        throw `${type} is not a valid log level`;
    }

    const logMethod = type === "info" ? "log" : type;

    if(metaData !== null)
    {
        metaData = {...metaData, log_level: type };
    }
    else
    {
        metaData = { log_level: type };
    }
    console[logMethod](`${event}\n${JSON.stringify(metaData,null,2)}`);
}

function removeEmptyParams(objectToClean)
{
  return Object.keys(objectToClean).filter(key => {
    return objectToClean[key] && objectToClean[key] !== "" && objectToClean[key] !== " " && objectToClean[key] !== null;
  }).reduce((accum,curr) => {
    accum[curr] = objectToClean[curr];
    return accum;
  },{});
}

function generateId()
{
  return uuidv4().split("-")[0].toUpperCase();
}

function logMessages(events,metaData=null,type="info")
{
  events.forEach(element => {
    log(element,metaData,type);
  });
}

function dynamoDbClient(local,AWSObject)
{
    return local === true ? 
          new AWSObject.DynamoDB.DocumentClient({
            region: 'localhost',
            endpoint: 'http://localhost:8000',
            accessKeyId: 'DEFAULT_ACCESS_KEY',  // needed if you don't have aws credentials at all in env
            secretAccessKey: 'DEFAULT_SECRET' // needed if you don't have aws credentials at all in env            
          }) :
          new AWSObject.DynamoDB.DocumentClient();
}

function buildResponse(statusCode=200,body,headers=null)
{
  let corsHeaders  = {
    "Content-Type" : "application/json",
    "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
    "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
  };
  
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {...corsHeaders,...headers}
  }
}

// Policy helper function
function generatePolicy(principalId, effect, resource,user=null){
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }

  if(user)
  {
    // Optional output with custom properties of the String, Number or Boolean type.
    authResponse.context = {
      email: user.email,
      associate_id: user.associate_id,
      user_type: user.user_type,
      user_session: user.current_session
    };
  }
  
  return authResponse;
}

function removeKeys(objectToChange,keysToRemove)
{
  return Object.keys(objectToChange).filter(key => {
    return !keysToRemove.includes(key);
  }).reduce((accum,curr) => {
    accum[curr] = objectToChange[curr];
    return accum;
  },{});
}

function cleanData(listOfObjects,keysToRemove=["password"])
{
  return listOfObjects.map(curr => {
    return removeKeys(curr,keysToRemove);
  });
}

/**
 * Returns an array with N number of elements 
 * for every param in the subject object. 
 * 
 * This assumes your subject and compare object
 * have the same param name/key structure. 
 * 
 * Each param in subject object is compared to the 
 * param key in the compare object.  
 * 
 * If there is a difference, the value in the Nth element 
 * of the array is recored as <key> was changed from "value1" to "value2"
 * 
 * @param {*} subject 
 * @param {*} compare 
 * @returns array
 */
function differences(subject,compare)
{
  return Object.keys(subject).map(key => 
  {
    if(compare[key] === undefined)
    {
      return `NEW_FIELD: Field \`${key}\` was not in subject, so "${subject[key]}" is a new value`
    }

    return subject[key] !== compare[key] ?
           `USER_CHANGE: Field \`${key}\` was changed from "${compare[key]}" to "${subject[key]}"` :
           `NO_CHANGE: Field \`${key}\` was not changed`; 
  });
}

/**
 * Is the given date past an expiration?
 * 
 * @param {*} date 
 * @param {*} expireSeconds 
 */
function isExpired(date,expireSeconds=86400)
{
  const expireDate = Math.floor(new Date(date) / 1000) + expireSeconds;
  const currentDate= Math.floor(new Date() / 1000);

  return expireDate <= currentDate;
}

function parseHTTPMethod(event)
{
  return  event.headers["X-Method"] ? 
          event.headers["X-Method"] : 
          event.requestContext.httpMethod;
}

function parseQueryParams(event)
{
  if(!event.queryStringParameters)
  {
      return null;
  }

  const params = removeKeys(event.queryStringParameters,"fields");

  return Object.keys(params).length > 0 ? params : null;
}

function parseFieldsParam(event)
{
  if(!event.queryStringParameters ||!event.queryStringParameters.fields)
  {
    return null;
  }
  return event.queryStringParameters.fields.split(",");
}

module.exports  = { dbFactory,removeEmptyParams, parseFieldsParam, parseQueryParams, generateId, parseHTTPMethod, isExpired, buildResponse, log, dynamoDbClient, generatePolicy,removeKeys, cleanData, differences, logMessages };