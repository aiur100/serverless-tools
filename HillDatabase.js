class HillDatabase {

    constructor(tableName,dynamoDb){
        this.dynamoDb   = dynamoDb;
        this.tableName  = tableName;
    }

    buildFilterExpression(keyValuePairs){
        let expressionString = "";
        for(let aKey in keyValuePairs){
            if(!keyValuePairs.hasOwnProperty(aKey)){
                continue;
            }

            if(expressionString === ""){
                expressionString = `#${aKey} = :${aKey}`;
            }
            else{
                expressionString += ` and #${aKey} = :${aKey}`;
            }
        }
        return expressionString;
    }

    buildExpressionAttributeNames(keys){
        let expressionObject = {};
        keys.forEach(aKey => {
            expressionObject[ `#${aKey}` ] = aKey
        });
        return expressionObject;
    }

    buildExpressionAttributeValues(keyValuePairs){
        let expressionObject = {};
        for(let aKey in keyValuePairs){
            if(!keyValuePairs.hasOwnProperty(aKey)){
                continue;
            }
            expressionObject[`:${aKey}`] = keyValuePairs[aKey];
        }
        return expressionObject;
    }

    buildScanFilterParams(keyValuePairs,fields)
    {
        let params = keyValuePairs === null ?
                    {
                        TableName: this.tableName,
                        Limit: 300,
                        Select: 'ALL_ATTRIBUTES',
                        ConsistentRead: false, // optional (true | false)
                        ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
                    }
                    :
                    {
                        TableName: this.tableName,
                        FilterExpression: this.buildFilterExpression(keyValuePairs),
                        ExpressionAttributeNames: this.buildExpressionAttributeNames(Object.keys(keyValuePairs)),
                        ExpressionAttributeValues: this.buildExpressionAttributeValues(keyValuePairs)
                    }

        if(fields)
        {
            params["Select"] = "SPECIFIC_ATTRIBUTES";
            params["AttributesToGet"] = fields;
        } 
        return params;           
    }

    /**
     * If keyValueParis is null, return
     * all items in table.
     *
     * @param keyValuePairs
     * @returns {Promise<PromiseResult<D, E>>}
     */
    where(keyValuePairs = null,fields = null){
        return this.dynamoDb.scan(
            this.buildScanFilterParams(keyValuePairs,fields)
        ).promise();
    }

    async whereCall(keyValuePairs = null,fields = null)
    {
        let params      = this.buildScanFilterParams(keyValuePairs,fields);
        let pagination  = false;
        let items       = [];
        //console.log("starting...",JSON.stringify(params,null,2));
        try{
            do{
                //console.log("sending dynamo db call...");

                let response = await this.dynamoDb.scan(
                    params
                ).promise();


                //console.log("response...");

                if(response.LastEvaluatedKey)
                {
                    params.ExclusiveStartKey = response.LastEvaluatedKey;
                    pagination               = true;
                    //console.log("Pagination found",JSON.stringify(params,null,2));
                }
                else
                {
                    pagination               = false;
                    //console.log("Pagination NOT found",JSON.stringify(params,null,2));
                }

                //console.log(`${response.Items.length} items added to return data`);

                items = items.concat(response.Items);
            }
            while(pagination);
        }
        catch(Error)
        {
            //console.error("DYNAMO ERRORS",JSON.stringify(Error,null,2));
            return Promise.reject(Error);
        }
        return items;
    }

    store(data){
        return this.dynamoDb.put({
                TableName: this.tableName,
                Item: data
            }, (error, result) => {

            if (error) {
                return {
                    status: "error",
                    message: error
                };
            }
            else{
                return {
                    status: "success",
                    message: result
                };
            }
        }).promise();
    }

}

module.exports = HillDatabase;