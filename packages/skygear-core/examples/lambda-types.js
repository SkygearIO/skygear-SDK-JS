var skygear = require('skygear');
var skygearCloud = require('skygear/cloud');

/**
 * This lamda returns some skydb types to the caller. This demonstrates
 * the lambda can return skydb types.
 *
 * ```
 * curl -X "POST" "http://localhost:3000" \
 *      -H 'Content-Type: application/json; charset=utf-8' \
 *      -d $'{
 *   "api_key": "secret",
 *   "action": "hello"
 * }'
 * ```
*/
skygearCloud.op('hello', function () {
  return [
    1,
    2,
    true,
    "hello",
    new skygear.Geolocation(1, 2),
    new skygear.Record('note', {
      _id: "note/99D92DBA-74D5-477F-B35E-F735E21B2DD5",
      _owner_id: "OWNER_ID",
      _access: null,
      "content": "Hello World!"
    }),
    {
        'location': new skygear.Geolocation(1, 2)
    }
  ]
});


/**
 * This lamda copies the lambda value and return it to the caller.
 *
 * ```
 * curl -X "POST" "http://localhost:3000" \
 *      -H 'Content-Type: application/json; charset=utf-8' \
 *      -d $'{
 *   "api_key": "secret",
 *   "action": "echo",
 *   "args": [
 *     {
 *       "location": {"$lng":1,"$type":"geo","$lat":2}
 *     }
 *   ]
 * }'
 * ```
 */
skygearCloud.op('echo', function (args) {
  return args
});
