const skygear = require('skygear');
const skygearCloud = require('skygear/cloud');

function includeme(skygearCloud) {
  skygearCloud.op('greeting', function(param) {
    return {
      'content': 'Hello, ' + param.name,
    };
  }, {
    keyRequired: true,
    userRequired: false,
  });
  

  skygearCloud.handler('create_image_note', function (req, options) {
    const { context } = options;
    const currentUserID = context.user_id;
    const container = skygearCloud.getContainer(currentUserID);
    const picture = new skygear.Asset({
        name: 'file.png',            // filename of your asset
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo0QjlCMTQ3OTEyRTcxMUU4OEVBNkM1QTRBQzJGNTc1QiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo0QjlCMTQ3QTEyRTcxMUU4OEVBNkM1QTRBQzJGNTc1QiI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjRCOUIxNDc3MTJFNzExRTg4RUE2QzVBNEFDMkY1NzVCIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjRCOUIxNDc4MTJFNzExRTg4RUE2QzVBNEFDMkY1NzVCIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+0k1WXQAAABJJREFUeNpiYGBg+A8EDAABBgAN+wP9QoT8VAAAAABJRU5ErkJggg==', // base64 of the file, no mime
        contentType: 'image/png'      // mime of the file
    });

    const Note = skygear.Record.extend('note');
    const note = new Note({ attachment: picture });
    console.log("Saving note");

    return container.publicDB.save(note) // automatically upload the picture
      .then((record) => {
          return { 'record.attachment.url': record.attachment.url };
      }, (error) => {
          return error;
      });
  }, {
    method: ['GET']
  });

}

module.exports = {
  includeme
};
